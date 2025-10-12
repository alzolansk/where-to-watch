(function () {
    const API_KEY = 'dc3b4144ae24ddabacaeda024ff0585c';
    const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
    const POSTER_SIZE = 'w500';
    const PROVIDER_LOGO_SIZE = 'w92';
    const WATCH_REGION = 'BR';
    const WATCH_PRIORITIES = ['flatrate', 'ads', 'free', 'rent', 'buy'];
    const POPULARITY_PAGES = 5;
    const MAX_RESULTS = 100;
    const CACHE_TTL = 5 * 60 * 1000;
    const MAX_CACHE_ENTRIES = 20;
    const DEFAULT_SORT = 'popularity.desc';
    const SORT_OPTIONS = [
        { value: 'popularity.desc', label: 'Popularidade' },
        { value: 'vote_average.desc', label: 'Avaliação' },
        { value: 'primary_release_date.desc', label: 'Mais recentes' }
    ];
    const sortLabelMap = new Map(SORT_OPTIONS.map((item) => [item.value, item.label]));
    const providerDirectUrls = new Map([
        [8, 'https://www.netflix.com/'],
        [9, 'https://www.primevideo.com/'],
        [337, 'https://www.disneyplus.com/'],
        [384, 'https://play.max.com/'],
        [350, 'https://tv.apple.com/'],
        [531, 'https://www.paramountplus.com/'],
        [746, 'https://www.starplus.com/'],
        [10, 'https://play.google.com/store/movies'],
        [68, 'https://www.clarovideo.com/']
    ]);

    const elements = {
        root: document.querySelector('[data-genres-root]'),
        heroTitle: document.getElementById('genreHeroTitle'),
        heroSubtitle: document.getElementById('genreHeroSubtitle'),
        heroSelected: document.getElementById('genreHeroSelected'),
        mediaFilter: document.querySelector('[data-filter-media]'),
        grid: document.getElementById('genreResultsGrid'),
        resultsCaption: document.getElementById('genreResultsCaption'),
        resultsCount: document.getElementById('genreResultsCount'),
        resultsStatus: document.getElementById('genreResultsStatus'),
        emptyState: document.getElementById('genreEmptyState')
    };

    if (!elements.root) {
        return;
    }

    const createDropdownRef = (key) => {
        const container = document.querySelector(`[data-filter-dropdown="${key}"]`);
        if (!container) {
            return null;
        }
        const trigger = container.querySelector(`[data-filter-trigger="${key}"]`);
        const menu = container.querySelector(`[data-filter-menu="${key}"]`);
        const options = container.querySelector(`[data-filter-options="${key}"]`);
        const reset = container.querySelector(`[data-filter-reset="${key}"]`);
        const valueEl = container.querySelector(`[data-filter-trigger-value="${key}"]`);
        const defaultValue = valueEl ? valueEl.textContent.trim() : '';
        const defaultLabel = trigger ? (trigger.dataset.defaultLabel || '') : '';
        if (options) {
            options.dataset.dropdownKey = key;
        }
        return { key, container, trigger, menu, options, reset, valueEl, defaultValue, defaultLabel };
    };

    const dropdowns = {
        genre: createDropdownRef('genre'),
        year: createDropdownRef('year'),
        sort: createDropdownRef('sort')
    };

    const dropdownKeys = Object.keys(dropdowns).filter((key) => dropdowns[key]);
    let openDropdownKey = null;

    const normalize = (value) => (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const buildImageUrl = (path, size) => (path ? `${IMAGE_BASE}${size}${path}` : '');

    const resolveProviderWatchUrl = (provider) => {
        if (!provider) {
            return '';
        }
        if (providerDirectUrls.has(provider.id)) {
            return providerDirectUrls.get(provider.id);
        }
        const searchTerm = provider.name || 'streaming';
        return `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
    };

    const state = {
        mediaType: 'both',
        sortBy: DEFAULT_SORT,
        year: '',
        selectedGenres: new Set(),
        selectedKeywords: new Set(),
        allGenres: new Map(),
        keywordData: new Map(),
        suggestedKeywords: [],
        titleKeywordCache: new Map(),
        fetchToken: 0,
        keywordToken: 0,
        initialLabels: new Map(),
        initialKeywordLabels: new Map(),
        providerCache: new Map(),
        providerToken: 0,
        resultsCache: new Map(),
        currentFetchController: null
    };

    const params = new URLSearchParams(window.location.search);
    const initialMedia = params.get('mediaType');
    if (initialMedia && ['movie', 'tv', 'both'].includes(initialMedia)) {
        state.mediaType = initialMedia;
    }
    const initialSort = params.get('sortBy');
    if (initialSort && sortLabelMap.has(initialSort)) {
        state.sortBy = initialSort;
    }
    const initialYear = params.get('year');
    if (initialYear && /^(19|20)\d{2}$/.test(initialYear)) {
        state.year = initialYear;
    }

    const parseInitialGenres = () => {
        const tokens = (params.get('genres') || '')
            .split(/[\s,;|]+/)
            .map((token) => Number.parseInt(token, 10))
            .filter((id) => Number.isInteger(id) && id > 0);
        const labels = (params.get('labels') || '')
            .split(/[|]/)
            .map((label) => label.trim())
            .filter(Boolean);
        tokens.forEach((id, index) => {
            state.selectedGenres.add(id);
            if (labels[index]) {
                state.initialLabels.set(id, labels[index]);
            }
        });
    };

    parseInitialGenres();

    const parseInitialKeywords = () => {
        const tokens = (params.get('keywords') || '')
            .split(/[\s,;|]+/)
            .map((token) => Number.parseInt(token, 10))
            .filter((id) => Number.isInteger(id) && id > 0);
        const labels = (params.get('keywordLabels') || '')
            .split(/[|]/)
            .map((label) => label.trim())
            .filter(Boolean);
        tokens.forEach((id, index) => {
            state.selectedKeywords.add(id);
            const label = labels[index];
            if (label) {
                state.initialKeywordLabels.set(id, label);
                state.keywordData.set(id, { id, name: label });
            }
        });
    };

    parseInitialKeywords();

    const mapSortForMedia = (sort, mediaType) => {
        if (mediaType === 'tv' && sort === 'primary_release_date.desc') {
            return 'first_air_date.desc';
        }
        return sort;
    };

    const closeDropdownMenu = () => {
        if (!openDropdownKey) {
            return;
        }
        const dropdown = dropdowns[openDropdownKey];
        if (dropdown?.container) {
            dropdown.container.classList.remove('is-open');
        }
        if (dropdown?.trigger) {
            dropdown.trigger.setAttribute('aria-expanded', 'false');
        }
        openDropdownKey = null;
    };

    const openDropdownMenu = (key) => {
        if (!dropdowns[key]) {
            return;
        }
        if (openDropdownKey === key) {
            closeDropdownMenu();
            return;
        }
        closeDropdownMenu();
        const dropdown = dropdowns[key];
        if (!dropdown.container || !dropdown.trigger) {
            return;
        }
        dropdown.container.classList.add('is-open');
        dropdown.trigger.setAttribute('aria-expanded', 'true');
        openDropdownKey = key;
    };

    const toggleDropdownMenu = (key) => {
        if (openDropdownKey === key) {
            closeDropdownMenu();
        } else {
            openDropdownMenu(key);
        }
    };

    const updateDropdownLabel = (key) => {
        const dropdown = dropdowns[key];
        if (!dropdown || !dropdown.valueEl) {
            return;
        }

        let text = dropdown.defaultValue || '';
        let isDefault = false;

        if (key === 'genre') {
            const selectedCount = state.selectedGenres.size;
            if (!selectedCount) {
                text = dropdown.defaultValue || 'Todos';
                isDefault = true;
            } else if (selectedCount === 1) {
                const first = state.selectedGenres.values().next().value;
                const entry = state.allGenres.get(first);
                const fallback = state.initialLabels.get(first);
                text = entry?.name || fallback || dropdown.defaultValue || 'Selecionado';
                isDefault = false;
            } else {
                text = `${selectedCount} selecionados`;
                isDefault = false;
            }
        } else if (key === 'year') {
            if (state.year) {
                text = state.year;
                isDefault = false;
            } else {
                text = dropdown.defaultValue || 'Todos';
                isDefault = true;
            }
        } else if (key === 'sort') {
            text = sortLabelMap.get(state.sortBy) || dropdown.defaultValue || 'Popularidade';
            isDefault = state.sortBy === DEFAULT_SORT;
        }

        dropdown.valueEl.textContent = text;
        if (dropdown.reset) {
            dropdown.reset.disabled = isDefault;
        }
        if (dropdown.container) {
            dropdown.container.classList.toggle('has-value', !isDefault);
        }
    };

    const createFilterOption = ({ label, value, key, isSelected }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `filter-option${isSelected ? ' is-selected' : ''}`;
        button.dataset.optionValue = value;
        button.dataset.dropdownKey = key;
        button.setAttribute('aria-pressed', String(Boolean(isSelected)));

        const check = document.createElement('span');
        check.className = 'filter-option__check';
        check.setAttribute('aria-hidden', 'true');

        const labelEl = document.createElement('span');
        labelEl.className = 'filter-option__label';
        labelEl.textContent = label;

        button.append(check, labelEl);
        return button;
    };

    const populateGenreOptions = () => {
        const dropdown = dropdowns.genre;
        if (!dropdown?.options) {
            return;
        }
        dropdown.options.innerHTML = '';

        const relevant = Array.from(state.allGenres.values())
            .filter((genre) => {
                if (state.mediaType === 'movie') {
                    return genre.mediaTypes.has('movie');
                }
                if (state.mediaType === 'tv') {
                    return genre.mediaTypes.has('tv');
                }
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        relevant.forEach((genre) => {
            const isSelected = state.selectedGenres.has(genre.id);
            const option = createFilterOption({
                key: 'genre',
                value: String(genre.id),
                label: genre.name,
                isSelected
            });
            dropdown.options.appendChild(option);
        });

        updateDropdownLabel('genre');
    };

    const populateYearOptions = () => {
        const dropdown = dropdowns.year;
        if (!dropdown?.options) {
            return;
        }
        dropdown.options.innerHTML = '';

        const currentYear = new Date().getFullYear();
        const earliestYear = 1960;

        dropdown.options.appendChild(createFilterOption({
            key: 'year',
            value: '',
            label: 'Todos os anos',
            isSelected: state.year === ''
        }));

        for (let year = currentYear; year >= earliestYear; year -= 1) {
            dropdown.options.appendChild(createFilterOption({
                key: 'year',
                value: String(year),
                label: String(year),
                isSelected: state.year === String(year)
            }));
        }

        updateDropdownLabel('year');
    };

    const populateSortOptions = () => {
        const dropdown = dropdowns.sort;
        if (!dropdown?.options) {
            return;
        }
        dropdown.options.innerHTML = '';

        SORT_OPTIONS.forEach((option) => {
            dropdown.options.appendChild(createFilterOption({
                key: 'sort',
                value: option.value,
                label: option.label,
                isSelected: state.sortBy === option.value
            }));
        });

        updateDropdownLabel('sort');
    };

    const setLoading = (isLoading, options = {}) => {
        const { mode = 'loading' } = options;
        if (elements.resultsStatus) {
            if (isLoading) {
                const message = mode === 'updating'
                    ? 'Atualizando resultados...'
                    : 'Buscando resultados...';
                elements.resultsStatus.hidden = false;
                elements.resultsStatus.textContent = message;
            } else {
                elements.resultsStatus.hidden = true;
                elements.resultsStatus.textContent = '';
            }
        }
        if (elements.grid) {
            if (isLoading && mode === 'updating') {
                elements.grid.classList.add('is-updating');
            } else {
                elements.grid.classList.remove('is-updating');
            }
            if (isLoading) {
                elements.grid.setAttribute('aria-busy', 'true');
            } else {
                elements.grid.removeAttribute('aria-busy');
            }
        }
    };

    const setEmptyState = (mode) => {
        if (!elements.emptyState) {
            return;
        }
        if (mode === 'hidden') {
            elements.emptyState.hidden = true;
            return;
        }
        elements.emptyState.hidden = false;
        const title = elements.emptyState.querySelector('h3');
        const description = elements.emptyState.querySelector('p');
        if (!title || !description) {
            return;
        }
        switch (mode) {
            case 'no-selection':
                title.textContent = 'Nenhuma categoria selecionada';
                description.textContent = 'Escolha ao menos uma categoria para descobrir novos títulos.';
                break;
            case 'no-results':
                title.textContent = 'Nenhum título encontrado';
                description.textContent = 'Ajuste os filtros ou tente combinar outras categorias semelhantes.';
                break;
            case 'error':
                title.textContent = 'Não foi possível carregar o catálogo';
                description.textContent = 'Verifique sua conexão e tente novamente em instantes.';
                break;
            default:
                break;
        }
    };

    const hasAnySelection = () => state.selectedGenres.size > 0 || state.selectedKeywords.size > 0;

    const getGenreName = (id) => {
        const entry = state.allGenres.get(id);
        if (entry) {
            return entry.name;
        }
        return state.initialLabels.get(id) || 'Categoria';
    };

    const getKeywordName = (id) => {
        const entry = state.keywordData.get(id);
        if (entry?.name) {
            return entry.name;
        }
        if (state.initialKeywordLabels.has(id)) {
            return state.initialKeywordLabels.get(id);
        }
        return 'Categoria';
    };

    const getSelectedGenreEntries = () => Array.from(state.selectedGenres)
        .map((id) => ({ id, name: getGenreName(id), type: 'genre' }))
        .filter((entry) => Boolean(entry.name));

    const getSelectedKeywordEntries = () => Array.from(state.selectedKeywords)
        .map((id) => ({ id, name: getKeywordName(id), type: 'keyword' }))
        .filter((entry) => Boolean(entry.name));

    const getCombinedSelections = () => {
        const genres = getSelectedGenreEntries().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        const keywords = getSelectedKeywordEntries().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        return [...genres, ...keywords];
    };

    const buildCacheKey = () => {
        const media = state.mediaType || 'both';
        const sort = state.sortBy || DEFAULT_SORT;
        const year = state.year || 'all';
        const genres = Array.from(state.selectedGenres).sort((a, b) => a - b).join(',') || 'none';
        const keywords = Array.from(state.selectedKeywords).sort((a, b) => a - b).join(',') || 'none';
        return [media, sort, year, genres, keywords].join('|');
    };

    const cloneProvider = (provider) => {
        if (!provider) {
            return null;
        }
        return {
            id: provider.id,
            name: provider.name,
            logo: provider.logo,
            type: provider.type,
            link: provider.link
        };
    };

    const cloneItemForCache = (item) => {
        if (!item || typeof item !== 'object') {
            return item;
        }
        return {
            ...item,
            genre_ids: Array.isArray(item.genre_ids) ? [...item.genre_ids] : item.genre_ids,
            origin_country: Array.isArray(item.origin_country) ? [...item.origin_country] : item.origin_country,
            primaryWatchProvider: cloneProvider(item.primaryWatchProvider)
        };
    };

    const cloneItemsForRender = (items) => Array.isArray(items)
        ? items.map((item) => cloneItemForCache(item))
        : [];

    const cloneSuggestions = (suggestions) => Array.isArray(suggestions)
        ? suggestions
            .filter((entry) => entry && Number.isInteger(entry.id) && entry.id > 0 && entry.name)
            .map((entry) => ({ id: entry.id, name: entry.name }))
        : [];

    const applyCacheEntry = (entry) => {
        if (!entry) {
            return;
        }
        const items = cloneItemsForRender(entry.items);
        renderTitles(items);
        const suggestions = cloneSuggestions(entry.suggestions);
        state.suggestedKeywords = suggestions;
        suggestions.forEach((suggestion) => {
            state.keywordData.set(suggestion.id, { id: suggestion.id, name: suggestion.name });
        });
        renderHeroChips();
    };

    const commitCacheEntry = (key, items, suggestions) => {
        if (!key) {
            return;
        }
        const entry = {
            timestamp: Date.now(),
            items: cloneItemsForRender(items),
            suggestions: cloneSuggestions(suggestions)
        };
        state.resultsCache.set(key, entry);
        if (state.resultsCache.size > MAX_CACHE_ENTRIES) {
            let oldestKey = null;
            let oldestTimestamp = Number.POSITIVE_INFINITY;
            state.resultsCache.forEach((value, cacheKey) => {
                if (value.timestamp < oldestTimestamp) {
                    oldestTimestamp = value.timestamp;
                    oldestKey = cacheKey;
                }
            });
            if (oldestKey) {
                state.resultsCache.delete(oldestKey);
            }
        }
    };

    const ensureKeywordDetails = async (ids) => {
        const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
        if (!uniqueIds.length) {
            return;
        }
        await Promise.all(uniqueIds.map(async (id) => {
            if (state.keywordData.has(id)) {
                return;
            }
            try {
                const url = `https://api.themoviedb.org/3/keyword/${id}?api_key=${API_KEY}`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Erro ao carregar palavra-chave ${id} (HTTP ${response.status})`);
                }
                const data = await response.json();
                if (data && data.id && data.name) {
                    state.keywordData.set(data.id, { id: data.id, name: data.name });
                }
            } catch (error) {
                console.error(error);
                if (state.initialKeywordLabels.has(id) && !state.keywordData.has(id)) {
                    state.keywordData.set(id, { id, name: state.initialKeywordLabels.get(id) });
                }
            }
        }));
        uniqueIds.forEach((id) => {
            if (!state.keywordData.has(id) && state.initialKeywordLabels.has(id)) {
                state.keywordData.set(id, { id, name: state.initialKeywordLabels.get(id) });
            }
        });
    };

    const updateHeroSubtitle = () => {
        if (!elements.heroSubtitle) {
            return;
        }
        const selectedNames = getCombinedSelections().map((item) => item.name).filter(Boolean);
        const mediaLabel = state.mediaType === 'movie'
            ? 'filmes'
            : state.mediaType === 'tv'
                ? 'séries'
                : 'filmes e séries';
        if (!selectedNames.length) {
            elements.heroSubtitle.textContent = `Selecione categorias, combine filtros e descubra ${mediaLabel} perfeitos para você.`;
            return;
        }
        const last = selectedNames.pop();
        const prefix = selectedNames.length ? `${selectedNames.join(', ')} e ${last}` : last;
        elements.heroSubtitle.textContent = `Explorando ${mediaLabel} relacionados a ${prefix}.`;
    };

    const updateResultsCaption = (count) => {
        if (!elements.resultsCaption) {
            return;
        }
        if (!hasAnySelection()) {
            elements.resultsCaption.textContent = 'Selecione uma categoria para começar a montar seu catálogo.';
            return;
        }
        if (!count) {
            elements.resultsCaption.textContent = 'Não encontramos títulos populares com essa combinação. Experimente outros filtros.';
            return;
        }
        const filters = [];
        const names = getCombinedSelections().map((item) => item.name).filter(Boolean);
        if (names.length) {
            filters.push(names.join(', '));
        }
        if (state.year) {
            filters.push(`lançados em ${state.year}`);
        }
        const mediaLabel = state.mediaType === 'movie'
            ? 'filmes'
            : state.mediaType === 'tv'
                ? 'séries'
                : 'títulos';
        elements.resultsCaption.textContent = `${mediaLabel.charAt(0).toUpperCase() + mediaLabel.slice(1)} encontrados para ${filters.join(' • ')}.`;
    };

    const updateResultsCount = (count) => {
        if (!elements.resultsCount) {
            return;
        }
        if (!count) {
            elements.resultsCount.textContent = '0 resultados';
            return;
        }
        elements.resultsCount.textContent = `${count} resultado${count === 1 ? '' : 's'}`;
    };

    const tokenize = (name) => normalize(name).split(/[^a-z0-9]+/g).filter(Boolean);

    const toProviderPriority = (provider) => {
        if (!provider) {
            return Number.POSITIVE_INFINITY;
        }
        const priority = provider.display_priority ?? provider.displayPriority;
        if (Number.isFinite(priority)) {
            return priority;
        }
        return Number.POSITIVE_INFINITY;
    };

    const selectPrimaryProvider = (regionEntry) => {
        if (!regionEntry) {
            return null;
        }
        for (const category of WATCH_PRIORITIES) {
            const list = Array.isArray(regionEntry[category]) ? regionEntry[category] : [];
            const sanitized = list
                .filter((provider) => provider && Number.isInteger(Number.parseInt(provider.provider_id, 10)) && provider.provider_name)
                .sort((a, b) => {
                    const priorityDiff = toProviderPriority(a) - toProviderPriority(b);
                    if (priorityDiff !== 0) {
                        return priorityDiff;
                    }
                    return (a.provider_name || '').localeCompare(b.provider_name || '', 'pt-BR');
                });
            if (sanitized.length) {
                const best = sanitized[0];
                const providerId = Number.parseInt(best.provider_id, 10);
                return {
                    id: providerId,
                    name: best.provider_name,
                    logo: buildImageUrl(best.logo_path, PROVIDER_LOGO_SIZE),
                    type: category,
                    link: regionEntry.link || ''
                };
            }
        }
        return null;
    };

    const getProviderCacheKey = (item) => {
        if (!item || !item.id) {
            return '';
        }
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        return `${mediaType}-${item.id}`;
    };

    const fetchPrimaryProviderForItem = async (item, signal) => {
        const cacheKey = getProviderCacheKey(item);
        if (!cacheKey) {
            return null;
        }
        if (state.providerCache.has(cacheKey)) {
            return state.providerCache.get(cacheKey);
        }
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const endpoint = `https://api.themoviedb.org/3/${mediaType}/${item.id}/watch/providers`;
        const url = new URL(endpoint);
        url.search = new URLSearchParams({ api_key: API_KEY });
        try {
            const response = await fetch(url.toString(), { signal });
            if (!response.ok) {
                throw new Error(`Erro ao carregar provedores de ${mediaType} ${item.id} (HTTP ${response.status})`);
            }
            const data = await response.json();
            const regionEntry = data?.results?.[WATCH_REGION];
            const provider = selectPrimaryProvider(regionEntry);
            state.providerCache.set(cacheKey, provider);
            return provider;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error(error);
            state.providerCache.set(cacheKey, null);
            return null;
        }
    };

    const PROVIDER_BATCH_SIZE = 6;

    const enrichWithProviders = async (items, token, signal) => {
        const enriched = [];
        for (let index = 0; index < items.length; index += PROVIDER_BATCH_SIZE) {
            if (token !== state.providerToken) {
                return [];
            }
            const batch = items.slice(index, index + PROVIDER_BATCH_SIZE);
            const providers = await Promise.all(batch.map((item) => fetchPrimaryProviderForItem(item, signal)));
            batch.forEach((item, position) => {
                // eslint-disable-next-line no-param-reassign
                item.primaryWatchProvider = providers[position] || null;
                enriched.push(item);
            });
        }
        return enriched;
    };

    const computeSuggestedGenres = () => {
        const relevant = Array.from(state.allGenres.values()).filter((genre) => {
            if (state.mediaType === 'movie') {
                return genre.mediaTypes.has('movie');
            }
            if (state.mediaType === 'tv') {
                return genre.mediaTypes.has('tv');
            }
            return true;
        });
        const toCategory = (genre) => ({ id: genre.id, name: genre.name, type: 'genre' });
        const selections = getCombinedSelections();
        if (!selections.length) {
            return relevant
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .slice(0, 18)
                .map(toCategory);
        }
        const tokenSet = new Map();
        selections.forEach((item) => {
            tokenize(item.name).forEach((token) => {
                tokenSet.set(token, (tokenSet.get(token) || 0) + 1);
            });
        });
        return relevant
            .map((genre) => {
                const tokens = tokenize(genre.name);
                const score = tokens.reduce((acc, token) => acc + (tokenSet.get(token) || 0), 0);
                return { category: toCategory(genre), score };
            })
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return a.category.name.localeCompare(b.category.name, 'pt-BR');
            })
            .slice(0, 18)
            .map((entry) => entry.category);
    };

    const getKeywordSuggestionEntries = () => state.suggestedKeywords
        .filter((entry) => entry && Number.isInteger(entry.id) && entry.id > 0 && entry.name)
        .map((entry) => ({ id: entry.id, name: entry.name, type: 'keyword' }));

    const createCategoryChip = (category, isActive, options = {}) => {
        const { isSuggestion = false } = options;
        const button = document.createElement('button');
        button.type = 'button';
        const type = category.type || 'genre';
        button.className = `genre-chip${isActive ? ' is-active' : ''}${type === 'keyword' ? ' genre-chip--keyword' : ''}`;
        button.dataset.categoryType = type;
        if (type === 'genre') {
            if (category.id) {
                button.dataset.genreId = String(category.id);
            }
        } else if (type === 'keyword') {
            if (category.id) {
                button.dataset.keywordId = String(category.id);
            }
        }
        if (category.name) {
            button.dataset.categoryName = category.name;
        }
        button.setAttribute('aria-pressed', String(Boolean(isActive)));
        button.title = isActive ? `Remover ${category.name}` : `Adicionar ${category.name}`;
        button.setAttribute('aria-label', button.title);

        const label = document.createElement('span');
        label.className = 'genre-chip__label';
        label.textContent = category.name;

        const icon = document.createElement('span');
        icon.className = 'genre-chip__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = isActive ? '×' : '+';

        if (isSuggestion) {
            button.classList.add('genre-chip--suggestion');
        }

        button.append(label, icon);
        return button;
    };

    const renderHeroChips = () => {
        if (!elements.heroSelected) {
            return;
        }
        const container = elements.heroSelected;
        container.innerHTML = '';
        const selected = getCombinedSelections();
        const seen = new Set();
        const suggestions = [];

        const pushSuggestion = (item) => {
            if (!item || !item.id || !item.name) {
                return;
            }
            const key = `${item.type || 'genre'}-${item.id}`;
            if (seen.has(key)) {
                return;
            }
            if (item.type === 'genre' && state.selectedGenres.has(item.id)) {
                return;
            }
            if (item.type === 'keyword' && state.selectedKeywords.has(item.id)) {
                return;
            }
            seen.add(key);
            suggestions.push(item);
        };

        const genreSuggestions = computeSuggestedGenres();
        const keywordSuggestions = getKeywordSuggestionEntries();
        const maxLength = Math.max(genreSuggestions.length, keywordSuggestions.length);
        for (let index = 0; index < maxLength; index += 1) {
            if (index < genreSuggestions.length) {
                pushSuggestion(genreSuggestions[index]);
            }
            if (index < keywordSuggestions.length) {
                pushSuggestion(keywordSuggestions[index]);
            }
        }

        if (!selected.length && !suggestions.length) {
            const span = document.createElement('span');
            span.className = 'genre-hero__placeholder';
            span.textContent = 'Escolha ou combine categorias para ver recomendações personalizadas.';
            container.appendChild(span);
            return;
        }

        selected.forEach((category) => {
            container.appendChild(createCategoryChip(category, true));
        });

        suggestions.slice(0, 24).forEach((category) => {
            container.appendChild(createCategoryChip(category, false, { isSuggestion: true }));
        });
    };

    const KEYWORD_SAMPLE_SIZE = 8;
    const KEYWORD_SUGGESTION_LIMIT = 20;

    const fetchKeywordsForTitle = async (item, signal) => {
        if (!item || !item.id) {
            return [];
        }
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const cacheKey = `${mediaType}-${item.id}`;
        if (state.titleKeywordCache.has(cacheKey)) {
            return state.titleKeywordCache.get(cacheKey);
        }
        const endpoint = mediaType === 'tv'
            ? `https://api.themoviedb.org/3/tv/${item.id}/keywords`
            : `https://api.themoviedb.org/3/movie/${item.id}/keywords`;
        const url = `${endpoint}?api_key=${API_KEY}`;
        try {
            const response = await fetch(url, { signal });
            if (!response.ok) {
                throw new Error(`Erro ao carregar palavras-chave de ${mediaType} ${item.id} (HTTP ${response.status})`);
            }
            const data = await response.json();
            const list = mediaType === 'tv' ? data.results : data.keywords;
            const keywords = Array.isArray(list)
                ? list
                    .filter((entry) => entry && Number.isInteger(entry.id) && entry.id > 0 && entry.name)
                    .map((entry) => ({ id: entry.id, name: entry.name }))
                : [];
            state.titleKeywordCache.set(cacheKey, keywords);
            return keywords;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error(error);
            state.titleKeywordCache.set(cacheKey, []);
            return [];
        }
    };

    const loadKeywordSuggestions = async (items, token, signal) => {
        if (token !== state.keywordToken) {
            return state.suggestedKeywords.slice();
        }
        if (!items.length) {
            return [];
        }
        const sample = items.slice(0, KEYWORD_SAMPLE_SIZE);
        try {
            const keywordLists = await Promise.all(sample.map((item) => fetchKeywordsForTitle(item, signal)));
            if (token !== state.keywordToken) {
                return state.suggestedKeywords.slice();
            }
            const counts = new Map();
            keywordLists.forEach((list) => {
                list.forEach((keyword) => {
                    if (!keyword || !keyword.id || !keyword.name) {
                        return;
                    }
                    state.keywordData.set(keyword.id, { id: keyword.id, name: keyword.name });
                    const entry = counts.get(keyword.id) || { id: keyword.id, name: keyword.name, count: 0 };
                    entry.count += 1;
                    counts.set(keyword.id, entry);
                });
            });
            return Array.from(counts.values())
                .filter((entry) => !state.selectedKeywords.has(entry.id))
                .sort((a, b) => {
                    if (b.count !== a.count) {
                        return b.count - a.count;
                    }
                    return a.name.localeCompare(b.name, 'pt-BR');
                })
                .slice(0, KEYWORD_SUGGESTION_LIMIT)
                .map((entry) => ({ id: entry.id, name: entry.name }));
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            console.error(error);
            if (token === state.keywordToken) {
                return [];
            }
            return state.suggestedKeywords.slice();
        }
    };

    const syncMediaFilterButtons = () => {
        if (!elements.mediaFilter) {
            return;
        }
        elements.mediaFilter.querySelectorAll('[data-media-filter]').forEach((button) => {
            const value = button.dataset.mediaFilter;
            const isActive = value === state.mediaType;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    };

    const getGenresForMedia = (mediaType) => {
        const list = [];
        state.selectedGenres.forEach((id) => {
            const entry = state.allGenres.get(id);
            if (!entry) {
                return;
            }
            if (mediaType === 'movie' && !entry.mediaTypes.has('movie')) {
                return;
            }
            if (mediaType === 'tv' && !entry.mediaTypes.has('tv')) {
                return;
            }
            list.push(id);
        });
        return list;
    };

    const buildDiscoverParams = (mediaType, page) => {
        const params = new URLSearchParams({
            api_key: API_KEY,
            language: 'pt-BR',
            sort_by: mapSortForMedia(state.sortBy, mediaType),
            include_adult: 'false',
            page: String(page)
        });
        const genreList = getGenresForMedia(mediaType);
        if (genreList.length) {
            params.set('with_genres', genreList.join(','));
        }
        const keywordList = Array.from(state.selectedKeywords).filter((id) => Number.isInteger(id) && id > 0);
        if (keywordList.length) {
            params.set('with_keywords', keywordList.join(','));
        }
        if (mediaType === 'movie') {
            params.set('include_video', 'false');
            if (state.year) {
                params.set('primary_release_year', state.year);
            }
        } else {
            params.set('include_null_first_air_dates', 'false');
            if (state.year) {
                params.set('first_air_date_year', state.year);
            }
        }
        if (state.sortBy === 'vote_average.desc') {
            params.set('vote_count.gte', mediaType === 'tv' ? '100' : '200');
        }
        return params;
    };

    const fetchDiscover = async (mediaType, signal) => {
        const requests = Array.from({ length: POPULARITY_PAGES }, (_, index) => {
            const params = buildDiscoverParams(mediaType, index + 1);
            const endpoint = mediaType === 'tv' ? 'discover/tv' : 'discover/movie';
            const url = `https://api.themoviedb.org/3/${endpoint}?${params.toString()}`;
            return fetch(url, { signal }).then((response) => {
                if (!response.ok) {
                    throw new Error(`Erro ao carregar ${mediaType} (HTTP ${response.status})`);
                }
                return response.json();
            });
        });
        const pages = await Promise.all(requests);
        const items = [];
        pages.forEach((page) => {
            (page.results || []).forEach((item) => {
                if (item && item.id) {
                    items.push({ ...item, media_type: mediaType });
                }
            });
        });
        return items;
    };

    const compareTitles = (a, b) => {
        switch (state.sortBy) {
            case 'vote_average.desc': {
                const scoreDiff = (b.vote_average || 0) - (a.vote_average || 0);
                if (scoreDiff !== 0) {
                    return scoreDiff;
                }
                return (b.vote_count || 0) - (a.vote_count || 0);
            }
            case 'primary_release_date.desc': {
                const dateA = Date.parse(a.release_date || a.first_air_date || 0) || 0;
                const dateB = Date.parse(b.release_date || b.first_air_date || 0) || 0;
                if (dateA !== dateB) {
                    return dateB - dateA;
                }
                return (b.popularity || 0) - (a.popularity || 0);
            }
            case 'popularity.desc':
            default:
                return (b.popularity || 0) - (a.popularity || 0);
        }
    };

    const renderTitles = (items) => {
        if (!elements.grid) {
            return;
        }
        const validItems = items
            .filter((item) => item && item.poster_path && item.primaryWatchProvider)
            .slice(0, MAX_RESULTS);
        if (!validItems.length) {
            elements.grid.innerHTML = '';
            updateResultsCount(0);
            updateResultsCaption(0);
            setEmptyState(hasAnySelection() ? 'no-results' : 'no-selection');
            return;
        }
        setEmptyState('hidden');
        updateResultsCount(validItems.length);
        updateResultsCaption(validItems.length);
        const fragment = document.createDocumentFragment();
        validItems.forEach((item) => {
            const posterUrl = buildImageUrl(item.poster_path, POSTER_SIZE);
            const title = item.title || item.name || 'Título indisponível';
            const year = (item.release_date || item.first_air_date || '').slice(0, 4) || '-';
            const typeLabel = item.media_type === 'tv' ? 'Série' : 'Filme';
            const detailUrl = new URL('filme.php', window.location.href);
            detailUrl.searchParams.set('id', item.id);
            detailUrl.searchParams.set('type', item.media_type === 'tv' ? 'tv' : 'movie');
            detailUrl.searchParams.set('title', title);
            const provider = item.primaryWatchProvider;
            const providerWatchUrl = resolveProviderWatchUrl(provider) || provider?.link || '';
            
            const card = document.createElement('article');
            card.className = 'media-card';
            card.dataset.mediaType = item.media_type;
            card.dataset.detailUrl = detailUrl.pathname + detailUrl.search;
            card.tabIndex = 0;

            const figure = document.createElement('figure');
            figure.className = 'media-card__poster';

            const img = document.createElement('img');
            img.src = posterUrl;
            img.alt = `Poster de ${title}`;
            img.loading = 'lazy';

            const figcaption = document.createElement('figcaption');
            figcaption.className = 'media-card__overlay';

            const badge = document.createElement('span');
            badge.className = 'media-card__badge';
            badge.textContent = typeLabel;

            const heading = document.createElement('h3');
            heading.className = 'media-card__title';
            heading.textContent = title;

            const yearEl = document.createElement('span');
            yearEl.className = 'media-card__year';
            yearEl.textContent = year;

            let watchButton = null;
            if (provider && providerWatchUrl) {
                watchButton = document.createElement('button');
                watchButton.type = 'button';
                watchButton.className = 'media-card__watch-link';
                watchButton.dataset.watchUrl = providerWatchUrl;
                if (provider.name) {
                    watchButton.dataset.providerName = provider.name;
                }

                const watchLabel = document.createElement('span');
                watchLabel.textContent = 'Assistir em';
                watchButton.appendChild(watchLabel);

                if (provider.logo) {
                    const logo = document.createElement('img');
                    logo.src = provider.logo;
                    logo.alt = provider.name ? provider.name : 'Provedor de streaming';
                    logo.loading = 'lazy';
                    watchButton.appendChild(logo);
                } else if (provider.name) {
                    const providerName = document.createElement('strong');
                    providerName.textContent = provider.name;
                    watchButton.appendChild(providerName);
                }
            }

            const hint = document.createElement('span');
            hint.className = 'media-card__detail-hint';
            hint.textContent = 'Ver detalhes';

            figcaption.append(badge, heading, yearEl);
            if (watchButton) {
                figcaption.appendChild(watchButton);
            }
            figcaption.appendChild(hint);
            figure.append(img, figcaption);
            card.appendChild(figure);

            card.addEventListener('click', (event) => {
                if (event.target.closest('[data-watch-url]')) {
                    return;
                }
                window.location.assign(card.dataset.detailUrl);
            });
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.target.closest('[data-watch-url]')) {
                    window.location.assign(card.dataset.detailUrl);
                }
            });
            fragment.appendChild(card);
        });
        elements.grid.innerHTML = '';
        elements.grid.appendChild(fragment);
    };

    const fetchTitles = async () => {
        const token = ++state.fetchToken;
        const keywordToken = ++state.keywordToken;
        const providerToken = ++state.providerToken;

        if (state.currentFetchController) {
            state.currentFetchController.abort();
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        if (controller) {
            state.currentFetchController = controller;
        }

        if (!hasAnySelection()) {
            state.suggestedKeywords = [];
            renderHeroChips();
            setLoading(false);
            renderTitles([]);
            if (controller && state.currentFetchController === controller) {
                state.currentFetchController = null;
            }
            return;
        }

        const cacheKey = buildCacheKey();
        const cachedEntry = cacheKey ? state.resultsCache.get(cacheKey) : null;
        const cacheIsFresh = cachedEntry ? (Date.now() - cachedEntry.timestamp) < CACHE_TTL : false;

        if (cachedEntry) {
            applyCacheEntry(cachedEntry);
        }

        if (cacheIsFresh) {
            setLoading(false);
            if (controller && state.currentFetchController === controller) {
                state.currentFetchController = null;
            }
            return;
        }

        setLoading(true, { mode: cachedEntry ? 'updating' : 'loading' });

        try {
            const requests = [];
            if (state.mediaType === 'movie' || state.mediaType === 'both') {
                requests.push(fetchDiscover('movie', controller?.signal));
            }
            if (state.mediaType === 'tv' || state.mediaType === 'both') {
                requests.push(fetchDiscover('tv', controller?.signal));
            }
            const results = await Promise.all(requests);
            if (token !== state.fetchToken) {
                return;
            }
            const unique = new Map();
            results.forEach((list) => {
                list.forEach((item) => {
                    const key = `${item.media_type}-${item.id}`;
                    if (!unique.has(key)) {
                        unique.set(key, item);
                    }
                });
            });
            const combined = Array.from(unique.values())
                .sort(compareTitles)
                .slice(0, MAX_RESULTS);
            const withPoster = combined.filter((item) => item.poster_path);
            const enriched = await enrichWithProviders(withPoster, providerToken, controller?.signal);
            if (token !== state.fetchToken || providerToken !== state.providerToken) {
                return;
            }
            renderTitles(enriched);
            const availableForKeywords = enriched.filter((item) => item.primaryWatchProvider);
            const suggestions = await loadKeywordSuggestions(availableForKeywords, keywordToken, controller?.signal);
            if (token !== state.fetchToken || keywordToken !== state.keywordToken) {
                return;
            }
            state.suggestedKeywords = Array.isArray(suggestions) ? suggestions : [];
            state.suggestedKeywords.forEach((entry) => {
                state.keywordData.set(entry.id, { id: entry.id, name: entry.name });
            });
            renderHeroChips();
            if (cacheKey) {
                commitCacheEntry(cacheKey, enriched, state.suggestedKeywords);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }
            console.error(error);
            if (token === state.fetchToken && !cachedEntry) {
                renderTitles([]);
                setEmptyState('error');
                state.suggestedKeywords = [];
                renderHeroChips();
            }
        } finally {
            if (token === state.fetchToken) {
                setLoading(false);
            }
            if (controller && state.currentFetchController === controller) {
                state.currentFetchController = null;
            }
        }
    };

    const updateQueryString = () => {
        const next = new URL(window.location.href);
        if (state.selectedGenres.size) {
            next.searchParams.set('genres', Array.from(state.selectedGenres).join(','));
            const labels = Array.from(state.selectedGenres).map(getGenreName).join('|');
            next.searchParams.set('labels', labels);
        } else {
            next.searchParams.delete('genres');
            next.searchParams.delete('labels');
        }
        if (state.selectedKeywords.size) {
            next.searchParams.set('keywords', Array.from(state.selectedKeywords).join(','));
            const keywordLabels = getSelectedKeywordEntries().map((entry) => entry.name).join('|');
            if (keywordLabels) {
                next.searchParams.set('keywordLabels', keywordLabels);
            } else {
                next.searchParams.delete('keywordLabels');
            }
        } else {
            next.searchParams.delete('keywords');
            next.searchParams.delete('keywordLabels');
        }
        if (state.mediaType && state.mediaType !== 'both') {
            next.searchParams.set('mediaType', state.mediaType);
        } else {
            next.searchParams.delete('mediaType');
        }
        if (state.sortBy && state.sortBy !== DEFAULT_SORT) {
            next.searchParams.set('sortBy', state.sortBy);
        } else {
            next.searchParams.delete('sortBy');
        }
        if (state.year) {
            next.searchParams.set('year', state.year);
        } else {
            next.searchParams.delete('year');
        }
        window.history.replaceState({}, document.title, `${next.pathname}${next.search}`);
    };

    const setMediaType = (value) => {
        if (!value || !['movie', 'tv', 'both'].includes(value) || state.mediaType === value) {
            syncMediaFilterButtons();
            return;
        }
        state.mediaType = value;
        syncMediaFilterButtons();
        populateGenreOptions();
        renderHeroChips();
        updateHeroSubtitle();
        updateQueryString();
        fetchTitles();
    };

    const setYear = (value) => {
        if (state.year === value) {
            updateDropdownLabel('year');
            return;
        }
        state.year = value;
        populateYearOptions();
        updateQueryString();
        fetchTitles();
    };

    const setSort = (value) => {
        const nextValue = value || DEFAULT_SORT;
        if (state.sortBy === nextValue) {
            updateDropdownLabel('sort');
            return;
        }
        state.sortBy = nextValue;
        populateSortOptions();
        updateQueryString();
        fetchTitles();
    };

    const toggleGenre = (id) => {
        if (!id) {
            return;
        }
        const numericId = Number.parseInt(id, 10);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            return;
        }
        if (state.selectedGenres.has(numericId)) {
            state.selectedGenres.delete(numericId);
        } else {
            state.selectedGenres.add(numericId);
        }
        populateGenreOptions();
        renderHeroChips();
        updateHeroSubtitle();
        updateQueryString();
        fetchTitles();
    };

    const toggleKeyword = (id, fallbackName = '') => {
        if (!id) {
            return;
        }
        const numericId = Number.parseInt(id, 10);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            return;
        }
        const refreshUi = () => {
            renderHeroChips();
            updateHeroSubtitle();
            updateQueryString();
        };
        if (state.selectedKeywords.has(numericId)) {
            state.selectedKeywords.delete(numericId);
            refreshUi();
            fetchTitles();
            return;
        }
        state.selectedKeywords.add(numericId);
        if (fallbackName) {
            state.keywordData.set(numericId, { id: numericId, name: fallbackName });
        }
        if (state.initialKeywordLabels.has(numericId) && !state.keywordData.has(numericId)) {
            state.keywordData.set(numericId, { id: numericId, name: state.initialKeywordLabels.get(numericId) });
        }
        refreshUi();
        fetchTitles();
        ensureKeywordDetails([numericId])
            .then(refreshUi)
            .catch((error) => console.error(error));
    };

    const resetGenres = () => {
        if (!state.selectedGenres.size) {
            return;
        }
        state.selectedGenres.clear();
        populateGenreOptions();
        renderHeroChips();
        updateHeroSubtitle();
        updateQueryString();
        fetchTitles();
    };

    const selectFilterOption = (key, value) => {
        switch (key) {
            case 'genre':
                toggleGenre(value);
                break;
            case 'year':
                setYear(value);
                break;
            case 'sort':
                setSort(value);
                break;
            default:
                break;
        }
        if (key !== 'genre') {
            closeDropdownMenu();
        }
    };

    const resetFilter = (key) => {
        switch (key) {
            case 'genre':
                resetGenres();
                break;
            case 'year':
                setYear('');
                break;
            case 'sort':
                setSort(DEFAULT_SORT);
                break;
            default:
                break;
        }
        closeDropdownMenu();
    };

    const handleDocumentClick = (event) => {
        if (!openDropdownKey) {
            return;
        }
        const dropdown = dropdowns[openDropdownKey];
        if (!dropdown?.container) {
            return;
        }
        if (dropdown.container.contains(event.target)) {
            return;
        }
        closeDropdownMenu();
    };

    document.addEventListener('click', handleDocumentClick);

    document.addEventListener('click', (event) => {
        const watchButton = event.target.closest('[data-watch-url]');
        if (!watchButton) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const targetUrl = watchButton.dataset.watchUrl || '';
        if (targetUrl) {
            window.location.assign(targetUrl);
        }
    });

    dropdownKeys.forEach((key) => {
        const dropdown = dropdowns[key];
        if (!dropdown) {
            return;
        }
        if (dropdown.trigger) {
            dropdown.trigger.addEventListener('click', (event) => {
                event.preventDefault();
                toggleDropdownMenu(key);
            });
        }
        if (dropdown.options) {
            dropdown.options.addEventListener('click', (event) => {
                const target = event.target.closest('.filter-option');
                if (!target) {
                    return;
                }
                const value = target.dataset.optionValue || '';
                const optionKey = target.dataset.dropdownKey || key;
                selectFilterOption(optionKey, value);
            });
        }
        if (dropdown.reset) {
            dropdown.reset.addEventListener('click', (event) => {
                event.preventDefault();
                resetFilter(key);
            });
        }
    });

    if (elements.mediaFilter) {
        elements.mediaFilter.addEventListener('click', (event) => {
            const button = event.target.closest('[data-media-filter]');
            if (!button) {
                return;
            }
            setMediaType(button.dataset.mediaFilter);
        });
    }

    const chipContainerEvents = (container) => {
        if (!container) {
            return;
        }
        container.addEventListener('click', (event) => {
            const button = event.target.closest('.genre-chip');
            if (!button) {
                return;
            }
            const type = button.dataset.categoryType || 'genre';
            if (type === 'keyword') {
                toggleKeyword(button.dataset.keywordId, button.dataset.categoryName || '');
            } else {
                toggleGenre(button.dataset.genreId);
            }
        });
    };

    chipContainerEvents(elements.heroSelected);

    const fetchGenreLists = async () => {
        const fetchList = async (type) => {
            const url = `https://api.themoviedb.org/3/genre/${type}/list?api_key=${API_KEY}&language=pt-BR`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erro ao carregar gêneros de ${type} (HTTP ${response.status})`);
            }
            const data = await response.json();
            return Array.isArray(data.genres) ? data.genres : [];
        };
        const [movieGenres, tvGenres] = await Promise.all([fetchList('movie'), fetchList('tv')]);
        const map = new Map();
        const register = (list, mediaType) => {
            list.forEach((genre) => {
                const existing = map.get(genre.id) || { id: genre.id, name: genre.name, mediaTypes: new Set() };
                existing.name = genre.name;
                existing.mediaTypes.add(mediaType);
                map.set(genre.id, existing);
            });
        };
        register(movieGenres, 'movie');
        register(tvGenres, 'tv');
        state.allGenres = map;
    };

    const initialize = async () => {
        try {
            await fetchGenreLists();
        } catch (error) {
            console.error(error);
        }
        try {
            await ensureKeywordDetails(Array.from(state.selectedKeywords));
        } catch (error) {
            console.error(error);
        }
        syncMediaFilterButtons();
        populateGenreOptions();
        populateYearOptions();
        populateSortOptions();
        renderHeroChips();
        updateHeroSubtitle();
        updateQueryString();
        fetchTitles();
    };

    initialize();
})();

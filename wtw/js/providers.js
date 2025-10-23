(function () {
    const API_KEY = 'dc3b4144ae24ddabacaeda024ff0585c';
    const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
    const PROVIDER_LOGO_SIZE = 'w92';
    const POSTER_SIZE = 'w500';
    const POPULARITY_PAGES = 5;
    const MAX_RESULTS = 100;
    const REGION = 'BR';
    const MONETIZATION = 'flatrate|ads|free|rent|buy';

    const elements = {
        root: document.querySelector('[data-providers-root]'),
        rail: document.getElementById('providersRail'),
        grid: document.getElementById('providersGrid'),
        emptyState: document.getElementById('providersEmptyState'),
        emptyStateTitle: document.querySelector('#providersEmptyState h3'),
        emptyStateDescription: document.querySelector('#providersEmptyState p'),
        loading: document.getElementById('providersLoading'),
        resultsCount: document.getElementById('providersResultsCount'),
        resultsCaption: document.getElementById('providersResultsCaption'),
        heroSubtitle: document.getElementById('providersHeroSubtitle'),
        mediaFilter: document.querySelector('[data-filter-media]'),
        railPrev: document.querySelector('[data-rail-prev]'),
        railNext: document.querySelector('[data-rail-next]')
    };

    if (!elements.root) {
        return;
    }

    const defaultResultsCaption = elements.resultsCaption
        ? elements.resultsCaption.textContent.trim()
        : '';
    const loadingCaption = 'Buscando destaques personalizados...';

    if (elements.loading) {
        elements.loading.setAttribute('aria-hidden', 'true');
        elements.loading.setAttribute('aria-busy', 'false');
    }

    const PROVIDERS_SKELETON_CARDS = 8;
    let clearLoadingSkeleton = null;

    const createSkeletonCard = () => {
        const card = document.createElement('article');
        card.className = 'providers-skeleton-card';
        card.innerHTML = `
            <div class="providers-skeleton-card__poster skeleton-block"></div>
            <div class="providers-skeleton-card__meta">
                <span class="skeleton-block skeleton-chip"></span>
                <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                <span class="skeleton-block skeleton-line skeleton-line--md"></span>
                <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
                <div class="providers-skeleton-card__chips">
                    <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                    <span class="skeleton-block skeleton-chip"></span>
                </div>
                <span class="skeleton-block skeleton-button skeleton-button--primary providers-skeleton-card__cta"></span>
            </div>
        `;
        return card;
    };

    const applyProvidersSkeleton = () => {
        if (!elements.grid) {
            return () => {};
        }

        const fragment = document.createDocumentFragment();
        for (let index = 0; index < PROVIDERS_SKELETON_CARDS; index += 1) {
            fragment.appendChild(createSkeletonCard());
        }

        elements.grid.dataset.loadingSkeleton = 'providers';
        elements.grid.classList.add('is-loading');
        elements.grid.setAttribute('aria-busy', 'true');
        elements.grid.replaceChildren(fragment);

        return () => {
            if (!elements.grid || elements.grid.dataset.loadingSkeleton !== 'providers') {
                return;
            }
            elements.grid.classList.remove('is-loading');
            elements.grid.removeAttribute('data-loading-skeleton');
            elements.grid.removeAttribute('aria-busy');
            elements.grid.innerHTML = '';
        };
    };

    const setupStickyRailSurface = () => {
        const railSurface = document.querySelector('.providers-hero__rail-surface');
        if (!railSurface) {
            return;
        }

        const parent = railSurface.parentElement;
        if (!parent) {
            return;
        }

        const sentinel = document.createElement('div');
        sentinel.className = 'providers-hero__rail-sentinel';
        sentinel.setAttribute('aria-hidden', 'true');
        parent.insertBefore(sentinel, railSurface);

        const placeholder = document.createElement('div');
        placeholder.className = 'providers-hero__rail-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        parent.insertBefore(placeholder, railSurface.nextSibling);

        const initialStyles = window.getComputedStyle(railSurface);
        const initialMarginTop = initialStyles.marginTop;
        const initialMarginBottom = initialStyles.marginBottom;

        const header = document.getElementById('menu');
        const offsetGap = 12;
        let isFixed = false;

        const getTopOffset = () => {
            if (!header) {
                return offsetGap;
            }
            const rect = header.getBoundingClientRect();
            const fallback = header.offsetHeight || 0;
            const base = rect.bottom > 0 ? rect.bottom : fallback;
            return base + offsetGap;
        };

        const updateFixedMetrics = () => {
            if (!isFixed) {
                return;
            }
            const referenceRect = placeholder.getBoundingClientRect();
            const surfaceRect = railSurface.getBoundingClientRect();
            placeholder.style.height = `${surfaceRect.height}px`;
            railSurface.style.width = `${referenceRect.width}px`;
            railSurface.style.left = `${referenceRect.left}px`;
            railSurface.style.top = `${getTopOffset()}px`;
        };

        const enableFixed = () => {
            if (isFixed) {
                updateFixedMetrics();
                return;
            }
            const surfaceRect = railSurface.getBoundingClientRect();
            placeholder.style.height = `${surfaceRect.height}px`;
            placeholder.style.display = 'block';
            placeholder.style.marginTop = initialMarginTop;
            placeholder.style.marginBottom = initialMarginBottom;

            railSurface.classList.add('providers-hero__rail-surface--fixed');
            railSurface.style.width = `${surfaceRect.width}px`;
            railSurface.style.left = `${surfaceRect.left}px`;
            railSurface.style.top = `${getTopOffset()}px`;
            isFixed = true;
        };

        const disableFixed = () => {
            if (!isFixed) {
                return;
            }
            isFixed = false;
            placeholder.style.display = 'none';
            placeholder.style.height = '';
            placeholder.style.marginTop = '';
            placeholder.style.marginBottom = '';
            railSurface.classList.remove('providers-hero__rail-surface--fixed');
            railSurface.style.width = '';
            railSurface.style.left = '';
            railSurface.style.top = '';
        };

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            if (entry.isIntersecting) {
                disableFixed();
            } else {
                enableFixed();
            }
        });

        observer.observe(sentinel);

        window.addEventListener('resize', updateFixedMetrics, { passive: true });
        window.addEventListener('scroll', updateFixedMetrics, { passive: true });
    };

    setupStickyRailSurface();

    const PROVIDER_POPULARITY_ORDER = [
        8,   // Netflix
        9,   // Prime Video
        337, // Disney+
        384, // HBO Max
        350, // Apple TV+
        531, // Paramount+
        746, // Star+
        10   // Google Play Movies
    ];
    const providerOrder = new Map();
    PROVIDER_POPULARITY_ORDER.forEach((id, index) => {
        if (!providerOrder.has(id)) {
            providerOrder.set(id, index);
        }
    });

    const providerDirectUrls = new Map([
        [8, 'https://www.netflix.com/'],
        [9, 'https://www.primevideo.com/'],
        [337, 'https://www.disneyplus.com/'],
        [384, 'https://play.max.com/'],
        [350, 'https://tv.apple.com/'],
        [531, 'https://www.paramountplus.com/'],
        [746, 'https://www.starplus.com/'],
        [10, 'https://play.google.com/store/movies'],
        [68, 'https://www.clarovideo.com/'],
        [384, 'https://play.max.com/'],
        [53, 'https://www.justwatch.com/'] // fallback example
    ]);

    const DEFAULT_SORT = 'popularity.desc';
    const SORT_OPTIONS = [
        { value: 'popularity.desc', label: 'Popularidade' },
        { value: 'vote_average.desc', label: 'Avaliacao' },
        { value: 'primary_release_date.desc', label: 'Mais recentes' }
    ];
    const sortLabelMap = new Map(SORT_OPTIONS.map((item) => [item.value, item.label]));

    const state = {
        providers: new Map(),
        genres: new Map(),
        selected: new Set(),
        mediaType: 'both',
        genreId: '',
        year: '',
        sortBy: DEFAULT_SORT,
        fetchToken: 0,
        availability: new Map()
    };

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

const scrollProviderRail = (direction = 'next') => {
    const rail = elements.rail;
    if (!rail) {
        return;
    }
    const step = Math.max(rail.clientWidth * 0.7, 220);
    const offset = direction === 'prev' ? -step : step;
    rail.scrollBy({ left: offset, behavior: 'smooth' });
};

const updateProviderRailNav = () => {
    const rail = elements.rail;
    if (!rail) {
        return;
    }
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const atStart = rail.scrollLeft <= 1;
    const atEnd = rail.scrollLeft >= maxScroll - 1;

    if (elements.railPrev) {
        elements.railPrev.disabled = atStart || !maxScroll;
    }
    if (elements.railNext) {
        elements.railNext.disabled = atEnd || !maxScroll;
    }

    rail.classList.toggle('has-overflow', maxScroll > 0);
    const railSurface = rail.parentElement;
    if (railSurface) {
        railSurface.classList.toggle('providers-hero__rail-surface--has-overflow', maxScroll > 0);
    }
};

    

    const resolveProviderWatchUrl = (provider) => {
        if (!provider) {
            return '';
        }
        if (providerDirectUrls.has(provider.id)) {
            return providerDirectUrls.get(provider.id);
        }
        const name = provider.name || 'streaming';
        return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
    };

    const normalize = (value) => (value || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const formatList = (items) => {
        if (!items.length) {
            return '';
        }
        if (items.length === 1) {
            return items[0];
        }
        return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
    };

    const buildImageUrl = (path, size) => (path ? `${IMAGE_BASE}${size}${path}` : '');

    const escapeHtml = (value) => (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const parseInitialProviders = () => {
        const params = new URLSearchParams(window.location.search);
        const list = (params.get('providers') || '').split(/[\s,;|]+/).map((token) => Number.parseInt(token, 10));
        return list.filter((value) => Number.isInteger(value) && value > 0);
    };

    const setLoading = (isLoading) => {
        if (!elements.grid) {
            return;
        }

        if (isLoading) {
            if (clearLoadingSkeleton) {
                clearLoadingSkeleton();
                clearLoadingSkeleton = null;
            }

            if (elements.resultsCaption) {
                elements.resultsCaption.textContent = loadingCaption;
            }
            if (elements.resultsCount) {
                elements.resultsCount.textContent = '...';
            }
            if (elements.loading) {
                elements.loading.hidden = true;
                elements.loading.setAttribute('aria-busy', 'true');
            }

            setEmptyState('hidden');
            clearLoadingSkeleton = applyProvidersSkeleton();
            return;
        }

        if (clearLoadingSkeleton) {
            clearLoadingSkeleton();
            clearLoadingSkeleton = null;
        } else {
            elements.grid.classList.remove('is-loading');
            elements.grid.removeAttribute('data-loading-skeleton');
            elements.grid.removeAttribute('aria-busy');
        }

        if (elements.loading) {
            elements.loading.hidden = true;
            elements.loading.setAttribute('aria-busy', 'false');
        }
    };


    const setEmptyState = (mode) => {
        if (!elements.emptyState || !elements.emptyStateTitle || !elements.emptyStateDescription) {
            return;
        }

        if (mode === 'hidden') {
            elements.emptyState.hidden = true;
            return;
        }

        elements.emptyState.hidden = false;

        if (mode === 'no-selection') {
            elements.emptyStateTitle.textContent = 'Selecione ao menos um provedor';
            elements.emptyStateDescription.textContent = 'Monte sua combinção clicando nas logos para ver conteudos disponiveis.';
        } else if (mode === 'no-results') {
            elements.emptyStateTitle.textContent = 'Nenhum titulo encontrado';
            elements.emptyStateDescription.textContent = 'Ajuste os filtros ou inclua outros provedores para ampliar os resultados.';
        } else if (mode === 'error') {
            elements.emptyStateTitle.textContent = 'Nao foi possivel carregar o catalogo';
            elements.emptyStateDescription.textContent = 'Verifique sua conexao e tente atualizar a pagina em instantes.';
        }
    };

    const updateHeroSubtitle = () => {
        if (!elements.heroSubtitle) {
            return;
        }

        const providerNames = Array.from(state.selected)
            .map((id) => state.providers.get(id))
            .filter(Boolean)
            .map((item) => item.name);

        const mediaLabel = state.mediaType === 'movie'
            ? 'filmes'
            : state.mediaType === 'tv'
                ? 'series'
                : 'filmes e series';

        const parts = [];
        if (state.genreId && state.genres.has(Number(state.genreId))) {
            parts.push(state.genres.get(Number(state.genreId)));
        }
        if (state.year) {
            parts.push(`lancados em ${state.year}`);
        }
        const filterText = parts.length ? ` focados em ${formatList(parts)}` : '';

        if (!providerNames.length) {
            elements.heroSubtitle.textContent = `Explorando ${mediaLabel} disponiveis em todos os provedores${filterText}.`;
            return;
        }

        elements.heroSubtitle.textContent = `Explorando ${mediaLabel} disponiveis em ${formatList(providerNames)}${filterText}.`;
    };

const updateResultsCaption = (count) => {
        if (!elements.resultsCaption) {
            return;
        }

        if (!count) {
            elements.resultsCaption.textContent = 'Nao encontramos titulos populares para esta combinacao de filtros.';
            return;
        }

        const providerNames = Array.from(state.selected)
            .map((id) => state.providers.get(id)?.name)
            .filter(Boolean);

        const mediaLabel = state.mediaType === 'movie'
            ? 'filmes'
            : state.mediaType === 'tv'
                ? 'series'
                : 'filmes e series';

        const filters = [];
        if (state.genreId && state.genres.has(Number(state.genreId))) {
            filters.push(state.genres.get(Number(state.genreId)));
        }
        if (state.year) {
            filters.push(`lancados em ${state.year}`);
        }

        const bullet = '\u2022';
        const separator = ` ${bullet} `;
        const filtersText = filters.length ? ` ${bullet} ${filters.join(separator)}` : '';

        const mediaLabelSentence = mediaLabel.charAt(0).toUpperCase() + mediaLabel.slice(1);
        if (providerNames.length) {
            elements.resultsCaption.textContent = `${mediaLabelSentence} disponiveis em ${formatList(providerNames)}${filtersText}.`;
        } else {
            elements.resultsCaption.textContent = `${mediaLabelSentence} disponiveis em todos os provedores${filtersText}.`;
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

    const createOptionButton = (key, value, label, isSelected) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `filter-option${isSelected ? ' is-selected' : ''}`;
        button.dataset.optionValue = value;
        button.dataset.dropdownKey = key;
        button.setAttribute('aria-pressed', String(isSelected));
        button.innerHTML = `
            <span class="filter-option__check" aria-hidden="true"></span>
            <span class="filter-option__label">${escapeHtml(label)}</span>
        `;
        return button;
    };

    const updateDropdownLabel = (key) => {
        const dropdown = dropdowns[key];
        if (!dropdown || !dropdown.valueEl) {
            return;
        }

        let text = dropdown.defaultValue || '';
        let isDefault = false;

        if (key === 'genre') {
            if (state.genreId) {
                text = state.genres.get(Number(state.genreId)) || dropdown.defaultValue || 'Todos';
                isDefault = false;
            } else {
                text = dropdown.defaultValue || 'Todos';
                isDefault = true;
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

    const populateGenreOptions = () => {
        const dropdown = dropdowns.genre;
        if (!dropdown || !dropdown.options) {
            return;
        }
        const container = dropdown.options;
        container.innerHTML = '';

        const options = [
            { value: '', label: 'Todos os generos' },
            ...Array.from(state.genres.entries())
                .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
                .map(([id, name]) => ({ value: String(id), label: name }))
        ];

        options.forEach(({ value, label }) => {
            container.appendChild(createOptionButton('genre', value, label, value === state.genreId));
        });

        updateDropdownLabel('genre');
    };

    const populateYearOptions = () => {
        const dropdown = dropdowns.year;
        if (!dropdown || !dropdown.options) {
            return;
        }
        const container = dropdown.options;
        container.innerHTML = '';

        const currentYear = new Date().getFullYear();
        const earliestYear = 1960;

        container.appendChild(createOptionButton('year', '', 'Todos os anos', state.year === ''));

        for (let year = currentYear; year >= earliestYear; year -= 1) {
            const value = String(year);
            container.appendChild(createOptionButton('year', value, value, state.year === value));
        }

        updateDropdownLabel('year');
    };

    const populateSortOptions = () => {
        const dropdown = dropdowns.sort;
        if (!dropdown || !dropdown.options) {
            return;
        }
        const container = dropdown.options;
        container.innerHTML = '';

        SORT_OPTIONS.forEach(({ value, label }) => {
            container.appendChild(createOptionButton('sort', value, label, state.sortBy === value));
        });

        updateDropdownLabel('sort');
    };

    const setGenre = (value) => {
        if (state.genreId === value) {
            updateDropdownLabel('genre');
            return;
        }
        state.genreId = value;
        populateGenreOptions();
        updateHeroSubtitle();
        fetchTitles();
    };

    const setYear = (value) => {
        if (state.year === value) {
            updateDropdownLabel('year');
            return;
        }
        state.year = value;
        populateYearOptions();
        updateHeroSubtitle();
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
        fetchTitles();
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

    const selectFilterOption = (key, value) => {
        switch (key) {
            case 'genre':
                setGenre(value);
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
        closeDropdownMenu();
    };

    const resetFilter = (key) => {
        switch (key) {
            case 'genre':
                setGenre('');
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
        if (!dropdown.container.contains(event.target)) {
            closeDropdownMenu();
        }
    };

    const handleDocumentKeydown = (event) => {
        if (event.key === 'Escape') {
            closeDropdownMenu();
        }
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeydown);

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

    const renderProviderRail = () => {
        if (!elements.rail) {
            return;
        }

        const providers = Array.from(state.providers.values())
            .sort((a, b) => {
                const selectedA = state.selected.has(a.id) ? 0 : 1;
                const selectedB = state.selected.has(b.id) ? 0 : 1;
                if (selectedA !== selectedB) {
                    return selectedA - selectedB;
                }
                const rankA = providerOrder.has(a.id) ? providerOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
                const rankB = providerOrder.has(b.id) ? providerOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
                if (rankA !== rankB) {
                    return rankA - rankB;
                }
                const priorityA = a.displayPriority ?? 1000;
                const priorityB = b.displayPriority ?? 1000;
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                return normalize(a.name).localeCompare(normalize(b.name));
            });

        const fragment = document.createDocumentFragment();

        providers.forEach((provider) => {
            const isSelected = state.selected.has(provider.id);
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.providerId = String(provider.id);
            button.className = `provider-pill${isSelected ? ' is-active' : ''}`;
            button.setAttribute('aria-pressed', String(isSelected));
            button.setAttribute('aria-label', isSelected ? `Remover ${provider.name}` : `Adicionar ${provider.name}`);
            button.title = isSelected ? `Remover ${provider.name}` : `Adicionar ${provider.name}`;

            const img = document.createElement('img');
            img.src = provider.logo || 'imagens/icon-cast.png';
            img.alt = provider.name;
            img.loading = 'lazy';
            button.appendChild(img);

            const sr = document.createElement('span');
            sr.className = 'sr-only';
            sr.textContent = isSelected ? `${provider.name} selecionado` : `Adicionar ${provider.name}`;
            button.appendChild(sr);

            fragment.appendChild(button);
        });

        elements.rail.innerHTML = '';
        elements.rail.appendChild(fragment);
        elements.rail.scrollLeft = 0;
        updateProviderRailNav();
    };

    const renderWatchCtaMarkup = (provider) => {
        if (!provider) {
            return '';
        }

        const providerLogo = provider.logo || '';
        const providerName = provider.name || 'provedor selecionado';
        const providerWatchUrl = resolveProviderWatchUrl(provider);

        return `
            <button type="button" class="media-card__watch-link" data-watch-url="${escapeHtml(providerWatchUrl)}" data-provider-name="${escapeHtml(providerName)}">
                <span>Assistir em</span>
                ${providerLogo ? `<img src="${escapeHtml(providerLogo)}" alt="${escapeHtml(providerName)}" loading="lazy">` : `<strong>${escapeHtml(providerName)}</strong>`}
            </button>
        `;
    };

    const selectProviderForAvailability = (availabilityMap, availabilityKey) => {
        const providerIds = availabilityMap.get(availabilityKey) || [];
        if (!providerIds.length) {
            return null;
        }

        const providers = providerIds
            .map((providerId) => state.providers.get(providerId))
            .filter(Boolean);

        if (!providers.length) {
            return null;
        }

        return providers.find((provider) => state.selected.has(provider.id))
            || providers[0]
            || null;
    };

    const applyAvailabilityToCard = (card, availabilityMap) => {
        if (!card) {
            return;
        }

        const availabilityKey = card.dataset.availabilityKey;
        const watchSlot = card.querySelector('[data-watch-slot]');
        if (!availabilityKey || !watchSlot) {
            return;
        }

        const providerForCta = selectProviderForAvailability(availabilityMap, availabilityKey);
        if (providerForCta) {
            watchSlot.innerHTML = renderWatchCtaMarkup(providerForCta);
            watchSlot.hidden = false;
        } else {
            watchSlot.innerHTML = '';
            watchSlot.hidden = true;
        }
    };

    const applyAvailabilityToRenderedTitles = (availabilityMap) => {
        if (!elements.grid) {
            return;
        }

        elements.grid.querySelectorAll('[data-availability-key]').forEach((card) => {
            applyAvailabilityToCard(card, availabilityMap);
        });
    };

    const renderTitles = (items) => {
        if (!elements.grid) {
            return;
        }

        if (!items.length) {
            elements.grid.innerHTML = '';
            setEmptyState('no-results');
            if (elements.resultsCount) {
                elements.resultsCount.textContent = '0 resultados';
            }
            updateResultsCaption(0);
            return;
        }

        setEmptyState('hidden');
        updateResultsCaption(items.length);
        if (elements.resultsCount) {
            elements.resultsCount.textContent = `${items.length} resultado${items.length === 1 ? '' : 's'}`;
        }

        const fragment = document.createDocumentFragment();

        items.forEach((item) => {
            const posterUrl = item.poster_path ? buildImageUrl(item.poster_path, POSTER_SIZE) : 'imagens/icon-cast.png';
            const title = item.title || item.name || 'Titulo indisponivel';
            const year = (item.release_date || item.first_air_date || '').slice(0, 4) || '-';
            const typeLabel = item.media_type === 'tv' ? 'Serie' : 'Filme';
            const detailUrl = new URL('WhereToWatch/wtw/filme.php', window.location.origin);
            detailUrl.searchParams.set('id', item.id);
            detailUrl.searchParams.set('type', item.media_type === 'tv' ? 'tv' : 'movie');
            const detailHref = detailUrl.pathname + detailUrl.search;

            const availabilityKey = `${item.media_type}-${item.id}`;

            const card = document.createElement('article');
            card.className = 'media-card';
            card.dataset.mediaType = item.media_type;
            card.dataset.detailUrl = detailHref;
            card.dataset.availabilityKey = availabilityKey;
            card.setAttribute('tabindex', '0');
            card.innerHTML = `
                <figure class="media-card__poster">
                    <img src="${escapeHtml(posterUrl)}" alt="${escapeHtml(`Poster de ${title}`)}" loading="lazy">
                    <figcaption class="media-card__overlay">
                        <span class="media-card__badge">${escapeHtml(typeLabel)}</span>
                        <h3 class="media-card__title">${escapeHtml(title)}</h3>
                        <span class="media-card__year">${escapeHtml(year)}</span>
                        <div class="media-card__watch-slot" data-watch-slot></div>
                        <span class="media-card__detail-hint">Ver detalhes</span>
                    </figcaption>
                </figure>
            `;

            applyAvailabilityToCard(card, state.availability);

            card.addEventListener('click', (event) => {
                if (event.target.closest('[data-watch-url]')) {
                    return;
                }
                window.location.assign(card.dataset.detailUrl);
            });
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    window.location.assign(card.dataset.detailUrl);
                }
            });

            fragment.appendChild(card);
        });

        elements.grid.innerHTML = '';
        elements.grid.appendChild(fragment);
    };

    const mapSortForMedia = (sort, mediaType) => {
        if (mediaType === 'tv' && sort === 'primary_release_date.desc') {
            return 'first_air_date.desc';
        }
        return sort;
    };

    const buildDiscoverParams = (mediaType, page) => {
        const params = new URLSearchParams({
            api_key: API_KEY,
            language: 'pt-BR',
            sort_by: mapSortForMedia(state.sortBy, mediaType),
            include_adult: 'false',
            watch_region: REGION,
            with_watch_monetization_types: MONETIZATION,
            page: String(page)
        });

        if (state.selected.size) {
            params.set('with_watch_providers', Array.from(state.selected).join('|'));
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

        if (state.genreId) {
            params.set('with_genres', String(state.genreId));
        }

        if (state.sortBy === 'vote_average.desc') {
            params.set('vote_count.gte', mediaType === 'tv' ? '100' : '200');
        }

        return params;
    };

    const fetchDiscover = async (mediaType) => {
        const requests = Array.from({ length: POPULARITY_PAGES }, (_, index) => {
            const params = buildDiscoverParams(mediaType, index + 1);
            const endpoint = mediaType === 'tv' ? 'discover/tv' : 'discover/movie';
            const url = `https://api.themoviedb.org/3/${endpoint}?${params.toString()}`;
            return fetch(url).then((response) => {
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

    const resetResultsHeader = (message = defaultResultsCaption) => {
        if (elements.resultsCount) {
            elements.resultsCount.textContent = '';
        }
        if (elements.resultsCaption) {
            elements.resultsCaption.textContent = message;
        }
    };

    const fetchTitles = async () => {
        const token = ++state.fetchToken;

        setLoading(true);

        try {
            const requests = [];
            const includeMovies = state.mediaType === 'movie' || state.mediaType === 'both';
            const includeTv = state.mediaType === 'tv' || state.mediaType === 'both';

            if (includeMovies) {
                requests.push(fetchDiscover('movie'));
            }
            if (includeTv) {
                requests.push(fetchDiscover('tv'));
            }

            if (!requests.length) {
                state.availability = new Map();
                setLoading(false);
                renderTitles([]);
                return;
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

            state.availability = new Map();
            setLoading(false);
            renderTitles(combined);

            const availability = await fetchAvailabilityForItems(combined);
            if (token !== state.fetchToken) {
                return;
            }

            state.availability = availability;
            applyAvailabilityToRenderedTitles(state.availability);
        } catch (error) {
            console.error(error);
            if (token !== state.fetchToken) {
                return;
            }
            state.availability = new Map();
            setLoading(false);
            if (elements.grid) {
                elements.grid.innerHTML = '';
            }
            resetResultsHeader('Nao foi possivel carregar os destaques agora. Tente novamente em instantes.');
            setEmptyState('error');
        } finally {
            if (token === state.fetchToken) {
                setLoading(false);
            }
        }
    };

    const addProvider = (id) => {
        if (!state.providers.has(id) || state.selected.has(id)) {
            return;
        }
        state.selected.add(id);
        renderProviderRail();
        updateHeroSubtitle();
        fetchTitles();
    };

    const removeProvider = (id) => {
        if (!state.selected.delete(id)) {
            return;
        }
        renderProviderRail();
        updateHeroSubtitle();
        fetchTitles();
    };

    const toggleProvider = (id) => {
        if (state.selected.has(id)) {
            removeProvider(id);
        } else {
            addProvider(id);
        }
    };

    const handleRailClick = (event) => {
        const button = event.target.closest('[data-provider-id]');
        if (!button) {
            return;
        }
        const id = Number.parseInt(button.dataset.providerId, 10);
        if (!Number.isInteger(id)) {
            return;
        }
        toggleProvider(id);
    };

    const handleMediaFilter = (event) => {
        const button = event.target.closest('[data-media-filter]');
        if (!button) {
            return;
        }
        const value = button.dataset.mediaFilter;
        if (!value || state.mediaType === value) {
            return;
        }
        state.mediaType = value;
        syncMediaFilterButtons();
        updateHeroSubtitle();
        fetchTitles();
    };

    const handleGenreChange = (event) => {
        state.genreId = event.target.value || '';
        updateHeroSubtitle();
        fetchTitles();
    };

    const handleYearChange = (event) => {
        state.year = event.target.value || '';
        updateHeroSubtitle();
        fetchTitles();
    };

    const handleSortChange = (event) => {
        state.sortBy = event.target.value || 'popularity.desc';
        fetchTitles();
    };

    const fetchProviderCatalog = async () => {
        const url = new URL('https://api.themoviedb.org/3/watch/providers/movie');
        url.search = new URLSearchParams({
            api_key: API_KEY,
            language: 'pt-BR',
            watch_region: REGION
        });

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Falha ao carregar provedores (${response.status})`);
        }
        const data = await response.json();

        (data.results || []).forEach((provider) => {
            const id = Number(provider.provider_id);
            if (!Number.isInteger(id)) {
                return;
            }
            state.providers.set(id, {
                id,
                name: provider.provider_name,
                logo: buildImageUrl(provider.logo_path, PROVIDER_LOGO_SIZE),
                displayPriority: provider.display_priority ?? provider.displayPriority ?? 1000
            });
        });
    };

    const fetchAvailabilityForItems = async (items) => {
        const availability = new Map();
        if (!items.length) {
            return availability;
        }

        const collectProviders = (payload) => {
            const providers = new Set();
            if (!payload) {
                return providers;
            }
            ['flatrate', 'ads', 'free', 'rent', 'buy'].forEach((category) => {
                (payload[category] || []).forEach((entry) => {
                    if (entry && Number.isInteger(entry.provider_id)) {
                        providers.add(entry.provider_id);
                    }
                });
            });
            return providers;
        };

        const tasks = items.map((item) => ({
            key: `${item.media_type}-${item.id}`,
            id: item.id,
            mediaType: item.media_type === 'tv' ? 'tv' : 'movie'
        }));

        const MAX_CONCURRENT = 8;
        let index = 0;

        const runWorker = async () => {
            while (index < tasks.length) {
                const currentIndex = index;
                index += 1;
                const { key, id, mediaType } = tasks[currentIndex];
                try {
                    const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers`);
                    url.search = new URLSearchParams({ api_key: API_KEY });
                    const response = await fetch(url.toString());
                    if (!response.ok) {
                        throw new Error(`Falha ao carregar provedores para ${mediaType} ${id} (${response.status})`);
                    }
                    const payload = await response.json();
                    const regionData = payload?.results?.[REGION];
                    const providers = collectProviders(regionData);
                    if (providers.size) {
                        availability.set(key, Array.from(providers));
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        };

        const workers = Array.from({ length: Math.min(MAX_CONCURRENT, tasks.length) }, runWorker);
        await Promise.all(workers);
        return availability;
    };

    const fetchGenres = async () => {
        const endpoints = [
            ['movie', 'genre/movie/list'],
            ['tv', 'genre/tv/list']
        ];

        const requests = endpoints.map(([, path]) => {
            const url = new URL(`https://api.themoviedb.org/3/${path}`);
            url.search = new URLSearchParams({
                api_key: API_KEY,
                language: 'pt-BR'
            });
            return fetch(url.toString()).then((response) => {
                if (!response.ok) {
                    throw new Error(`Falha ao carregar generos (${response.status})`);
                }
                return response.json();
            });
        });

        const results = await Promise.all(requests);
        results.forEach((payload) => {
            (payload.genres || []).forEach((genre) => {
                if (genre && Number.isInteger(genre.id)) {
                    state.genres.set(genre.id, genre.name);
                }
            });
        });
    };

    const init = async () => {
        if (elements.rail) {
            elements.rail.addEventListener('click', handleRailClick);
        }
        if (elements.mediaFilter) {
            elements.mediaFilter.addEventListener('click', handleMediaFilter);
        }
        if (elements.railPrev) {
            elements.railPrev.addEventListener('click', () => scrollProviderRail('prev'));
        }
        if (elements.railNext) {
            elements.railNext.addEventListener('click', () => scrollProviderRail('next'));
        }
        if (elements.rail) {
            elements.rail.addEventListener('scroll', updateProviderRailNav, { passive: true });
        }
        window.addEventListener('resize', updateProviderRailNav);

        updateProviderRailNav();

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
                    const option = event.target.closest('[data-option-value]');
                    if (!option) {
                        return;
                    }
                    event.preventDefault();
                    selectFilterOption(key, option.dataset.optionValue ?? '');
                });
            }
            if (dropdown.reset) {
                dropdown.reset.addEventListener('click', (event) => {
                    event.preventDefault();
                    resetFilter(key);
                });
            }
        });

        populateGenreOptions();
        populateYearOptions();
        populateSortOptions();

        const initialProviders = parseInitialProviders();

        try {
            await Promise.all([
                fetchProviderCatalog(),
                fetchGenres()
            ]);
        } catch (error) {
            console.error(error);
        }

        if (!state.providers.size) {
            setEmptyState('error');
            if (elements.resultsCount) {
                elements.resultsCount.textContent = '';
            }
            return;
        }

        if (initialProviders.length) {
            initialProviders.forEach((id) => {
                if (state.providers.has(id)) {
                    state.selected.add(id);
                }
            });
        }

        populateGenreOptions();
        populateYearOptions();
        populateSortOptions();
        syncMediaFilterButtons();
        renderProviderRail();
        updateHeroSubtitle();
        fetchTitles();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
















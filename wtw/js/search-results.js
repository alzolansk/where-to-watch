document.addEventListener('DOMContentLoaded', () => {
    const runtimeConfig = (typeof window !== 'undefined' && window.__WY_WATCH_CONFIG__) || {};
    const apiKey = runtimeConfig.tmdbApiKey || '';
    const tmdbBaseUrl = (runtimeConfig.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
    const tmdbEndpoint = (path) => `${tmdbBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const tmdbUrl = (path, params = {}) => {
        const url = new URL(tmdbEndpoint(path));
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }
            url.searchParams.set(key, value);
        });
        return url;
    };

    if (!apiKey) {
        console.warn('[WYWatch] TMDB API key não configurada – resultados de busca desativados.');
        return;
    }
    const initialQuery = (window.__INITIAL_SEARCH_QUERY__ || '').trim();
    const resultsGrid = document.querySelector('[data-search-results]');
    const resultsSection = document.querySelector('.search-results');
    const emptyState = document.querySelector('[data-search-empty]');
    const resultCount = document.querySelector('[data-result-count]');
    const searchTerm = document.querySelector('[data-search-term]');
    const resetButton = document.querySelector('[data-reset-filters]');
    const mediaButtons = document.querySelectorAll('[data-media-filter]');
    const genreButtons = document.querySelectorAll('[data-genre-option]');
    const releaseButtons = document.querySelectorAll('[data-release-option]');
    const sortButtons = document.querySelectorAll('[data-sort-option]');
    const filterSections = document.querySelectorAll('[data-filter-section]');
    const searchForm = document.querySelector('[data-search-form]');
    const searchField = document.querySelector('[data-search-field]');
    const clearSearchButton = document.querySelector('[data-search-clear]');

    if (!resultsGrid) {
        return;
    }

    const state = {
        query: initialQuery,
        media: 'both',
        genre: null,
        release: 'all',
        sort: 'popularity.desc',
        fuzzyActive: false,
    };

    const cache = {
        rawResults: [],
        availability: new Map(),
    };
    const availabilityCache = new Map();
    const availabilityRegion = 'BR';
    const SKELETON_CARD_COUNT = 12;

    const setEmptyStateContent = (titleText, descriptionText) => {
        if (!emptyState) {
            return;
        }
        const titleNode = emptyState.querySelector('h2');
        const descriptionNode = emptyState.querySelector('p');
        if (titleNode && typeof titleText === 'string') {
            titleNode.textContent = titleText;
        }
        if (descriptionNode && typeof descriptionText === 'string') {
            descriptionNode.textContent = descriptionText;
        }
    };

    const buildAvailabilityKey = (item) => {
        if (!item || typeof item.id === 'undefined') {
            return '';
        }
        const type = item.media_type === 'tv' ? 'tv' : 'movie';
        return `${type}-${item.id}`;
    };

    const collectProviderIds = (regionPayload) => {
        const providerIds = new Set();
        if (!regionPayload) {
            return providerIds;
        }
        ['flatrate', 'ads', 'free', 'rent', 'buy'].forEach((category) => {
            const entries = regionPayload[category];
            if (!Array.isArray(entries)) {
                return;
            }
            entries.forEach((entry) => {
                if (entry && Number.isInteger(entry.provider_id)) {
                    providerIds.add(entry.provider_id);
                }
            });
        });
        return providerIds;
    };

    const fetchAvailabilityForItems = async (items, { signal } = {}) => {
        const availability = new Map();
        if (!items.length) {
            return availability;
        }

        const queue = [];

        items.forEach((item) => {
            const key = buildAvailabilityKey(item);
            if (!key) {
                return;
            }
            const cached = availabilityCache.get(key);
            if (cached !== undefined) {
                if (Array.isArray(cached) && cached.length) {
                    availability.set(key, cached);
                }
                return;
            }
            queue.push({
                key,
                id: item.id,
                mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
            });
        });

        if (!queue.length) {
            return availability;
        }

        const MAX_CONCURRENT = 6;
        let index = 0;

        const runWorker = async () => {
            while (index < queue.length) {
                if (signal?.aborted) {
                    return;
                }
                const currentIndex = index;
                index += 1;
                const { key, id, mediaType } = queue[currentIndex];
                try {
                    const url = new URL(tmdbEndpoint(`/${mediaType}/${id}/watch/providers`));
                    url.search = new URLSearchParams({ api_key: apiKey });
                    const response = await fetch(url.toString(), { signal });
                    if (!response.ok) {
                        console.error(`Falha ao carregar provedores para ${mediaType} ${id}: ${response.status}`);
                        availabilityCache.set(key, []);
                        continue;
                    }
                    const payload = await response.json();
                    const results = payload && payload.results ? payload.results : null;
                    const regionPayload = results && results[availabilityRegion] ? results[availabilityRegion] : null;
                    const providers = Array.from(collectProviderIds(regionPayload));
                    availabilityCache.set(key, providers);
                    if (providers.length) {
                        availability.set(key, providers);
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return;
                    }
                    console.error('Erro ao consultar provedores:', error);
                    availabilityCache.set(key, []);
                }
            }
        };

        const workers = Array.from({ length: Math.min(MAX_CONCURRENT, queue.length) }, runWorker);
        await Promise.all(workers);
        return availability;
    };

    const filterItemsByAvailability = async (items, { signal } = {}) => {
        if (!items.length) {
            return { items: [], availability: new Map() };
        }
        const availability = await fetchAvailabilityForItems(items, { signal });
        const filteredItems = items.filter((item) => {
            const key = buildAvailabilityKey(item);
            return key && availability.has(key);
        });
        return { items: filteredItems, availability };
    };

    const hasCustomActiveChip = (section) => section.querySelector('.search-chip.is-active:not([data-default-active])') !== null;

    const syncFilterSectionIndicators = () => {
        filterSections.forEach((section) => {
            section.classList.toggle('has-active-filter', hasCustomActiveChip(section));
        });
    };

    const setupFilterSections = () => {
        filterSections.forEach((section) => {
            const toggle = section.querySelector('[data-filter-toggle]');
            const content = section.querySelector('[data-filter-content]');
            if (!toggle || !content) {
                return;
            }

            const setExpanded = (expanded) => {
                toggle.setAttribute('aria-expanded', String(expanded));
                section.classList.toggle('is-collapsed', !expanded);
                content.hidden = !expanded;
            };

            const initialExpanded = toggle.getAttribute('aria-expanded') === 'true' || hasCustomActiveChip(section);
            setExpanded(initialExpanded);

            toggle.addEventListener('click', () => {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                setExpanded(!isExpanded);
            });
        });
    };

    setupFilterSections();
    syncFilterSectionIndicators();

    const normalizeText = (value) => {
        if (!value) return '';
        let normalized = `${value}`;
        if (typeof normalized.normalize === 'function') {
            normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        return normalized
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const levenshtein = (source, target) => {
        if (source === target) {
            return 0;
        }
        if (!source) {
            return target.length;
        }
        if (!target) {
            return source.length;
        }

        const sourceLength = source.length;
        const targetLength = target.length;
        let previous = new Array(targetLength + 1);
        let current = new Array(targetLength + 1);

        for (let index = 0; index <= targetLength; index += 1) {
            previous[index] = index;
        }

        for (let i = 0; i < sourceLength; i += 1) {
            current[0] = i + 1;
            const sourceCode = source.charCodeAt(i);
            for (let j = 0; j < targetLength; j += 1) {
                const cost = sourceCode === target.charCodeAt(j) ? 0 : 1;
                const insertion = current[j] + 1;
                const deletion = previous[j + 1] + 1;
                const substitution = previous[j] + cost;
                current[j + 1] = Math.min(insertion, deletion, substitution);
            }
            [previous, current] = [current, previous];
        }

        return previous[targetLength];
    };

    const computeFuzzySimilarity = (query, target) => {
        if (!query || !target) {
            return 0;
        }
        const distance = levenshtein(query, target);
        const maxLength = Math.max(query.length, target.length);
        if (maxLength === 0) {
            return 1;
        }
        const similarity = 1 - distance / maxLength;
        return similarity < 0 ? 0 : similarity;
    };

    const computeItemFuzzyScore = (item, normalizedQuery) => {
        if (!normalizedQuery) {
            return 0;
        }
        const fields = [
            normalizeText(item.title || item.name || ''),
            normalizeText(item.original_title || item.original_name || ''),
            normalizeText(item.overview || ''),
        ];
        let best = 0;
        fields.forEach((field) => {
            if (!field) {
                return;
            }
            const similarity = computeFuzzySimilarity(normalizedQuery, field);
            if (similarity > best) {
                best = similarity;
            }
        });
        return best;
    };

    const buildQueryVariants = (query) => {
        const normalized = normalizeText(query);
        if (!normalized) {
            return [];
        }
        const variants = new Set();
        const tokens = normalized.split(' ').filter((token) => token.length >= 3);
        tokens.forEach((token) => variants.add(token));
        if (normalized.length >= 5) {
            variants.add(normalized.slice(0, -1));
        }
        if (normalized.length >= 6) {
            variants.add(normalized.slice(0, -2));
        }
        const collapsed = normalized.replace(/(.)\1+/g, '$1');
        if (collapsed.length >= 3) {
            variants.add(collapsed);
        }
        return Array.from(variants).slice(0, 4);
    };

    const dedupeItems = (items) => {
        const seen = new Set();
        const deduped = [];
        items.forEach((item) => {
            if (!item || typeof item.id === 'undefined') {
                return;
            }
            const mediaType = (item.media_type === 'tv' ? 'tv' : 'movie');
            const key = `${mediaType}-${item.id}`;
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            deduped.push(item);
        });
        return deduped;
    };

    let trendingCache = null;
    let resultsRequestToken = 0;
    let searchResultsController = null;
    const FUZZY_SIMILARITY_THRESHOLD = 0.35;

    const fetchTrendingCandidates = async ({ signal } = {}) => {
        if (trendingCache) {
            return trendingCache;
        }
        const endpoints = [
            tmdbEndpoint('/trending/movie/week'),
            tmdbEndpoint('/trending/tv/week'),
        ];
        const responses = await Promise.all(endpoints.map(async (endpoint) => {
            const url = new URL(endpoint);
            url.searchParams.set('api_key', apiKey);
            url.searchParams.set('language', 'pt-BR');
            try {
                const response = await fetch(url, { signal });
                if (!response.ok) {
                    return { results: [] };
                }
                return await response.json();
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw error;
                }
                return { results: [] };
            }
        }));

        const combined = [];
        responses.forEach((payload, index) => {
            const defaultType = index === 1 ? 'tv' : 'movie';
            (payload.results || []).forEach((item) => {
                const mediaType = item.media_type === 'tv' ? 'tv' : item.media_type === 'movie' ? 'movie' : defaultType;
                if (!item.media_type) {
                    item.media_type = mediaType;
                }
                combined.push(item);
            });
        });

        trendingCache = dedupeItems(combined).slice(0, 60);
        return trendingCache;
    };

    const fetchMultiSearch = async (query, pages = [1], { signal } = {}) => {
        const trimmed = (query || '').trim();
        if (!trimmed) {
            return [];
        }
        const promises = pages.map((page) => {
            const url = new URL(tmdbEndpoint('/search/multi'));
            url.searchParams.set('api_key', apiKey);
            url.searchParams.set('language', 'pt-BR');
            url.searchParams.set('include_adult', 'false');
            url.searchParams.set('page', page.toString());
            url.searchParams.set('query', trimmed);
            return fetch(url, { signal })
                .then((response) => (response.ok ? response.json() : { results: [] }))
                .catch((error) => {
                    if (error.name === 'AbortError') {
                        throw error;
                    }
                    return { results: [] };
                });
        });
        const responses = await Promise.all(promises);
        const collected = [];
        responses.forEach((payload) => {
            (payload.results || []).forEach((item) => {
                if (item.media_type !== 'movie' && item.media_type !== 'tv') {
                    return;
                }
                collected.push(item);
            });
        });
        return dedupeItems(collected);
    };

    const collectCandidatesWithFallback = async (query, { signal } = {}) => {
        const primary = await fetchMultiSearch(query, [1, 2, 3, 4, 5], { signal });
        if (primary.length) {
            return { items: primary.slice(0, 80), source: 'primary' };
        }

        const variants = buildQueryVariants(query);
        if (variants.length) {
            const fallback = [];
            for (const variant of variants) {
                if (signal?.aborted) {
                    break;
                }
                const entries = await fetchMultiSearch(variant, [1, 2], { signal });
                fallback.push(...entries);
            }
            const deduped = dedupeItems(fallback);
            if (deduped.length) {
                return { items: deduped.slice(0, 80), source: 'variants' };
            }
        }

        const trending = await fetchTrendingCandidates({ signal });
        return { items: trending.slice(0, 60), source: 'trending' };
    };

    const computeRelevanceScore = (item, normalizedQuery, queryTokens) => {
        if (!normalizedQuery) {
            item._wtwFuzzyScore = 0;
            return 0;
        }

        const candidates = [
            normalizeText(item.title || item.name || ''),
            normalizeText(item.original_title || item.original_name || ''),
            normalizeText(item.overview || ''),
        ];

        let score = 0;
        let bestFuzzy = 0;

        const evaluateCandidate = (target, baseWeight) => {
            if (!target) return;

            const fuzzy = computeFuzzySimilarity(normalizedQuery, target);
            if (fuzzy > bestFuzzy) {
                bestFuzzy = fuzzy;
            }

            if (target === normalizedQuery) {
                score += 1000 * baseWeight;
            } else if (target.startsWith(normalizedQuery)) {
                score += 600 * baseWeight;
            } else if (target.includes(normalizedQuery)) {
                score += 300 * baseWeight;
            }

            if (queryTokens.length) {
                const targetTokens = target.split(' ');
                const matched = queryTokens.filter((token) => targetTokens.includes(token)).length;
                if (matched) {
                    const coverage = matched / queryTokens.length;
                    score += coverage * 200 * baseWeight;
                }
            }

            if (fuzzy >= 0.85) {
                score += 450 * fuzzy * baseWeight;
            } else if (fuzzy >= 0.6) {
                score += 260 * fuzzy * baseWeight;
            } else if (fuzzy >= 0.35) {
                score += 120 * fuzzy * baseWeight;
            }
        };

        evaluateCandidate(candidates[0], 1);
        evaluateCandidate(candidates[1], 0.6);
        evaluateCandidate(candidates[2], 0.2);

        item._wtwFuzzyScore = bestFuzzy;

        return score;
    };

    const applyRelevanceScores = (items, query) => {
        const normalizedQuery = normalizeText(query);
        const queryTokens = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean) : [];
        items.forEach((item) => {
            item._searchRelevance = computeRelevanceScore(item, normalizedQuery, queryTokens);
        });
        return items;
    };

    const updateUrlQuery = (value) => {
        const url = new URL(window.location.href);
        if (value) {
            url.searchParams.set('q', value);
        } else {
            url.searchParams.delete('q');
        }
        window.history.replaceState({}, '', url.toString());
    };

    const syncSearchTerm = (value) => {
        if (searchTerm) {
            searchTerm.textContent = value || 'todo o cat\u00E1logo';
        }
    };

    const syncClearButton = () => {
        if (!clearSearchButton || !searchField) {
            return;
        }
        const hasValue = searchField.value.trim().length > 0;
        clearSearchButton.hidden = !hasValue;
    };

    const toggleActiveChip = (collection, activeValue, attr) => {
        collection.forEach((chip) => {
            const value = chip.getAttribute(attr);
            chip.classList.toggle('is-active', value === activeValue);
        });
    };

    const getReleaseYear = (item) => {
        const raw = item.release_date || item.first_air_date || '';
        if (!raw) return null;
        const year = parseInt(raw.slice(0, 4), 10);
        return Number.isNaN(year) ? null : year;
    };

    const releaseMatchers = {
        all: () => true,
        new: (year) => {
            if (!year) return false;
            const currentYear = new Date().getFullYear();
            return year >= currentYear - 1;
        },
        '2010s': (year) => year && year >= 2010 && year <= 2019,
        '2000s': (year) => year && year >= 2000 && year <= 2009,
        '90s': (year) => year && year >= 1990 && year <= 1999,
        '80s': (year) => year && year >= 1980 && year <= 1989,
        classic: (year) => year && year < 1980,
    };

    const sortComparators = {
        'popularity.desc': (a, b) => {
            const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
            if (popularityDiff !== 0) {
                return popularityDiff;
            }
            const relevanceDiff = (b._searchRelevance || 0) - (a._searchRelevance || 0);
            if (relevanceDiff !== 0) {
                return relevanceDiff;
            }
            const fuzzyDiff = (b._wtwFuzzyScore || 0) - (a._wtwFuzzyScore || 0);
            if (fuzzyDiff !== 0) {
                return fuzzyDiff;
            }
            return (b.vote_average || 0) - (a.vote_average || 0);
        },
        'release_date.desc': (a, b) => {
            const aDate = new Date(a.release_date || a.first_air_date || 0).getTime();
            const bDate = new Date(b.release_date || b.first_air_date || 0).getTime();
            return bDate - aDate;
        },
        'release_date.asc': (a, b) => {
            const aDate = new Date(a.release_date || a.first_air_date || 0).getTime();
            const bDate = new Date(b.release_date || b.first_air_date || 0).getTime();
            return aDate - bDate;
        },
        'vote_average.desc': (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
    };

    const getSortComparator = (sort, query) => {
        const baseComparator = sortComparators[sort] || sortComparators['popularity.desc'];
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) {
            return baseComparator;
        }
        if (sort !== 'popularity.desc') {
            return (a, b) => {
                const result = baseComparator(a, b);
                if (result !== 0) {
                    return result;
                }
                const relevanceDiff = (b._searchRelevance || 0) - (a._searchRelevance || 0);
                if (relevanceDiff !== 0) {
                    return relevanceDiff;
                }
                const fuzzyDiff = (b._wtwFuzzyScore || 0) - (a._wtwFuzzyScore || 0);
                if (fuzzyDiff !== 0) {
                    return fuzzyDiff;
                }
                return (b.popularity || 0) - (a.popularity || 0);
            };
        }
        return (a, b) => {
            const relevanceDiff = (b._searchRelevance || 0) - (a._searchRelevance || 0);
            if (relevanceDiff !== 0) {
                return relevanceDiff;
            }
            const fuzzyDiff = (b._wtwFuzzyScore || 0) - (a._wtwFuzzyScore || 0);
            if (fuzzyDiff !== 0) {
                return fuzzyDiff;
            }
            return baseComparator(a, b);
        };
    };

    const mediaLabel = {
        movie: 'Filme',
        tv: 'S\u00E9rie',
    };

    const genreMap = new Map([
        [28, 'A\u00E7\u00E3o'],
        [12, 'Aventura'],
        [16, 'Anima\u00E7\u00E3o'],
        [35, 'Com\u00E9dia'],
        [80, 'Crime'],
        [99, 'Document\u00E1rio'],
        [18, 'Drama'],
        [10751, 'Fam\u00EDlia'],
        [14, 'Fantasia'],
        [878, 'Fic\u00E7\u00E3o cient\u00EDfica'],
        [9648, 'Mist\u00E9rio'],
        [10749, 'Romance'],
        [53, 'Suspense'],
        [27, 'Terror'],
        [10759, 'A\u00E7\u00E3o e aventura'],
        [10762, 'Infantil'],
        [10765, 'Sci-Fi & Fantasia'],
        [10768, 'Guerra & Pol\u00EDtica'],
    ]);

    const buildCard = (item) => {
        const card = document.createElement('article');
        card.className = 'search-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', `Ver detalhes de ${item.title || item.name}`);

        const media = document.createElement('figure');
        media.className = 'search-card__media';
        const img = document.createElement('img');
        img.src = item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'imagens/icon-cast.png';
        img.alt = item.title || item.name || 'Sem t\u00EDtulo';
        img.loading = 'lazy';
        media.appendChild(img);

        const overlay = document.createElement('figcaption');
        overlay.className = 'search-card__overlay';

        const type = document.createElement('span');
        type.className = 'search-card__type';
        type.textContent = mediaLabel[item.media_type] || 'T\u00EDtulo';

        const title = document.createElement('h3');
        title.className = 'search-card__title';
        title.textContent = item.title || item.name || 'Sem t\u00EDtulo';

        const metaRow = document.createElement('div');
        metaRow.className = 'search-card__meta';
        const year = getReleaseYear(item);
        if (year) {
            const yearEl = document.createElement('span');
            yearEl.textContent = year.toString();
            metaRow.appendChild(yearEl);
        }
        const detailParts = [];
        if (item.vote_average) {
            detailParts.push(`${item.vote_average.toFixed(1)} \u2605`);
        }
        const genres = (item.genre_ids || [])
            .map((id) => genreMap.get(id))
            .filter(Boolean)
            .slice(0, 2);
        if (genres.length) {
            detailParts.push(genres.join(' \u2022 '));
        }
        if (detailParts.length) {
            const details = document.createElement('span');
            details.textContent = detailParts.join(' \u2022 ');
            metaRow.appendChild(details);
        }

        overlay.appendChild(type);
        overlay.appendChild(title);
        if (metaRow.children.length) {
            overlay.appendChild(metaRow);
        }
        const cta = document.createElement('span');
        cta.className = 'search-card__cta';
        cta.textContent = 'Ver detalhes';
        overlay.appendChild(cta);

        media.appendChild(overlay);
        card.appendChild(media);

        const availabilityKey = buildAvailabilityKey(item);
        if (availabilityKey && cache.availability.has(availabilityKey)) {
            card.dataset.availabilityKey = availabilityKey;
        } else {
            delete card.dataset.availabilityKey;
        }

        const navigateToDetails = () => {
            const params = new URLSearchParams({ id: item.id, mediaTp: item.media_type });
            window.location.href = `filme.php?${params.toString()}`;
        };

        card.addEventListener('click', navigateToDetails);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateToDetails();
            }
        });

        return card;
    };

    const toggleEmptyState = (isVisible) => {
        if (!emptyState) {
            return;
        }
        emptyState.hidden = !isVisible;
        emptyState.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
        emptyState.classList.toggle('is-visible', isVisible);
    };

    const buildSkeletonCard = () => {
        const card = document.createElement('article');
        card.className = 'search-card search-card--skeleton';

        const media = document.createElement('figure');
        media.className = 'search-card__media search-card__media--skeleton';
        const poster = document.createElement('div');
        poster.className = 'search-card__skeleton-poster';
        media.appendChild(poster);

        const body = document.createElement('div');
        body.className = 'search-card__skeleton-body';

        const typePill = document.createElement('div');
        typePill.className = 'search-card__skeleton-pill';
        const titleLine = document.createElement('div');
        titleLine.className = 'search-card__skeleton-line search-card__skeleton-line--title';
        const metaLine = document.createElement('div');
        metaLine.className = 'search-card__skeleton-line search-card__skeleton-line--meta';
        const metaLineShort = document.createElement('div');
        metaLineShort.className = 'search-card__skeleton-line search-card__skeleton-line--short';
        const ctaLine = document.createElement('div');
        ctaLine.className = 'search-card__skeleton-line search-card__skeleton-line--cta';

        body.append(typePill, titleLine, metaLine, metaLineShort, ctaLine);
        card.append(media, body);

        return card;
    };

    const showLoader = () => {
        if (!resultsGrid) {
            return;
        }
        resultsGrid.innerHTML = '';
        resultsGrid.hidden = false;
        resultsGrid.classList.add('is-loading');
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < SKELETON_CARD_COUNT; index += 1) {
            fragment.appendChild(buildSkeletonCard());
        }
        resultsGrid.appendChild(fragment);
        if (resultsSection) {
            resultsSection.setAttribute('aria-busy', 'true');
        }
        if (resultCount) {
            resultCount.textContent = 'Carregando...';
        }
        toggleEmptyState(false);
    };

    const hideLoader = () => {
        if (!resultsGrid) {
            return;
        }
        resultsGrid.classList.remove('is-loading');
        if (resultsSection) {
            resultsSection.setAttribute('aria-busy', 'false');
        }
    };

    const updateCount = (total) => {
        if (resultCount) {
            const label = total === 1 ? 'resultado' : 'resultados';
            resultCount.textContent = `${total} ${label}`;
        }
    };

    const applyFilters = () => {
        const { media, genre, release, sort, query } = state;
        const matcher = releaseMatchers[release] || releaseMatchers.all;
        const comparator = getSortComparator(sort, query);
        const filtered = cache.rawResults
            .filter((item) => {
                if (media !== 'both' && item.media_type !== media) {
                    return false;
                }
                if (genre && !(item.genre_ids || []).includes(parseInt(genre, 10))) {
                    return false;
                }
                if (state.fuzzyActive && (item._wtwFuzzyScore || 0) < FUZZY_SIMILARITY_THRESHOLD) {
                    return false;
                }
                const year = getReleaseYear(item);
                return matcher(year);
            })
            .sort(comparator);

        updateCount(filtered.length);

        resultsGrid.innerHTML = '';
        if (!filtered.length) {
            resultsGrid.hidden = true;
            if (cache.rawResults.length) {
                setEmptyStateContent('Nenhum resultado para os filtros selecionados', 'Ajuste os filtros ou limpe-os para ver mais t\u00EDtulos.');
            }
            toggleEmptyState(true);
            return;
        }

        resultsGrid.hidden = false;
        toggleEmptyState(false);
        filtered.forEach((item) => {
            const card = buildCard(item);
            resultsGrid.appendChild(card);
        });

        syncFilterSectionIndicators();
    };

    const fetchResults = async (query) => {
        if (searchResultsController) {
            searchResultsController.abort();
        }
        const controller = new AbortController();
        searchResultsController = controller;
        const { signal } = controller;
        const requestToken = ++resultsRequestToken;

        state.query = query;
        state.fuzzyActive = false;
        cache.availability = new Map();

        if (!query) {
            cache.rawResults = [];
            updateCount(0);
            resultsGrid.innerHTML = '';
            resultsGrid.hidden = true;
            resultsGrid.classList.remove('is-loading');
            if (resultsSection) {
                resultsSection.setAttribute('aria-busy', 'false');
            }
            toggleEmptyState(true);
            setEmptyStateContent('Digite algo para pesquisar', 'Use a busca no topo para encontrar filmes e séries.');
            searchResultsController = null;
            return;
        }

        showLoader();

        try {
            const { items: candidates, source } = await collectCandidatesWithFallback(query, { signal });
            if (requestToken !== resultsRequestToken) {
                return;
            }
            state.fuzzyActive = source !== 'primary';

            const normalizedQuery = normalizeText(query);
            let preparedCandidates = candidates.slice(0, 80);

            if (state.fuzzyActive && normalizedQuery) {
                const ranked = candidates
                    .map((item) => ({
                        item,
                        score: computeItemFuzzyScore(item, normalizedQuery),
                        popularity: item.popularity || 0,
                    }))
                    .filter((entry) => entry.score >= FUZZY_SIMILARITY_THRESHOLD)
                    .sort((a, b) => {
                        if (b.score !== a.score) {
                            return b.score - a.score;
                        }
                        return b.popularity - a.popularity;
                    })
                    .slice(0, 40);
                preparedCandidates = ranked.map((entry) => {
                    entry.item._wtwFuzzyScore = entry.score;
                    return entry.item;
                });
            }

            if (!preparedCandidates.length) {
                cache.rawResults = [];
                if (state.fuzzyActive) {
                    setEmptyStateContent('Nenhum título encontrado', 'Tente ajustar a grafia ou experimentar outras palavras-chave.');
                } else {
                    setEmptyStateContent('Nenhum provedor encontrado', 'Nenhum serviço de streaming no Brasil oferece este título no momento.');
                }
            } else {
                const { items: availableItems, availability } = await filterItemsByAvailability(preparedCandidates, { signal });
                if (requestToken !== resultsRequestToken) {
                    return;
                }
                cache.availability = availability;
                const scoredItems = applyRelevanceScores(availableItems, query);
                cache.rawResults = state.fuzzyActive
                    ? scoredItems.filter((item) => (item._wtwFuzzyScore || 0) >= FUZZY_SIMILARITY_THRESHOLD)
                    : scoredItems;

                if (!cache.rawResults.length) {
                    setEmptyStateContent(
                        state.fuzzyActive
                            ? 'Nenhum título encontrado'
                            : 'Nenhum provedor encontrado',
                        state.fuzzyActive
                            ? 'Nenhum serviço de streaming no Brasil oferece este título no momento.'
                            : 'Nenhum serviço de streaming no Brasil oferece este título no momento.',
                    );
                } else if (state.fuzzyActive) {
                    setEmptyStateContent('Resultados da busca', 'Mostrando títulos encontrados para sua pesquisa.');
                } else {
                    setEmptyStateContent('Nenhum resultado encontrado', 'Tente ajustar os filtros ou realizar uma nova pesquisa.');
                }
            }
        } catch (error) {
            if (error.name === 'AbortError' || requestToken !== resultsRequestToken) {
                return;
            }
            console.error('Erro ao carregar resultados:', error);
            cache.rawResults = [];
            cache.availability = new Map();
            resultsGrid.hidden = true;
            toggleEmptyState(true);
            setEmptyStateContent('Algo deu errado', 'Não foi possível carregar os resultados agora. Tente novamente em instantes.');
        } finally {
            if (requestToken === resultsRequestToken) {
                hideLoader();
                applyFilters();
                if (searchResultsController === controller) {
                    searchResultsController = null;
                }
            }
        }
    };
    const updateActiveMedia = (value) => {
        state.media = value;
        toggleActiveChip(mediaButtons, value, 'data-media-filter');
        applyFilters();
        syncFilterSectionIndicators();
    };

    const updateActiveGenre = (value) => {
        state.genre = value === state.genre ? null : value;
        genreButtons.forEach((chip) => {
            const id = chip.getAttribute('data-genre-option');
            const isActive = state.genre && id === state.genre;
            chip.classList.toggle('is-active', isActive);
        });
        applyFilters();
        syncFilterSectionIndicators();
    };

    const updateRelease = (value) => {
        state.release = value;
        toggleActiveChip(releaseButtons, value, 'data-release-option');
        applyFilters();
        syncFilterSectionIndicators();
    };

    const updateSort = (value) => {
        state.sort = value;
        toggleActiveChip(sortButtons, value, 'data-sort-option');
        applyFilters();
        syncFilterSectionIndicators();
    };

    mediaButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-media-filter');
            updateActiveMedia(value);
        });
    });

    genreButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-genre-option');
            updateActiveGenre(value);
        });
    });

    releaseButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-release-option');
            updateRelease(value);
        });
    });

    sortButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-sort-option');
            updateSort(value);
        });
    });

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            state.media = 'both';
            state.genre = null;
            state.release = 'all';
            state.sort = 'popularity.desc';
            toggleActiveChip(mediaButtons, state.media, 'data-media-filter');
            toggleActiveChip(releaseButtons, state.release, 'data-release-option');
            toggleActiveChip(sortButtons, state.sort, 'data-sort-option');
            genreButtons.forEach((chip) => chip.classList.remove('is-active'));
            applyFilters();
            syncFilterSectionIndicators();
        });
    }

    if (searchForm && searchField) {
        searchField.value = initialQuery;
        syncClearButton();
        syncSearchTerm(initialQuery);
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = searchField.value.trim();
            state.query = value;
            updateUrlQuery(value);
            syncSearchTerm(value);
            fetchResults(value);
        });
        searchField.addEventListener('input', () => {
            syncClearButton();
        });
    } else {
        syncSearchTerm(initialQuery);
    }

    if (clearSearchButton && searchField) {
        clearSearchButton.addEventListener('click', () => {
            searchField.value = '';
            searchField.focus();
            syncClearButton();
            state.query = '';
            updateUrlQuery('');
            syncSearchTerm('');
            fetchResults('');
        });
    }

    fetchResults(initialQuery);
});











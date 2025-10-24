document.addEventListener('DOMContentLoaded', () => {
    const runtimeConfig = (typeof window !== 'undefined' && window.__WY_WATCH_CONFIG__) || {};
    const apiKey = runtimeConfig.tmdbApiKey || '';
    const tmdbBaseUrl = (runtimeConfig.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '');

    const tmdbEndpoint = (path) => {
        if (!path) {
            return tmdbBaseUrl;
        }
        return `${tmdbBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    if (!apiKey) {
        console.warn('[WYWatch] TMDB API key não configurada – a busca será desativada.');
        return;
    }
    const searchInput = document.getElementById('searchmovie');
    const resultsContainer = document.getElementById('results');
    const clearButton = document.getElementById('clearSearch');
    const inputWrapper = document.getElementById('searchInputWrapper');
    const isSearchResultsPage = document.body.classList.contains('search-results-page');
    const dropdownEnabled = !isSearchResultsPage && !!resultsContainer;

    if (!searchInput) {
        return;
    }

    if (!dropdownEnabled && resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }

    const genreMap = {
        28: 'Ação',
        12: 'Aventura',
        16: 'Animação',
        35: 'Comédia',
        80: 'Crime',
        99: 'Documentário',
        18: 'Drama',
        10751: 'Família',
        14: 'Fantasia',
        36: 'História',
        27: 'Terror',
        10402: 'Música',
        9648: 'Mistério',
        10749: 'Romance',
        878: 'Ficção Científica',
        10770: 'Filme de TV',
        53: 'Suspense',
        10752: 'Guerra',
        37: 'Faroeste',
        10759: 'Ação e Aventura',
        10762: 'Infantil',
        10763: 'Notícias',
        10764: 'Reality',
        10765: 'Sci-Fi & Fantasia',
        10766: 'Novela',
        10767: 'Talk Show',
        10768: 'Guerra & Política'
    };

    const normalizeText = (value) => {
        if (!value) {
            return '';
        }
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
        const candidates = [
            normalizeText(item.title || item.name || ''),
            normalizeText(item.original_title || item.original_name || ''),
            normalizeText(item.overview || ''),
        ];
        let best = 0;
        candidates.forEach((candidate) => {
            if (!candidate) {
                return;
            }
            const similarity = computeFuzzySimilarity(normalizedQuery, candidate);
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
        const collapsed = normalized.replace(/(.)\1+/g, '$1');
        if (collapsed.length >= 3) {
            variants.add(collapsed);
        }
        return Array.from(variants).slice(0, 4);
    };

    const dedupeItems = (items) => {
        const seen = new Set();
        const output = [];
        items.forEach((item) => {
            if (!item || typeof item.id === 'undefined') {
                return;
            }
            const key = `${item.media_type === 'tv' ? 'tv' : 'movie'}-${item.id}`;
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            output.push(item);
        });
        return output;
    };

    let trendingCache = null;
    let lastRequestToken = 0;
    const FUZZY_SIMILARITY_THRESHOLD = 0.35;

    const fetchTrendingCandidates = async () => {
        if (trendingCache) {
            return trendingCache;
        }
        const endpoints = [
            tmdbEndpoint('/trending/movie/week'),
            tmdbEndpoint('/trending/tv/week'),
        ];
        const responses = await Promise.all(endpoints.map((endpoint) => {
            const url = new URL(endpoint);
            url.searchParams.set('api_key', apiKey);
            url.searchParams.set('language', 'pt-BR');
            return fetch(url)
                .then((response) => (response.ok ? response.json() : { results: [] }))
                .catch(() => ({ results: [] }));
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
        trendingCache = dedupeItems(combined).slice(0, 40);
        return trendingCache;
    };

    const fetchMultiSearch = async (query, page = 1) => {
        const trimmed = (query || '').trim();
        if (!trimmed) {
            return [];
        }
        const url = new URL(tmdbEndpoint('/search/multi'));
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('language', 'pt-BR');
        url.searchParams.set('include_adult', 'false');
        url.searchParams.set('page', page.toString());
        url.searchParams.set('query', trimmed);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                return [];
            }
            const payload = await response.json();
            return dedupeItems(
                (payload.results || []).filter((item) => item.media_type === 'movie' || item.media_type === 'tv'),
            );
        } catch (error) {
            console.error('Erro ao buscar dados TMDB:', error);
            return [];
        }
    };

    const collectCandidatesWithFallback = async (query) => {
        const primary = await fetchMultiSearch(query, 1);
        if (primary.length) {
            return { items: primary, source: 'primary' };
        }

        const variants = buildQueryVariants(query);
        if (variants.length) {
            const aggregated = [];
            for (const variant of variants.slice(0, 3)) {
                const entries = await fetchMultiSearch(variant, 1);
                aggregated.push(...entries);
            }
            const deduped = dedupeItems(aggregated);
            if (deduped.length) {
                return { items: deduped, source: 'variants' };
            }
        }

        const trending = await fetchTrendingCandidates();
        return { items: trending, source: 'trending' };
    };

    const rankCandidates = (items, query, { forceFuzzy = false, limit = 8 } = {}) => {
        if (!items.length) {
            return [];
        }
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) {
            return items.slice(0, limit);
        }
        const scored = items.map((item) => ({
            item,
            similarity: computeItemFuzzyScore(item, normalizedQuery),
            popularity: item.popularity || 0,
        })).sort((a, b) => {
            if (b.similarity !== a.similarity) {
                return b.similarity - a.similarity;
            }
            return b.popularity - a.popularity;
        });

        const filtered = forceFuzzy
            ? scored.filter((entry) => entry.similarity >= FUZZY_SIMILARITY_THRESHOLD)
            : scored;

        const subset = filtered.length || !forceFuzzy ? filtered : [];
        if (forceFuzzy && subset.length === 0) {
            return [];
        }
        return (subset.length ? subset : scored)
            .slice(0, limit)
            .map((entry) => {
                entry.item._wtwFuzzyScore = entry.similarity;
                return entry.item;
            });
    };

    const redirectToFullResults = (query) => {
        if (!query) {
            return;
        }
        const target = `search.php?q=${encodeURIComponent(query)}`;
        window.location.href = target;
    };

    const renderViewAllAction = (query) => {
        if (!dropdownEnabled || !resultsContainer) {
            return;
        }

        const existingAction = resultsContainer.querySelector('.search-view-all');
        if (existingAction) {
            existingAction.remove();
        }

        if (!query) {
            return;
        }

        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'search-view-all';
        action.textContent = 'Ver todos os resultados';
        action.addEventListener('click', () => redirectToFullResults(query));
        resultsContainer.appendChild(action);
    };

    const toggleClearState = () => {
        if (!inputWrapper) {
            return;
        }
        const hasText = searchInput.value.trim().length > 0;
        inputWrapper.classList.toggle('has-text', hasText);
        if (!hasText && dropdownEnabled && resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
        }
    };

    const createChip = (label, modifier) => {
        const chip = document.createElement('span');
        chip.className = modifier ? `chip ${modifier}` : 'chip';
        chip.textContent = label;
        return chip;
    };

    const createResultCard = (item) => {
        const title = item.title || item.name || 'Sem tÃ­tulo';
        const mediaType = item.media_type === 'movie' ? 'Filme' : 'Série';
        const poster = item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : 'imagens/icon-cast.png';
        const yearSource = item.release_date || item.first_air_date || '';
        const year = yearSource ? yearSource.slice(0, 4) : '';
        const genreNames = (item.genre_ids || [])
            .map((id) => genreMap[id])
            .filter(Boolean)
            .slice(0, 3);

        const card = document.createElement('article');
        card.className = 'search-result-card';

        const figure = document.createElement('figure');
        figure.className = 'result-poster';
        const posterImg = document.createElement('img');
        posterImg.src = poster;
        posterImg.alt = title;
        posterImg.loading = 'lazy';
        figure.appendChild(posterImg);
        card.appendChild(figure);

        const info = document.createElement('div');
        info.className = 'result-info';
        const titleEl = document.createElement('p');
        titleEl.className = 'result-title';
        titleEl.textContent = title;
        info.appendChild(titleEl);

        const tagsRow = document.createElement('div');
        tagsRow.className = 'result-tag-row';
        tagsRow.appendChild(createChip(mediaType, 'chip--type'));
        if (year) {
            tagsRow.appendChild(createChip(year, 'chip--year'));
        }
        info.appendChild(tagsRow);

        if (genreNames.length) {
            const chips = document.createElement('div');
            chips.className = 'result-chips';
            genreNames.forEach((name) => chips.appendChild(createChip(name, 'chip--genre')));
            info.appendChild(chips);
        }

        card.appendChild(info);

        card.addEventListener('click', () => {
            const params = new URLSearchParams({ id: item.id, mediaTp: item.media_type });
            window.location.href = `filme.php?${params.toString()}`;
        });

        return card;
    };

    const showEmptyState = (message) => {
        if (!dropdownEnabled || !resultsContainer) {
            return;
        }

        resultsContainer.innerHTML = '';
        renderViewAllAction('');
        const empty = document.createElement('p');
        empty.className = 'search-empty';
        empty.textContent = message;
        resultsContainer.appendChild(empty);
        resultsContainer.style.display = 'block';
    };

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            toggleClearState();
            searchInput.focus();
        });
    }

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                event.preventDefault();
                redirectToFullResults(query);
            }
        }
    });


    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        toggleClearState();

        if (!dropdownEnabled || !resultsContainer) {
            return;
        }

        if (query.length === 0) {
            lastRequestToken += 1;
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            renderViewAllAction('');
            return;
        }

        const requestToken = ++lastRequestToken;
        resultsContainer.innerHTML = '';

        try {
            const { items: candidates, source } = await collectCandidatesWithFallback(query);
            if (requestToken !== lastRequestToken) {
                return;
            }

            const ranked = rankCandidates(candidates, query, {
                forceFuzzy: source !== 'primary',
                limit: 8,
            });

            resultsContainer.innerHTML = '';

            if (!ranked.length) {
                const message = 'Nenhum resultado encontrado.';
                showEmptyState(message);
                return;
            }

            ranked.forEach((item) => {
                const card = createResultCard(item);
                resultsContainer.appendChild(card);
            });
            renderViewAllAction(query);
            resultsContainer.style.display = 'block';
        } catch (error) {
            if (requestToken !== lastRequestToken) {
                return;
            }
            console.error('Erro:', error);
            showEmptyState('Nao foi possivel carregar os resultados agora.');
        }
    });


    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q');
    if (initialQuery && searchInput.value.trim().length === 0) {
        searchInput.value = initialQuery;
    }

    toggleClearState();
});

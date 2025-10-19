document.addEventListener('DOMContentLoaded', () => {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const initialQuery = (window.__INITIAL_SEARCH_QUERY__ || '').trim();
    const resultsGrid = document.querySelector('[data-search-results]');
    const loader = document.querySelector('[data-search-loader]');
    const emptyState = document.querySelector('[data-search-empty]');
    const resultCount = document.querySelector('[data-result-count]');
    const searchTerm = document.querySelector('[data-search-term]');
    const resetButton = document.querySelector('[data-reset-filters]');
    const mediaButtons = document.querySelectorAll('[data-media-filter]');
    const genreButtons = document.querySelectorAll('[data-genre-option]');
    const releaseButtons = document.querySelectorAll('[data-release-option]');
    const sortButtons = document.querySelectorAll('[data-sort-option]');
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
    };

    const cache = {
        rawResults: [],
    };

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

    const computeRelevanceScore = (item, normalizedQuery, queryTokens) => {
        if (!normalizedQuery) return 0;

        const candidates = [
            normalizeText(item.title || item.name || ''),
            normalizeText(item.original_title || item.original_name || ''),
            normalizeText(item.overview || ''),
        ];

        let score = 0;

        const evaluateCandidate = (target, baseWeight) => {
            if (!target) return;

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
        };

        evaluateCandidate(candidates[0], 1);
        evaluateCandidate(candidates[1], 0.6);
        evaluateCandidate(candidates[2], 0.2);

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

        const media = document.createElement('div');
        media.className = 'search-card__media';
        const img = document.createElement('img');
        img.src = item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'imagens/icon-cast.png';
        img.alt = item.title || item.name || 'Sem t\u00EDtulo';
        img.loading = 'lazy';
        media.appendChild(img);

        const overlay = document.createElement('div');
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
        if (item.vote_average) {
            const vote = document.createElement('span');
            vote.textContent = `${item.vote_average.toFixed(1)} \u2605`;
            metaRow.appendChild(vote);
        }
        const genres = (item.genre_ids || [])
            .map((id) => genreMap.get(id))
            .filter(Boolean)
            .slice(0, 2);
        genres.forEach((genre) => {
            const chip = document.createElement('span');
            chip.textContent = genre;
            metaRow.appendChild(chip);
        });

        overlay.appendChild(type);
        overlay.appendChild(title);
        if (metaRow.children.length) {
            overlay.appendChild(metaRow);
        }
        const cta = document.createElement('span');
        cta.className = 'search-card__cta';
        cta.textContent = 'Ver detalhes';
        overlay.appendChild(cta);

        card.appendChild(media);
        card.appendChild(overlay);

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

    const showLoader = () => {
        resultsGrid.innerHTML = '';
        resultsGrid.hidden = true;
        if (loader) loader.hidden = false;
        toggleEmptyState(false);
    };

    const hideLoader = () => {
        if (loader) loader.hidden = true;
    };

    const updateCount = (total) => {
        if (resultCount) {
            const label = total === 1 ? 'resultado' : 'resultados';
            resultCount.textContent = `${total} ${label}`;
        }
    };

    const applyFilters = () => {
        const { media, genre, release, sort } = state;
        const matcher = releaseMatchers[release] || releaseMatchers.all;
        const comparator = sortComparators[sort] || sortComparators['popularity.desc'];
        const filtered = cache.rawResults
            .filter((item) => {
                if (media !== 'both' && item.media_type !== media) {
                    return false;
                }
                if (genre && !(item.genre_ids || []).includes(parseInt(genre, 10))) {
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
            toggleEmptyState(true);
            return;
        }

        resultsGrid.hidden = false;
        toggleEmptyState(false);
        filtered.forEach((item) => {
            const card = buildCard(item);
            resultsGrid.appendChild(card);
        });
    };

    const fetchResults = async (query) => {
        state.query = query;
        if (!query) {
            cache.rawResults = [];
            updateCount(0);
            resultsGrid.innerHTML = '';
            resultsGrid.hidden = true;
            if (loader) loader.hidden = true;
            if (emptyState) {
                toggleEmptyState(true);
                const title = emptyState.querySelector('h2');
                const description = emptyState.querySelector('p');
                if (title) title.textContent = 'Digite algo para pesquisar';
                if (description) description.textContent = 'Use a busca no topo para encontrar filmes e s\u00E9ries.';
            }
            return;
        }

        showLoader();

        try {
            const pages = [1, 2, 3, 4, 5];
            const promises = pages.map((page) => {
                const url = new URL('https://api.themoviedb.org/3/search/multi');
                url.searchParams.set('api_key', apiKey);
                url.searchParams.set('language', 'pt-BR');
                url.searchParams.set('page', page.toString());
                url.searchParams.set('include_adult', 'false');
                url.searchParams.set('query', query);
                return fetch(url).then((response) => response.json());
            });
            const responses = await Promise.all(promises);
            const collected = [];
            const seen = new Set();
            responses.forEach((payload) => {
                (payload.results || []).forEach((item) => {
                    if (item.media_type !== 'movie' && item.media_type !== 'tv') {
                        return;
                    }
                    const key = `${item.media_type}-${item.id}`;
                    if (seen.has(key)) {
                        return;
                    }
                    seen.add(key);
                    collected.push(item);
                });
            });
            cache.rawResults = applyRelevanceScores(collected, query);
        } catch (error) {
            console.error('Erro ao carregar resultados:', error);
            cache.rawResults = [];
            resultsGrid.hidden = true;
            if (emptyState) {
                toggleEmptyState(true);
                emptyState.querySelector('h2').textContent = 'Algo deu errado';
                emptyState.querySelector('p').textContent = 'N\u00E3o foi poss\u00EDvel carregar os resultados agora. Tente novamente em instantes.';
            }
        } finally {
            hideLoader();
            applyFilters();
        }
    };

    const updateActiveMedia = (value) => {
        state.media = value;
        toggleActiveChip(mediaButtons, value, 'data-media-filter');
        applyFilters();
    };

    const updateActiveGenre = (value) => {
        state.genre = value === state.genre ? null : value;
        genreButtons.forEach((chip) => {
            const id = chip.getAttribute('data-genre-option');
            const isActive = state.genre && id === state.genre;
            chip.classList.toggle('is-active', isActive);
        });
        applyFilters();
    };

    const updateRelease = (value) => {
        state.release = value;
        toggleActiveChip(releaseButtons, value, 'data-release-option');
        applyFilters();
    };

    const updateSort = (value) => {
        state.sort = value;
        toggleActiveChip(sortButtons, value, 'data-sort-option');
        applyFilters();
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











document.addEventListener('DOMContentLoaded', () => {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const searchInput = document.getElementById('searchmovie');
    const resultsContainer = document.getElementById('results');
    const clearButton = document.getElementById('clearSearch');
    const inputWrapper = document.getElementById('searchInputWrapper');

    if (!searchInput || !resultsContainer) {
        return;
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

    const fetchJson = (url) => fetch(url).then((response) => response.json());

    const redirectToFullResults = (query) => {
        if (!query) {
            return;
        }
        const target = `search.php?q=${encodeURIComponent(query)}`;
        window.location.href = target;
    };

    const renderViewAllAction = (query) => {
        if (!resultsContainer) {
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
        if (!hasText) {
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


    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        toggleClearState();

        if (query.length === 0) {
            renderViewAllAction('');
            return;
        }

        const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1&sort_by=popularity.desc`;

        fetchJson(url)
            .then((data) => {
                resultsContainer.innerHTML = '';
                const items = (data.results || [])
                    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

                if (!items.length) {
                    showEmptyState('Nenhum resultado encontrado.');
                    return;
                }

                items.forEach((item) => {
                    const card = createResultCard(item);
                    resultsContainer.appendChild(card);
                });
                renderViewAllAction(query);
                resultsContainer.style.display = 'block';
            })
            .catch((error) => {
                console.error('Erro:', error);
                showEmptyState('NÃ£o foi possÃ­vel carregar os resultados agora.');
            });
    });

    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q');
    if (initialQuery && searchInput.value.trim().length === 0) {
        searchInput.value = initialQuery;
    }

    toggleClearState();
});


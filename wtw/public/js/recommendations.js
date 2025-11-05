(function() {
    const IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';
    const PLACEHOLDER = 'imagens/icon-cast.png';

    const fetchJson = (url, options = {}) => {
        return fetch(url, Object.assign({
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        }, options)).then(async (response) => {
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || response.statusText);
            }
            return response.json();
        });
    };

    const state = {
        providersMeta: [],
        genresMeta: [],
        providerPrefs: new Map(),
        genrePrefs: new Map(),
    };

    document.addEventListener('DOMContentLoaded', () => {
        const recommendationsList = document.getElementById('recommendationsList');
        const recommendationsEmpty = document.getElementById('recommendationsEmpty');
        const recommendationsFeedback = document.getElementById('recommendationsFeedback');
        const reloadBtn = document.getElementById('reloadRecommendations');

        const providerList = document.getElementById('providerList');
        const genreList = document.getElementById('genreList');
        const preferencesForm = document.getElementById('preferencesForm');
        const preferencesFeedback = document.getElementById('preferencesFeedback');
        const resetBtn = document.getElementById('resetPreferences');

        if (!recommendationsList || !providerList || !genreList || !preferencesForm) {
            return;
        }

        const setRecommendationFeedback = (message, tone = 'info') => {
            recommendationsFeedback.textContent = message || '';
            recommendationsFeedback.dataset.tone = tone;
        };

        const setPreferencesFeedback = (message, tone = 'info') => {
            preferencesFeedback.textContent = message || '';
            preferencesFeedback.classList.remove('form-feedback--error', 'form-feedback--success');
            if (tone === 'error') {
                preferencesFeedback.classList.add('form-feedback--error');
            } else if (tone === 'success') {
                preferencesFeedback.classList.add('form-feedback--success');
            }
        };

        const buildProviderTile = (provider) => {
            const tile = document.createElement('label');
            tile.className = 'provider-tile';
            tile.dataset.providerId = provider.id;

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.dataset.providerId = provider.id;
            input.checked = state.providerPrefs.get(provider.id) === 1;
            input.setAttribute('aria-label', provider.name);

            if (input.checked) {
                tile.classList.add('provider-tile--active');
            }

            input.addEventListener('change', () => {
                if (input.checked) {
                    tile.classList.add('provider-tile--active');
                } else {
                    tile.classList.remove('provider-tile--active');
                }
            });

            const logo = document.createElement('img');
            logo.className = 'provider-logo';
            logo.alt = provider.name;
            if (provider.logo) {
                logo.src = `https://image.tmdb.org/t/p/w92${provider.logo}`;
            } else {
                logo.src = PLACEHOLDER;
            }

            const name = document.createElement('span');
            name.className = 'provider-tile__name';
            name.textContent = provider.name;

            tile.appendChild(input);
            tile.appendChild(logo);
            tile.appendChild(name);
            return tile;
        };

        const buildGenreRow = (genre) => {
            const row = document.createElement('div');
            row.className = 'genre-row';
            row.dataset.genreId = genre.id;

            const label = document.createElement('label');
            label.textContent = genre.name;
            label.htmlFor = `genre-${genre.id}`;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = `genre-${genre.id}`;
            slider.min = '0';
            slider.max = '5';
            slider.step = '0.5';
            const saved = state.genrePrefs.has(genre.id) ? state.genrePrefs.get(genre.id) : 1;
            slider.value = saved;

            const valueLabel = document.createElement('span');
            valueLabel.className = 'genre-value';
            valueLabel.textContent = Number(saved).toFixed(1);

            slider.addEventListener('input', () => {
                valueLabel.textContent = Number(slider.value).toFixed(1);
            });

            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(valueLabel);
            return row;
        };

        const buildCard = (item) => {
            const card = document.createElement('article');
            card.className = 'recommendation-card';
            card.tabIndex = 0;

            const figure = document.createElement('figure');
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.alt = item.title || 'Título';
            img.src = item.poster ? `${IMAGE_BASE}${item.poster}` : PLACEHOLDER;
            figure.appendChild(img);

            const body = document.createElement('div');
            body.className = 'recommendation-card__body';

            const title = document.createElement('h3');
            title.className = 'recommendation-card__title';
            title.textContent = item.title || 'Título não informado';

            const meta = document.createElement('div');
            meta.className = 'recommendation-card__meta';

            const year = (item.release_date || '').slice(0, 4);
            const info = document.createElement('span');
            info.textContent = year ? year : (item.media_type === 'tv' ? 'Série' : 'Filme');

            const match = document.createElement('span');
            match.className = 'match-badge';
            const matchPercent = Math.round((item.match ?? 0) * 100);
            match.textContent = `${matchPercent}% match`;

            meta.appendChild(info);
            meta.appendChild(match);

            const providerMeta = document.createElement('p');
            providerMeta.className = 'recommendation-card__providers';
            const providerNames = (item.why?.providers || [])
                .map((id) => state.providersMeta.find((p) => p.id === id))
                .filter(Boolean)
                .map((p) => p.name);
            if (providerNames.length) {
                providerMeta.textContent = `Disponível em: ${providerNames.join(', ')}`;
            } else if ((item.why?.providers || []).length) {
                providerMeta.textContent = 'Disponibilidade localizada em provedores não preferidos.';
            } else {
                providerMeta.textContent = 'Sem disponibilidade confirmada.';
            }

            body.appendChild(title);
            body.appendChild(meta);
            body.appendChild(providerMeta);

            card.appendChild(figure);
            card.appendChild(body);

            card.addEventListener('click', () => {
                const params = new URLSearchParams({
                    id: item.tmdb_id,
                    mediaTp: item.media_type || 'movie',
                });
                window.location.href = `filme.php?${params.toString()}`;
            });

            card.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    card.click();
                }
            });

            return card;
        };

        const renderProviders = () => {
            providerList.innerHTML = '';
            state.providersMeta.forEach((provider) => {
                providerList.appendChild(buildProviderTile(provider));
            });
        };

        const renderGenres = () => {
            genreList.innerHTML = '';
            state.genresMeta.forEach((genre) => {
                genreList.appendChild(buildGenreRow(genre));
            });
        };

        const loadMeta = () => fetchJson('api/recommendations-meta.php');
        const loadPrefs = () => fetchJson('api/preferences.php');

        const loadRecommendations = (showSpinner = true) => {
            if (showSpinner) {
                setRecommendationFeedback('Carregando recomendações...', 'info');
            }
            recommendationsEmpty.hidden = true;
            recommendationsList.innerHTML = '';

            return fetchJson('api/recommendations.php?limit=30')
                .then((data) => {
                    const items = data.items || [];
                    if (!items.length) {
                        recommendationsEmpty.hidden = false;
                        setRecommendationFeedback('Ajuste suas preferências ou tente novamente mais tarde.', 'info');
                        return;
                    }

                    const hasStrongMatch = items.some((item) => (item.match ?? 0) >= 0.4);
                    if (!hasStrongMatch) {
                        setRecommendationFeedback('Encontramos poucos títulos com disponibilidade nos seus provedores. Considere ampliar os provedores ou ajustar pesos de gênero.', 'warn');
                    } else {
                        setRecommendationFeedback('', 'info');
                    }

                    items.forEach((item) => {
                        recommendationsList.appendChild(buildCard(item));
                    });
                })
                .catch((error) => {
                    console.error('Erro ao carregar recomendações', error);
                    setRecommendationFeedback('Não foi possível carregar recomendações agora. Tente novamente em instantes.', 'error');
                    recommendationsEmpty.hidden = false;
                });
        };

        const hydrate = () => {
            Promise.all([loadMeta(), loadPrefs()])
                .then(([meta, prefs]) => {
                    state.providersMeta = (meta.providers || []).slice(0, 24);
                    state.genresMeta = meta.genres || [];

                    state.providerPrefs.clear();
                    (prefs.providers || []).forEach((item) => {
                        state.providerPrefs.set(Number(item.provider_id ?? item.id), Number(item.enabled ?? 1));
                    });

                    state.genrePrefs.clear();
                    (prefs.genres || []).forEach((item) => {
                        state.genrePrefs.set(Number(item.genre_id ?? item.id), Number(item.weight ?? 1));
                    });

                    renderProviders();
                    renderGenres();

                    if (!state.providerPrefs.size) {
                        setRecommendationFeedback('Você ainda não selecionou provedores favoritos. Configure para melhorar as sugestões.', 'warn');
                    }

                    return loadRecommendations(false);
                })
                .catch((error) => {
                    console.error('Erro ao iniciar módulo de recomendações', error);
                    setRecommendationFeedback('Não conseguimos carregar os dados de preferências.', 'error');
                    setPreferencesFeedback('Erro ao buscar dados iniciais.', 'error');
                });
        };

        preferencesForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const providerInputs = providerList.querySelectorAll('input[data-provider-id]');
            const genreInputs = genreList.querySelectorAll('input[type="range"]');

            const payload = {
                providers: Array.from(providerInputs).map((input) => ({
                    id: Number(input.dataset.providerId),
                    enabled: input.checked ? 1 : 0,
                })),
                genres: Array.from(genreInputs).map((input) => ({
                    id: Number((input.id || '').replace('genre-', '')),
                    weight: Number(input.value),
                })),
                people: [],
            };

            setPreferencesFeedback('Salvando...', 'info');

            fetchJson('api/preferences.php', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
                .then(() => {
                    setPreferencesFeedback('Preferências atualizadas com sucesso!', 'success');
                    state.providerPrefs.clear();
                    payload.providers.forEach((item) => state.providerPrefs.set(item.id, item.enabled));
                    state.genrePrefs.clear();
                    payload.genres.forEach((item) => state.genrePrefs.set(item.id, item.weight));
                    return loadRecommendations(false);
                })
                .catch((error) => {
                    console.error('Falha ao salvar preferências', error);
                    setPreferencesFeedback('Não foi possível salvar agora. Verifique os dados e tente novamente.', 'error');
                });
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                providerList.querySelectorAll('input[data-provider-id]').forEach((input) => {
                    input.checked = false;
                    input.dispatchEvent(new Event('change'));
                });
                genreList.querySelectorAll('input[type="range"]').forEach((input) => {
                    input.value = '1';
                    input.dispatchEvent(new Event('input'));
                });
                setPreferencesFeedback('Preferências revertidas para os padrões locais (não salvas).', 'info');
            });
        }

        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                loadRecommendations();
            });
        }

        hydrate();
    });
})();
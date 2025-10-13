(function () {
  const root = document.querySelector('[data-profile-root]');
  if (!root) {
    return;
  }

  const isAuthenticated = root.dataset.authenticated === 'true';
  const apiUrl = root.dataset.apiUrl || 'api/onboarding.php';

  const stats = {
    favorites: root.querySelector('[data-profile-stat="favorites"]'),
    preferences: root.querySelector('[data-profile-stat="preferences"]'),
    updated: root.querySelector('[data-profile-stat="updated"]'),
  };

  const favoritesList = root.querySelector('[data-profile-favorites-list]');
  const favoritesEmpty = root.querySelector('[data-profile-favorites-empty]');
  const favoritesCountBadge = root.querySelector('[data-profile-favorites-count]');
  const favoritesSearchForm = root.querySelector('[data-profile-favorites-form]');
  const favoritesSearchInput = root.querySelector('[data-profile-favorites-search]');
  const favoritesResultsContainer = root.querySelector('[data-profile-favorites-results]');
  const favoritesSummaryList = root.querySelector('[data-profile-favorites-summary]');
  const favoritesSummaryEmpty = root.querySelector('[data-profile-favorites-summary-empty]');
  const favoritesTotalIndicator = root.querySelector('[data-profile-favorites-total]');
  const saveButton = root.querySelector('[data-profile-save]');
  const feedbackBox = root.querySelector('[data-profile-feedback]');
  const preferencesContainer = root.querySelector('[data-profile-preferences]');
  const genresContainer = root.querySelector('[data-profile-genres]');
  const genresSummaryContainer = root.querySelector('[data-profile-genres-summary]');
  const keywordSuggestionsContainer = root.querySelector('[data-profile-keyword-suggestions]');
  const keywordsSelectedContainer = root.querySelector('[data-profile-keywords-list]');
  const keywordsSummaryContainer = root.querySelector('[data-profile-keywords-summary]');
  const keywordForm = root.querySelector('[data-profile-keyword-form]');
  const keywordInput = root.querySelector('[data-profile-keyword-input]');
  const providersContainer = root.querySelector('[data-profile-providers]');
  const providersSummaryContainer = root.querySelector('[data-profile-providers-summary]');
  const preferencesCountBadge = root.querySelector('[data-profile-preferences-count]');
  const modalTriggers = root.querySelectorAll('[data-profile-open-modal]');
  const modalElements = root.querySelectorAll('[data-profile-modal]');

  const genreLabels = new Map();
  const providerLabels = new Map();

  if (genresContainer) {
    genresContainer.querySelectorAll('[data-genre-id]').forEach((button) => {
      const id = parseInt(button.getAttribute('data-genre-id'), 10);
      if (!Number.isNaN(id)) {
        genreLabels.set(id, (button.textContent || '').trim());
      }
    });
  }

  if (providersContainer) {
    providersContainer.querySelectorAll('[data-provider-id]').forEach((button) => {
      const id = parseInt(button.getAttribute('data-provider-id'), 10);
      if (!Number.isNaN(id)) {
        const label = button.querySelector('.provider-card__label');
        providerLabels.set(id, label ? label.textContent.trim() : (button.textContent || '').trim());
      }
    });
  }

  const state = {
    genres: new Set(),
    keywords: [],
    providers: new Set(),
    favorites: [],
    updatedAt: null,
  };

  const activeModal = {
    element: null,
    lastFocused: null,
  };

  const buildTmdbImage = (path, size = 'w342') => {
    if (!path) {
      return null;
    }
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const resolvePosterUrl = (favorite, size = 'w342') => {
    if (!favorite) {
      return null;
    }
    if (favorite.poster_url) {
      return favorite.poster_url;
    }
    if (favorite.poster_path) {
      return buildTmdbImage(favorite.poster_path, size);
    }
    if (favorite.backdrop_path) {
      return buildTmdbImage(favorite.backdrop_path, size);
    }
    if (favorite.logo_url) {
      return favorite.logo_url;
    }
    return null;
  };

  const extractPosterInfo = (favorite) => {
    const info = {
      poster_path: null,
      poster_url: null,
      backdrop_path: null,
    };

    if (!favorite || typeof favorite !== 'object') {
      return info;
    }

    const rawPoster = favorite.poster_path ?? favorite.poster ?? null;
    const rawPosterUrl = favorite.poster_url ?? favorite.posterUrl ?? null;
    const rawBackdrop = favorite.backdrop_path ?? favorite.backdrop ?? null;

    if (typeof rawPosterUrl === 'string' && rawPosterUrl.trim() !== '') {
      info.poster_url = rawPosterUrl.trim();
    }

    if (typeof rawPoster === 'string' && rawPoster.trim() !== '') {
      const trimmed = rawPoster.trim();
      if (trimmed.startsWith('http')) {
        info.poster_url = info.poster_url || trimmed;
      } else {
        info.poster_path = trimmed;
      }
    }

    if (typeof rawBackdrop === 'string' && rawBackdrop.trim() !== '') {
      const trimmedBackdrop = rawBackdrop.trim();
      if (trimmedBackdrop.startsWith('http')) {
        info.backdrop_path = null;
        info.poster_url = info.poster_url || trimmedBackdrop;
      } else {
        info.backdrop_path = trimmedBackdrop;
      }
    }

    return info;
  };

  const keywordKey = (keyword) => {
    if (!keyword) {
      return null;
    }
    const id = keyword.id ?? keyword.keyword_id ?? null;
    const label = (keyword.label || keyword.name || '').trim().toLocaleLowerCase('pt-BR');
    if (id) {
      return `id:${id}`;
    }
    if (label) {
      return `label:${label}`;
    }
    return null;
  };

  const updateFeedback = (message, type) => {
    if (!feedbackBox) {
      return;
    }
    feedbackBox.textContent = message || '';
    feedbackBox.classList.remove('is-success', 'is-error');
    if (type === 'success') {
      feedbackBox.classList.add('is-success');
    } else if (type === 'error') {
      feedbackBox.classList.add('is-error');
    }
  };

  const renderSummaryChips = (container, items, emptyText) => {
    if (!container) {
      return;
    }
    container.innerHTML = '';
    if (!items || items.length === 0) {
      const placeholder = document.createElement('span');
      placeholder.className = 'profile-summary-chip profile-summary-chip--empty';
      placeholder.textContent = emptyText;
      container.appendChild(placeholder);
      return;
    }

    const visibleItems = items.slice(0, 3);
    visibleItems.forEach((label) => {
      const chip = document.createElement('span');
      chip.className = 'profile-summary-chip';
      chip.textContent = label;
      container.appendChild(chip);
    });

    if (items.length > visibleItems.length) {
      const remainder = document.createElement('span');
      remainder.className = 'profile-summary-chip profile-summary-chip--more';
      remainder.textContent = `+${items.length - visibleItems.length}`;
      container.appendChild(remainder);
    }
  };

  const renderFavoritesSummary = () => {
    if (!favoritesSummaryList) {
      return;
    }

    favoritesSummaryList.innerHTML = '';
    if (!state.favorites || state.favorites.length === 0) {
      if (favoritesSummaryEmpty) {
        favoritesSummaryEmpty.hidden = false;
      }
      return;
    }

    if (favoritesSummaryEmpty) {
      favoritesSummaryEmpty.hidden = true;
    }

    const visibleFavorites = state.favorites.slice(0, 4);
    visibleFavorites.forEach((favorite) => {
      const item = document.createElement('li');
      item.className = 'favorite-tile';

      const posterWrapper = document.createElement('figure');
      posterWrapper.className = 'favorite-tile__poster';
      posterWrapper.setAttribute('aria-hidden', 'true');

      const posterUrl = resolvePosterUrl(favorite, 'w342');
      if (posterUrl) {
        const image = document.createElement('img');
        image.src = posterUrl;
        image.alt = '';
        image.loading = 'lazy';
        image.className = 'favorite-tile__image';
        posterWrapper.appendChild(image);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'favorite-tile__fallback';
        fallback.textContent = favorite.title.slice(0, 1).toUpperCase();
        posterWrapper.appendChild(fallback);
      }

      const scrim = document.createElement('div');
      scrim.className = 'favorite-tile__scrim';
      posterWrapper.appendChild(scrim);

      const meta = document.createElement('div');
      meta.className = 'favorite-tile__meta';

      const title = document.createElement('span');
      title.className = 'favorite-tile__title';
      title.textContent = favorite.title;

      const type = document.createElement('span');
      type.className = 'favorite-tile__type';
      type.textContent = favorite.media_type === 'tv' ? 'Série' : 'Filme';

      meta.appendChild(title);
      meta.appendChild(type);

      item.appendChild(posterWrapper);
      item.appendChild(meta);
      favoritesSummaryList.appendChild(item);
    });

    if (state.favorites.length > visibleFavorites.length) {
      const remainder = document.createElement('li');
      remainder.className = 'favorite-tile favorite-tile--more';
      const total = state.favorites.length - visibleFavorites.length;
      const value = document.createElement('span');
      value.textContent = `+${total}`;
      const label = document.createElement('small');
      label.textContent = total === 1 ? 'título' : 'títulos';
      remainder.appendChild(value);
      remainder.appendChild(label);
      favoritesSummaryList.appendChild(remainder);
    }
  };

  const renderPreferencesSummary = () => {
    const genreItems = Array.from(state.genres.values()).map((id) => genreLabels.get(id) || `#${id}`);
    const keywordItems = state.keywords.map((keyword) => keyword.label);
    const providerItems = Array.from(state.providers.values()).map((id) => providerLabels.get(id) || `#${id}`);

    renderSummaryChips(genresSummaryContainer, genreItems, 'Nenhum gênero selecionado');
    renderSummaryChips(keywordsSummaryContainer, keywordItems, 'Sem temas definidos');
    renderSummaryChips(providersSummaryContainer, providerItems, 'Nenhum provedor selecionado');
  };

  renderFavoritesSummary();
  renderPreferencesSummary();

  const updateStats = () => {
    if (stats.favorites) {
      stats.favorites.textContent = state.favorites.length.toString();
    }

    const preferencesTotal = state.genres.size + state.keywords.length + state.providers.size;
    if (stats.preferences) {
      stats.preferences.textContent = preferencesTotal.toString();
    }

    if (favoritesCountBadge) {
      favoritesCountBadge.textContent = `${state.favorites.length} ${state.favorites.length === 1 ? 'título' : 'títulos'}`;
    }

    if (favoritesTotalIndicator) {
      favoritesTotalIndicator.textContent = `${state.favorites.length} ${state.favorites.length === 1 ? 'título' : 'títulos'}`;
    }

    if (preferencesCountBadge) {
      preferencesCountBadge.textContent = `${preferencesTotal} ${preferencesTotal === 1 ? 'item' : 'itens'}`;
    }

    if (stats.updated) {
      stats.updated.textContent = state.updatedAt ? state.updatedAt : stats.updated.textContent;
    }

    renderPreferencesSummary();
    renderFavoritesSummary();
  };

  const renderGenres = () => {
    if (!genresContainer) {
      return;
    }
    const buttons = genresContainer.querySelectorAll('[data-genre-id]');
    buttons.forEach((button) => {
      const id = parseInt(button.getAttribute('data-genre-id'), 10);
      const isSelected = state.genres.has(id);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  };

  const renderKeywordSuggestions = () => {
    if (!keywordSuggestionsContainer) {
      return;
    }
    const suggestionButtons = keywordSuggestionsContainer.querySelectorAll('[data-keyword-id]');
    suggestionButtons.forEach((button) => {
      const id = parseInt(button.getAttribute('data-keyword-id'), 10);
      const label = button.getAttribute('data-keyword-label') || '';
      const exists = state.keywords.some((keyword) => {
        const keywordId = keyword.id ?? keyword.keyword_id ?? null;
        if (keywordId && id) {
          return keywordId === id;
        }
        return keyword.label.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR');
      });
      button.classList.toggle('is-selected', exists);
      button.setAttribute('aria-pressed', exists ? 'true' : 'false');
    });
  };

  const renderSelectedKeywords = () => {
    if (!keywordsSelectedContainer) {
      return;
    }
    keywordsSelectedContainer.innerHTML = '';
    if (state.keywords.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.textContent = 'Nenhuma palavra-chave selecionada ainda.';
      placeholder.className = 'profile-empty';
      keywordsSelectedContainer.appendChild(placeholder);
      return;
    }

    state.keywords.forEach((keyword) => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.setAttribute('data-keyword-tag', '');
      tag.dataset.key = keywordKey(keyword) || '';
      tag.textContent = keyword.label;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'keyword-tag__remove';
      remove.setAttribute('aria-label', `Remover ${keyword.label}`);
      remove.innerHTML = '&times;';
      remove.addEventListener('click', () => {
        removeKeyword(keyword);
      });

      tag.appendChild(remove);
      keywordsSelectedContainer.appendChild(tag);
    });
  };

  const renderProviders = () => {
    if (!providersContainer) {
      return;
    }
    providersContainer.querySelectorAll('[data-provider-id]').forEach((button) => {
      const id = parseInt(button.getAttribute('data-provider-id'), 10);
      const isSelected = state.providers.has(id);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  };

  const renderFavorites = () => {
    if (!favoritesList) {
      return;
    }

    favoritesList.innerHTML = '';
    if (state.favorites.length === 0) {
      if (favoritesEmpty) {
        favoritesEmpty.hidden = false;
      }
      updateStats();
      return;
    }

    if (favoritesEmpty) {
      favoritesEmpty.hidden = true;
    }

    state.favorites.forEach((favorite) => {
      const card = document.createElement('article');
      card.className = 'favorite-card';
      card.setAttribute('role', 'listitem');
      card.dataset.key = `${favorite.tmdb_id}:${favorite.media_type}`;

      const media = document.createElement('figure');
      media.className = 'favorite-card__media';
      media.setAttribute('aria-hidden', 'true');
      const poster = resolvePosterUrl(favorite, 'w185');
      if (poster) {
        const img = document.createElement('img');
        img.src = poster;
        img.alt = '';
        img.loading = 'lazy';
        media.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'favorite-card__fallback';
        fallback.textContent = favorite.title.slice(0, 1).toUpperCase();
        media.appendChild(fallback);
      }

      const title = document.createElement('h3');
      title.className = 'favorite-card__title';
      title.textContent = favorite.title;

      const meta = document.createElement('p');
      meta.className = 'favorite-card__meta';
      const typeLabel = favorite.media_type === 'tv' ? 'Série' : 'Filme';
      meta.textContent = `${typeLabel}`;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'favorite-card__remove';
      removeButton.textContent = 'Remover';
      removeButton.addEventListener('click', () => {
        removeFavorite(favorite.tmdb_id, favorite.media_type);
      });

      card.appendChild(media);
      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(removeButton);
      favoritesList.appendChild(card);
    });

    updateStats();
  };

  const closeModal = (modal) => {
    if (!modal || !modal.classList.contains('is-open')) {
      return;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');

    if (activeModal.element === modal) {
      const { lastFocused } = activeModal;
      activeModal.element = null;
      activeModal.lastFocused = null;
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    if (!root.querySelector('.profile-modal.is-open')) {
      document.body.classList.remove('profile-modal-open');
    }
  };

  const openModal = (name, trigger) => {
    if (!name) {
      return;
    }

    const modal = Array.from(modalElements).find((element) => element.dataset.profileModal === name);
    if (!modal) {
      return;
    }

    activeModal.element = modal;
    activeModal.lastFocused = trigger || document.activeElement;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('profile-modal-open');

    const focusTarget = modal.querySelector('[data-profile-modal-focus]') ||
      modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  };

  const ensureUniqueKeyword = (keyword) => {
    const key = keywordKey(keyword);
    if (!key) {
      return false;
    }
    return !state.keywords.some((existing) => keywordKey(existing) === key);
  };

  const addKeyword = (keyword) => {
    if (!keyword || !keyword.label) {
      return;
    }
    if (!ensureUniqueKeyword(keyword)) {
      return;
    }
    state.keywords.push({
      id: keyword.id ?? keyword.keyword_id ?? null,
      label: keyword.label,
    });
    renderKeywordSuggestions();
    renderSelectedKeywords();
    updateStats();
  };

  const removeKeyword = (keyword) => {
    const key = keywordKey(keyword);
    state.keywords = state.keywords.filter((existing) => keywordKey(existing) !== key);
    renderKeywordSuggestions();
    renderSelectedKeywords();
    updateStats();
  };

  const toggleGenre = (id) => {
    if (state.genres.has(id)) {
      state.genres.delete(id);
    } else {
      state.genres.add(id);
    }
    renderGenres();
    updateStats();
  };

  const toggleProvider = (id) => {
    if (state.providers.has(id)) {
      state.providers.delete(id);
    } else {
      state.providers.add(id);
    }
    renderProviders();
    updateStats();
  };

  const favoriteKey = (id, mediaType) => `${id}:${mediaType}`;

  const addFavorite = (favorite) => {
    const id = parseInt(favorite.tmdb_id ?? favorite.id ?? 0, 10);
    if (!id || !favorite.title) {
      return;
    }
    const mediaType = (favorite.media_type || favorite.type || 'movie').toLowerCase();
    const key = favoriteKey(id, mediaType);
    const exists = state.favorites.some((item) => favoriteKey(item.tmdb_id, item.media_type) === key);
    if (exists) {
      updateFeedback('Esse título já está nos seus favoritos.', 'error');
      return;
    }
    const posterInfo = extractPosterInfo(favorite);

    state.favorites.push({
      tmdb_id: id,
      media_type: mediaType === 'tv' ? 'tv' : 'movie',
      title: favorite.title || favorite.name || 'Título',
      logo_path: favorite.logo_path || null,
      logo_url: favorite.logo_url || favorite.logo || null,
      poster_path: posterInfo.poster_path,
      poster_url: posterInfo.poster_url,
      backdrop_path: posterInfo.backdrop_path,
    });
    renderFavorites();
    updateFeedback('Favorito adicionado com sucesso.', 'success');
  };

  const removeFavorite = (id, mediaType) => {
    const key = favoriteKey(id, mediaType);
    const nextFavorites = state.favorites.filter((favorite) => favoriteKey(favorite.tmdb_id, favorite.media_type) !== key);
    state.favorites = nextFavorites;
    renderFavorites();
    updateFeedback('Favorito removido.', 'success');
  };

  const buildPayload = () => {
    return {
      genres: Array.from(state.genres.values()),
      keywords: state.keywords.map((keyword) => ({
        id: keyword.id,
        label: keyword.label,
      })),
      providers: Array.from(state.providers.values()),
      favorites: state.favorites.map((favorite) => ({
        tmdb_id: favorite.tmdb_id,
        media_type: favorite.media_type,
        title: favorite.title,
        logo_path: favorite.logo_path,
        logo_url: favorite.logo_url,
        poster_path: favorite.poster_path,
        poster_url: favorite.poster_url,
        backdrop_path: favorite.backdrop_path,
      })),
    };
  };

  const applyPreferences = (payload) => {
    if (payload.genres) {
      state.genres = new Set(payload.genres.map((value) => parseInt(value, 10)).filter((value) => value > 0));
    }
    if (payload.keywords) {
      state.keywords = payload.keywords.map((keyword) => ({
        id: keyword.id ?? keyword.keyword_id ?? null,
        label: keyword.label ?? keyword.name ?? '',
      })).filter((keyword) => keyword.label !== '');
    }
    if (payload.providers) {
      state.providers = new Set(payload.providers.map((value) => parseInt(value, 10)).filter((value) => value > 0));
    }
    if (payload.favorites) {
      state.favorites = payload.favorites.map((favorite) => {
        const posterInfo = extractPosterInfo(favorite);
        return {
          tmdb_id: favorite.tmdb_id ?? favorite.id,
          media_type: (favorite.media_type || favorite.type || 'movie').toLowerCase() === 'tv' ? 'tv' : 'movie',
          title: favorite.title || favorite.name || '',
          logo_path: favorite.logo_path || null,
          logo_url: favorite.logo_url || favorite.logo || null,
          poster_path: posterInfo.poster_path,
          poster_url: posterInfo.poster_url,
          backdrop_path: posterInfo.backdrop_path,
        };
      }).filter((favorite) => favorite.tmdb_id && favorite.title);
    }
    if (payload.completed) {
      try {
        const date = new Date(payload.completed);
        if (!Number.isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });
          state.updatedAt = formatted;
        }
      } catch (error) {
        state.updatedAt = null;
      }
    }

    renderGenres();
    renderKeywordSuggestions();
    renderSelectedKeywords();
    renderProviders();
    renderFavorites();
    updateStats();
  };

  const handleFavoritesSearch = async (event) => {
    event.preventDefault();
    if (!isAuthenticated || !favoritesSearchInput) {
      return;
    }
    const query = favoritesSearchInput.value.trim();
    if (query === '') {
      updateFeedback('Digite pelo menos uma palavra para buscar novos favoritos.', 'error');
      return;
    }
    updateFeedback('Buscando títulos...', null);
    if (favoritesResultsContainer) {
      favoritesResultsContainer.innerHTML = '';
      favoritesResultsContainer.hidden = false;
    }
    try {
      const url = new URL(apiUrl, window.location.href);
      url.searchParams.set('resource', 'titles');
      url.searchParams.set('q', query);
      const response = await fetch(url.toString(), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('fetch_failed');
      }
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      if (results.length === 0) {
        updateFeedback('Nenhum título encontrado. Tente outra busca.', 'error');
        return;
      }
      updateFeedback(`${results.length} resultados encontrados.`, 'success');
      if (favoritesResultsContainer) {
        favoritesResultsContainer.innerHTML = '';
        results.forEach((result) => {
          const row = document.createElement('div');
          row.className = 'search-result';

          const info = document.createElement('div');
          info.className = 'search-result__info';

          const title = document.createElement('span');
          title.className = 'search-result__title';
          title.textContent = result.title || result.name;

          const meta = document.createElement('span');
          meta.className = 'search-result__meta';
          const year = result.release_year ? ` • ${result.release_year}` : '';
          meta.textContent = `${result.media_type === 'tv' ? 'Série' : 'Filme'}${year}`;

          const action = document.createElement('button');
          action.type = 'button';
          action.className = 'search-result__action';
          action.textContent = 'Adicionar';
          action.addEventListener('click', () => {
            addFavorite(result);
          });

          info.appendChild(title);
          info.appendChild(meta);
          row.appendChild(info);
          row.appendChild(action);
          favoritesResultsContainer.appendChild(row);
        });
      }
    } catch (error) {
      console.error('favorites_search_error', error);
      updateFeedback('Não foi possível buscar títulos agora. Tente novamente mais tarde.', 'error');
    }
  };

  const fetchPreferences = async () => {
    if (!isAuthenticated) {
      updateFeedback('Faça login para gerenciar suas preferências.', 'error');
      return;
    }
    updateFeedback('Carregando suas preferências...', null);
    try {
      const response = await fetch(apiUrl, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`fetch_failed_${response.status}`);
      }
      const data = await response.json();
      applyPreferences(data);
      updateFeedback('Preferências carregadas com sucesso.', 'success');
    } catch (error) {
      console.error('profile_preferences_error', error);
      updateFeedback('Não foi possível carregar suas preferências agora.', 'error');
    }
  };

  const savePreferences = async () => {
    if (!isAuthenticated || !saveButton) {
      return;
    }
    const payload = buildPayload();
    updateFeedback('Salvando preferências...', null);
    saveButton.disabled = true;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`save_failed_${response.status}`);
      }
      updateFeedback('Preferências atualizadas com sucesso.', 'success');
      await fetchPreferences();
    } catch (error) {
      console.error('profile_save_error', error);
      updateFeedback('Não foi possível salvar suas preferências. Tente novamente.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  };

  modalElements.forEach((modal) => {
    modal.setAttribute('aria-hidden', 'true');
    modal.querySelectorAll('[data-profile-modal-close]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();
        closeModal(modal);
      });
    });
  });

  modalTriggers.forEach((trigger) => {
    const name = trigger.getAttribute('data-profile-open-modal');
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      if (!isAuthenticated) {
        return;
      }
      openModal(name, trigger);
    });
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || typeof target !== 'object' || typeof target.closest !== 'function') {
      return;
    }
    if (target.dataset && target.dataset.profileModalClose !== undefined) {
      const modal = target.closest('[data-profile-modal]');
      if (modal) {
        closeModal(modal);
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeModal.element) {
      event.preventDefault();
      closeModal(activeModal.element);
    }
  });

  if (isAuthenticated) {
    if (genresContainer) {
      genresContainer.querySelectorAll('[data-genre-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = parseInt(button.getAttribute('data-genre-id'), 10);
          if (!Number.isNaN(id)) {
            toggleGenre(id);
          }
        });
      });
    }

    if (keywordSuggestionsContainer) {
      keywordSuggestionsContainer.querySelectorAll('[data-keyword-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const keyword = {
            id: parseInt(button.getAttribute('data-keyword-id'), 10) || null,
            label: button.getAttribute('data-keyword-label') || button.textContent || '',
          };
          const key = keywordKey(keyword);
          const exists = state.keywords.some((item) => keywordKey(item) === key);
          if (exists) {
            removeKeyword(keyword);
          } else {
            addKeyword(keyword);
          }
        });
      });
    }

    if (keywordForm && keywordInput) {
      keywordForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = keywordInput.value.trim();
        if (value === '') {
          updateFeedback('Digite uma palavra-chave antes de adicionar.', 'error');
          return;
        }
        addKeyword({ id: null, label: value });
        keywordInput.value = '';
        updateFeedback('Palavra-chave adicionada.', 'success');
      });
    }

    if (providersContainer) {
      providersContainer.querySelectorAll('[data-provider-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = parseInt(button.getAttribute('data-provider-id'), 10);
          if (!Number.isNaN(id)) {
            toggleProvider(id);
          }
        });
      });
    }

    if (favoritesSearchForm) {
      favoritesSearchForm.addEventListener('submit', handleFavoritesSearch);
    }

    if (saveButton) {
      saveButton.addEventListener('click', savePreferences);
    }

    fetchPreferences();
  } else {
    if (preferencesContainer) {
      preferencesContainer.setAttribute('aria-disabled', 'true');
    }
    if (favoritesEmpty) {
      favoritesEmpty.hidden = false;
      favoritesEmpty.textContent = 'Entre na sua conta para visualizar seus favoritos.';
    }
    if (favoritesSummaryEmpty) {
      favoritesSummaryEmpty.hidden = false;
      favoritesSummaryEmpty.textContent = 'Entre na sua conta para visualizar seus favoritos.';
    }
    updateFeedback('Faça login para acessar todas as funcionalidades do perfil.', 'error');
  }
})();

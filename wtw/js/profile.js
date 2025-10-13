(function () {
  const root = document.querySelector('[data-profile-root]');
  if (!root) {
    return;
  }

  const isAuthenticated = root.dataset.authenticated === 'true';
  const apiUrl = root.dataset.apiUrl || 'api/onboarding.php';

  let initialPayload = null;
  const initialStateRaw = root.dataset.profileInitial;
  if (initialStateRaw) {
    try {
      initialPayload = JSON.parse(initialStateRaw);
    } catch (error) {
      console.error('profile_initial_parse_error', error);
      initialPayload = null;
    }
  }
  const hasInitialData = !!(initialPayload && typeof initialPayload === 'object');

  const stats = {
    favorites: root.querySelector('[data-profile-stat="favorites"]'),
    preferences: root.querySelector('[data-profile-stat="preferences"]'),
    updated: root.querySelector('[data-profile-stat="updated"]'),
  };

  const favoritesList = root.querySelector('[data-profile-favorites-list]');
  const favoritesEmpty = root.querySelector('[data-profile-favorites-empty]');
  const favoritesCountBadge = root.querySelector('[data-profile-favorites-count]');
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
    recommendations: [],
    updatedAt: null,
  };

  let recommendationsLoaded = false;
  let recommendationsLoading = false;
  let recommendationsReloadTimeout = null;
  let favoritesSyncTimeout = null;
  let favoritesSyncController = null;

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

  const renderGenres = () => {
    const selectedLabels = [];
    if (genresContainer) {
      genresContainer.querySelectorAll('[data-genre-id]').forEach((button) => {
        const id = parseInt(button.getAttribute('data-genre-id'), 10);
        const isSelected = !Number.isNaN(id) && state.genres.has(id);
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        if (isSelected) {
          const label = genreLabels.get(id) || (button.textContent || '').trim();
          if (label) {
            selectedLabels.push(label);
          }
        }
      });
    }
    if (genresSummaryContainer) {
      renderSummaryChips(genresSummaryContainer, selectedLabels, 'Nenhum genero selecionado ainda.');
    }
  };

  const renderKeywordSuggestions = () => {
    if (!keywordSuggestionsContainer) {
      return;
    }
    const selectedKeys = new Set(state.keywords.map((keyword) => keywordKey(keyword)));
    keywordSuggestionsContainer.querySelectorAll('[data-keyword-id]').forEach((button) => {
      const keyword = {
        id: parseInt(button.getAttribute('data-keyword-id'), 10) || null,
        label: button.getAttribute('data-keyword-label') || button.textContent || '',
      };
      const key = keywordKey(keyword);
      const isSelected = key !== null && selectedKeys.has(key);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  };

  const renderSelectedKeywords = () => {
    if (!keywordsSelectedContainer) {
      return;
    }
    keywordsSelectedContainer.innerHTML = '';
    if (state.keywords.length === 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'profile-empty';
      placeholder.textContent = 'Nenhuma palavra chave selecionada ainda.';
      keywordsSelectedContainer.appendChild(placeholder);
      if (keywordsSummaryContainer) {
        renderSummaryChips(keywordsSummaryContainer, [], 'Nenhuma palavra chave selecionada.');
      }
      return;
    }

    const labels = [];
    state.keywords.forEach((keyword) => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
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
      labels.push(keyword.label);
    });

    if (keywordsSummaryContainer) {
      renderSummaryChips(keywordsSummaryContainer, labels, 'Nenhuma palavra chave selecionada.');
    }
  };

  const renderProviders = () => {
    const labels = [];
    if (providersContainer) {
      providersContainer.querySelectorAll('[data-provider-id]').forEach((button) => {
        const id = parseInt(button.getAttribute('data-provider-id'), 10);
        const isSelected = !Number.isNaN(id) && state.providers.has(id);
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        if (isSelected) {
          labels.push(providerLabels.get(id) || (button.textContent || '').trim());
        }
      });
    }

    if (providersSummaryContainer) {
      renderSummaryChips(providersSummaryContainer, labels, 'Nenhum provedor selecionado.');
    }
  };

  const renderFavoritesSummary = () => {
    if (!favoritesSummaryList) {
      return;
    }

    favoritesSummaryList.innerHTML = '';

    const favorites = Array.isArray(state.favorites) ? state.favorites : [];
    const summaryItems = favorites.slice(0, 4);

    if (summaryItems.length === 0) {
      favoritesSummaryList.setAttribute('hidden', 'true');
      if (favoritesSummaryEmpty) {
        favoritesSummaryEmpty.hidden = false;
      }
      return;
    }

    favoritesSummaryList.removeAttribute('hidden');
    if (favoritesSummaryEmpty) {
      favoritesSummaryEmpty.hidden = true;
    }

    summaryItems.forEach((favorite) => {
      const item = document.createElement('li');
      item.className = 'favorite-tile favorite-tile--poster';

      const figure = document.createElement('figure');
      figure.className = 'favorite-tile__poster';
      figure.setAttribute('aria-hidden', 'true');

      const poster = resolvePosterUrl(favorite, 'w185');
      if (poster) {
        const img = document.createElement('img');
        img.src = poster;
        img.alt = '';
        img.loading = 'lazy';
        img.className = 'favorite-tile__image';
        figure.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'favorite-tile__fallback';
        fallback.textContent = (favorite.title || '?').slice(0, 1).toUpperCase();
        figure.appendChild(fallback);
      }

      item.appendChild(figure);
      favoritesSummaryList.appendChild(item);
    });

    const overflow = Math.max(0, favorites.length - summaryItems.length);
    if (overflow > 0) {
      const moreItem = document.createElement('li');
      moreItem.className = 'favorite-tile favorite-tile--poster favorite-tile--poster-more';

      const value = document.createElement('span');
      value.className = 'favorite-tile__more-value';
      value.textContent = `+${overflow}`;

      const label = document.createElement('small');
      label.className = 'favorite-tile__more-label';
      label.textContent = overflow === 1 ? 'titulo' : 'titulos';

      moreItem.appendChild(value);
      moreItem.appendChild(label);
      favoritesSummaryList.appendChild(moreItem);
    }
  };

  const updateStats = () => {
    const favoritesCount = Array.isArray(state.favorites) ? state.favorites.length : 0;
    const favoritesLabel = `${favoritesCount} ${favoritesCount === 1 ? 'titulo' : 'titulos'}`;

    if (favoritesCountBadge) {
      favoritesCountBadge.textContent = favoritesLabel;
    }
    if (favoritesTotalIndicator) {
      favoritesTotalIndicator.textContent = favoritesLabel;
    }
    if (stats.favorites) {
      stats.favorites.textContent = favoritesLabel;
    }

    const preferencesCount = state.genres.size + state.keywords.length + state.providers.size;
    const preferencesLabel = `${preferencesCount} ${preferencesCount === 1 ? 'item' : 'itens'}`;
    if (preferencesCountBadge) {
      preferencesCountBadge.textContent = preferencesLabel;
    }
    if (stats.preferences) {
      stats.preferences.textContent = preferencesLabel;
    }

    if (stats.updated) {
      stats.updated.textContent = state.updatedAt || 'â€”';
    }

    renderFavoritesSummary();
  };

  const renderFavorites = () => {
    if (!favoritesList) {
      return;
    }

    favoritesList.innerHTML = '';

    const favorites = Array.isArray(state.favorites) ? state.favorites : [];
    const fragment = document.createDocumentFragment();
    const favoriteKeys = new Set();

    favorites.forEach((favorite) => {
      const key = `${favorite.tmdb_id}:${favorite.media_type}`;
      favoriteKeys.add(key);

      const card = document.createElement('article');
      card.className = 'favorite-poster-card favorite-poster-card--selected';
      card.setAttribute('role', 'listitem');
      card.dataset.key = key;

      const media = document.createElement('figure');
      media.className = 'favorite-poster-card__media';
      media.setAttribute('aria-hidden', 'true');
      const poster = resolvePosterUrl(favorite, 'w342');
      if (poster) {
        const img = document.createElement('img');
        img.src = poster;
        img.alt = '';
        img.loading = 'lazy';
        media.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'favorite-poster-card__fallback';
        fallback.textContent = (favorite.title || '?').slice(0, 1).toUpperCase();
        media.appendChild(fallback);
      }

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'favorite-poster-card__remove';
      removeButton.setAttribute('aria-label', `Remover ${favorite.title || 'titulo'} dos favoritos`);
      removeButton.textContent = '-';
      removeButton.addEventListener('click', () => {
        removeFavorite(favorite.tmdb_id, favorite.media_type);
      });

      card.appendChild(media);
      card.appendChild(removeButton);
      fragment.appendChild(card);
    });

    const suggestions = [];
    if (recommendationsLoaded && Array.isArray(state.recommendations)) {
      state.recommendations.forEach((item) => {
        const id = parseInt(item.tmdb_id ?? item.id ?? 0, 10);
        if (!id) {
          return;
        }
        const mediaType = (item.media_type || item.type || 'movie').toLowerCase() === 'tv' ? 'tv' : 'movie';
        const key = `${id}:${mediaType}`;
        if (!key || favoriteKeys.has(key)) {
          return;
        }
        favoriteKeys.add(key);
        const posterInfo = extractPosterInfo(item);
        suggestions.push({
          key,
          data: {
            tmdb_id: id,
            media_type: mediaType,
            title: item.title || item.name || '',
            logo_path: item.logo_path || null,
            logo_url: item.logo_url || null,
            poster_path: posterInfo.poster_path,
            poster_url: posterInfo.poster_url,
            backdrop_path: posterInfo.backdrop_path,
          },
        });
      });
    }

    const hasFavorites = favorites.length > 0;
    const hasSuggestions = suggestions.length > 0;

    if (!hasFavorites && !hasSuggestions) {
      favoritesList.setAttribute('hidden', 'true');
      if (favoritesEmpty) {
        favoritesEmpty.hidden = false;
      }
      updateStats();
      return;
    }

    favoritesList.removeAttribute('hidden');
    if (favoritesEmpty) {
      favoritesEmpty.hidden = true;
    }

    favoritesList.appendChild(fragment);

    suggestions.forEach(({ key, data }) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'favorite-poster-card favorite-poster-card--suggestion';
      card.setAttribute('role', 'listitem');
      card.dataset.key = key;

      const media = document.createElement('figure');
      media.className = 'favorite-poster-card__media';
      media.setAttribute('aria-hidden', 'true');
      const poster = resolvePosterUrl(data, 'w342');
      if (poster) {
        const img = document.createElement('img');
        img.src = poster;
        img.alt = '';
        img.loading = 'lazy';
        media.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'favorite-poster-card__fallback';
        fallback.textContent = (data.title || '?').slice(0, 1).toUpperCase();
        media.appendChild(fallback);
      }

      card.setAttribute('aria-label', `Adicionar ${data.title || 'titulo'} aos favoritos`);
      card.addEventListener('click', () => {
        addFavorite(data);
      });

      card.appendChild(media);
      favoritesList.appendChild(card);
    });

    updateStats();
  };
  const scheduleRecommendationsRefresh = (options = {}) => {
    if (!isAuthenticated) {
      return;
    }
    const delay = typeof options.delay === 'number' ? options.delay : 320;
    if (recommendationsReloadTimeout) {
      clearTimeout(recommendationsReloadTimeout);
    }
    recommendationsReloadTimeout = setTimeout(() => {
      fetchFavoriteRecommendations({ silent: true });
    }, Math.max(delay, 0));
  };

  const scheduleFavoritesSync = (delay = 600) => {
    if (!isAuthenticated) {
      return;
    }
    if (favoritesSyncTimeout) {
      clearTimeout(favoritesSyncTimeout);
    }
    favoritesSyncTimeout = setTimeout(() => {
      syncFavoritesWithServer();
    }, Math.max(delay, 0));
  };

  const syncFavoritesWithServer = async () => {
    if (favoritesSyncTimeout) {
      clearTimeout(favoritesSyncTimeout);
      favoritesSyncTimeout = null;
    }
    if (!isAuthenticated) {
      return;
    }
    if (favoritesSyncController) {
      favoritesSyncController.abort();
      favoritesSyncController = null;
    }

    const controller = new AbortController();
    favoritesSyncController = controller;

    try {
      const payload = buildPayload();
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`autosave_failed_${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('profile_autosave_error', error);
      updateFeedback('Nao foi possivel sincronizar seus favoritos agora.', 'error');
    } finally {
      if (favoritesSyncController === controller) {
        favoritesSyncController = null;
      }
    }
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
      updateFeedback('Esse titulo ja esta nos seus favoritos.', 'error');
      return;
    }
    const posterInfo = extractPosterInfo(favorite);

    state.favorites.push({
      tmdb_id: id,
      media_type: mediaType === 'tv' ? 'tv' : 'movie',
      title: favorite.title || favorite.name || 'Titulo',
      logo_path: favorite.logo_path || null,
      logo_url: favorite.logo_url || favorite.logo || null,
      poster_path: posterInfo.poster_path,
      poster_url: posterInfo.poster_url,
      backdrop_path: posterInfo.backdrop_path,
    });
    state.recommendations = state.recommendations.filter((item) => favoriteKey(item.tmdb_id, item.media_type) !== key);
    renderFavorites();
    updateFeedback('Favorito adicionado com sucesso.', 'success');
    scheduleRecommendationsRefresh();
    scheduleFavoritesSync();
  };

  const removeFavorite = (id, mediaType) => {
    const key = favoriteKey(id, mediaType);
    const nextFavorites = state.favorites.filter((favorite) => favoriteKey(favorite.tmdb_id, favorite.media_type) !== key);
    state.favorites = nextFavorites;
    renderFavorites();
    updateFeedback('Favorito removido.', 'success');
    scheduleRecommendationsRefresh();
    scheduleFavoritesSync();
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
    scheduleRecommendationsRefresh({ delay: 0 });
    updateStats();
  };

  if (hasInitialData) {
    applyPreferences(initialPayload);
    initialPayload = null;
    root.removeAttribute('data-profile-initial');
  }

  const fetchFavoriteRecommendations = async (options = {}) => {
    if (!isAuthenticated) {
      return;
    }
    if (recommendationsReloadTimeout) {
      clearTimeout(recommendationsReloadTimeout);
      recommendationsReloadTimeout = null;
    }
    if (recommendationsLoading) {
      return;
    }
    const silent = !!(options && options.silent);
    recommendationsLoading = true;
    try {
      const url = new URL(apiUrl, window.location.href);
      url.searchParams.set('resource', 'recommendations');
      const response = await fetch(url.toString(), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('fetch_failed');
      }
      const data = await response.json();
      const rawResults = Array.isArray(data.results) ? data.results : [];
      const unique = new Map();
      rawResults.forEach((raw) => {
        if (!raw || typeof raw !== 'object') {
          return;
        }
        const id = parseInt(raw.tmdb_id ?? raw.id ?? 0, 10);
        if (!id) {
          return;
        }
        const mediaType = (raw.media_type || raw.type || 'movie').toLowerCase() === 'tv' ? 'tv' : 'movie';
        const key = favoriteKey(id, mediaType);
        if (!key || unique.has(key)) {
          return;
        }
        const posterInfo = extractPosterInfo(raw);
        unique.set(key, {
          tmdb_id: id,
          media_type: mediaType,
          title: raw.title || raw.name || '',
          logo_path: raw.logo_path || null,
          logo_url: raw.logo_url || null,
          poster_path: posterInfo.poster_path,
          poster_url: posterInfo.poster_url,
          backdrop_path: posterInfo.backdrop_path,
        });
      });
      state.recommendations = Array.from(unique.values());
      recommendationsLoaded = true;
    } catch (error) {
      console.error('favorites_recommendations_error', error);
      state.recommendations = [];
      recommendationsLoaded = true;
      if (!silent) {
        updateFeedback('Nao foi possivel carregar sugestoes no momento.', 'error');
      }
    } finally {
      recommendationsLoading = false;
      renderFavorites();
    }
  };

  const fetchPreferences = async (options = {}) => {
    if (favoritesSyncTimeout) {
      clearTimeout(favoritesSyncTimeout);
      favoritesSyncTimeout = null;
    }
    if (favoritesSyncController) {
      favoritesSyncController.abort();
      favoritesSyncController = null;
    }
    const silent = !!(options && options.silent);
    if (!isAuthenticated) {
      if (!silent) {
        updateFeedback('Faca login para gerenciar suas preferencias.', 'error');
      }
      return;
    }
    if (!silent) {
      updateFeedback('Carregando suas preferencias...', null);
    }
    try {
      const response = await fetch(apiUrl, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`fetch_failed_${response.status}`);
      }
      const data = await response.json();
      applyPreferences(data);
      if (!silent) {
        updateFeedback('Preferencias carregadas com sucesso.', 'success');
      }
    } catch (error) {
      console.error('profile_preferences_error', error);
      updateFeedback('Nao foi possivel carregar suas preferencias agora.', 'error');
    }
  };

  const savePreferences = async () => {
    if (favoritesSyncTimeout) {
      clearTimeout(favoritesSyncTimeout);
      favoritesSyncTimeout = null;
    }
    if (favoritesSyncController) {
      favoritesSyncController.abort();
      favoritesSyncController = null;
    }
    if (!isAuthenticated || !saveButton) {
      return;
    }
    const payload = buildPayload();
    updateFeedback('Salvando preferencias...', null);
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
      updateFeedback('Preferencias atualizadas com sucesso.', 'success');
      await fetchPreferences({ silent: true });
    } catch (error) {
      console.error('profile_save_error', error);
      updateFeedback('Nao foi possivel salvar suas preferencias. Tente novamente.', 'error');
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

    if (saveButton) {
      saveButton.addEventListener('click', savePreferences);
    }

    if (hasInitialData) {
      fetchPreferences({ silent: true });
    } else {
      fetchPreferences();
    }
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
    updateFeedback('Faca login para acessar todas as funcionalidades do perfil.', 'error');
  }
})();

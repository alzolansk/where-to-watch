(function () {
  const config = window.wtwOnboarding || {};
  const backdrop = document.querySelector('[data-onboarding-backdrop]');
  const modal = document.querySelector('[data-onboarding-modal]');
  if (!backdrop || !modal) {
    return;
  }

  const steps = Array.from(modal.querySelectorAll('[data-onboarding-step]'));
  const progressDots = Array.from(modal.querySelectorAll('[data-onboarding-progress-step]'));
  const backButton = modal.querySelector('[data-onboarding-action="back"]');
  const nextButton = modal.querySelector('[data-onboarding-action="next"]');
  const finishButton = modal.querySelector('[data-onboarding-action="finish"]');
  const skipButton = modal.querySelector('[data-onboarding-action="skip"]');
  const errorBox = modal.querySelector('[data-onboarding-error]');
  const genresGrid = modal.querySelector('[data-onboarding-genres]');
  const keywordsGrid = modal.querySelector('[data-onboarding-keywords]');
  const keywordForm = modal.querySelector('[data-onboarding-keyword-form]');
  const keywordInput = modal.querySelector('[data-onboarding-keyword-input]');
  const providersGrid = modal.querySelector('[data-onboarding-providers]');
  const favoritesGrid = modal.querySelector('[data-onboarding-favorites]');
  const favoritesSelectedGrid = modal.querySelector('[data-onboarding-favorites-selected]');
  const favoritesEmpty = modal.querySelector('[data-onboarding-favorites-empty]');
  const favoritesLoading = modal.querySelector('[data-onboarding-favorites-loading]');
  const favoritesSearchInput = modal.querySelector('[data-onboarding-favorites-search]');
  const favoritesSearchButton = modal.querySelector('[data-onboarding-favorites-refresh]');
  const totalSteps = steps.length;
  const body = document.body;

  const tmdbImageBase = (typeof config.tmdbImageBase === 'string' && config.tmdbImageBase) || 'https://image.tmdb.org/t/p';
  const defaultLogoSize = '/w300';

  const state = {
    stepIndex: 0,
    submitting: false,
    genres: new Set(),
    keywords: new Map(),
    keywordButtons: new Map(),
    providers: new Set(),
    favorites: new Map(),
    favoritesLoaded: false,
    favoritesQuery: '',
    favoritesDebounce: null,
    favoriteAbortController: null,
    initialised: false,
  };

  function normaliseLabel(label) {
    return String(label || '').trim().replace(/\s+/g, ' ');
  }

  function makeKeywordKey(id, label) {
    const normalised = normaliseLabel(label).toLowerCase();
    const keyId = Number.isFinite(id) && id > 0 ? String(id) : 'custom';
    return `${keyId}:${normalised}`;
  }

  function makeFavoriteKey(id, mediaType) {
    return `${String(mediaType || 'movie').toLowerCase()}:${Number(id)}`;
  }

  function buildImageUrl(path) {
    if (!path) {
      return '';
    }
    if (/^https?:/i.test(path)) {
      return path;
    }
    const normalisedPath = path.startsWith('/') ? path : `/${path}`;
    return `${tmdbImageBase}${defaultLogoSize}${normalisedPath}`;
  }

  function setError(message) {
    if (!errorBox) return;
    if (message) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    } else {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }
  }

  function registerKeywordButtons() {
    if (!keywordsGrid) return;
    state.keywordButtons.clear();
    keywordsGrid.querySelectorAll('[data-keyword-id]').forEach((button) => {
      const id = Number(button.dataset.keywordId);
      const label = normaliseLabel(button.dataset.keywordLabel || button.textContent);
      if (!label) {
        return;
      }
      const key = makeKeywordKey(id, label);
      button.dataset.keywordKey = key;
      state.keywordButtons.set(key, button);
    });
  }

  registerKeywordButtons();

  function ensureKeywordButton(id, label) {
    if (!keywordsGrid) return null;
    const normalisedLabel = normaliseLabel(label);
    if (!normalisedLabel) {
      return null;
    }
    const key = makeKeywordKey(id, normalisedLabel);
    let button = state.keywordButtons.get(key);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'onboarding-chip';
      button.dataset.keywordId = id ? String(id) : '';
      button.dataset.keywordLabel = normalisedLabel;
      button.dataset.keywordKey = key;
      button.textContent = normalisedLabel;
      keywordsGrid.appendChild(button);
      state.keywordButtons.set(key, button);
    }
    return button;
  }

  function applyInitialSelections(existing) {
    if (!existing || state.initialised) return;

    if (Array.isArray(existing.genres) && genresGrid) {
      existing.genres.forEach((value) => {
        const id = Number(value);
        if (!Number.isFinite(id)) return;
        const button = genresGrid.querySelector(`[data-genre-id="${id}"]`);
        if (button) {
          state.genres.add(id);
          button.classList.add('is-selected');
        }
      });
    }

    const existingKeywords = existing.keywords;
    if (Array.isArray(existingKeywords)) {
      existingKeywords.forEach((item) => {
        if (!item) return;
        const id = Number(item.id ?? item.keyword_id ?? 0) || null;
        const label = normaliseLabel(item.label ?? item.name ?? '');
        if (!label) return;
        const button = ensureKeywordButton(id, label);
        const key = makeKeywordKey(id, label);
        if (button) {
          state.keywords.set(key, { id: id && id > 0 ? id : null, label });
          button.classList.add('is-selected');
        }
      });
    }

    if (Array.isArray(existing.providers) && providersGrid) {
      existing.providers.forEach((value) => {
        const id = Number(value);
        if (!Number.isFinite(id)) return;
        const button = providersGrid.querySelector(`[data-provider-id="${id}"]`);
        if (button) {
          state.providers.add(id);
          button.classList.add('is-selected');
        }
      });
    }

    if (Array.isArray(existing.favorites)) {
      existing.favorites.forEach((item) => {
        if (!item) return;
        const id = Number(item.tmdb_id ?? item.id ?? 0);
        if (!Number.isFinite(id) || id <= 0) return;
        const mediaType = String(item.media_type ?? item.type ?? 'movie').toLowerCase();
        const label = normaliseLabel(item.title ?? item.label ?? item.name ?? '');
        const logo = item.logo_url || item.logo || buildImageUrl(item.logo_path || '');
        const logoPath = item.logo_path || '';
        if (!label) return;
        const key = makeFavoriteKey(id, mediaType);
        state.favorites.set(key, {
          id,
          mediaType,
          label,
          logo,
          logoPath,
        });
      });
      refreshSelectedFavorites();
    }

    state.initialised = true;
  }

  function updateNavigation() {
    const isFirst = state.stepIndex === 0;
    const isLast = state.stepIndex === totalSteps - 1;

    if (backButton) {
      backButton.disabled = isFirst || state.submitting;
    }
    if (nextButton) {
      nextButton.hidden = isLast;
      nextButton.disabled = state.submitting;
    }
    if (finishButton) {
      const showFinish = isLast;
      finishButton.hidden = !showFinish;
      finishButton.classList.toggle('is-visible', showFinish);
      finishButton.disabled = state.submitting;
    }
    if (skipButton) {
      skipButton.disabled = state.submitting;
    }
  }

  function showStep(index) {
    state.stepIndex = Math.min(Math.max(index, 0), totalSteps - 1);
    steps.forEach((step, i) => {
      step.hidden = i !== state.stepIndex;
    });
    progressDots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === state.stepIndex);
    });
    setError('');
    updateNavigation();
    if (!state.favoritesLoaded && steps[state.stepIndex] === modal.querySelector('[data-onboarding-step="favorites"]')) {
      preloadFavorites();
    }
  }

  function goNext() {
    if (state.stepIndex < totalSteps - 1) {
      if (!validateStep(state.stepIndex)) {
        return;
      }
      showStep(state.stepIndex + 1);
    }
  }

  function goBack() {
    if (state.stepIndex > 0) {
      showStep(state.stepIndex - 1);
    }
  }

  function toggleGenre(button) {
    if (!button) return;
    if (state.stepIndex === 0) {
      setError('');
    }
    const id = Number(button.dataset.genreId);
    if (!Number.isFinite(id)) return;
    if (state.genres.has(id)) {
      state.genres.delete(id);
      button.classList.remove('is-selected');
    } else {
      state.genres.add(id);
      button.classList.add('is-selected');
    }
  }

  function toggleKeyword(button) {
    if (!button) return;
    if (state.stepIndex === 0) {
      setError('');
    }
    const label = normaliseLabel(button.dataset.keywordLabel || button.textContent);
    if (!label) return;
    const idAttr = button.dataset.keywordId;
    const id = idAttr ? Number(idAttr) : null;
    const key = button.dataset.keywordKey || makeKeywordKey(id, label);
    if (!key) return;
    if (state.keywords.has(key)) {
      state.keywords.delete(key);
      button.classList.remove('is-selected');
    } else {
      state.keywords.set(key, { id: id && id > 0 ? id : null, label });
      button.classList.add('is-selected');
    }
  }

  function toggleProvider(button) {
    if (!button) return;
    if (state.stepIndex === 1) {
      setError('');
    }
    const id = Number(button.dataset.providerId);
    if (!Number.isFinite(id)) return;
    if (state.providers.has(id)) {
      state.providers.delete(id);
      button.classList.remove('is-selected');
    } else {
      state.providers.add(id);
      button.classList.add('is-selected');
    }
  }

  function createFavoriteButton(item, isSelectedList) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'onboarding-card onboarding-card--favorite';
    if (isSelectedList) {
      button.classList.add('is-selected');
    }
    button.dataset.favoriteId = String(item.id);
    button.dataset.favoriteMediaType = item.mediaType;
    button.dataset.favoriteLabel = item.label;
    if (item.logo) {
      button.dataset.favoriteLogo = item.logo;
    }
    if (item.logoPath) {
      button.dataset.favoriteLogoPath = item.logoPath;
    }
    button.dataset.favoriteKey = makeFavoriteKey(item.id, item.mediaType);

    const mediaSpan = document.createElement('span');
    mediaSpan.className = 'onboarding-card__media onboarding-card__media--logo';
    mediaSpan.setAttribute('aria-hidden', 'true');

    if (item.logo) {
      const img = document.createElement('img');
      img.src = item.logo;
      img.alt = '';
      mediaSpan.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'onboarding-card__fallback';
      fallback.textContent = item.label.slice(0, 1).toUpperCase();
      mediaSpan.appendChild(fallback);
    }
    button.appendChild(mediaSpan);

    return button;
  }

  function refreshSelectedFavorites() {
    if (!favoritesSelectedGrid) return;
    favoritesSelectedGrid.innerHTML = '';
    state.favorites.forEach((item) => {
      const button = createFavoriteButton(item, true);
      favoritesSelectedGrid.appendChild(button);
    });
  }

  function renderFavoriteResults(items) {
    if (!favoritesGrid) return;
    favoritesGrid.innerHTML = '';
    if (!Array.isArray(items) || items.length === 0) {
      if (favoritesEmpty) {
        favoritesEmpty.hidden = false;
      }
      return;
    }
    if (favoritesEmpty) {
      favoritesEmpty.hidden = true;
    }
    items.forEach((item) => {
      const id = Number(item.tmdb_id ?? item.id ?? 0);
      if (!Number.isFinite(id) || id <= 0) {
        return;
      }
      const mediaType = String(item.media_type ?? 'movie').toLowerCase();
      const label = normaliseLabel(item.title ?? item.name ?? item.label ?? '');
      if (!label) {
        return;
      }
      const logoPath = item.logo_path || '';
      const logo = item.logo_url || buildImageUrl(logoPath);
      const favoriteKey = makeFavoriteKey(id, mediaType);
      const favoriteData = {
        id,
        mediaType,
        label,
        logo,
        logoPath,
      };
      const button = createFavoriteButton(favoriteData, state.favorites.has(favoriteKey));
      favoritesGrid.appendChild(button);
    });
  }

  function setFavoritesLoading(value) {
    if (favoritesLoading) {
      favoritesLoading.hidden = !value;
    }
    if (favoritesGrid) {
      favoritesGrid.classList.toggle('is-loading', Boolean(value));
    }
  }

  function clearFavoriteResults() {
    if (favoritesGrid) {
      favoritesGrid.innerHTML = '';
    }
    if (favoritesEmpty) {
      favoritesEmpty.hidden = true;
    }
  }

  function buildTitlesUrl(query) {
    const endpoint = config.titlesEndpoint || (config.apiUrl ? `${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}resource=titles` : null);
    if (!endpoint) {
      return null;
    }
    try {
      const url = new URL(endpoint, window.location.href);
      if (query) {
        url.searchParams.set('q', query);
      } else {
        url.searchParams.delete('q');
      }
      return url.toString();
    } catch (error) {
      console.error('URL inválida para sugestões de títulos', error);
      return null;
    }
  }

  async function loadFavoriteSuggestions(query) {
    const url = buildTitlesUrl(query);
    if (!url) {
      return;
    }

    if (state.favoriteAbortController) {
      state.favoriteAbortController.abort();
    }
    const controller = new AbortController();
    state.favoriteAbortController = controller;
    if (favoritesEmpty) {
      favoritesEmpty.textContent = 'Nenhum título encontrado. Tente outra busca.';
      favoritesEmpty.hidden = true;
    }
    setFavoritesLoading(true);

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data || data.ok !== true) {
        throw new Error('invalid_response');
      }
      renderFavoriteResults(data.results || []);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Falha ao buscar títulos populares', error);
      clearFavoriteResults();
      if (favoritesEmpty) {
        favoritesEmpty.textContent = 'Não foi possível carregar os títulos agora.';
        favoritesEmpty.hidden = false;
      }
    } finally {
      setFavoritesLoading(false);
    }
  }

  function preloadFavorites() {
    if (state.favoritesLoaded) {
      return;
    }
    state.favoritesLoaded = true;
    loadFavoriteSuggestions(state.favoritesQuery || '');
  }

  function handleFavoritesSearch() {
    const query = normaliseLabel(favoritesSearchInput ? favoritesSearchInput.value : '');
    state.favoritesQuery = query;
    loadFavoriteSuggestions(query);
  }

  function scheduleFavoritesSearch() {
    if (state.favoritesDebounce) {
      window.clearTimeout(state.favoritesDebounce);
    }
    state.favoritesDebounce = window.setTimeout(() => {
      handleFavoritesSearch();
    }, 350);
  }

  function toggleFavorite(button) {
    if (!button) return;
    if (state.stepIndex === totalSteps - 1) {
      setError('');
    }
    const id = Number(button.dataset.favoriteId);
    if (!Number.isFinite(id) || id <= 0) return;
    const mediaType = String(button.dataset.favoriteMediaType || 'movie').toLowerCase();
    const label = normaliseLabel(button.dataset.favoriteLabel || button.textContent);
    if (!label) return;
    const logo = button.dataset.favoriteLogo || '';
    const logoPath = button.dataset.favoriteLogoPath || '';
    const key = button.dataset.favoriteKey || makeFavoriteKey(id, mediaType);
    if (state.favorites.has(key)) {
      state.favorites.delete(key);
      button.classList.remove('is-selected');
    } else {
      state.favorites.set(key, {
        id,
        mediaType,
        label,
        logo,
        logoPath,
      });
      button.classList.add('is-selected');
    }
    refreshSelectedFavorites();
  }

  if (genresGrid) {
    genresGrid.addEventListener('click', (event) => {
      const target = event.target.closest('[data-genre-id]');
      if (!target) return;
      toggleGenre(target);
    });
  }

  if (keywordsGrid) {
    keywordsGrid.addEventListener('click', (event) => {
      const target = event.target.closest('[data-keyword-id], [data-keyword-key]');
      if (!target) return;
      toggleKeyword(target);
    });
  }

  if (keywordForm) {
    keywordForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!keywordInput) return;
      const value = normaliseLabel(keywordInput.value);
      if (!value) {
        return;
      }
      const button = ensureKeywordButton(null, value);
      if (button) {
        button.dataset.keywordId = '';
        toggleKeyword(button);
      }
      keywordInput.value = '';
      keywordInput.focus();
    });
  }

  if (providersGrid) {
    providersGrid.addEventListener('click', (event) => {
      const target = event.target.closest('[data-provider-id]');
      if (!target) return;
      toggleProvider(target);
    });
  }

  if (favoritesGrid) {
    favoritesGrid.addEventListener('click', (event) => {
      const target = event.target.closest('[data-favorite-id]');
      if (!target) return;
      toggleFavorite(target);
    });
  }

  if (favoritesSelectedGrid) {
    favoritesSelectedGrid.addEventListener('click', (event) => {
      const target = event.target.closest('[data-favorite-id]');
      if (!target) return;
      toggleFavorite(target);
    });
  }

  if (favoritesSearchInput) {
    favoritesSearchInput.addEventListener('input', scheduleFavoritesSearch);
    favoritesSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleFavoritesSearch();
      }
    });
  }

  if (favoritesSearchButton) {
    favoritesSearchButton.addEventListener('click', handleFavoritesSearch);
  }

  function validateStep(index) {
    switch (index) {
      case 0:
        if (state.genres.size === 0 && state.keywords.size === 0) {
          setError('Selecione pelo menos um gênero ou palavra-chave para continuar.');
          return false;
        }
        break;
      case 1:
        if (state.providers.size === 0) {
          setError('Escolha pelo menos um provedor disponível para você.');
          return false;
        }
        break;
      case 2:
        if (state.favorites.size === 0) {
          setError('Selecione ao menos um título favorito.');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  }

  function collectPayload() {
    return {
      genres: Array.from(state.genres.values()),
      keywords: Array.from(state.keywords.values()).map((item) => ({
        id: item.id,
        label: item.label,
      })),
      providers: Array.from(state.providers.values()),
      favorites: Array.from(state.favorites.values()).map((item) => ({
        tmdb_id: item.id,
        media_type: item.mediaType,
        title: normaliseLabel(item.label || ''),
        logo_path: item.logoPath || null,
        logo_url: item.logo || null,
      })),
    };
  }

  function setSubmitting(value) {
    state.submitting = Boolean(value);
    updateNavigation();
  }

  async function submitPreferences({ skip = false } = {}) {
    if (!config.apiUrl) {
      closeModal();
      return;
    }

    if (!skip && !validateStep(state.stepIndex)) {
      return;
    }

    setError('');
    setSubmitting(true);

    const payload = skip ? { skip: true } : collectPayload();

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || data.ok !== true) {
        throw new Error(data && data.message ? data.message : 'invalid_response');
      }

      config.required = false;
      closeModal();
    } catch (error) {
      console.error('Falha ao salvar preferências do onboarding', error);
      setError('Não foi possível salvar suas preferências agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function openModal() {
    if (!backdrop) return;
    if (backdrop.hidden) {
      backdrop.hidden = false;
    }
    requestAnimationFrame(() => {
      backdrop.classList.add('is-visible');
      body.classList.add('onboarding-open');
      backdrop.setAttribute('aria-hidden', 'false');
      applyInitialSelections(config.existing);
      showStep(0);
      window.setTimeout(preloadFavorites, 200);
    });
  }

  function closeModal() {
    backdrop.classList.remove('is-visible');
    body.classList.remove('onboarding-open');
    backdrop.setAttribute('aria-hidden', 'true');
    const fallback = window.setTimeout(() => {
      backdrop.hidden = true;
    }, 320);
    const handleTransitionEnd = () => {
      backdrop.hidden = true;
      backdrop.removeEventListener('transitionend', handleTransitionEnd);
      window.clearTimeout(fallback);
    };
    backdrop.addEventListener('transitionend', handleTransitionEnd);
  }

  if (backButton) {
    backButton.addEventListener('click', goBack);
  }

  if (nextButton) {
    nextButton.addEventListener('click', goNext);
  }

  if (finishButton) {
    finishButton.addEventListener('click', () => submitPreferences({ skip: false }));
  }

  if (skipButton) {
    skipButton.addEventListener('click', () => submitPreferences({ skip: true }));
  }

  if (config.required) {
    openModal();
  }
})();

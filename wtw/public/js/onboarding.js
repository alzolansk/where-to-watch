(function () {
  const config = window.wtwOnboarding || {};
  const backdrop = document.querySelector('[data-onboarding-backdrop]');
  const modal = document.querySelector('[data-onboarding-modal]');
  if (!backdrop || !modal) {
    return;
  }

  const steps = Array.from(modal.querySelectorAll('[data-onboarding-step]'));
  const genresStepElement = modal.querySelector('[data-onboarding-step="genres"]');
  const providersStepElement = modal.querySelector('[data-onboarding-step="providers"]');
  const favoritesStepElement = modal.querySelector('[data-onboarding-step="favorites"]');
  const genresStepIndex = genresStepElement ? steps.indexOf(genresStepElement) : 0;
  const providersStepIndex = providersStepElement ? steps.indexOf(providersStepElement) : -1;
  const favoritesStepIndex = favoritesStepElement ? steps.indexOf(favoritesStepElement) : -1;
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
    recommendationsLoaded: false,
    recommendationsAbortController: null,
    initialised: false,
    retryAttempts: {},
  };

  function normaliseLabel(label) {
    return String(label || '').trim().replace(/\s+/g, ' ');
  }

  async function fetchWithRetry(url, options = {}, retries = 2) {
    const retryKey = url.split('?')[0]; // Usa a URL base como chave
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Se foi bem-sucedido, limpa o contador de tentativas
        if (response.ok) {
          delete state.retryAttempts[retryKey];
          return response;
        }
        
        // Se for erro 502 e ainda há tentativas, aguarda antes de tentar novamente
        if (response.status === 502 && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 3000); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Para outros erros ou última tentativa, retorna a resposta
        return response;
      } catch (error) {
        // Se for AbortError, não tenta novamente
        if (error.name === 'AbortError') {
          throw error;
        }
        
        // Se for erro de rede e ainda há tentativas, aguarda antes de tentar novamente
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Última tentativa, lança o erro
        throw error;
      }
    }
  }

  function collectFavoriteFilters() {
    // genres: números inteiros > 0
    const genres = Array.from(state.genres.values())
      .map(v => Number(v))
      .filter(v => Number.isFinite(v) && v > 0);

    const keywordIds = [];
    const keywordLabels = new Set();

    state.keywords.forEach((item) => {
      if (!item) return;
      if (Number.isFinite(item.id) && item.id > 0) {
        keywordIds.push(Number(item.id));
      } else if (item.label) {
        const label = normaliseLabel(item.label);
        if (label) keywordLabels.add(label);
      }
    });

    return {
      genres: Array.from(new Set(genres)),
      keywordIds: Array.from(new Set(keywordIds)),
      keywordLabels: Array.from(keywordLabels.values()),
    };
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

  function extractYear(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      const match = String(value).match(/\d{4}/);
      return match ? match[0] : '';
    }
    return String(date.getUTCFullYear());
  }

  function normaliseMediaType(type) {
    const normalised = String(type || 'movie').toLowerCase();
    return normalised === 'tv' ? 'tv' : 'movie';
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

  function setPreviewStatus(message) {
    if (!previewStatus) return;
    if (message) {
      previewStatus.textContent = message;
      previewStatus.hidden = false;
    } else {
      previewStatus.textContent = '';
      previewStatus.hidden = true;
    }
  }

  function updatePreviewControls() {
    if (previewRefreshButton) {
      previewRefreshButton.disabled = state.submitting || state.previewLoading;
    }
  }

  function buildPreviewMeta(item) {
    if (!item) return '';
    const parts = [];
    const mediaLabel = item.mediaType === 'tv' ? 'Série' : 'Filme';
    parts.push(mediaLabel);
    const year = extractYear(item.releaseDate);
    if (year) {
      parts.push(year);
    }
    if (Array.isArray(item.reasons) && item.reasons.length > 0) {
      parts.push(`Baseado em ${item.reasons.slice(0, 3).join(', ')}`);
    }
    return parts.filter(Boolean).join(' • ');
  }

  function createPreviewSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'onboarding-preview__card onboarding-preview__card--skeleton';

    const poster = document.createElement('div');
    poster.className = 'onboarding-preview__poster';
    card.appendChild(poster);

    const info = document.createElement('div');
    info.className = 'onboarding-preview__info';
    const line1 = document.createElement('span');
    const line2 = document.createElement('span');
    info.appendChild(line1);
    info.appendChild(line2);
    card.appendChild(info);

    return card;
  }

  function renderPreviewSkeleton(count = 6) {
    if (!previewList) return;
    previewList.classList.remove('is-empty');
    previewList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.appendChild(createPreviewSkeletonCard());
    }
    previewList.appendChild(fragment);
  }

  function normalisePreviewItem(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const id = Number(raw.tmdb_id ?? raw.id ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    const mediaType = normaliseMediaType(raw.media_type ?? raw.type);
    const title = normaliseLabel(raw.title ?? raw.name ?? raw.label ?? '');
    if (!title) {
      return null;
    }
    const posterPath = raw.poster_path ?? raw.posterPath ?? raw.backdrop_path ?? null;
    const posterUrl = raw.poster_url ?? raw.posterUrl ?? buildImageUrl(posterPath);
    const releaseDate = raw.release_date ?? raw.first_air_date ?? raw.release_year ?? raw.year ?? '';

    const reasons = [];
    if (raw.match && typeof raw.match === 'object' && raw.match.reasons && typeof raw.match.reasons === 'object') {
      ['genres', 'keywords', 'cast'].forEach((key) => {
        const values = raw.match.reasons[key];
        if (!Array.isArray(values)) {
          return;
        }
        values.slice(0, 3).forEach((value) => {
          const label = normaliseLabel(value);
          if (label) {
            reasons.push(label);
          }
        });
      });
    }

    return {
      id,
      mediaType,
      title,
      posterUrl,
      releaseDate,
      reasons: Array.from(new Set(reasons)),
    };
  }

  function createPreviewCard(item) {
    if (!item) return null;
    const card = document.createElement('article');
    card.className = 'onboarding-preview__card';
    card.dataset.previewId = String(item.id);
    card.dataset.previewMediaType = item.mediaType;

    const poster = document.createElement('div');
    poster.className = 'onboarding-preview__poster';
    if (item.posterUrl) {
      const img = document.createElement('img');
      img.src = item.posterUrl;
      img.alt = '';
      poster.appendChild(img);
    } else {
      const fallback = document.createElement('span');
      fallback.textContent = item.title.slice(0, 1).toUpperCase();
      poster.appendChild(fallback);
    }
    card.appendChild(poster);

    const info = document.createElement('div');
    info.className = 'onboarding-preview__info';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'onboarding-preview__title';
    titleSpan.textContent = item.title;
    info.appendChild(titleSpan);

    const metaSpan = document.createElement('span');
    metaSpan.className = 'onboarding-preview__meta';
    metaSpan.textContent = buildPreviewMeta(item) || 'Recomendação personalizada';
    info.appendChild(metaSpan);

    card.appendChild(info);

    return card;
  }

  function renderPreviewResults(items) {
    if (!previewList) return [];
    previewList.innerHTML = '';
    previewList.classList.remove('is-empty');

    if (!Array.isArray(items) || items.length === 0) {
      previewList.classList.add('is-empty');
      previewList.textContent = 'Não encontramos recomendações no momento. Tente outra combinação.';
      return [];
    }

    const fragment = document.createDocumentFragment();
    const normalisedItems = [];
    items.forEach((rawItem) => {
      const normalised = normalisePreviewItem(rawItem);
      if (!normalised) {
        return;
      }
      const card = createPreviewCard(normalised);
      if (card) {
        fragment.appendChild(card);
        normalisedItems.push(normalised);
      }
    });

    if (normalisedItems.length === 0) {
      previewList.classList.add('is-empty');
      previewList.textContent = 'Não encontramos recomendações no momento. Tente outra combinação.';
      return [];
    }

    previewList.appendChild(fragment);
    return normalisedItems;
  }

  function setPreviewLoading(value, { showSkeleton = false } = {}) {
    state.previewLoading = Boolean(value);
    if (showSkeleton) {
      renderPreviewSkeleton();
    }
    updatePreviewControls();
    updateNavigation();
  }

  function pickPreviewAnchor() {
    if (!Array.isArray(state.previewResults) || state.previewResults.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * state.previewResults.length);
    const candidate = state.previewResults[index];
    if (!candidate) {
      return null;
    }
    const id = Number(candidate.id ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    const mediaType = normaliseMediaType(candidate.mediaType);
    return `${mediaType}:${id}`;
  }

  function buildRecommendationsUrl({ anchor = null, level = null } = {}) {
    const endpoint = config.recommendationsEndpoint || (
      config.apiUrl ? `${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}resource=recommendations` : null
    );
    if (!endpoint) return null;

    try {
      const url = new URL(endpoint, window.location.href);
      if (anchor) {
        url.searchParams.set('anchor', anchor);
      } else {
        url.searchParams.delete('anchor');
      }
      if (Number.isFinite(level)) {
        url.searchParams.set('level', String(level));
      } else {
        url.searchParams.delete('level');
      }
      return url.toString();
    } catch (error) {
      console.error('URL inválida para recomendações do onboarding', error);
      return null;
    }
  }

  async function loadPreviewRecommendations({ anchor = null, level = null, reset = false } = {}) {
    const url = buildRecommendationsUrl({ anchor, level });
    if (!url) {
      state.previewLoaded = true;
      if (!state.previewResults.length) {
        setPreviewStatus('As recomendações estão indisponíveis no momento.');
      }
      return;
    }

    if (state.previewAbortController) {
      state.previewAbortController.abort();
    }

    const controller = new AbortController();
    state.previewAbortController = controller;

    if (reset) {
      state.previewLoaded = false;
      state.previewResults = [];
    }

    setPreviewStatus(anchor ? 'Gerando novas recomendações…' : 'Carregando recomendações personalizadas…');
    setPreviewLoading(true, { showSkeleton: true });

    try {
      const response = await fetchWithRetry(url, {
        method: 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorMessage = response.status === 502 
          ? 'Servidor temporariamente indisponível. Tente novamente em alguns segundos.'
          : `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (!data || data.ok !== true) {
        const errorMsg = data && data.error ? data.error : 'invalid_response';
        console.warn('Resposta de recomendações:', data);
        // Se retornou erro mas com results vazios, não é crítico
        if (errorMsg === 'recommendations_unavailable' && Array.isArray(data.results)) {
          console.warn('Recomendações temporariamente indisponíveis, mostrando vazio');
          const normalisedResults = renderPreviewResults([]);
          state.previewResults = normalisedResults;
          state.previewLoaded = true;
          const userMessage = data.message ? `Erro: ${data.message}` : 'Não foi possível carregar recomendações agora. Tente ajustar suas preferências ou recarregar.';
          setPreviewStatus(userMessage);
          return;
        }
        throw new Error(errorMsg);
      }

      const results = Array.isArray(data.results) ? data.results : [];
      const normalisedResults = renderPreviewResults(results);
      state.previewResults = normalisedResults;
      state.previewLoaded = true;

      if (normalisedResults.length > 0) {
        setPreviewStatus('Veja o que encontramos para você:');
      } else {
        setPreviewStatus('Não encontramos recomendações no momento. Experimente ajustar suas preferências.');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Falha ao carregar recomendações do onboarding:', error.message);
      state.previewLoaded = false;
      state.previewResults = [];
      if (previewList) {
        previewList.classList.add('is-empty');
        previewList.textContent = 'Não foi possível carregar as recomendações agora.';
      }
      setPreviewStatus(error.message || 'Não foi possível carregar as recomendações agora. Tente novamente.');
    } finally {
      setPreviewLoading(false);
      state.previewAbortController = null;
    }
  }

  function preloadPreview(force = false) {
    if (state.previewLoading) {
      if (!force) {
        return;
      }
      if (state.previewAbortController) {
        state.previewAbortController.abort();
      }
    }
    if (!force && state.previewLoaded) {
      return;
    }
    state.previewLoaded = false;
    state.previewResults = [];
    loadPreviewRecommendations({ reset: true });
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
    const disableForward = state.submitting;

    if (backButton) {
      backButton.disabled = isFirst || state.submitting;
    }
    if (nextButton) {
      nextButton.hidden = isLast;
      nextButton.disabled = disableForward;
    }
    if (finishButton) {
      const showFinish = isLast;
      finishButton.hidden = !showFinish;
      finishButton.classList.toggle('is-visible', showFinish);
      finishButton.disabled = disableForward;
    }
    if (skipButton) {
      skipButton.disabled = state.submitting;
    }
  }

  function showStep(index) {
    state.stepIndex = Math.min(Math.max(index, 0), totalSteps - 1);
    steps.forEach((step, i) => { step.hidden = i !== state.stepIndex; });
    progressDots.forEach((dot, i) => { dot.classList.toggle('is-active', i === state.stepIndex); });
    setError(''); 
    updateNavigation();

    // Carrega favoritos/recomendações quando entrar na etapa de favoritos
    if (!state.favoritesLoaded && state.stepIndex === favoritesStepIndex) {
      preloadFavorites(true);
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

  function handlePreferenceChange() {
    // Quando preferências mudam, reseta o cache de favoritos/recomendações
    if (favoritesStepIndex !== -1) {
      state.favoritesLoaded = false;
      state.recommendationsLoaded = false;
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
    handlePreferenceChange();
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
    handlePreferenceChange();
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
    
    // Adiciona o título do filme/série
    const labelSpan = document.createElement('span');
    labelSpan.className = 'onboarding-card__label';
    labelSpan.textContent = item.label;
    button.appendChild(labelSpan);

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
    const endpoint = config.titlesEndpoint || (
      config.apiUrl ? `${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}resource=titles` : null
    );
    if (!endpoint) return null;

    try {
      const url = new URL(endpoint, window.location.href);
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');

      // ➜ aplica filtros coletados
      const filters = collectFavoriteFilters();
      ['genres', 'keyword_ids', 'keyword_labels'].forEach((k) => {
        url.searchParams.delete(k);
        url.searchParams.delete(`${k}[]`);
      });
      filters.genres.forEach(id => url.searchParams.append('genres[]', String(id)));
      filters.keywordIds.forEach(id => url.searchParams.append('keyword_ids[]', String(id)));
      filters.keywordLabels.forEach(label => url.searchParams.append('keyword_labels[]', label));

      return url.toString();
    } catch (e) {
      console.error('URL inválida para sugestões de títulos', e);
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
      // Carrega resultados de busca OU títulos personalizados
      const response = await fetchWithRetry(url, {
        method: 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorMessage = response.status === 502 
          ? 'Servidor temporariamente indisponível'
          : `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (!data || data.ok !== true) {
        const errorMsg = data && data.error ? data.error : 'invalid_response';
        if (errorMsg === 'tmdb_unavailable' && Array.isArray(data.results)) {
          console.warn('TMDB temporariamente indisponível, mostrando resultados vazios');
          renderFavoriteResults([]);
          return;
        }
        throw new Error(errorMsg);
      }
      
      let results = data.results || [];
      
      // Se não há query de busca E ainda não carregamos recomendações, mescla com títulos gerais
      if (!query && !state.recommendationsLoaded) {
        console.log('🎬 Carregando títulos gerais para mesclar...');
        const generalTitles = await loadGeneralTitlesQuietly();
        console.log('🎬 Títulos gerais recebidos:', generalTitles.length);
        console.log('🎬 Títulos filtrados por preferências:', results.length);
        
        if (generalTitles && generalTitles.length > 0) {
          // Mescla títulos filtrados (baseados em preferências) com títulos gerais
          const maxTotal = 18;
          
          // Remove duplicatas: títulos filtrados têm prioridade
          const filteredKeys = new Set(results.map(r => `${r.media_type || 'movie'}:${r.tmdb_id || r.id}`));
          const uniqueGeneralTitles = generalTitles.filter(r => {
            const key = `${r.media_type || 'movie'}:${r.tmdb_id || r.id}`;
            return !filteredKeys.has(key);
          });
          
          console.log('🎬 Títulos gerais únicos:', uniqueGeneralTitles.length);
          
          // Mescla intercalando: 2 filtrados, 1 geral, 2 filtrados, 1 geral...
          const merged = [];
          let filteredIndex = 0;
          let generalIndex = 0;
          
          while (merged.length < maxTotal) {
            // Adiciona 2 títulos filtrados
            for (let i = 0; i < 2 && filteredIndex < results.length && merged.length < maxTotal; i++) {
              merged.push(results[filteredIndex++]);
            }
            // Adiciona 1 título geral
            if (generalIndex < uniqueGeneralTitles.length && merged.length < maxTotal) {
              merged.push(uniqueGeneralTitles[generalIndex++]);
            }
            // Evita loop infinito
            if (filteredIndex >= results.length && generalIndex >= uniqueGeneralTitles.length) {
              break;
            }
          }
          
          results = merged;
          console.log('🎬 Total de resultados após mesclagem:', results.length);
        }
        state.recommendationsLoaded = true;
      }
      
      renderFavoriteResults(results);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Falha ao buscar títulos:', error.message);
      clearFavoriteResults();
      if (favoritesEmpty) {
        favoritesEmpty.textContent = error.message === 'Servidor temporariamente indisponível'
          ? 'Servidor temporariamente indisponível. Aguarde alguns segundos e tente novamente.'
          : 'Não foi possível carregar os títulos agora.';
        favoritesEmpty.hidden = false;
      }
    } finally {
      setFavoritesLoading(false);
    }
  }

  async function loadGeneralTitlesQuietly() {
    // Carrega títulos gerais (trending) sem filtros de preferências
    const endpoint = config.titlesEndpoint || (
      config.apiUrl ? `${config.apiUrl}${config.apiUrl.includes('?') ? '&' : '?'}resource=titles` : null
    );
    
    console.log('🔍 Endpoint de títulos gerais:', endpoint);
    
    if (!endpoint) {
      console.warn('⚠️ Endpoint de títulos não configurado');
      return [];
    }

    try {
      console.log('🌐 Fazendo requisição para títulos gerais (sem filtros)...');
      const response = await fetchWithRetry(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
      }, 1);

      console.log('📡 Resposta recebida:', response.ok, response.status);
      
      if (!response.ok) {
        console.warn('⚠️ Resposta não OK:', response.status);
        return [];
      }
      
      const data = await response.json();
      console.log('📦 Dados recebidos (títulos gerais)');
      
      if (!data || data.ok !== true) {
        console.warn('⚠️ Dados inválidos ou ok !== true');
        return [];
      }
      
      const results = Array.isArray(data.results) ? data.results : [];
      console.log('✅ Títulos gerais processados:', results.length);
      return results;
    } catch (error) {
      console.error('❌ Erro ao carregar títulos gerais:', error.message);
      return [];
    }
  }

  function preloadFavorites(force = false) {
    if (state.favoritesLoaded && !force) {
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
    if (state.stepIndex === favoritesStepIndex) {
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
      
      // Atualiza todos os botões com o mesmo ID em todos os grids
      if (favoritesGrid) {
        const matchingButtons = favoritesGrid.querySelectorAll(`[data-favorite-key="${key}"]`);
        matchingButtons.forEach(btn => btn.classList.remove('is-selected'));
      }
    } else {
      state.favorites.set(key, {
        id,
        mediaType,
        label,
        logo,
        logoPath,
      });
      button.classList.add('is-selected');
      
      // Atualiza todos os botões com o mesmo ID em todos os grids
      if (favoritesGrid) {
        const matchingButtons = favoritesGrid.querySelectorAll(`[data-favorite-key="${key}"]`);
        matchingButtons.forEach(btn => btn.classList.add('is-selected'));
      }
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
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(target);
    });
  }

  if (favoritesSelectedGrid) {
    favoritesSelectedGrid.addEventListener('click', (event) => {
      const target = event.target.closest('[data-favorite-id]');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
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
    if (index === genresStepIndex) {
      if (state.genres.size === 0 && state.keywords.size === 0) {
        setError('👆 Selecione pelo menos um gênero ou palavra-chave para continuar.');
        return false;
      }
      return true;
    }

    if (index === providersStepIndex) {
      if (state.providers.size === 0) {
        setError('📺 Escolha pelo menos um provedor disponível para você.');
        return false;
      }
      return true;
    }

    if (index === favoritesStepIndex) {
      if (state.favorites.size === 0) {
        setError('🎬 Selecione ao menos um título favorito para personalizar suas recomendações.');
        return false;
      }
      return true;
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
      state.favoritesLoaded = false;
      state.favoritesQuery = '';
      state.recommendationsLoaded = false;
      showStep(0);
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

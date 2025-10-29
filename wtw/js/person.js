// person.js – nova experiência de timeline e filmografia com caching, filtros e acessibilidade

document.addEventListener('DOMContentLoaded', () => {
  const pageShell = document.querySelector('.page-shell');
  const skeleton = document.getElementById('personSkeleton');

  const setLoadingState = (isLoading) => {
    if (pageShell) {
      pageShell.classList.toggle('is-loading', isLoading);
    }
    if (skeleton) {
      skeleton.setAttribute('aria-hidden', String(!isLoading));
    }
  };

  setLoadingState(true);

  const runtimeConfig = (typeof window !== 'undefined' && window.__WY_WATCH_CONFIG__) || {};
  const apiKey = runtimeConfig.tmdbApiKey || '';
  const preferredRegion = (runtimeConfig.defaultRegion || 'BR').toUpperCase();
  const tmdbBaseUrl = (runtimeConfig.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
  const providerRegionPriority = [preferredRegion, 'BR', 'US', 'CA', 'GB'];

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
    setLoadingState(false);
    console.error('[WYWatch] TMDB API key não configurada – página de pessoa não pode ser carregada.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const personId = params.get('personId');

  if (!personId) {
    setLoadingState(false);
    console.error('personId ausente');
    return;
  }

  const personUrl = tmdbUrl(`/person/${personId}`, {
    api_key: apiKey,
    language: 'pt-BR',
    append_to_response: 'external_ids,images'
  });
  const creditsUrl = tmdbUrl(`/person/${personId}/combined_credits`, {
    api_key: apiKey,
    language: 'pt-BR'
  });

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  const PROVIDER_TTL = 10 * 60 * 1000; // 10 minutos

  const storage = (() => {
    try {
      return window.sessionStorage;
    } catch (err) {
      return null;
    }
  })();

  const cacheKey = `wyw-person-${personId}`;
  const preferencesKey = `wyw-filmography-preferences-${personId}`;
  const timelineModeKey = `wyw-timeline-mode-${personId}`;
  const genreCacheKey = 'wyw-genre-cache';

  const waitForImages = (container) => new Promise((resolve) => {
    const scope = container || document;
    const allImages = scope ? scope.querySelectorAll('img') : [];
    const images = Array.from(allImages).filter((img) => !(img && img.loading === 'lazy' && !img.complete));
    if (!images.length) {
      resolve();
      return;
    }
    let loaded = 0;
    const check = () => {
      loaded += 1;
      if (loaded >= images.length) {
        resolve();
      }
    };
    images.forEach((img) => {
      if (img.complete) {
        check();
      } else {
        img.addEventListener('load', check, { once: true });
        img.addEventListener('error', check, { once: true });
      }
    });
    setTimeout(resolve, 4000);
  });

  const dom = {
    name: document.getElementById('person-name'),
    prof1: document.getElementById('profession-label-1'),
    prof2: document.getElementById('profession-label-2'),
    bioH3: document.getElementById('bio-h3'),
    bio: document.getElementById('person-bio'),
    photo: document.getElementById('person-img'),
    metaChips: document.getElementById('personMetaChips'),
    external: document.getElementById('externalLinks'),
    infoGrid: document.getElementById('infoGrid'),
    timelineShell: document.querySelector('.timeline-shell'),
    timelineContent: document.getElementById('timeline-container'),
    timelineYearNav: document.getElementById('timelineYearNav'),
    timelineDecadeChips: document.getElementById('timelineDecadeChips'),
    timelineRoleFilter: document.getElementById('timelineRoleFilter'),
    timelineModeToggle: document.getElementById('timelineModeToggle'),
    timelineModeLabel: document.getElementById('timelineModeLabel'),
    timelineMiniPhoto: document.getElementById('timelineActorPhoto'),
    timelineMiniName: document.getElementById('timelineActorName'),
    timelineMiniMeta: document.getElementById('timelineActorMeta'),
    followBtn: document.getElementById('followActorBtn'),
    favoriteBtn: document.getElementById('favoriteActorBtn'),
    watchlistBtn: document.getElementById('watchlistActorBtn'),
    backToTop: document.getElementById('backToTopButton'),
    allBtn: document.getElementById('show-all-movies'),
    allModal: document.getElementById('moviesModal'),
    closeAll: document.getElementById('closeMoviesModal'),
    modalTitle: document.getElementById('moviesModalTitle'),
    modalActorPhoto: document.getElementById('modalActorPhoto'),
    modalResultCount: document.getElementById('modalResultCount'),
    modalEmptyState: document.getElementById('modalEmptyState'),
    modalSearch: document.getElementById('modalFilmographySearch'),
    modalSortSelect: document.getElementById('modalSortSelect'),
    modalRoleSelect: document.getElementById('modalRoleSelect'),
    modalProviderSelect: document.getElementById('modalProviderSelect'),
    modalGenreSelect: document.getElementById('modalGenreSelect'),
    modalTabs: document.querySelectorAll('.modal-tab'),
    filmographyPanels: document.querySelectorAll('.filmography-panel'),
    moviesList: document.getElementById('moviesList'),
    tvList: document.getElementById('tvList'),
    crewList: document.getElementById('crewList'),
    loadMoreButtons: Array.from(document.querySelectorAll('.load-more-btn')),
    timelineSection: document.getElementById('timeline-container') ? document.getElementById('timeline-container').closest('.card-section') : null,
    coworkersGrid: document.getElementById('coworkersGrid'),
    coworkersSection: document.getElementById('coworkersSection'),
    coworkersCTA: document.getElementById('openCoworkersCarousel')
  };

  const modalLists = {
    movies: dom.moviesList,
    tv: dom.tvList,
    crew: dom.crewList
  };

  const modalPanels = {
    movies: document.getElementById('filmographyMovies'),
    tv: document.getElementById('filmographyTv'),
    crew: document.getElementById('filmographyCrew')
  };

  const modalLoadMoreButtons = {
    movies: dom.loadMoreButtons.find((btn) => btn.dataset.target === 'moviesList'),
    tv: dom.loadMoreButtons.find((btn) => btn.dataset.target === 'tvList'),
    crew: dom.loadMoreButtons.find((btn) => btn.dataset.target === 'crewList')
  };

  const providerCache = new Map();
  const providerRequests = new Map();
  const entryDomRegistry = new Map();
  let providersPrefetched = false;
  const genreMaps = { movie: new Map(), tv: new Map() };
  let timelineObserver = null;

  const filmographyState = {
    allEntries: [],
    groupedTimeline: new Map(),
    sortedYears: [],
    decades: [],
    roleFilter: 'all',
    activeYear: null,
    timelineMode: 'grid',
    providerOptions: new Map(),
    genreOptions: new Map(),
    modal: {
      activeTab: 'movies',
      search: '',
      searchNormalized: '',
      sort: 'yearDesc',
      role: 'all',
      genre: 'all',
      provider: 'all',
      itemsPerPage: 24,
      pagination: {
        movies: 24,
        tv: 24,
        crew: 24
      }
    },
    filmographyCollections: {
      movies: [],
      tv: [],
      crew: []
    }
  };

  const storedTimelineMode = storage ? storage.getItem(timelineModeKey) : null;
  if (storedTimelineMode === 'timeline' || storedTimelineMode === 'grid') {
    filmographyState.timelineMode = storedTimelineMode;
  }

  const focusTrap = {
    handler: null,
    previousActive: null
  };

  const normalize = (value = '') => value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const img = (path, size = 'w500') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : '');

  const safeParseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const inferCrewCategory = (job = '') => {
    const lower = job.toLowerCase();
    if (lower.includes('director') || lower.includes('direção')) return 'directing';
    if (lower.includes('producer') || lower.includes('produção')) return 'production';
    return 'crew';
  };

  const pickRoleLabel = (entry) => {
    if (!entry || !Array.isArray(entry.roles)) return '';
    const acting = entry.roles.find((role) => role.type === 'acting' && role.label);
    if (acting && acting.label) {
      return acting.label;
    }
    const directing = entry.roles.find((role) => role.type === 'directing' && role.label);
    if (directing && directing.label) return directing.label;
    const production = entry.roles.find((role) => role.type === 'production' && role.label);
    if (production && production.label) return production.label;
    const fallback = entry.roles.find((role) => role.label);
    return fallback ? fallback.label : '';
  };

  const roleMatchesFilter = (entry, filter) => {
    if (!entry) return false;
    if (filter === 'all') return true;
    return entry.roleCategories.has(filter);
  };

  const getSessionCache = (key) => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.timestamp || (Date.now() - parsed.timestamp) > CACHE_TTL) {
        storage.removeItem(key);
        return null;
      }
      return parsed.payload;
    } catch (err) {
      console.warn('Falha ao ler cache da sessão:', err);
      return null;
    }
  };

  const setSessionCache = (key, payload) => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify({ timestamp: Date.now(), payload }));
    } catch (err) {
      console.warn('Não foi possível salvar no sessionStorage:', err);
    }
  };

  const loadModalPreferences = () => {
    if (!storage) return;
    try {
      const raw = storage.getItem(preferencesKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        filmographyState.modal = {
          ...filmographyState.modal,
          ...parsed,
          pagination: {
            ...filmographyState.modal.pagination,
            ...(parsed.pagination || {})
          }
        };
        filmographyState.modal.searchNormalized = normalize(filmographyState.modal.search || '');
        if (!filmographyState.modal.genre) {
          filmographyState.modal.genre = 'all';
        }
      }
    } catch (err) {
      console.warn('Não foi possível restaurar preferências da filmografia:', err);
    }
  };

  const saveModalPreferences = () => {
    if (!storage) return;
    try {
      storage.setItem(preferencesKey, JSON.stringify(filmographyState.modal));
    } catch (err) {
      console.warn('Não foi possível salvar preferências da filmografia:', err);
    }
  };

  const toggleButtonState = (button) => {
    if (!button) return;
    button.classList.toggle('is-active');
    const isActive = button.classList.contains('is-active');
    button.setAttribute('aria-pressed', String(isActive));
  };

  const setupToggleButton = (button) => {
    if (!button) return;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      toggleButtonState(button);
    });
  };

  setupToggleButton(dom.followBtn);
  setupToggleButton(dom.favoriteBtn);
  setupToggleButton(dom.watchlistBtn);


  const registerEntryDom = (entry, context, refs) => {
    if (!entry) return;
    if (!entryDomRegistry.has(entry.key)) {
      entryDomRegistry.set(entry.key, { timeline: [], movies: [], tv: [], crew: [] });
    }
    const registry = entryDomRegistry.get(entry.key);
    if (registry && registry[context]) {
      registry[context].push(refs);
    }
  };

  const buildTimelineTooltip = (entry) => {
    if (!entry) return '';
    const roleLabel = pickRoleLabel(entry);
    const providerName = entry && entry.providerPrimary ? entry.providerPrimary.name : '';
    if (roleLabel && providerName) return `${roleLabel} — ${providerName}`;
    if (roleLabel) return roleLabel;
    if (providerName) return `Disponível em ${providerName}`;
    return entry.title || '';
  };

  const buildTimelineAria = (entry) => {
    if (!entry) return '';
    const parts = [entry.title];
    if (entry.year) parts.push(`Ano ${entry.year}`);
    const roleLabel = pickRoleLabel(entry);
    if (roleLabel) parts.push(roleLabel);
    if (entry.providerPrimary && entry.providerPrimary.name) {
      parts.push(`Disponível em ${entry.providerPrimary.name}`);
    }
    return parts.filter(Boolean).join(' • ');
  };

  const updateEntryTooltip = (entry) => {
    if (!entry) return;
    const registry = entryDomRegistry.get(entry.key);
    if (!registry) return;
    const tooltip = buildTimelineTooltip(entry);
    const aria = buildTimelineAria(entry);
    Object.values(registry).forEach((refs = []) => {
      refs.forEach(({ card }) => {
        if (!card) return;
        if (tooltip) {
          card.setAttribute('data-tooltip', tooltip);
        } else {
          card.removeAttribute('data-tooltip');
        }
        if (aria) {
          card.setAttribute('aria-label', aria);
        }
      });
    });
  };

  const updateProviderNodes = (entry) => {
    if (!entry) return;
    const registry = entryDomRegistry.get(entry.key);
    if (!registry) return;
    const provider = entry.providerPrimary;
    const hasProvider = Boolean(provider);
    const updateSet = (set) => {
      set.forEach(({ providerNode }) => {
        if (!providerNode) return;
        if (!hasProvider) {
          providerNode.classList.add('is-hidden');
          providerNode.innerHTML = '';
          return;
        }
        providerNode.classList.remove('is-hidden');
        providerNode.innerHTML = '';
        if (provider.logo) {
          const logoImg = document.createElement('img');
          logoImg.src = provider.logo;
          logoImg.alt = '';
          providerNode.appendChild(logoImg);
        }
        const label = document.createElement('span');
        label.textContent = provider.name;
        providerNode.appendChild(label);
      });
    };
    updateSet(registry.timeline || []);
    updateSet(registry.movies || []);
    updateSet(registry.tv || []);
    updateSet(registry.crew || []);
    updateEntryTooltip(entry);
  };

  const ensureProviderInfo = async (entry) => {
    if (!entry || entry.providerFetched) {
      return entry ? entry.providerInfo : null;
    }
    entry.providerFetched = true;
    try {
      const info = await fetchProviders(entry.mediaType, entry.id);
      entry.providerInfo = info;
      entry.providerPrimary = info ? info.primary : null;
      entry.hasProvider = Boolean(info && info.providers && info.providers.length);
      entry.providerIds = new Set((info && info.providers ? info.providers : []).map((provider) => provider.id));
      updateProviderOptions(info);
      updateProviderNodes(entry);
      return info;
    } catch (err) {
      entry.providerFetched = false;
      console.warn('Não foi possível obter provedores para', entry.id, err);
      return null;
    }
  };

  const updateProviderOptions = (providerInfo) => {
    if (!providerInfo || !Array.isArray(providerInfo.providers)) return;
    providerInfo.providers.forEach((provider) => {
      if (!filmographyState.providerOptions.has(provider.id)) {
        filmographyState.providerOptions.set(provider.id, {
          id: provider.id,
          name: provider.name,
          logo: provider.logo
        });
      }
    });
    refreshProviderOptions();
  };

  const ensureGenresLoaded = async () => {
    if (genreMaps.movie.size && genreMaps.tv.size) return;
    const cached = getSessionCache(genreCacheKey);
    if (cached && cached.movie && cached.tv) {
      try {
        cached.movie.forEach(([id, name]) => genreMaps.movie.set(Number(id), name));
        cached.tv.forEach(([id, name]) => genreMaps.tv.set(Number(id), name));
        return;
      } catch (err) {
        console.warn('Falha ao restaurar cache de gêneros:', err);
        genreMaps.movie.clear();
        genreMaps.tv.clear();
      }
    }
    try {
      const [movieRes, tvRes] = await Promise.all([
        fetch(tmdbUrl('/genre/movie/list', { api_key: apiKey, language: 'pt-BR' })),
        fetch(tmdbUrl('/genre/tv/list', { api_key: apiKey, language: 'pt-BR' }))
      ]);
      if (movieRes.ok) {
        const data = await movieRes.json();
        (data.genres || []).forEach((genre) => {
          if (genre && Number.isFinite(Number(genre.id))) {
            genreMaps.movie.set(Number(genre.id), genre.name);
          }
        });
      }
      if (tvRes.ok) {
        const data = await tvRes.json();
        (data.genres || []).forEach((genre) => {
          if (genre && Number.isFinite(Number(genre.id))) {
            genreMaps.tv.set(Number(genre.id), genre.name);
          }
        });
      }
      if (genreMaps.movie.size || genreMaps.tv.size) {
        setSessionCache(genreCacheKey, {
          movie: Array.from(genreMaps.movie.entries()),
          tv: Array.from(genreMaps.tv.entries())
        });
      }
    } catch (err) {
      console.warn('Não foi possível carregar gêneros do TMDB:', err);
    }
  };

  const refreshGenreOptions = () => {
    if (!dom.modalGenreSelect) return;
    const previous = dom.modalGenreSelect.value || 'all';
    dom.modalGenreSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'Todos os gêneros';
    dom.modalGenreSelect.appendChild(defaultOption);
    const entries = Array.from(filmographyState.genreOptions.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    entries.forEach(([id, name]) => {
      const option = document.createElement('option');
      option.value = String(id);
      option.textContent = name;
      dom.modalGenreSelect.appendChild(option);
    });
    if (entries.some(([id]) => String(id) === previous)) {
      dom.modalGenreSelect.value = previous;
    } else {
      dom.modalGenreSelect.value = 'all';
      filmographyState.modal.genre = 'all';
    }
  };

  const populateGenreOptions = (entries) => {
    filmographyState.genreOptions.clear();
    entries.forEach((entry) => {
      if (!entry || !entry.genreIds) return;
      const dictionary = entry.mediaType === 'movie' ? genreMaps.movie : genreMaps.tv;
      entry.genreIds.forEach((id) => {
        const name = dictionary.get(id);
        if (name) {
          filmographyState.genreOptions.set(id, name);
        }
      });
    });
    refreshGenreOptions();
  };

  const fetchProviders = async (mediaType, id) => {
    if (!mediaType || !id) return null;
    const key = `${mediaType}-${id}`;
    const cached = providerCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < PROVIDER_TTL) {
      return cached.data;
    }
    if (providerRequests.has(key)) {
      return providerRequests.get(key);
    }
    const request = (async () => {
      try {
        const url = tmdbUrl(`/${mediaType}/${id}/watch/providers`, { api_key: apiKey });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Falha ao obter provedores (${response.status})`);
        }
        const data = await response.json();
        const result = data && data.results ? data.results : {};
        const regionKey = providerRegionPriority.find((region) => result[region]) || Object.keys(result)[0];
        const regionData = regionKey ? result[regionKey] : null;
        if (!regionData) {
          providerCache.set(key, { timestamp: Date.now(), data: null });
          return null;
        }
        const categories = ['flatrate', 'free', 'ads', 'rent', 'buy'];
        let primary = null;
        const providers = [];
        categories.forEach((category) => {
          const list = Array.isArray(regionData[category]) ? regionData[category] : [];
          list.forEach((provider) => {
            providers.push({
              id: provider.provider_id,
              name: provider.provider_name,
              logo: provider.logo_path ? img(provider.logo_path, 'w45') : '',
              category
            });
          });
          if (!primary && list.length) {
            const first = list[0];
            primary = {
              id: first.provider_id,
              name: first.provider_name,
              logo: first.logo_path ? img(first.logo_path, 'w45') : '',
              category
            };
          }
        });
        const payload = providers.length ? { providers, primary, region: regionKey } : null;
        providerCache.set(key, { timestamp: Date.now(), data: payload });
        return payload;
      } finally {
        providerRequests.delete(key);
      }
    })();
    providerRequests.set(key, request);
    return request;
  };

  const aggregateCredits = (credits) => {
    const map = new Map();
    const addEntry = (item, type, label) => {
      if (!item || !item.id) return;
      const mediaType = (item.media_type || (item.title ? 'movie' : 'tv')).toLowerCase();
      if (mediaType !== 'movie' && mediaType !== 'tv') return;
      const key = `${mediaType}-${item.id}`;
      if (!map.has(key)) {
        const releaseDate = item.release_date || item.first_air_date || '';
        const parsedDate = safeParseDate(releaseDate);
        const year = releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : null;
        map.set(key, {
          key,
          id: item.id,
          mediaType,
          title: item.title || item.name || 'Título não informado',
          originalTitle: item.original_title || item.original_name || '',
          posterPath: item.poster_path,
          backdropPath: item.backdrop_path,
          releaseDate,
          year: Number.isFinite(year) ? year : null,
          dateSort: parsedDate ? parsedDate.getTime() : 0,
          popularity: item.popularity || 0,
          voteAverage: item.vote_average || 0,
          voteCount: item.vote_count || 0,
          roles: [],
          roleCategories: new Set(),
          normalizedTitle: normalize(item.title || item.name || ''),
          providerInfo: null,
          providerPrimary: null,
          providerIds: new Set(),
          hasProvider: false,
          providerFetched: false,
          genreIds: new Set((Array.isArray(item.genre_ids) ? item.genre_ids : [])
            .map((genreId) => Number(genreId))
            .filter((genreId) => Number.isFinite(genreId)))
        });
      }
      const entry = map.get(key);
      if (!entry) return;
      const genres = Array.isArray(item.genre_ids) ? item.genre_ids : [];
      genres.forEach((genreId) => {
        const numericId = Number(genreId);
        if (Number.isFinite(numericId)) {
          entry.genreIds.add(numericId);
        }
      });
      const roleLabel = label || '';
      entry.roles.push({ type, label: roleLabel });
      if (type === 'acting') {
        entry.roleCategories.add('acting');
      } else {
        entry.roleCategories.add(type);
      }
    };

    (credits.cast || []).forEach((item) => {
      const label = item.character || (Array.isArray(item.roles) ? item.roles.map((role) => role.character).filter(Boolean).join(', ') : '');
      addEntry(item, 'acting', label);
    });
    (credits.crew || []).forEach((item) => {
      const job = item.job || item.department || '';
      const category = inferCrewCategory(job);
      addEntry(item, category, job);
    });
    return Array.from(map.values());
  };

  const buildTimelineGroups = (entries) => {
    const filtered = entries.filter((entry) => entry.year);
    filtered.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.dateSort !== a.dateSort) return b.dateSort - a.dateSort;
      return b.popularity - a.popularity;
    });
    const grouped = new Map();
    filtered.forEach((entry) => {
      if (!grouped.has(entry.year)) {
        grouped.set(entry.year, []);
      }
      grouped.get(entry.year).push(entry);
    });
    return grouped;
  };

  const computeDecades = (years) => {
    const decades = new Set();
    years.forEach((year) => {
      const decade = Math.floor(year / 10) * 10;
      decades.add(decade);
    });
    return Array.from(decades).sort((a, b) => b - a);
  };

  const refreshProviderOptions = () => {
    if (!dom.modalProviderSelect) return;
    const previous = dom.modalProviderSelect.value || 'all';
    dom.modalProviderSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'Todos os provedores';
    dom.modalProviderSelect.appendChild(defaultOption);
    const providers = Array.from(filmographyState.providerOptions.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = String(provider.id);
      option.textContent = provider.name;
      dom.modalProviderSelect.appendChild(option);
    });
    if (providers.some((provider) => String(provider.id) === previous)) {
      dom.modalProviderSelect.value = previous;
    } else {
      dom.modalProviderSelect.value = 'all';
      filmographyState.modal.provider = 'all';
    }
  };

  const renderHero = (person) => {
    if (!person) return;
    dom.name.textContent = person.name || '-';
    if (dom.modalTitle) {
      dom.modalTitle.textContent = person.name ? `Filmografia de ${person.name}` : 'Todos os trabalhos';
    }
    const department = person.known_for_department || 'Profissional';
    dom.prof1.textContent = department;
    dom.prof2.textContent = department;
    const photo = img(person.profile_path, 'w500') || 'imagens/icon-cast.png';
    dom.photo.src = photo;
    dom.photo.alt = person.name ? `Foto de ${person.name}` : 'Foto do(a) artista';
    if (dom.modalActorPhoto) {
      dom.modalActorPhoto.src = img(person.profile_path, 'w185') || 'imagens/icon-cast.png';
      dom.modalActorPhoto.alt = person.name ? `Foto de ${person.name}` : 'Foto do(a) artista';
    }
    if (dom.timelineMiniPhoto) {
      dom.timelineMiniPhoto.src = img(person.profile_path, 'w154') || 'imagens/icon-cast.png';
      dom.timelineMiniPhoto.alt = person.name ? `Foto de ${person.name}` : 'Foto do(a) artista';
    }
    if (dom.timelineMiniName) {
      dom.timelineMiniName.textContent = person.name || '-';
    }
    const biography = (person.biography || '').trim();
    if (!biography) {
      dom.bioH3.style.display = 'none';
      dom.bio.textContent = '';
    } else {
      dom.bioH3.style.display = 'block';
      dom.bio.textContent = biography.split('\n')[0];
    }
    const chips = [];
    if (person.birthday) {
      try {
        const birth = new Date(person.birthday);
        chips.push(`Nascimento - ${birth.toLocaleDateString('pt-BR')}`);
      } catch (_) {}
    }
    if (person.deathday) {
      try {
        const death = new Date(person.deathday);
        chips.push(`Falecimento - ${death.toLocaleDateString('pt-BR')}`);
      } catch (_) {}
    }
    if (person.place_of_birth) chips.push(person.place_of_birth);
    dom.metaChips.innerHTML = '';
    chips.forEach((chip) => {
      const span = document.createElement('span');
      span.className = 'meta-chip';
      span.textContent = chip;
      dom.metaChips.appendChild(span);
    });
  };

  const renderInfo = (person) => {
    if (!person) return;
    const rows = [
      { label: 'Popularidade', value: (person.popularity || 0).toFixed(0) },
      { label: 'Departamento', value: person.known_for_department || '-' },
      { label: 'Também conhecido(a) como', value: (person.also_known_as || []).slice(0, 3).join(', ') || '-' }
    ];
    if (person.birthday) {
      rows.unshift({ label: 'Nascimento', value: new Date(person.birthday).toLocaleDateString('pt-BR') });
    }
    if (person.deathday) {
      rows.push({ label: 'Falecimento', value: new Date(person.deathday).toLocaleDateString('pt-BR') });
    }
    if (person.place_of_birth) {
      rows.push({ label: 'Local de nascimento', value: person.place_of_birth });
    }
    dom.infoGrid.innerHTML = '';
    rows.forEach((row) => {
      const card = document.createElement('div');
      card.className = 'info-card';
      card.innerHTML = `<div class="label">${row.label}</div><div class="value">${row.value}</div>`;
      dom.infoGrid.appendChild(card);
    });
  };

  const renderExternal = (external = {}, homepage) => {
    const links = [
      external.instagram_id && { href: `https://instagram.com/${external.instagram_id}`, label: 'Instagram' },
      external.twitter_id && { href: `https://x.com/${external.twitter_id}`, label: 'Twitter/X' },
      external.facebook_id && { href: `https://facebook.com/${external.facebook_id}`, label: 'Facebook' },
      homepage && { href: homepage, label: 'Site oficial' }
    ].filter(Boolean);
    dom.external.innerHTML = '';
    links.forEach((link) => {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = link.label;
      dom.external.appendChild(anchor);
    });
  };

  const renderTimeline = () => {
    if (!dom.timelineContent) return;
    entryDomRegistry.forEach((refs) => {
      if (refs && Array.isArray(refs.timeline)) {
        refs.timeline.length = 0;
      }
    });
    const years = filmographyState.sortedYears;
    const fragment = document.createDocumentFragment();
    const availableYears = [];
    dom.timelineContent.innerHTML = '';
    years.forEach((year) => {
      const entries = filmographyState.groupedTimeline.get(year) || [];
      const filtered = entries.filter((entry) => roleMatchesFilter(entry, filmographyState.roleFilter));
      if (!filtered.length) return;
      availableYears.push(year);
      const section = document.createElement('section');
      section.className = 'timeline-year-group';
      section.id = `timeline-year-${year}`;
      section.dataset.year = String(year);
      section.setAttribute('role', 'group');
      const head = document.createElement('div');
      head.className = 'timeline-year-head';
      const label = document.createElement('h3');
      label.className = 'timeline-year-label';
      label.textContent = year;
      const count = document.createElement('span');
      count.className = 'timeline-year-count';
      count.textContent = `${filtered.length} título${filtered.length === 1 ? '' : 's'}`;
      head.append(label, count);
      const row = document.createElement('div');
      row.className = 'timeline-row';
      filtered.forEach((entry) => {
        const card = buildTimelineCard(entry);
        row.appendChild(card);
      });
      section.append(head, row);
      fragment.appendChild(section);
    });
    dom.timelineContent.appendChild(fragment);
    renderTimelineNav(availableYears);
    renderTimelineDecades(availableYears);
    if (availableYears.length) {
      if (!availableYears.includes(filmographyState.activeYear)) {
        filmographyState.activeYear = availableYears[0];
      }
      setActiveYear(filmographyState.activeYear);
      setActiveDecade(Math.floor(filmographyState.activeYear / 10) * 10);
    } else {
      filmographyState.activeYear = null;
      highlightTimelineSection(null);
    }
    if (dom.timelineMiniMeta) {
      dom.timelineMiniMeta.textContent = availableYears.length
        ? `${availableYears.length} ano${availableYears.length === 1 ? '' : 's'} de destaques`
        : 'Nenhum destaque disponível';
    }
    if (dom.timelineSection) {
      dom.timelineSection.classList.toggle('is-hidden', !availableYears.length);
    }
    if (dom.allBtn) {
      const hasEntries = filmographyState.allEntries && filmographyState.allEntries.length;
      dom.allBtn.toggleAttribute('disabled', !hasEntries);
      dom.allBtn.setAttribute('aria-hidden', hasEntries ? 'false' : 'true');
      const wrapper = dom.allBtn.closest('.show-movies');
      if (wrapper) {
        wrapper.classList.toggle('is-hidden', !hasEntries);
      }
    }
    if (dom.timelineContent) {
      dom.timelineContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    applyTimelineMode(filmographyState.timelineMode, { persist: false, force: true });
    setupTimelinePrefetch();
  };

  const buildTimelineCard = (entry) => {
    const card = document.createElement('article');
    card.className = 'timeline-card';
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;
    card.dataset.entryKey = entry.key;
    card.dataset.year = entry.year ? String(entry.year) : '';
    card.dataset.roles = Array.from(entry.roleCategories).join(',');
    card.setAttribute('aria-label', buildTimelineAria(entry));
    card.classList.add('is-entering');
    card.addEventListener('animationend', () => {
      card.classList.remove('is-entering');
    }, { once: true });
    const poster = document.createElement('img');
    poster.src = img(entry.posterPath, 'w342') || 'imagens/icon-cast.png';
    poster.alt = `${entry.title}`;
    poster.loading = 'lazy';
    card.appendChild(poster);
    const body = document.createElement('div');
    body.className = 'timeline-card__body';
    const title = document.createElement('p');
    title.className = 'timeline-card__title';
    title.textContent = entry.title;
    const meta = document.createElement('div');
    meta.className = 'timeline-card__meta';
    const yearSpan = document.createElement('span');
    yearSpan.textContent = entry.year || '–';
    const providerBadge = document.createElement('span');
    providerBadge.className = 'provider-badge is-hidden';
    meta.append(yearSpan, providerBadge);
    body.append(title, meta);
    const role = document.createElement('span');
    role.className = 'timeline-role';
    const roleLabel = pickRoleLabel(entry);
    role.textContent = roleLabel ? `${roleLabel} – ${entry.title}` : entry.title;
    card.append(body, role);
    card.addEventListener('click', () => {
      goToMedia(entry);
    });
    card.addEventListener('focus', () => {
      card.classList.add('is-focused');
    });
    card.addEventListener('blur', () => {
      card.classList.remove('is-focused');
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToMedia(entry);
      } else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        handleTimelineNavigation(event, card);
      }
    });
    registerEntryDom(entry, 'timeline', { card, providerNode: providerBadge });
    updateEntryTooltip(entry);
    updateProviderNodes(entry);
    return card;
  };

  const goToMedia = (entry) => {
    if (!entry) return;
    const params = new URLSearchParams({
      id: entry.id,
      mediaType: entry.mediaType
    });
    location.href = `filme.php?${params.toString()}`;
  };

  const renderTimelineNav = (years) => {
    if (!dom.timelineYearNav) return;
    dom.timelineYearNav.innerHTML = '';
    const fragment = document.createDocumentFragment();
    years.forEach((year, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = year;
      button.dataset.year = String(year);
      if (index === 0) button.classList.add('is-active');
      button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      button.setAttribute('aria-label', `Ir para ${year}`);
      button.addEventListener('click', () => {
        scrollToYear(year);
        setActiveYear(year);
        setActiveDecade(Math.floor(year / 10) * 10);
      });
      fragment.appendChild(button);
    });
    dom.timelineYearNav.appendChild(fragment);
  };

  const renderTimelineDecades = (years) => {
    if (!dom.timelineDecadeChips) return;
    const decades = computeDecades(years);
    dom.timelineDecadeChips.innerHTML = '';
    if (!decades.length) return;
    const fragment = document.createDocumentFragment();
    decades.forEach((decade, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${decade}s`;
      button.dataset.decade = String(decade);
      if (index === 0) button.classList.add('is-active');
      button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      button.addEventListener('click', () => {
        scrollToDecade(decade);
        setActiveDecade(decade);
      });
      fragment.appendChild(button);
    });
    dom.timelineDecadeChips.appendChild(fragment);
  };

  const highlightTimelineSection = (year) => {
    if (!dom.timelineContent) return;
    Array.from(dom.timelineContent.querySelectorAll('.timeline-year-group')).forEach((section) => {
      section.classList.toggle('is-active', section.dataset.year === String(year));
    });
  };

  const isTimelineMode = () => filmographyState.timelineMode === 'timeline';

  const scrollToYear = (year) => {
    const target = document.getElementById(`timeline-year-${year}`);
    if (!target) return;
    if (isTimelineMode()) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  };

  const scrollToDecade = (decade) => {
    const years = filmographyState.sortedYears.filter((year) => Math.floor(year / 10) * 10 === decade);
    if (!years.length) return;
    scrollToYear(years[0]);
    setActiveYear(years[0]);
  };

  const setActiveYear = (year) => {
    if (!Number.isFinite(year)) return;
    filmographyState.activeYear = year;
    if (dom.timelineYearNav) {
      Array.from(dom.timelineYearNav.querySelectorAll('button')).forEach((button) => {
        const isActive = button.dataset.year === String(year);
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }
    highlightTimelineSection(year);
  };

  const setActiveDecade = (decade) => {
    if (!dom.timelineDecadeChips) return;
    Array.from(dom.timelineDecadeChips.querySelectorAll('button')).forEach((button) => {
      const isActive = button.dataset.decade === String(decade);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  const applyTimelineMode = (mode, { persist = true, force = false } = {}) => {
    const normalized = mode === 'timeline' ? 'timeline' : 'grid';
    if (!force && filmographyState.timelineMode === normalized) return;
    filmographyState.timelineMode = normalized;
    if (dom.timelineShell) {
      dom.timelineShell.dataset.mode = normalized;
      dom.timelineShell.classList.toggle('timeline-shell--grid', normalized === 'grid');
    }
    if (dom.timelineModeToggle) {
      dom.timelineModeToggle.setAttribute('aria-pressed', normalized === 'timeline' ? 'true' : 'false');
      dom.timelineModeToggle.setAttribute(
        'aria-label',
        normalized === 'timeline'
          ? 'Ativar modo grade tradicional'
          : 'Ativar modo timeline imersivo'
      );
    }
    if (dom.timelineModeLabel) {
      dom.timelineModeLabel.textContent = normalized === 'timeline' ? 'Modo timeline' : 'Modo grade';
    }
    highlightTimelineSection(filmographyState.activeYear);
    if (persist && storage) {
      try {
        storage.setItem(timelineModeKey, normalized);
      } catch (err) {
        console.warn('Não foi possível salvar preferência de modo da timeline:', err);
      }
    }
  };

  applyTimelineMode(filmographyState.timelineMode, { persist: false, force: true });

  if (dom.timelineModeToggle) {
    dom.timelineModeToggle.addEventListener('click', () => {
      const nextMode = filmographyState.timelineMode === 'grid' ? 'timeline' : 'grid';
      applyTimelineMode(nextMode);
      if (dom.timelineContent) {
        if (nextMode === 'timeline') {
          dom.timelineContent.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          dom.timelineContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      setupTimelinePrefetch();
    });
  }

  const setupTimelinePrefetch = () => {
    if (!dom.timelineContent) return;
    const sections = Array.from(dom.timelineContent.querySelectorAll('.timeline-year-group'));
    if (!sections.length) {
      if (timelineObserver) {
        timelineObserver.disconnect();
        timelineObserver = null;
      }
      return;
    }
    const fallbackPrefetch = () => {
      const years = filmographyState.sortedYears.slice(0, 2);
      years.forEach((year) => {
        prefetchYearProviders(year);
      });
    };
    if (!('IntersectionObserver' in window)) {
      fallbackPrefetch();
      return;
    }
    if (timelineObserver) {
      timelineObserver.disconnect();
      timelineObserver = null;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const year = Number(entry.target.dataset.year);
          if (Number.isFinite(year)) {
            setActiveYear(year);
            setActiveDecade(Math.floor(year / 10) * 10);
            prefetchNeighborYears(year);
          }
        }
      });
    }, {
      root: dom.timelineContent,
      threshold: isTimelineMode() ? 0.5 : 0.35
    });
    timelineObserver = observer;
    sections.forEach((section) => observer.observe(section));
    fallbackPrefetch();
  };

  const prefetchNeighborYears = (year) => {
    const years = filmographyState.sortedYears;
    const index = years.indexOf(year);
    if (index === -1) return;
    const targets = new Set([year]);
    if (index > 0) targets.add(years[index - 1]);
    if (index < years.length - 1) targets.add(years[index + 1]);
    targets.forEach((target) => prefetchYearProviders(target));
  };

  const prefetchYearProviders = (year) => {
    const entries = filmographyState.groupedTimeline.get(year) || [];
    entries.forEach((entry) => {
      if (!entry.providerFetched) {
        ensureProviderInfo(entry);
      }
    });
  };

  const handleTimelineNavigation = (event, card) => {
    event.preventDefault();
    const cards = Array.from(dom.timelineContent.querySelectorAll('.timeline-card'));
    const index = cards.indexOf(card);
    if (index === -1) return;
    let targetIndex = index;
    const columns = Math.max(1, Math.round(card.parentElement.clientWidth / card.offsetWidth));
    switch (event.key) {
      case 'ArrowRight':
        targetIndex = Math.min(cards.length - 1, index + 1);
        break;
      case 'ArrowLeft':
        targetIndex = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        targetIndex = Math.min(cards.length - 1, index + columns);
        break;
      case 'ArrowUp':
        targetIndex = Math.max(0, index - columns);
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = cards.length - 1;
        break;
      default:
        break;
    }
    const target = cards[targetIndex];
    if (target) {
      target.focus();
      const year = target.dataset.year;
      if (year) setActiveYear(Number(year));
    }
  };

  const renderCoworkers = (list) => {
    if (!dom.coworkersSection || !dom.coworkersGrid) return;
    if (!Array.isArray(list) || !list.length) {
      dom.coworkersSection.classList.add('is-hidden');
      return;
    }
    dom.coworkersSection.classList.remove('is-hidden');
    dom.coworkersGrid.classList.add('people-grid--featured');
    dom.coworkersGrid.innerHTML = '';
    list.forEach((person) => {
      const anchor = document.createElement('a');
      anchor.href = `person.php?personId=${encodeURIComponent(person.id)}`;
      anchor.className = 'person-chip person-chip--featured';
      anchor.innerHTML = `
        <img src="${img(person.profile, 'w185') || 'imagens/icon-cast.png'}" alt="">
        <div class="chip-text">
          <div class="pname">${person.name}</div>
          <div class="prole">${person.role || 'Colaborador(a)'}</div>
        </div>
        <span class="count-badge" title="Projetos em comum">${person.count}x</span>
      `;
      dom.coworkersGrid.appendChild(anchor);
    });
  };

  const fetchCoworkersFromHighlights = async (entries) => {
    const limit = Array.isArray(entries) ? entries.slice(0, 6) : [];
    const map = new Map();
    for (const entry of limit) {
      try {
        const endpoint = entry.mediaType === 'tv'
          ? tmdbUrl(`/tv/${entry.id}/aggregate_credits`, { api_key: apiKey, language: 'pt-BR' })
          : tmdbUrl(`/movie/${entry.id}/credits`, { api_key: apiKey, language: 'pt-BR' });
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        const data = await response.json();
        const pool = [];
        if (Array.isArray(data.cast)) pool.push(...data.cast.slice(0, 10));
        if (Array.isArray(data.crew)) pool.push(...data.crew.slice(0, 6));
        pool.forEach((person) => {
          if (!person.id || String(person.id) === String(personId)) return;
          if (!map.has(person.id)) {
            map.set(person.id, {
              id: person.id,
              name: person.name,
              profile: person.profile_path,
              role: person.job || person.character || '',
              count: 0
            });
          }
          const current = map.get(person.id);
          current.count += 1;
        });
      } catch (err) {
        console.warn('Erro ao obter colaboradores frequentes:', err);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  };

  const renderModalTab = async (tab) => {
    const grid = modalLists[tab];
    const panel = modalPanels[tab];
    const loadMore = modalLoadMoreButtons[tab];
    if (!grid || !panel) return;
    entryDomRegistry.forEach((refs) => {
      if (refs && Array.isArray(refs[tab])) {
        refs[tab].length = 0;
      }
    });
    const collection = filmographyState.filmographyCollections[tab] || [];
    let entries = [...collection];
    if (filmographyState.modal.searchNormalized) {
      entries = entries.filter((entry) => entry.normalizedTitle.includes(filmographyState.modal.searchNormalized));
    }
    if (filmographyState.modal.role !== 'all') {
      entries = entries.filter((entry) => roleMatchesFilter(entry, filmographyState.modal.role));
    }
    if (filmographyState.modal.genre !== 'all') {
      const genreId = Number(filmographyState.modal.genre);
      if (Number.isFinite(genreId)) {
        entries = entries.filter((entry) => entry.genreIds && entry.genreIds.has && entry.genreIds.has(genreId));
      }
    }
    if (filmographyState.modal.provider !== 'all' || filmographyState.modal.sort === 'availability') {
      await ensureProvidersForList(entries);
    }
    if (filmographyState.modal.provider !== 'all') {
      const providerId = Number(filmographyState.modal.provider);
      if (Number.isFinite(providerId)) {
        entries = entries.filter((entry) => entry.providerIds.has(providerId));
      }
    }
    const total = entries.length;
    const limit = filmographyState.modal.pagination[tab] || filmographyState.modal.itemsPerPage;
    const sorter = getModalSorter(filmographyState.modal.sort);
    entries.sort(sorter);
    const visible = entries.slice(0, limit);
    grid.innerHTML = '';
    if (!visible.length) {
      panel.classList.remove('is-active');
      panel.hidden = true;
      grid.classList.add('is-hidden');
      dom.modalEmptyState.classList.remove('is-hidden');
      dom.modalEmptyState.textContent = 'Nenhum título encontrado para os filtros escolhidos.';
    } else {
      panel.classList.add('is-active');
      panel.hidden = false;
      grid.classList.remove('is-hidden');
      dom.modalEmptyState.classList.add('is-hidden');
      visible.forEach((entry) => {
        const card = buildFilmographyCard(entry, tab);
        grid.appendChild(card);
      });
    }
    if (loadMore) {
      loadMore.classList.toggle('is-hidden', total <= limit);
    }
    updateModalResultCount(total, collection.length, visible.length);
  };

  const ensureProvidersForList = async (entries) => {
    for (const entry of entries) {
      if (!entry.providerFetched) {
        await ensureProviderInfo(entry);
      }
    }
  };

  const getModalSorter = (sortKey) => {
    switch (sortKey) {
      case 'yearAsc':
        return (a, b) => (a.dateSort - b.dateSort) || (a.popularity - b.popularity);
      case 'popularity':
        return (a, b) => (b.popularity - a.popularity) || (b.dateSort - a.dateSort);
      case 'rating':
        return (a, b) => (b.voteAverage - a.voteAverage) || (b.voteCount - a.voteCount);
      case 'availability':
        return (a, b) => {
          const availabilityScore = (entry) => (entry.hasProvider ? 1 : 0);
          const diff = availabilityScore(b) - availabilityScore(a);
          if (diff !== 0) return diff;
          return (b.dateSort - a.dateSort) || (b.popularity - a.popularity);
        };
      case 'yearDesc':
      default:
        return (a, b) => (b.dateSort - a.dateSort) || (b.popularity - a.popularity);
    }
  };

  const buildFilmographyCard = (entry, tab) => {
    const anchor = document.createElement('a');
    anchor.href = `filme.php?${new URLSearchParams({ id: entry.id, mediaType: entry.mediaType }).toString()}`;
    anchor.className = 'filmography-card';
    anchor.tabIndex = 0;
    anchor.setAttribute('aria-label', buildTimelineAria(entry));
    const poster = document.createElement('img');
    poster.src = img(entry.posterPath, 'w342') || 'imagens/icon-cast.png';
    poster.alt = entry.title;
    poster.loading = 'lazy';
    anchor.appendChild(poster);
    const body = document.createElement('div');
    body.className = 'filmography-card__body';
    const title = document.createElement('p');
    title.className = 'filmography-card__title';
    title.textContent = entry.title;
    const meta = document.createElement('p');
    meta.className = 'filmography-card__meta';
    const pieces = [];
    if (entry.year) pieces.push(entry.year);
    if (entry.voteAverage) pieces.push(`Nota ${entry.voteAverage.toFixed(1)}`);
    meta.textContent = pieces.join(' • ');
    body.append(title, meta);
    anchor.appendChild(body);
    if (entry.roleCategories.has('acting')) {
      const actingRole = entry.roles.find((role) => role.type === 'acting' && role.label);
      if (actingRole && actingRole.label) {
        const badge = document.createElement('span');
        badge.className = 'filmography-card__badge';
        badge.textContent = actingRole.label;
        anchor.appendChild(badge);
      }
    }
    const providerBadge = document.createElement('span');
    providerBadge.className = 'provider-badge is-hidden';
    anchor.appendChild(providerBadge);
    anchor.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        anchor.click();
      }
    });
    registerEntryDom(entry, tab, { card: anchor, providerNode: providerBadge });
    updateEntryTooltip(entry);
    updateProviderNodes(entry);
    return anchor;
  };

  const updateModalResultCount = (filtered, total, visible) => {
    if (!dom.modalResultCount) return;
    const totalLabel = total === 1 ? 'trabalho' : 'trabalhos';
    if (!total) {
      dom.modalResultCount.textContent = 'Nenhum trabalho cadastrado';
      return;
    }
    if (!filtered) {
      dom.modalResultCount.textContent = `Nenhum trabalho encontrado (0 de ${total} ${totalLabel})`;
      return;
    }
    const filteredLabel = filtered === 1 ? 'trabalho' : 'trabalhos';
    if (filtered === total && visible === filtered) {
      dom.modalResultCount.textContent = `${total} ${totalLabel} no total`;
    } else {
      dom.modalResultCount.textContent = `Mostrando ${visible} de ${filtered} ${filteredLabel} (${total} no total)`;
    }
  };

  const activateFocusTrap = (dialog) => {
    if (!dialog) return;
    focusTrap.previousActive = document.activeElement;
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const handler = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll(focusableSelectors)).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handler);
    focusTrap.handler = handler;
    const focusable = Array.from(dialog.querySelectorAll(focusableSelectors)).filter((el) => !el.hasAttribute('disabled'));
    if (focusable.length) {
      focusable[0].focus();
    }
  };

  const deactivateFocusTrap = (dialog) => {
    if (!dialog) return;
    if (focusTrap.handler) {
      dialog.removeEventListener('keydown', focusTrap.handler);
      focusTrap.handler = null;
    }
    if (focusTrap.previousActive && typeof focusTrap.previousActive.focus === 'function') {
      focusTrap.previousActive.focus();
    }
    focusTrap.previousActive = null;
  };

  const openFilmographyModal = async () => {
    if (!dom.allModal) return;
    loadModalPreferences();
    dom.allModal.showModal();
    document.body.classList.add('modal-is-open');
    document.body.style.overflow = 'hidden';
    dom.modalSearch.value = filmographyState.modal.search;
    dom.modalSortSelect.value = filmographyState.modal.sort;
    dom.modalRoleSelect.value = filmographyState.modal.role;
    dom.modalProviderSelect.value = filmographyState.modal.provider;
    if (dom.modalGenreSelect) {
      dom.modalGenreSelect.value = filmographyState.modal.genre;
    }
    dom.modalTabs.forEach((tab) => {
      const isActive = tab.id === `tab${capitalize(filmographyState.modal.activeTab)}`;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    Object.entries(modalPanels).forEach(([key, panel]) => {
      const isActive = key === filmographyState.modal.activeTab;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
    activateFocusTrap(dom.allModal);
    await renderModalTab(filmographyState.modal.activeTab);
  };

  const closeFilmographyModal = () => {
    if (!dom.allModal) return;
    dom.allModal.close();
  };

  const capitalize = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

  const prefetchAllProviders = async () => {
    if (providersPrefetched) return;
    providersPrefetched = true;
    const entries = filmographyState.allEntries || [];
    for (const entry of entries) {
      if (!entry.providerFetched) {
        await ensureProviderInfo(entry);
      }
    }
  };

  const setupEventListeners = () => {
    if (dom.timelineRoleFilter) {
      Array.from(dom.timelineRoleFilter.querySelectorAll('.filter-chip')).forEach((chip) => {
        const isActive = chip.classList.contains('is-active');
        chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      dom.timelineRoleFilter.addEventListener('click', (event) => {
        const button = event.target.closest('.filter-chip');
        if (!button) return;
        const role = button.dataset.role || 'all';
        if (filmographyState.roleFilter === role) return;
        filmographyState.roleFilter = role;
        Array.from(dom.timelineRoleFilter.querySelectorAll('.filter-chip')).forEach((chip) => {
          const isActive = chip.dataset.role === role;
          chip.classList.toggle('is-active', isActive);
          chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        renderTimeline();
      });
    }
    if (dom.allBtn) {
      dom.allBtn.addEventListener('click', async () => {
        await openFilmographyModal();
        prefetchAllProviders().catch((err) => console.warn('Falha ao pré-carregar provedores:', err));
      });
    }
    if (dom.backToTop) {
      const handleBackToTopVisibility = () => {
        const show = window.scrollY > 480;
        dom.backToTop.classList.toggle('is-visible', show);
      };
      dom.backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      window.addEventListener('scroll', handleBackToTopVisibility, { passive: true });
      handleBackToTopVisibility();
    }
    if (dom.closeAll) {
      dom.closeAll.addEventListener('click', () => {
        closeFilmographyModal();
      });
    }
    if (dom.allModal) {
      dom.allModal.addEventListener('close', () => {
        document.body.classList.remove('modal-is-open');
        document.body.style.overflow = '';
        deactivateFocusTrap(dom.allModal);
        saveModalPreferences();
      });
      dom.allModal.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeFilmographyModal();
      });
    }
    dom.modalTabs.forEach((tab) => {
      tab.addEventListener('click', async () => {
        const tabId = tab.id.replace('tab', '').toLowerCase();
        if (filmographyState.modal.activeTab === tabId) return;
        filmographyState.modal.activeTab = tabId;
        dom.modalTabs.forEach((other) => {
          const isActive = other === tab;
          other.classList.toggle('is-active', isActive);
          other.setAttribute('aria-selected', String(isActive));
        });
        Object.entries(modalPanels).forEach(([key, panel]) => {
          const isActive = key === tabId;
          panel.classList.toggle('is-active', isActive);
          panel.hidden = !isActive;
        });
        await renderModalTab(tabId);
      });
    });
    if (dom.modalSearch) {
      dom.modalSearch.addEventListener('input', async () => {
        filmographyState.modal.search = dom.modalSearch.value;
        filmographyState.modal.searchNormalized = normalize(dom.modalSearch.value);
        filmographyState.modal.pagination[filmographyState.modal.activeTab] = filmographyState.modal.itemsPerPage;
        await renderModalTab(filmographyState.modal.activeTab);
      });
    }
    if (dom.modalSortSelect) {
      dom.modalSortSelect.addEventListener('change', async () => {
        filmographyState.modal.sort = dom.modalSortSelect.value;
        filmographyState.modal.pagination[filmographyState.modal.activeTab] = filmographyState.modal.itemsPerPage;
        await renderModalTab(filmographyState.modal.activeTab);
      });
    }
    if (dom.modalRoleSelect) {
      dom.modalRoleSelect.addEventListener('change', async () => {
        filmographyState.modal.role = dom.modalRoleSelect.value;
        filmographyState.modal.pagination[filmographyState.modal.activeTab] = filmographyState.modal.itemsPerPage;
        await renderModalTab(filmographyState.modal.activeTab);
      });
    }
    if (dom.modalGenreSelect) {
      dom.modalGenreSelect.addEventListener('change', async () => {
        filmographyState.modal.genre = dom.modalGenreSelect.value;
        filmographyState.modal.pagination[filmographyState.modal.activeTab] = filmographyState.modal.itemsPerPage;
        await renderModalTab(filmographyState.modal.activeTab);
      });
    }
    if (dom.modalProviderSelect) {
      dom.modalProviderSelect.addEventListener('change', async () => {
        filmographyState.modal.provider = dom.modalProviderSelect.value;
        filmographyState.modal.pagination[filmographyState.modal.activeTab] = filmographyState.modal.itemsPerPage;
        await renderModalTab(filmographyState.modal.activeTab);
      });
    }
    Object.entries(modalLoadMoreButtons).forEach(([tab, button]) => {
      if (!button) return;
      button.addEventListener('click', async () => {
        filmographyState.modal.pagination[tab] += filmographyState.modal.itemsPerPage;
        await renderModalTab(tab);
      });
    });
    if (dom.coworkersCTA && dom.coworkersGrid) {
      dom.coworkersCTA.addEventListener('click', () => {
        dom.coworkersGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const loadPersonBundle = async () => {
    const cached = getSessionCache(cacheKey);
    if (cached && cached.person && cached.credits) {
      return cached;
    }
    const [personResponse, creditsResponse] = await Promise.all([
      fetch(personUrl),
      fetch(creditsUrl)
    ]);
    if (!personResponse.ok) {
      throw new Error('Falha ao obter dados da pessoa');
    }
    const person = await personResponse.json();
    let credits = { cast: [], crew: [] };
    if (creditsResponse.ok) {
      credits = await creditsResponse.json();
    } else if (person.combined_credits) {
      credits = person.combined_credits;
    }
    const payload = { person, credits };
    setSessionCache(cacheKey, payload);
    return payload;
  };

  const bootstrap = async () => {
    try {
      const { person, credits } = await loadPersonBundle();
      renderHero(person);
      renderInfo(person);
      renderExternal(person.external_ids, person.homepage);
      const aggregated = aggregateCredits(credits);
      filmographyState.allEntries = aggregated;
      filmographyState.groupedTimeline = buildTimelineGroups(aggregated);
      filmographyState.sortedYears = Array.from(filmographyState.groupedTimeline.keys()).sort((a, b) => b - a);
      filmographyState.decades = computeDecades(filmographyState.sortedYears);
      filmographyState.filmographyCollections = {
        movies: aggregated.filter((entry) => entry.mediaType === 'movie'),
        tv: aggregated.filter((entry) => entry.mediaType === 'tv'),
        crew: aggregated.filter((entry) => entry.roleCategories.has('directing') || entry.roleCategories.has('production') || (entry.roleCategories.has('crew') && !entry.roleCategories.has('acting')))
      };
      await ensureGenresLoaded();
      populateGenreOptions(aggregated);
      renderTimeline();
      const highlights = [...aggregated].sort((a, b) => (b.popularity - a.popularity)).slice(0, 12);
      const coworkerList = await fetchCoworkersFromHighlights(highlights);
      renderCoworkers(coworkerList);
      setupEventListeners();
    } catch (err) {
      console.error('Falha ao carregar página da pessoa:', err);
      if (dom.name) {
        dom.name.textContent = 'Conteúdo indisponível no momento';
      }
      if (dom.timelineSection) dom.timelineSection.classList.add('is-hidden');
      if (dom.coworkersSection) dom.coworkersSection.classList.add('is-hidden');
      if (dom.modalEmptyState) {
        dom.modalEmptyState.textContent = 'Filmografia indisponível no momento.';
        dom.modalEmptyState.classList.remove('is-hidden');
      }
    } finally {
      await waitForImages(document);
      setLoadingState(false);
    }
  };

  bootstrap();
});

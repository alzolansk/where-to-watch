const runtimeConfig = (typeof window !== 'undefined' && window.__WY_WATCH_CONFIG__) || {};
const apiKey = runtimeConfig.tmdbApiKey || '';
const preferredRegion = (runtimeConfig.defaultRegion || 'BR').toUpperCase();
const tmdbBaseUrl = (runtimeConfig.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
const providerRegionPriority = [preferredRegion, 'BR', 'US', 'CA', 'GB'];

const tmdbUrl = (path, params = {}) => {
  const url = new URL(`${tmdbBaseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const waitForImages = (container) => new Promise((resolve) => {
  const scope = container || document;
  const images = Array.from(scope.querySelectorAll('img')).filter((img) => !(img.loading === 'lazy' && !img.complete));
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

const img = (path, size = 'w500') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : '');
const safeParseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inferCrewCategory = (job = '') => {
  const lower = job.toLowerCase();
  if (lower.includes('director') || lower.includes('direção') || lower.includes('director de fotografia')) return 'directing';
  if (lower.includes('writer') || lower.includes('roteir') || lower.includes('screenplay') || lower.includes('teleplay') || lower.includes('story') || lower.includes('escritor')) return 'writing';
  if (lower.includes('producer') || lower.includes('produção')) return 'production';
  return 'crew';
};

const ROLE_LABELS = {
  acting: 'Atuação',
  directing: 'Direção',
  production: 'Produção',
  writing: 'Roteiro',
  crew: 'Equipe'
};

const storage = (() => {
  try {
    return window.sessionStorage;
  } catch (err) {
    return null;
  }
})();

const CACHE_TTL = 5 * 60 * 1000;

const params = new URLSearchParams(window.location.search);
let personId = params.get('personId') || params.get('id');
if (!personId) {
  const pathMatch = window.location.pathname.match(/(?:ator|actor)\/([0-9]+)(?:\/timeline)?/i);
  if (pathMatch && pathMatch[1]) {
    personId = pathMatch[1];
  }
}

const dom = {
  shell: document.querySelector('.timeline-page'),
  skeleton: document.getElementById('timelinePageSkeleton'),
  content: document.getElementById('timelinePageContent'),
  actorPhoto: document.getElementById('timelineActorAvatar'),
  actorName: document.getElementById('timelineActorName'),
  actorYears: document.getElementById('timelineActorYears'),
  followBtn: document.getElementById('timelineFollowBtn'),
  favoriteBtn: document.getElementById('timelineFavoriteBtn'),
  profileLink: document.getElementById('timelineProfileLink'),
  statWorks: document.getElementById('timelineStatWorks'),
  statRating: document.getElementById('timelineStatRating'),
  statCareer: document.getElementById('timelineStatCareer'),
  roleFilter: document.getElementById('timelineRoleFilter'),
  compactBtn: document.getElementById('toggleCompactYearsBtn'),
  yearNav: document.getElementById('timelineYearNav'),
  yearsContainer: document.getElementById('timelineYearsContainer')
};

const state = {
  entries: [],
  grouped: new Map(),
  sortedYears: [],
  roleFilter: 'all',
  collapsedYears: new Set(),
  activeYear: null
};

const providerCache = new Map();
const providerRequests = new Map();
let providerObserver = null;
let yearObserver = null;
const entryRegistry = new Map();

const syncVisibilityState = (element, isVisible) => {
  if (!element) return;
  element.hidden = !isVisible;
  element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
};

const setLoadingState = (loading) => {
  dom.shell?.classList.toggle('is-loading', loading);
  syncVisibilityState(dom.skeleton, loading);
  syncVisibilityState(dom.content, !loading);
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
    console.warn('Falha ao ler cache da timeline:', err);
    return null;
  }
};

const setSessionCache = (key, payload) => {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify({ timestamp: Date.now(), payload }));
  } catch (err) {
    console.warn('Falha ao gravar cache da timeline:', err);
  }
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
        providerInfo: null,
        providerPrimary: null,
        providerFetched: false
      });
    }
    const entry = map.get(key);
    if (!entry) return;
    const roleLabel = label || '';
    entry.roles.push({ type, label: roleLabel });
    if (type === 'acting') {
      entry.roleCategories.add('acting');
    } else if (type === 'directing') {
      entry.roleCategories.add('directing');
    } else if (type === 'production') {
      entry.roleCategories.add('production');
    } else if (type === 'writing') {
      entry.roleCategories.add('writing');
    } else {
      entry.roleCategories.add('crew');
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

const roleMatchesFilter = (entry, filter) => {
  if (!entry) return false;
  if (filter === 'all') return true;
  return entry.roleCategories.has(filter);
};

const pickPrimaryRole = (entry) => {
  if (!entry) return { type: 'acting', label: '' };
  if (entry.roleCategories.has('acting')) {
    const acting = entry.roles.find((role) => role.type === 'acting' && role.label);
    return { type: 'acting', label: acting ? acting.label : '' };
  }
  if (entry.roleCategories.has('directing')) {
    const directing = entry.roles.find((role) => role.type === 'directing' && role.label);
    return { type: 'directing', label: directing ? directing.label : '' };
  }
  if (entry.roleCategories.has('writing')) {
    const writing = entry.roles.find((role) => role.type === 'writing' && role.label);
    return { type: 'writing', label: writing ? writing.label : '' };
  }
  if (entry.roleCategories.has('production')) {
    const production = entry.roles.find((role) => role.type === 'production' && role.label);
    return { type: 'production', label: production ? production.label : '' };
  }
  const fallback = entry.roles.find((role) => role.label) || entry.roles[0];
  if (fallback) return { type: fallback.type || 'acting', label: fallback.label || '' };
  return { type: 'acting', label: '' };
};

const goToMedia = (entry) => {
  if (!entry || !entry.id) return;
  const params = new URLSearchParams({ id: entry.id, mediaType: entry.mediaType });
  window.location.href = `filme.php?${params.toString()}`;
};

const fetchProviders = async (mediaType, id) => {
  if (!mediaType || !id) return null;
  const key = `${mediaType}-${id}`;
  const cached = providerCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
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
        throw new Error(`Falha ao buscar provedores (${response.status})`);
      }
      const data = await response.json();
      const results = data && data.results ? data.results : {};
      const regionKey = providerRegionPriority.find((region) => results[region]) || Object.keys(results)[0];
      const regionData = regionKey ? results[regionKey] : null;
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

const renderProviderInfo = (card, entry) => {
  if (!card) return;
  const slot = card.querySelector('[data-provider-slot]');
  if (!slot) return;
  slot.innerHTML = '';
  const info = entry?.providerPrimary;
  if (!info) {
    const fallback = document.createElement('span');
    fallback.textContent = 'Provedor principal indisponível';
    slot.appendChild(fallback);
    return;
  }
  if (info.logo) {
    const logo = document.createElement('img');
    logo.src = info.logo;
    logo.alt = info.name ? `Disponível em ${info.name}` : 'Provedor de streaming';
    slot.appendChild(logo);
  }
  const text = document.createElement('span');
  text.textContent = info.name || 'Disponível';
  slot.appendChild(text);
};

const observeProviderCards = () => {
  if (providerObserver) {
    providerObserver.disconnect();
  }
  const cards = dom.yearsContainer ? Array.from(dom.yearsContainer.querySelectorAll('.timeline-card')) : [];
  if (!cards.length) return;
  providerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entryItem) => {
      if (!entryItem.isIntersecting) return;
      const card = entryItem.target;
      providerObserver.unobserve(card);
      const entryKey = card.dataset.entryKey;
      const entry = entryRegistry.get(entryKey);
      if (!entry || entry.providerFetched) {
        renderProviderInfo(card, entry);
        return;
      }
      entry.providerFetched = true;
      fetchProviders(entry.mediaType, entry.id)
        .then((info) => {
          entry.providerInfo = info;
          entry.providerPrimary = info ? info.primary : null;
        })
        .catch((err) => {
          console.warn('Falha ao carregar provedores:', err);
        })
        .finally(() => {
          renderProviderInfo(card, entry);
        });
    });
  }, { rootMargin: '0px 0px -20% 0px', threshold: 0.4 });

  cards.forEach((card) => providerObserver.observe(card));
};

const applyCollapsedState = (section, collapsed) => {
  if (!section) return;
  section.classList.toggle('is-collapsed', collapsed);
  const toggle = section.querySelector('.timeline-year-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.innerHTML = `${collapsed ? 'Expandir ano' : 'Compactar ano'} <span aria-hidden="true">${collapsed ? '▾' : '▴'}</span>`;
  }
};

const refreshCollapsedStates = () => {
  const sections = dom.yearsContainer ? Array.from(dom.yearsContainer.querySelectorAll('.timeline-year-block')) : [];
  sections.forEach((section) => {
    const year = Number(section.dataset.year);
    const collapsed = state.collapsedYears.has(year);
    applyCollapsedState(section, collapsed);
  });
  const allCollapsed = state.sortedYears.length > 0 && state.sortedYears.every((year) => state.collapsedYears.has(year));
  if (dom.compactBtn) {
    dom.compactBtn.setAttribute('aria-pressed', allCollapsed ? 'true' : 'false');
    dom.compactBtn.textContent = allCollapsed ? 'Expandir anos' : 'Compactar anos';
  }
};

const updateYearNav = (visibleYears) => {
  if (!dom.yearNav) return;
  dom.yearNav.innerHTML = '';
  visibleYears.forEach((year) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.year = String(year);
    button.textContent = String(year);
    if (year === state.activeYear) {
      button.classList.add('is-active');
    }
    button.addEventListener('click', () => {
      const section = document.getElementById(`timeline-year-${year}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    dom.yearNav.appendChild(button);
  });
};

const setActiveYear = (year) => {
  state.activeYear = year || null;
  if (!dom.yearNav) return;
  Array.from(dom.yearNav.querySelectorAll('button')).forEach((button) => {
    const isActive = Number(button.dataset.year) === state.activeYear;
    button.classList.toggle('is-active', isActive);
  });
};

const observeYears = (visibleYears) => {
  if (yearObserver) {
    yearObserver.disconnect();
    yearObserver = null;
  }
  if (!visibleYears.length) return;
  yearObserver = new IntersectionObserver((entries) => {
    const sorted = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!sorted.length) return;
    const target = sorted[0].target;
    const year = Number(target.dataset.year);
    if (Number.isFinite(year)) {
      setActiveYear(year);
    }
  }, { threshold: [0.25, 0.5, 0.75], rootMargin: '-35% 0px -40% 0px' });

  visibleYears.forEach((year) => {
    const section = document.getElementById(`timeline-year-${year}`);
    if (section) {
      yearObserver.observe(section);
    }
  });
};

const formatActivityRange = (entries) => {
  const years = entries.map((entry) => entry.year).filter((year) => Number.isFinite(year));
  if (!years.length) return null;
  const min = Math.min(...years);
  const max = Math.max(...years);
  const span = Math.max(1, max - min + 1);
  const range = min === max ? `${min}` : `${min} — ${max}`;
  const yearsLabel = `${span} ${span === 1 ? 'ano' : 'anos'} de carreira`;
  return {
    range,
    span,
    summary: `${range} (${yearsLabel})`
  };
};

const renderHeader = (person, entries) => {
  if (dom.actorName) {
    dom.actorName.textContent = person.name || 'Nome não disponível';
  }
  if (dom.actorPhoto) {
    const photo = img(person.profile_path, 'w342') || 'imagens/icon-cast.png';
    dom.actorPhoto.src = photo;
    dom.actorPhoto.alt = person.name ? `Foto de ${person.name}` : 'Foto do(a) artista';
  }
  if (dom.profileLink) {
    dom.profileLink.href = `person.php?personId=${personId}`;
  }
  const activity = formatActivityRange(entries);
  const department = person.known_for_department ? ` • ${person.known_for_department}` : '';
  if (dom.actorYears) {
    if (activity) {
      const summary = activity.summary || activity.range;
      dom.actorYears.textContent = `Ativo(a) em ${summary}${department}`;
    } else {
      dom.actorYears.textContent = department ? department.slice(3) : 'Atividade não informada';
    }
  }
  const totalWorks = entries.length;
  if (dom.statWorks) {
    if (totalWorks) {
      const label = totalWorks === 1 ? 'produção' : 'produções';
      dom.statWorks.textContent = `${totalWorks} ${label}`;
    } else {
      dom.statWorks.textContent = 'Produções não informadas';
    }
  }
  const rated = entries.filter((entry) => Number(entry.voteCount) > 0 && Number.isFinite(entry.voteAverage));
  const average = rated.length ? rated.reduce((sum, entry) => sum + entry.voteAverage, 0) / rated.length : null;
  if (dom.statRating) {
    dom.statRating.textContent = average ? `Nota ${average.toFixed(1).replace('.', ',')}` : 'Nota não avaliada';
  }
  if (dom.statCareer) {
    if (activity && activity.span) {
      const yearsLabel = activity.span === 1 ? 'ano' : 'anos';
      dom.statCareer.textContent = `${activity.span} ${yearsLabel} de carreira`;
    } else {
      dom.statCareer.textContent = 'Carreira não informada';
    }
  }
};

const updateRoleChips = () => {
  if (!dom.roleFilter) return;
  const chips = Array.from(dom.roleFilter.querySelectorAll('.filter-chip'));
  const availableRoles = new Set();
  state.entries.forEach((entry) => {
    entry.roleCategories.forEach((role) => {
      if (role !== 'crew') availableRoles.add(role);
    });
  });
  if (state.roleFilter !== 'all' && !availableRoles.has(state.roleFilter)) {
    state.roleFilter = 'all';
  }
  chips.forEach((chip) => {
    const role = chip.dataset.role || 'all';
    if (role === 'all') {
      chip.classList.remove('is-hidden');
      chip.disabled = false;
      return;
    }
    const hasRole = availableRoles.has(role);
    chip.classList.toggle('is-hidden', !hasRole);
    chip.disabled = !hasRole;
    chip.setAttribute('aria-hidden', hasRole ? 'false' : 'true');
  });
  chips.forEach((chip) => {
    const role = chip.dataset.role || 'all';
    const isActive = role === state.roleFilter;
    chip.classList.toggle('is-active', isActive);
    chip.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
};

const buildTimeline = () => {
  if (!dom.yearsContainer) return;
  dom.yearsContainer.innerHTML = '';
  entryRegistry.clear();
  const visibleYears = [];
  state.sortedYears.forEach((year) => {
    const entriesForYear = (state.grouped.get(year) || []).filter((entry) => roleMatchesFilter(entry, state.roleFilter));
    if (!entriesForYear.length) return;
    visibleYears.push(year);
    const section = document.createElement('article');
    section.className = 'timeline-year-block';
    section.id = `timeline-year-${year}`;
    section.dataset.year = String(year);

    const header = document.createElement('div');
    header.className = 'timeline-year-head';

    const title = document.createElement('div');
    title.className = 'timeline-year-title';
    const yearLabel = document.createElement('span');
    yearLabel.textContent = String(year);
    const count = document.createElement('span');
    count.className = 'timeline-year-count';
    count.textContent = `${entriesForYear.length} projeto${entriesForYear.length > 1 ? 's' : ''}`;
    title.appendChild(yearLabel);
    title.appendChild(count);

    const actions = document.createElement('div');
    actions.className = 'timeline-year-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'timeline-year-toggle';
    toggle.dataset.year = String(year);
    toggle.addEventListener('click', () => {
      const numeric = Number(toggle.dataset.year);
      if (!Number.isFinite(numeric)) return;
      if (state.collapsedYears.has(numeric)) {
        state.collapsedYears.delete(numeric);
      } else {
        state.collapsedYears.add(numeric);
      }
      applyCollapsedState(section, state.collapsedYears.has(numeric));
      refreshCollapsedStates();
    });
    actions.appendChild(toggle);

    header.appendChild(title);
    header.appendChild(actions);

    const track = document.createElement('div');
    track.className = 'timeline-year-track';
    track.setAttribute('role', 'list');

    entriesForYear.forEach((entry) => {
      entryRegistry.set(entry.key, entry);
      const card = document.createElement('article');
      card.className = 'timeline-card';
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;
      card.dataset.entryKey = entry.key;
      card.setAttribute('aria-label', entry.year ? `${entry.title} (${entry.year})` : entry.title);
      card.addEventListener('click', () => {
        goToMedia(entry);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goToMedia(entry);
        }
      });

      const posterFrame = document.createElement('figure');
      posterFrame.className = 'timeline-card__poster';
      const poster = document.createElement('img');
      poster.src = img(entry.posterPath, 'w342') || 'imagens/icon-cast.png';
      poster.alt = entry.title ? `Pôster de ${entry.title}` : 'Pôster não disponível';
      poster.loading = 'lazy';
      posterFrame.appendChild(poster);
      card.appendChild(posterFrame);

      const body = document.createElement('div');
      body.className = 'timeline-card__body';

      const titleNode = document.createElement('h3');
      titleNode.className = 'timeline-card__title';
      titleNode.textContent = entry.title;
      body.appendChild(titleNode);

      const meta = document.createElement('div');
      meta.className = 'timeline-card__meta';
      const mediaLabel = entry.mediaType === 'tv' ? 'Série' : 'Filme';
      const yearLabelText = entry.year ? String(entry.year) : 'Sem ano';
      meta.textContent = `${mediaLabel} • ${yearLabelText}`;
      body.appendChild(meta);

      const roleInfo = pickPrimaryRole(entry);
      const roleNode = document.createElement('div');
      roleNode.className = 'timeline-card__role-label';
      const roleLabel = document.createElement('span');
      roleLabel.textContent = ROLE_LABELS[roleInfo.type] || 'Participação';
      roleNode.appendChild(roleLabel);
      if (roleInfo.label) {
        const sep = document.createElement('span');
        sep.textContent = '•';
        const detail = document.createElement('span');
        detail.textContent = roleInfo.label;
        roleNode.appendChild(sep);
        roleNode.appendChild(detail);
      }
      body.appendChild(roleNode);

      const provider = document.createElement('div');
      provider.className = 'timeline-card__provider';
      provider.dataset.providerSlot = 'true';
      provider.setAttribute('data-provider-slot', 'true');
      provider.textContent = 'Carregando provedores…';
      body.appendChild(provider);

      card.appendChild(body);
      track.appendChild(card);
    });

    section.appendChild(header);
    section.appendChild(track);
    dom.yearsContainer.appendChild(section);
  });

  dom.content?.setAttribute('data-empty', visibleYears.length ? 'false' : 'true');
  updateYearNav(visibleYears);
  if (!visibleYears.includes(state.activeYear)) {
    setActiveYear(visibleYears[0] || null);
  }
  refreshCollapsedStates();
  observeProviderCards();
  observeYears(visibleYears);
};

const setupRoleFilter = () => {
  if (!dom.roleFilter) return;
  dom.roleFilter.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('.filter-chip');
    if (!button || button.disabled) return;
    const role = button.dataset.role || 'all';
    if (role === state.roleFilter) return;
    state.roleFilter = role;
    updateRoleChips();
    buildTimeline();
  });
};

const setupCompactButton = () => {
  if (!dom.compactBtn) return;
  dom.compactBtn.addEventListener('click', () => {
    const shouldCollapse = !(state.sortedYears.length && state.sortedYears.every((year) => state.collapsedYears.has(year)));
    state.sortedYears.forEach((year) => {
      if (shouldCollapse) {
        state.collapsedYears.add(year);
      } else {
        state.collapsedYears.delete(year);
      }
    });
    refreshCollapsedStates();
  });
};

const toggleButtonState = (button) => {
  if (!button) return;
  button.classList.toggle('is-active');
  const isActive = button.classList.contains('is-active');
  button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
};

const setupToggleButton = (button) => {
  if (!button) return;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    toggleButtonState(button);
  });
};

const loadPersonBundle = async () => {
  const cacheKey = `wyw-timeline-${personId}`;
  const cached = getSessionCache(cacheKey);
  if (cached && cached.person && cached.credits) {
    return cached;
  }
  const personUrl = tmdbUrl(`/person/${personId}`, {
    api_key: apiKey,
    language: 'pt-BR',
    append_to_response: 'external_ids'
  });
  const creditsUrl = tmdbUrl(`/person/${personId}/combined_credits`, {
    api_key: apiKey,
    language: 'pt-BR'
  });
  const [personResponse, creditsResponse] = await Promise.all([
    fetch(personUrl),
    fetch(creditsUrl)
  ]);
  if (!personResponse.ok) {
    throw new Error('Não foi possível carregar dados do artista');
  }
  const person = await personResponse.json();
  const credits = creditsResponse.ok ? await creditsResponse.json() : { cast: [], crew: [] };
  const payload = { person, credits };
  setSessionCache(cacheKey, payload);
  return payload;
};

const bootstrap = async () => {
  if (!personId) {
    if (dom.actorName) dom.actorName.textContent = 'Artista não encontrado';
    setLoadingState(false);
    dom.content?.setAttribute('data-empty', 'true');
    return;
  }
  setupToggleButton(dom.followBtn);
  setupToggleButton(dom.favoriteBtn);
  setupRoleFilter();
  setupCompactButton();
  setLoadingState(true);
  try {
    const { person, credits } = await loadPersonBundle();
    const aggregated = aggregateCredits(credits);
    state.entries = aggregated;
    state.grouped = buildTimelineGroups(aggregated);
    state.sortedYears = Array.from(state.grouped.keys()).sort((a, b) => b - a);
    state.collapsedYears.clear();
    renderHeader(person, aggregated);
    updateRoleChips();
    buildTimeline();
  } catch (err) {
    console.error('Falha ao carregar timeline do artista:', err);
    if (dom.actorName) dom.actorName.textContent = 'Conteúdo indisponível no momento';
    dom.content?.setAttribute('data-empty', 'true');
  } finally {
    setLoadingState(false);
    await waitForImages(dom.content);
  }
};

bootstrap();

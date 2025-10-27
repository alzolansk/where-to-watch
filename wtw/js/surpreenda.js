const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");
const introContainer = document.getElementById('intro');
const introTextElement = document.getElementById('intro-text');
const mainContent = document.getElementById('main-content');
const brandSlot = document.querySelector('[data-brand-slot]');
const INTRO_STORAGE_KEY = 'wtw_surprise_intro_v1';

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

let stars = [];
const numStars = 500; // densidade base
let warp = false;     // modo hipervelocidade

class Star {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = (Math.random() - 0.8) * width;
    this.y = (Math.random() - 0.8) * height;
    this.z = Math.random() * width;
    this.prevZ = this.z;
  }
  update(speed) {
    this.prevZ = this.z;
    this.z -= speed;
    if (this.z < 1) {
      this.reset();
      this.z = width;
      this.prevZ = this.z;
    }
  }
  draw() {
    const sx = (this.x / this.z) * width + width / 2;
    const sy = (this.y / this.z) * height + height / 2;
    const px = (this.x / this.prevZ) * width + width / 2;
    const py = (this.y / this.prevZ) * height + height / 2;
    const alpha = Math.max(0, 1 - this.z / width);
    const hue = warp ? 210 + Math.sin(this.x + this.y) * 10 : 200;
    const lightness = warp ? 80 : 9000;      // antes era 70
    const a = Math.max(0.25, alpha);       // garante brilho mínimo
    ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${a})`;
    ctx.lineWidth = warp ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
}

function initStars() {
  stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
  }
}

function animate() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, height);
  const speed = warp ? 45 : 3; // velocidade normal/hiper
  for (const star of stars) {
    star.update(speed);
    star.draw();
  }
  requestAnimationFrame(animate);
}

initStars();
animate();

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  initStars();
});

const revealMainContent = () => {
  if (mainContent && !mainContent.classList.contains('is-visible')) {
    mainContent.classList.add('is-visible');
  }
};

const hideIntroOverlay = () => {
  if (!introContainer) {
    return;
  }
  introContainer.classList.add('is-hidden');
};

const getStoredIntroState = () => {
  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch (error) {
    return false;
  }
};

const setStoredIntroState = () => {
  try {
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
  } catch (error) {
    // ignore storage failures
  }
};

const shouldReduceMotion = () => {
  if (!window.matchMedia) {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    return false;
  }
};

const prepareBrandSlot = (text) => {
  if (!brandSlot) {
    return;
  }
  if (typeof text === 'string' && text !== '') {
    brandSlot.textContent = text;
  }
  brandSlot.classList.remove('is-active');
  brandSlot.setAttribute('aria-hidden', 'true');
};

const activateBrandSlot = (text) => {
  if (!brandSlot) {
    return;
  }
  if (typeof text === 'string' && text !== '') {
    brandSlot.textContent = text;
  }
  brandSlot.classList.add('is-active');
  brandSlot.removeAttribute('aria-hidden');
};

const dockIntroTextToHud = (text) => {
  if (!introTextElement) {
    activateBrandSlot(text);
    revealMainContent();
    setStoredIntroState();
    hideIntroOverlay();
    return;
  }

  revealMainContent();

  if (!brandSlot) {
    introTextElement.classList.add('is-floating');
    setStoredIntroState();
    setTimeout(hideIntroOverlay, 400);
    return;
  }

  const performDock = () => {
    const introRect = introTextElement.getBoundingClientRect();
    const brandRect = brandSlot.getBoundingClientRect();
    const deltaX = (brandRect.left + brandRect.width / 2) - (introRect.left + introRect.width / 2);
    const deltaY = (brandRect.top + brandRect.height / 2) - (introRect.top + introRect.height / 2);
    const scale = Math.max(0.22, Math.min(0.55, brandRect.height / Math.max(introRect.height, 1)));

    introTextElement.classList.add('is-docking');
    introTextElement.style.transform = 'translate3d(0, 0, 0) scale(1)';
    requestAnimationFrame(() => {
      introTextElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`;
    });

    const handleDockEnd = (event) => {
      if (event.propertyName !== 'transform') {
        return;
      }
      introTextElement.removeEventListener('transitionend', handleDockEnd);
      activateBrandSlot(text);
      introTextElement.classList.add('is-hidden');
      setStoredIntroState();
      setTimeout(hideIntroOverlay, 220);
    };

    introTextElement.addEventListener('transitionend', handleDockEnd);
  };

  requestAnimationFrame(performDock);
};

const runIntroSequence = () => {
  const fallbackText = introTextElement
    ? introTextElement.getAttribute('data-intro-text') || 'Where You Watch Surpreend'
    : 'Where You Watch Surpreend';

  if (!introContainer || !introTextElement || !mainContent) {
    activateBrandSlot(fallbackText);
    revealMainContent();
    hideIntroOverlay();
    return;
  }

  const introText = fallbackText;
  prepareBrandSlot(introText);

  const skipIntro = shouldReduceMotion() || getStoredIntroState();

  if (skipIntro) {
    introTextElement.textContent = introText;
    introTextElement.classList.add('is-complete', 'is-hidden');
    activateBrandSlot(introText);
    revealMainContent();
    setStoredIntroState();
    hideIntroOverlay();
    return;
  }

  introTextElement.textContent = '';
  const characters = [...introText];
  let index = 0;
  let decoded = '';
  const glyphPool = ['0', '1', '/', '\\', '-', '|'];

  const randomGlyph = () => glyphPool[Math.floor(Math.random() * glyphPool.length)] || '0';

  const decodeNext = () => {
    if (index >= characters.length) {
      introTextElement.textContent = decoded;
      introTextElement.classList.add('is-complete');
      setTimeout(() => dockIntroTextToHud(introText), 60);
      return;
    }

    const targetChar = characters[index];

    if (targetChar === ' ') {
      decoded += ' ';
      introTextElement.textContent = decoded;
      index += 1;
      setTimeout(decodeNext, 10);
      return;
    }

    let cycles = 0;
    const totalCycles = 3 + Math.floor(Math.random() * 4);

    const scramble = () => {
      if (cycles < totalCycles) {
        introTextElement.textContent = decoded + randomGlyph();
        cycles += 1;
        setTimeout(scramble, 18 + Math.random() * 22);
        return;
      }

      decoded += targetChar;
      introTextElement.textContent = decoded;
      index += 1;
      setTimeout(decodeNext, 15 + Math.random() * 25);
    };

    scramble();
  };

  setTimeout(decodeNext, 150);
};

window.addEventListener('load', runIntroSequence);

const readClientConfig = () => {
  const configElement = document.getElementById('wtw-client-config');
  if (!configElement) {
    return {};
  }
  try {
    return JSON.parse(configElement.textContent || '{}');
  } catch (error) {
    console.warn('Não foi possível interpretar as configurações do cliente.', error);
    return {};
  }
};

const config = readClientConfig();
const btn = document.getElementById('trigger');
const statusEl = document.getElementById('statusMessage');
const statusTextEl = statusEl ? statusEl.querySelector('[data-status-text]') : null;
const station = document.getElementById('rouletteStation');
const shell = document.getElementById('rouletteShell');
const track = document.getElementById('rouletteTrack');
const posterEl = document.getElementById('roulettePoster');
const displayWrapper = document.getElementById('surpriseDisplay');
const infoPanel = document.getElementById('surprisePanel');
const infoMeta = document.getElementById('surpriseMeta');
const infoTitle = document.getElementById('surpriseTitle');
const infoOverview = document.getElementById('surpriseOverview');
const infoInsight = document.getElementById('surpriseInsight');
const infoTags = document.getElementById('surpriseTags');
const bootPanel = document.getElementById('surprisePanelBoot');
const bootText = document.getElementById('surpriseBootText');
const bootCursor = document.getElementById('surpriseBootCursor');
const detailsBtn = document.getElementById('rouletteDetails');
const againBtn = document.getElementById('rouletteAgain');
const mediaToggle = document.getElementById('mediaToggle');
const mediaToggleLabel = document.getElementById('mediaToggleLabel');

const MEDIA_TYPES = {
  MOVIE: 'movie',
  TV: 'tv',
};

const MEDIA_LABELS = {
  movie: 'Filmes',
  tv: 'Séries',
};

const MEDIA_STORAGE_KEY = 'wtw_surprise_media_type';

const createPosterPoolState = () => ({
  entries: [],
  expiresAt: 0,
  inflight: null,
});

const roulettePosterPool = {
  [MEDIA_TYPES.MOVIE]: createPosterPoolState(),
  [MEDIA_TYPES.TV]: createPosterPoolState(),
};

const normalizeMediaType = (value) => (value === MEDIA_TYPES.TV ? MEDIA_TYPES.TV : MEDIA_TYPES.MOVIE);

const readStoredMediaPreference = () => {
  if (typeof localStorage === 'undefined') {
    return '';
  }
  try {
    return localStorage.getItem(MEDIA_STORAGE_KEY) || '';
  } catch (storageError) {
    return '';
  }
};

const persistMediaPreference = (value) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(MEDIA_STORAGE_KEY, value);
  } catch (storageError) {
    // armazenamento indisponível (modo privado, etc)
  }
};

const getPosterPoolStore = (mediaType) => {
  const normalized = normalizeMediaType(mediaType);
  if (!roulettePosterPool[normalized]) {
    roulettePosterPool[normalized] = createPosterPoolState();
  }
  return {
    normalized,
    store: roulettePosterPool[normalized],
  };
};

let currentMediaType = normalizeMediaType(readStoredMediaPreference());

const syncMediaToggleUI = () => {
  if (!mediaToggle) {
    return;
  }
  mediaToggle.dataset.media = currentMediaType;
  mediaToggle.setAttribute('aria-pressed', currentMediaType === MEDIA_TYPES.TV ? 'true' : 'false');
  mediaToggle.setAttribute('title', `Modo ${MEDIA_LABELS[currentMediaType]} - Clique para alternar`);
  if (mediaToggleLabel) {
    mediaToggleLabel.textContent = MEDIA_LABELS[currentMediaType];
  }
};

syncMediaToggleUI();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let rouletteTimer = null;
let storedSelection = null;
let bootTimers = [];

if (displayWrapper) {
  displayWrapper.setAttribute('aria-hidden', 'true');
}

const markEmptyState = (element, isEmpty) => {
  if (!element) {
    return;
  }
  if (isEmpty) {
    element.classList.add('is-empty');
  } else {
    element.classList.remove('is-empty');
  }
};

const setTextContentOrEmpty = (element, value) => {
  if (!element) {
    return;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (text) {
    element.textContent = text;
    markEmptyState(element, false);
  } else {
    element.textContent = '';
    markEmptyState(element, true);
  }
};

const clearBootTimers = () => {
  if (!bootTimers.length) {
    return;
  }
  for (const timer of bootTimers) {
    clearTimeout(timer);
  }
  bootTimers = [];
};

const scheduleBootTick = (fn, delay) => {
  const id = window.setTimeout(fn, delay);
  bootTimers.push(id);
  return id;
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const hideSurprisePanel = () => {
  clearBootTimers();
  if (bootText) {
    bootText.innerHTML = '';
  }
  if (bootCursor) {
    bootCursor.style.display = 'none';
  }
  if (infoTags) {
    infoTags.innerHTML = '';
    markEmptyState(infoTags, true);
  }
  setTextContentOrEmpty(infoMeta, '');
  setTextContentOrEmpty(infoTitle, '');
  setTextContentOrEmpty(infoOverview, '');
  setTextContentOrEmpty(infoInsight, '');
  if (infoPanel) {
    infoPanel.classList.remove('is-open', 'is-ready');
    infoPanel.setAttribute('aria-hidden', 'true');
    infoPanel.hidden = true;
  }
  if (displayWrapper) {
    displayWrapper.setAttribute('aria-hidden', 'true');
  }
};

const formatPanelMeta = (item) => {
  if (!item) {
    return '';
  }
  const parts = [];
  if (item.release_date) {
    const year = item.release_date.slice(0, 4);
    if (year) {
      parts.push(year);
    }
  }
  if (Array.isArray(item.genres) && item.genres.length) {
    parts.push(item.genres.slice(0, 3).join(' • '));
  }
  return parts.join('  •  ');
};

const buildPanelTags = (item) => {
  const tags = [];
  if (item) {
    if (typeof item.providers_note === 'string' && item.providers_note.trim() !== '') {
      tags.push(item.providers_note.trim());
    }
    if (Array.isArray(item.reasons)) {
      item.reasons.forEach((reason, index) => {
        const normalized = typeof reason === 'string' ? reason.trim() : '';
        if (!normalized) {
          return;
        }
        if (index === 0) {
          return;
        }
        if (!tags.includes(normalized)) {
          tags.push(normalized);
        }
      });
    }
  }
  return tags.slice(0, 5);
};

const renderPanelTags = (tags) => {
  if (!infoTags) {
    return;
  }
  infoTags.innerHTML = '';
  if (!tags || !tags.length) {
    markEmptyState(infoTags, true);
    return;
  }
  markEmptyState(infoTags, false);
  for (const tag of tags) {
    const chip = document.createElement('span');
    chip.className = 'surprise-panel-tag';
    chip.textContent = tag;
    infoTags.appendChild(chip);
  }
};

const buildBootLines = (item) => {
  const title = item && item.title ? item.title : 'Título surpresa';
  const genreLine = Array.isArray(item && item.genres) && item.genres.length
    ? item.genres.slice(0, 3).join(' · ')
    : 'multi-heurística';
  const reason = Array.isArray(item && item.reasons) && item.reasons.length ? item.reasons[0] : null;
  const providerNote = item && typeof item.providers_note === 'string' && item.providers_note.trim() !== ''
    ? item.providers_note.trim()
    : 'mapa de provedores pronto';
  const score = typeof (item && item.score) === 'number' && Number.isFinite(item.score)
    ? item.score.toFixed(2)
    : '??';
  return [
    '>>> INIT SURPRISE_MODULE v2.0',
    '>>> handshake: ok',
    `>>> alvo: ${title.toUpperCase()}`,
    `>>> heurística: ${genreLine}`,
    reason ? `>>> insight: ${reason}` : '>>> insight: alinhado ao seu perfil',
    `>>> providers: ${providerNote}`,
    `>>> score: ${score}`,
    '>>> construindo painel…',
  ];
};

const runPanelBootSequence = (lines) => {
  if (!infoPanel || !bootText || !bootCursor || !bootPanel) {
    if (infoPanel) {
      infoPanel.classList.add('is-ready');
    }
    return;
  }
  clearBootTimers();
  infoPanel.classList.remove('is-ready');
  bootText.innerHTML = '';
  bootCursor.style.display = 'inline-block';
  const doneLines = [];
  let lineIndex = 0;
  let charIndex = 0;

  const render = (partial) => {
    const head = doneLines.length ? `${doneLines.join('<br>')}<br>` : '';
    bootText.innerHTML = head + escapeHtml(partial);
  };

  const typeNext = () => {
    if (!Array.isArray(lines) || lineIndex >= lines.length) {
      bootCursor.style.display = 'none';
      infoPanel.classList.add('is-ready');
      return;
    }
    const current = lines[lineIndex] || '';
    if (charIndex <= current.length) {
      render(current.slice(0, charIndex));
      charIndex += 1;
      scheduleBootTick(typeNext, 10 + Math.random() * 15);
    } else {
      doneLines.push(escapeHtml(current));
      lineIndex += 1;
      charIndex = 0;
      scheduleBootTick(typeNext, 80 + Math.random() * 40);
    }
  };

  scheduleBootTick(typeNext, 200);
};

const openSurprisePanel = (item) => {
  if (!infoPanel) {
    return;
  }
  if (displayWrapper) {
    displayWrapper.removeAttribute('aria-hidden');
  }
  infoPanel.hidden = false;
  infoPanel.setAttribute('aria-hidden', 'false');
  infoPanel.classList.add('is-open');
  const meta = formatPanelMeta(item);
  const insight = Array.isArray(item && item.reasons) && item.reasons.length ? item.reasons[0] : '';
  const overview = item && item.overview ? item.overview : '';
  const title = item && item.title ? item.title : 'Recomendação surpresa';
  setTextContentOrEmpty(infoMeta, meta);
  setTextContentOrEmpty(infoTitle, title);
  setTextContentOrEmpty(infoOverview, overview);
  const insightText = insight ? `✨ ${insight}` : '';
  setTextContentOrEmpty(infoInsight, insightText);
  renderPanelTags(buildPanelTags(item));
  runPanelBootSequence(buildBootLines(item));
};
let isProcessing = false;

let statusTypingTimeout = null;
let statusTypingActive = false;
let statusTypingDirection = 1;
let statusTypingIndex = 0;
let statusTypingText = '';

const clearStatusTyping = ({ keepText = false } = {}) => {
  statusTypingActive = false;
  statusTypingText = '';
  statusTypingDirection = 1;
  statusTypingIndex = 0;
  if (statusTypingTimeout) {
    clearTimeout(statusTypingTimeout);
    statusTypingTimeout = null;
  }
  if (!keepText && statusTextEl) {
    statusTextEl.textContent = '';
  }
};

const startStatusTypingLoop = (message) => {
  if (!statusTextEl) {
    return;
  }
  const sanitized = typeof message === 'string' ? message.replace(/<[^>]*>/g, '').trim() : '';
  clearStatusTyping();
  if (!sanitized) {
    return;
  }

  statusTypingActive = true;
  statusTypingText = sanitized;
  statusTypingDirection = 1;
  statusTypingIndex = 0;
  statusTextEl.textContent = '';

  const tick = () => {
    if (!statusTypingActive || !statusTextEl) {
      return;
    }

    statusTextEl.textContent = statusTypingText.slice(0, statusTypingIndex);

    if (statusTypingDirection > 0) {
      if (statusTypingIndex < statusTypingText.length) {
        statusTypingIndex += 1;
        statusTypingTimeout = setTimeout(tick, 60 + Math.random() * 45);
        return;
      }
      statusTypingDirection = -1;
      statusTypingTimeout = setTimeout(tick, 1150);
      return;
    }

    if (statusTypingIndex > 0) {
      statusTypingIndex -= 1;
      statusTypingTimeout = setTimeout(tick, 45 + Math.random() * 35);
      return;
    }

    statusTypingDirection = 1;
    statusTypingTimeout = setTimeout(tick, 780);
  };

  statusTypingTimeout = setTimeout(tick, 180);
};

const setStatus = (message, state = 'info') => {
  if (!statusEl) {
    return;
  }
  const hasMessage = typeof message === 'string' && message.trim() !== '';
  if (!hasMessage) {
    clearStatusTyping();
    if (statusTextEl) {
      statusTextEl.textContent = '';
    }
    statusEl.classList.remove('is-visible', 'is-error', 'is-success', 'is-loading');
    statusEl.removeAttribute('data-state');
    return;
  }

  statusEl.classList.add('is-visible');
  statusEl.classList.toggle('is-loading', state === 'info');
  statusEl.classList.toggle('is-error', state === 'error');
  statusEl.classList.toggle('is-success', state === 'success');
  statusEl.setAttribute('data-state', state);

  if (state === 'info') {
    startStatusTypingLoop(message);
    return;
  }

  clearStatusTyping();
  if (statusTextEl) {
    statusTextEl.innerHTML = message;
  }
};

const startHyperdrive = () => {
  if (!btn) {
    return;
  }
  warp = true;
  btn.style.transform = 'scale(1.1)';
  btn.style.boxShadow = '0 0 70px rgba(1, 3, 44, 0.8)';
  setTimeout(() => {
    btn.style.transform = '';
    btn.style.boxShadow = '';
  }, 800);
};

const stopHyperdrive = () => {
  warp = false;
  if (rouletteTimer) {
    clearTimeout(rouletteTimer);
    rouletteTimer = null;
  }
};

const enterRoulette = () => {
  if (station) {
    station.classList.add('is-rolling');
    station.classList.remove('has-selection');
  }
  if (shell) {
    shell.setAttribute('aria-hidden', 'false');
  }
  if (track) {
    track.innerHTML = '';
  }
  if (posterEl) {
    posterEl.hidden = true;
    posterEl.removeAttribute('src');
    posterEl.classList.remove('is-visible');
  }
  hideSurprisePanel();
  storedSelection = null;
};

const resetStation = ({ focusButton = false } = {}) => {
  if (station) {
    station.classList.remove('is-rolling', 'has-selection');
  }
  if (shell) {
    shell.setAttribute('aria-hidden', 'true');
  }
  if (track) {
    track.innerHTML = '';
    track.classList.remove('is-shuffling');
  }
  if (posterEl) {
    posterEl.hidden = true;
    posterEl.removeAttribute('src');
    posterEl.classList.remove('is-visible');
  }
  hideSurprisePanel();
  storedSelection = null;
  if (focusButton && btn) {
    btn.focus();
  }
};

const setMediaType = (nextType, { skipReset = false } = {}) => {
  const normalized = normalizeMediaType(nextType);
  if (normalized === currentMediaType) {
    syncMediaToggleUI();
    return normalized;
  }
  currentMediaType = normalized;
  syncMediaToggleUI();
  if (!skipReset) {
    resetStation({ focusButton: false });
    setStatus('');
  }
  persistMediaPreference(normalized);
  return normalized;
};

const resolveApiBase = () => {
  return (typeof config.apiBaseUrl === 'string' && config.apiBaseUrl !== '') ? config.apiBaseUrl : 'api';
};

const buildApiUrl = (path) => {
  const base = resolveApiBase().replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
};

const getApiEndpoint = () => buildApiUrl('surprise.php');
const getRoulettePostersEndpoint = () => buildApiUrl('roulette-posters.php');

const requestSurprise = async (mediaType = currentMediaType) => {
  const normalizedType = encodeURIComponent(normalizeMediaType(mediaType));
  const endpoint = getApiEndpoint();
  const url = `${endpoint}?media_type=${normalizedType}`;
  let response;
  try {
    response = await fetch(url, { credentials: 'include' });
  } catch (networkError) {
    const error = new Error('network_error');
    error.code = 'network';
    throw error;
  }

  if (response.status === 204) {
    const error = new Error('empty');
    error.code = 'empty';
    throw error;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (parseError) {
    if (!response.ok) {
      const error = new Error('http_error');
      error.code = 'http';
      error.status = response.status;
      throw error;
    }
  }

  if (response.status === 401) {
    const error = new Error('unauthorized');
    error.code = 'unauthorized';
    throw error;
  }

  if (!response.ok) {
    const error = new Error((payload && payload.message) || 'http_error');
    error.code = (payload && payload.error) || 'http';
    error.status = response.status;
    throw error;
  }

  if (!payload || payload.status !== 'ok') {
    const error = new Error('invalid');
    error.code = 'invalid';
    throw error;
  }

  let resolvedItem = null;
  if (payload.item && payload.item.tmdb_id) {
    resolvedItem = payload.item;
  } else if (Array.isArray(payload.items)) {
    resolvedItem = payload.items.find((entry) => entry && entry.tmdb_id);
  }

  if (!resolvedItem || !resolvedItem.tmdb_id) {
    const error = new Error('invalid');
    error.code = 'invalid';
    throw error;
  }

  return resolvedItem;
};

const fetchRoulettePosterPool = async (mediaType = currentMediaType) => {
  const { normalized, store } = getPosterPoolStore(mediaType);
  const now = Date.now();
  if (Array.isArray(store.entries) && store.entries.length && store.expiresAt > now) {
    return store.entries;
  }
  if (store.inflight) {
    return store.inflight;
  }

  const endpoint = getRoulettePostersEndpoint();
  const url = `${endpoint}?media_type=${encodeURIComponent(normalized)}`;
  const inflightRequest = (async () => {
    let response;
    try {
      response = await fetch(url, { credentials: 'include' });
    } catch (networkError) {
      const error = new Error('posters_network');
      error.code = 'posters_network';
      throw error;
    }

    if (response.status === 204) {
      const error = new Error('shuffle_empty');
      error.code = 'shuffle_empty';
      throw error;
    }

    let payload = null;
    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch (parseError) {
        payload = null;
      }
    }

    if (response.status === 401) {
      const error = new Error('posters_unauthorized');
      error.code = 'posters_unauthorized';
      throw error;
    }

    if (response.status === 412) {
      const error = new Error((payload && payload.message) || 'posters_missing_providers');
      error.code = 'posters_missing_providers';
      error.payload = payload;
      throw error;
    }

    if (!response.ok) {
      const error = new Error((payload && payload.message) || 'posters_fetch_failed');
      error.code = (payload && payload.error) || 'posters_fetch_failed';
      error.status = response.status;
      throw error;
    }

    if (!payload || payload.status !== 'ok' || !Array.isArray(payload.posters)) {
      const error = new Error('posters_invalid');
      error.code = 'posters_invalid';
      throw error;
    }

    const ttlSeconds = (typeof payload.ttl === 'number' && payload.ttl > 0) ? payload.ttl : 300;
    const fallbackExpiration = Date.now() + ttlSeconds * 1000;
    const parsedExpiration = payload.cache_expires_at ? Date.parse(payload.cache_expires_at) : fallbackExpiration;
    store.entries = payload.posters;
    store.expiresAt = Number.isFinite(parsedExpiration) ? parsedExpiration : fallbackExpiration;
    return store.entries;
  })()
    .catch((error) => {
      store.entries = [];
      store.expiresAt = 0;
      throw error;
    })
    .finally(() => {
      store.inflight = null;
    });

  store.inflight = inflightRequest;
  return inflightRequest;
};

const buildRouletteItems = (items) => {
  if (!track) {
    return [];
  }
  track.innerHTML = '';
  track.classList.remove('is-shuffling');
  return items.map((item, index) => {
    const element = document.createElement('div');
    element.className = 'roulette-item';
    element.dataset.index = String(index);
    element.setAttribute('aria-hidden', 'true');
    if (item.poster_url) {
      const img = document.createElement('img');
      img.src = item.poster_url;
      img.alt = item.title || 'Título surpresa';
      element.appendChild(img);
    }
    track.appendChild(element);
    return element;
  });
};

const runRoulette = (elements, finalIndex) => {
  return new Promise((resolve) => {
    if (!elements.length) {
      resolve();
      return;
    }

    if (track) {
      track.classList.add('is-shuffling');
    }

    const revealIndex = (index) => {
      elements.forEach((el, idx) => {
        if (idx === index) {
          el.classList.add('is-visible');
          el.removeAttribute('aria-hidden');
        } else {
          el.classList.remove('is-visible');
          el.setAttribute('aria-hidden', 'true');
        }
      });
    };

    let currentIndex = 0;
    let iterations = 0;
    const totalIterations = Math.max(24, elements.length * 8);

    const tick = () => {
      revealIndex(currentIndex);

      iterations += 1;
      if (iterations >= totalIterations && currentIndex === finalIndex) {
        if (track) {
          track.classList.remove('is-shuffling');
        }
        resolve();
        return;
      }

      const easeOut = iterations / totalIterations;
      const delayMs = Math.max(55, 150 - easeOut * 95);
      currentIndex = (currentIndex + 1) % elements.length;
      rouletteTimer = setTimeout(tick, delayMs);
    };

    tick();
  });
};

const selectFinalItem = (items) => {
  if (!items.length) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return { item: items[index], index };
};

const applySelection = (selection) => {
  if (!station || !selection) {
    return;
  }
  const { item } = selection;
  storedSelection = item || null;
  if (track) {
    track.classList.remove('is-shuffling');
  }
  if (posterEl) {
    if (item && item.poster_url) {
      posterEl.src = item.poster_url;
      posterEl.alt = item.title || 'Recomendação surpresa';
      posterEl.hidden = false;
      posterEl.classList.add('is-visible');
    } else {
      posterEl.hidden = true;
      posterEl.classList.remove('is-visible');
    }
  }
  station.classList.remove('is-rolling');
  station.classList.add('has-selection');
  if (shell) {
    shell.setAttribute('aria-hidden', 'false');
  }
  openSurprisePanel(item);
};

const gatherRouletteOptions = async (mediaType = currentMediaType) => {
  const pool = await fetchRoulettePosterPool(mediaType);
  if (!Array.isArray(pool) || !pool.length) {
    return [];
  }
  const desired = Math.min(6, pool.length);
  const picks = [];
  const used = new Set();
  while (picks.length < desired && used.size < pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    if (used.has(index)) {
      continue;
    }
    used.add(index);
    picks.push(pool[index]);
  }
  return picks;
};

const handleTrigger = async () => {
  if (isProcessing) {
    return;
  }

  if (!config.isAuthenticated) {
    setStatus('Entre na sua conta para receber uma recomendação surpresa. <a href="login.php">Fazer login</a>', 'error');
    resetStation({ focusButton: true });
    return;
  }

  isProcessing = true;
  if (btn) {
    btn.disabled = true;
  }
  if (againBtn) {
    againBtn.disabled = true;
  }
  if (mediaToggle) {
    mediaToggle.disabled = true;
  }

  startHyperdrive();
  enterRoulette();
  setStatus('Buscando uma surpresa personalizada para você...', 'info');

  const activeMediaType = currentMediaType;
  const personalizedPromise = requestSurprise(activeMediaType)
    .then((item) => ({ status: 'fulfilled', value: item }))
    .catch((reason) => ({ status: 'rejected', reason }));

  try {
    const [options] = await Promise.all([
      gatherRouletteOptions(activeMediaType),
      delay(900),
    ]);

    if (!options || !options.length) {
      const error = new Error('shuffle_empty');
      error.code = 'shuffle_empty';
      throw error;
    }

    const selection = selectFinalItem(options) || { item: options[0], index: 0 };
    const elements = buildRouletteItems(options);
    const [, surpriseResult] = await Promise.all([
      runRoulette(elements, selection.index),
      personalizedPromise,
    ]);

    if (!surpriseResult || surpriseResult.status !== 'fulfilled' || !surpriseResult.value) {
      const rootError = surpriseResult && surpriseResult.reason ? surpriseResult.reason : new Error('empty');
      throw rootError;
    }

    applySelection({ item: surpriseResult.value, index: selection.index });
    setStatus('Encontramos algo especial para você! Confira o destaque ao centro ✨', 'success');
  } catch (error) {
    let message = 'Não foi possível encontrar uma recomendação surpresa agora. Tente novamente em instantes.';
    if (error && error.code === 'unauthorized') {
      message = 'Sua sessão expirou. <a href="login.php">Faça login novamente</a> para continuar.';
    } else if (error && error.code === 'empty') {
      message = 'Nenhum título inédito foi encontrado com o seu perfil. Experimente ajustar suas preferências!';
    } else if (error && error.code === 'network') {
      message = 'Erro de conexão. Verifique sua internet e tente novamente.';
    } else if (error && (error.code === 'shuffle_empty' || error.code === 'posters_fetch_failed' || error.code === 'posters_invalid' || error.code === 'posters_network')) {
      message = 'Não conseguimos preparar a roleta agora. Tente novamente em instantes.';
    }
    resetStation({ focusButton: true });
    setStatus(message, 'error');
  } finally {
    stopHyperdrive();
    isProcessing = false;
    if (btn) {
      btn.disabled = false;
    }
    if (againBtn) {
      againBtn.disabled = false;
    }
    if (mediaToggle) {
      mediaToggle.disabled = false;
    }
  }
};

if (btn) {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    handleTrigger();
  });
}

if (againBtn) {
  againBtn.addEventListener('click', (event) => {
    event.preventDefault();
    handleTrigger();
  });
}

if (mediaToggle) {
  mediaToggle.addEventListener('click', (event) => {
    event.preventDefault();
    if (isProcessing) {
      return;
    }
    const nextType = currentMediaType === MEDIA_TYPES.MOVIE ? MEDIA_TYPES.TV : MEDIA_TYPES.MOVIE;
    setMediaType(nextType);
  });
}

if (detailsBtn) {
  detailsBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (!storedSelection) {
      return;
    }
    const target = new URL('filme.php', window.location.href);
    target.searchParams.set('id', storedSelection.tmdb_id);
    target.searchParams.set('mediaTp', storedSelection.media_type === 'tv' ? 'tv' : 'movie');
    window.location.href = target.toString();
  });
}

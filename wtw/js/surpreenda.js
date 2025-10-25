const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

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
    const hue = warp ? 210 + Math.sin(this.x + this.y) * 50 : 200;
    ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
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
  ctx.fillStyle = "rgba(3,6,20,0.4)";
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
const station = document.getElementById('rouletteStation');
const shell = document.getElementById('rouletteShell');
const track = document.getElementById('rouletteTrack');
const posterEl = document.getElementById('roulettePoster');
const detailsBtn = document.getElementById('rouletteDetails');
const againBtn = document.getElementById('rouletteAgain');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let rouletteTimer = null;
let storedSelection = null;
let isProcessing = false;
const roulettePosterPool = {
  entries: [],
  expiresAt: 0,
  inflight: null,
};

const setStatus = (message, state = 'info') => {
  if (!statusEl) {
    return;
  }
  if (!message) {
    statusEl.textContent = '';
    statusEl.classList.remove('is-visible', 'is-error', 'is-success');
    return;
  }
  statusEl.innerHTML = message;
  statusEl.classList.add('is-visible');
  statusEl.classList.toggle('is-error', state === 'error');
  statusEl.classList.toggle('is-success', state === 'success');
};

const startHyperdrive = () => {
  if (!btn) {
    return;
  }
  warp = true;
  btn.style.transform = 'scale(1.1)';
  btn.style.boxShadow = '0 0 70px rgba(0,200,255,0.8)';
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
  storedSelection = null;
  if (focusButton && btn) {
    btn.focus();
  }
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

const requestSurprise = async () => {
  const endpoint = getApiEndpoint();
  const url = endpoint + '?media_type=movie';
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

  if (!payload || payload.status !== 'ok' || !payload.item || !payload.item.tmdb_id) {
    const error = new Error('invalid');
    error.code = 'invalid';
    throw error;
  }

  return payload.item;
};

const fetchRoulettePosterPool = async () => {
  const now = Date.now();
  if (Array.isArray(roulettePosterPool.entries) && roulettePosterPool.entries.length && roulettePosterPool.expiresAt > now) {
    return roulettePosterPool.entries;
  }
  if (roulettePosterPool.inflight) {
    return roulettePosterPool.inflight;
  }

  const endpoint = getRoulettePostersEndpoint();
  const inflightRequest = (async () => {
    let response;
    try {
      response = await fetch(endpoint, { credentials: 'include' });
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
    roulettePosterPool.entries = payload.posters;
    roulettePosterPool.expiresAt = Number.isFinite(parsedExpiration) ? parsedExpiration : fallbackExpiration;
    return roulettePosterPool.entries;
  })()
    .catch((error) => {
      roulettePosterPool.entries = [];
      roulettePosterPool.expiresAt = 0;
      throw error;
    })
    .finally(() => {
      roulettePosterPool.inflight = null;
    });

  roulettePosterPool.inflight = inflightRequest;
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
};

const gatherRouletteOptions = async () => {
  const pool = await fetchRoulettePosterPool();
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

  startHyperdrive();
  enterRoulette();
  setStatus('Buscando uma surpresa personalizada para você...', 'info');

  const personalizedPromise = requestSurprise()
    .then((item) => ({ status: 'fulfilled', value: item }))
    .catch((reason) => ({ status: 'rejected', reason }));

  try {
    const [options] = await Promise.all([
      gatherRouletteOptions(),
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

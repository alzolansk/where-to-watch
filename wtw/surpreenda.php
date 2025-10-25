<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/includes/env.php';

wyw_load_env(__DIR__);

require_once __DIR__ . '/includes/db.php';

$dbConnected = true;

try {
    $pdo = get_pdo();
} catch (Throwable $exception) {
    $dbConnected = false;
    $pdo = null;
}

$scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
$scriptDir = str_replace('\\', '/', (string) dirname($scriptName));
if ($scriptDir === '.' || $scriptDir === '') {
    $scriptDir = '/';
}
$appBasePath = $scriptDir === '/' ? '/' : '/' . ltrim($scriptDir, '/');

$apiBaseEnv = trim((string) wyw_env('APP_API_BASE_URL', ''));
if ($apiBaseEnv === '') {
    $apiBaseUrl = $appBasePath === '/' ? '/api' : $appBasePath . '/api';
} else {
    $apiBaseUrl = $apiBaseEnv;
}

if (!preg_match('#^https?://#i', $apiBaseUrl)) {
    $apiBaseUrl = str_replace('\\', '/', $apiBaseUrl);

    if ($apiBaseUrl === '') {
        $apiBaseUrl = $appBasePath;
    }

    if ($apiBaseUrl !== '' && $apiBaseUrl[0] !== '/') {
        $prefix = $appBasePath === '/' ? '/' : $appBasePath . '/';
        $apiBaseUrl = $prefix . ltrim($apiBaseUrl, '/');
    } elseif ($appBasePath !== '/' && strpos($apiBaseUrl, $appBasePath . '/') !== 0 && $apiBaseUrl !== $appBasePath) {
        $apiBaseUrl = rtrim($appBasePath, '/') . $apiBaseUrl;
    }

    $normalized = preg_replace('#/{2,}#', '/', $apiBaseUrl);
    if (is_string($normalized) && $normalized !== '') {
        $apiBaseUrl = $normalized;
    }
}

$apiBaseUrl = rtrim($apiBaseUrl, '/');

$clientConfig = [
    'apiBaseUrl' => $apiBaseUrl,
    'appBasePath' => $appBasePath,
    'tmdbImageBase' => rtrim((string) wyw_env('TMDB_IMAGE_BASE_URL', 'https://image.tmdb.org/t/p'), '/'),
    'isAuthenticated' => isset($_SESSION['id']) && (int) $_SESSION['id'] > 0,
    'databaseConnected' => $dbConnected,
];
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Surpreenda-me</title>
<style>
  body {
    margin: 0;
    overflow: hidden;
    height: 100vh;
    background: radial-gradient(circle at center, #0d1024 0%, #030614 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Orbitron', sans-serif;
  }

  canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .roulette-station {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
  }

  .btn {
    background: radial-gradient(circle at center, #00c8ff, #007bff);
    border: none;
    color: #fff;
    font-size: 1rem;
    padding: 1rem 2rem;
    border-radius: 2rem;
    cursor: pointer;
    box-shadow: 0 0 30px rgba(0, 200, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    transition: all 0.3s ease;
  }

  .btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 50px rgba(0, 200, 255, 0.7);
  }

  .roulette-station.is-rolling .btn,
  .roulette-station.has-selection .btn {
    pointer-events: none;
    opacity: 0;
    transform: translateY(10px);
  }

  .orb {
    position: absolute;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,200,255,0.25), rgba(0,200,255,0) 70%);
    z-index: 1;
    animation: pulse 3s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }

    .hud { position: absolute; inset: 0; z-index: 3; display: grid; grid-template-rows: auto 1fr auto; pointer-events: none; padding: 24px; font-family: Orbitron, Inter, sans-serif; }
    .brand { opacity: .85; letter-spacing: .2ch; font-weight: 800; color: #bcd7ff; text-shadow: 0 0 18px rgba(123, 164, 255, .35); }
    .brand small { font-weight: 600; opacity: .65; }
    .footer-hud { justify-self: center; align-self: end; opacity: .65; font-size: 12px; }

  .status-message {
    position: absolute;
    bottom: 48px;
    left: 50%;
    transform: translate(-50%, 12px);
    padding: 0.75rem 1.5rem;
    border-radius: 999px;
    background: rgba(6, 16, 36, 0.85);
    color: #cde7ff;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    z-index: 4;
    min-width: 260px;
    text-align: center;
    box-shadow: 0 0 24px rgba(0, 200, 255, 0.28);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease, transform 0.35s ease;
  }

  .status-message.is-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, 0);
  }

  .status-message.is-error {
    color: #ffd3dc;
    background: rgba(47, 5, 20, 0.82);
    box-shadow: 0 0 32px rgba(255, 76, 102, 0.3);
  }

  .status-message.is-success {
    color: #d0ffe3;
    background: rgba(5, 36, 23, 0.85);
    box-shadow: 0 0 32px rgba(0, 255, 170, 0.26);
  }

  .roulette-shell {
    position: relative;
    display: none;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 0;
    border-radius: 0;
    background: none;
    border: none;
    box-shadow: none;
    width: auto;
    opacity: 0;
    transform: translateY(14px) scale(0.98);
    transition: opacity 0.35s ease, transform 0.35s ease;
  }

  .roulette-station.is-rolling .roulette-shell,
  .roulette-station.has-selection .roulette-shell {
    display: flex;
  }

  .roulette-station.has-selection .roulette-shell {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .roulette-station.is-rolling .roulette-shell {
    opacity: 1;
  }

  .roulette-wheel {
    width: auto;
    overflow: hidden;
    border-radius: 999px;
    padding: 14px 18px;
    background: rgba(8, 18, 42, 0.72);
    border: 1px solid rgba(0, 200, 255, 0.16);
    position: relative;
  }

  .roulette-wheel::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }

  .roulette-track {
    display: flex;
    gap: 12px;
    width: max-content;
  }

  .roulette-item {
    width: 58px;
    height: 82px;
    border-radius: 16px;
    background: radial-gradient(circle at top, rgba(68, 98, 146, 0.6), rgba(19, 35, 70, 0.2));
    overflow: hidden;
    position: relative;
    opacity: 0.35;
    filter: saturate(0.5) brightness(0.7);
    transition: transform 0.35s ease, opacity 0.35s ease, filter 0.35s ease;
  }

  .roulette-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .roulette-item::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(3, 9, 20, 0.4), rgba(3, 9, 20, 0.65));
    pointer-events: none;
  }

  .roulette-item.is-active {
    opacity: 0.92;
    filter: saturate(1) brightness(1);
    transform: scale(1.12);
    box-shadow: 0 0 18px rgba(0, 200, 255, 0.45);
  }

  .roulette-item.is-active::after {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(3, 9, 20, 0.4));
  }

  #roulettePoster {
    display: block;
    width: min(62vw, 240px);
    aspect-ratio: 2 / 3;
    border-radius: 0;
    box-shadow: 0 26px 48px rgba(0, 0, 0, 0.48);
    opacity: 0;
    transform: translateY(16px) scale(0.94);
    transition: opacity 0.35s ease, transform 0.35s ease;
  }

  #roulettePoster.is-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .roulette-actions {
    display: flex;
    gap: 12px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
  }

  .roulette-station.has-selection .roulette-actions {
    opacity: 1;
    pointer-events: auto;
  }

  .roulette-station.has-selection .roulette-wheel {
    display: none;
  }

  .roulette-button {
    border: none;
    border-radius: 999px;
    padding: 0.6rem 1.6rem;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    cursor: pointer;
    background: radial-gradient(circle at center, rgba(0, 200, 255, 0.9), rgba(0, 110, 220, 0.92));
    color: #f5fbff;
    box-shadow: 0 0 24px rgba(0, 200, 255, 0.35);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }

  .roulette-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 34px rgba(0, 200, 255, 0.55);
  }

  .roulette-button.is-ghost {
    background: rgba(5, 16, 36, 0.7);
    color: #9ab6ff;
    box-shadow: inset 0 0 0 1px rgba(0, 200, 255, 0.25);
  }

  .roulette-button.is-ghost:hover {
    box-shadow: inset 0 0 0 1px rgba(0, 200, 255, 0.45);
  }

  @media (max-width: 480px) {
    .roulette-shell {
      gap: 16px;
    }
    .roulette-item {
      width: 48px;
      height: 70px;
    }
  }
</style>
</head>
<body>
  <canvas id="space"></canvas>
  <div class="orb"></div>
  <div class="roulette-station" id="rouletteStation">
    <button class="btn" id="trigger">Surpreenda-me</button>
    <div class="roulette-shell" id="rouletteShell" aria-hidden="true">
      <div class="roulette-wheel">
        <div class="roulette-track" id="rouletteTrack" aria-hidden="true"></div>
      </div>
      <img id="roulettePoster" alt="Poster da recomendação surpresa" hidden>
      <div class="roulette-actions" id="rouletteActions">
        <button class="roulette-button" id="rouletteDetails">Ver detalhes</button>
        <button class="roulette-button is-ghost" id="rouletteAgain">Nova surpresa</button>
      </div>
    </div>
  </div>

  <div class="hud">
    <div class="brand">WYWATCH <small>• O STREAMING DO IMPREVISÍVEL</small></div>
    <div></div>
    <div class="footer-hud">Protótipo imersivo — “Hyperjump Experience”</div>
  </div>
  <div id="statusMessage" class="status-message" role="status" aria-live="polite"></div>
<script>
window.wtwClientConfig = <?php echo json_encode($clientConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
</script>
<script>
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

const config = window.wtwClientConfig || {};
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

const getApiEndpoint = () => {
  const base = (typeof config.apiBaseUrl === 'string' && config.apiBaseUrl !== '') ? config.apiBaseUrl : 'api';
  return base.replace(/\/+$/, '') + '/surprise.php';
};

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

const buildRouletteItems = (items) => {
  if (!track) {
    return [];
  }
  track.innerHTML = '';
  return items.map((item, index) => {
    const element = document.createElement('div');
    element.className = 'roulette-item';
    element.dataset.index = String(index);
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

    let currentIndex = 0;
    let iterations = 0;
    const totalIterations = Math.max(12, elements.length * 4);

    const tick = () => {
      elements.forEach((el) => el.classList.remove('is-active'));
      const element = elements[currentIndex];
      if (element) {
        element.classList.add('is-active');
      }

      iterations += 1;
      if (iterations >= totalIterations && currentIndex === finalIndex) {
        resolve();
        return;
      }

      const easeOut = iterations / totalIterations;
      const delayMs = 90 + easeOut * 140;
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
  const desired = 6;
  const results = [];
  const seen = new Set();
  let attempts = 0;
  while (results.length < desired && attempts < desired * 4) {
    attempts += 1;
    const candidate = await requestSurprise();
    const key = candidate ? `${candidate.media_type || 'movie'}:${candidate.tmdb_id}` : '';
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push(candidate);
    await delay(160);
  }
  return results;
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

  try {
    const [options] = await Promise.all([
      gatherRouletteOptions(),
      delay(900),
    ]);

    if (!options || !options.length) {
      const error = new Error('empty');
      error.code = 'empty';
      throw error;
    }

    const selection = selectFinalItem(options) || { item: options[0], index: 0 };
    const elements = buildRouletteItems(options);
    await runRoulette(elements, selection.index);
    applySelection(selection);
    setStatus('Encontramos algo especial para você! Confira o destaque ao centro ✨', 'success');
  } catch (error) {
    let message = 'Não foi possível encontrar uma recomendação surpresa agora. Tente novamente em instantes.';
    if (error && error.code === 'unauthorized') {
      message = 'Sua sessão expirou. <a href="login.php">Faça login novamente</a> para continuar.';
    } else if (error && error.code === 'empty') {
      message = 'Nenhum título inédito foi encontrado com o seu perfil. Experimente ajustar suas preferências!';
    } else if (error && error.code === 'network') {
      message = 'Erro de conexão. Verifique sua internet e tente novamente.';
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
</script>

</body>
</html>

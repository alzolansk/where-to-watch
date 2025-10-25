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

  .btn {
    position: relative;
    z-index: 2;
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

</style>
</head>
<body>
  <canvas id="space"></canvas>
  <div class="orb"></div>
  <button class="btn" id="trigger">Surpreenda-me</button>

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

// Botão ativa hipervelocidade e busca o título surpresa
document.getElementById("trigger").addEventListener("click", async () => {
  const btn = document.getElementById("trigger");
  const statusEl = document.getElementById("statusMessage");
  const config = window.wtwClientConfig || {};

  if (!btn || btn.disabled) {
    return;
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    warp = true;
    btn.style.transform = "scale(1.1)";
    btn.style.boxShadow = "0 0 70px rgba(0,200,255,0.8)";
    setTimeout(() => {
      btn.style.transform = "";
      btn.style.boxShadow = "";
    }, 800);
  };

  const stopHyperdrive = () => {
    warp = false;
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

  const redirectToDetails = (item) => {
    const target = new URL('filme.php', window.location.href);
    target.searchParams.set('id', item.tmdb_id);
    target.searchParams.set('mediaTp', item.media_type === 'tv' ? 'tv' : 'movie');
    setTimeout(() => {
      window.location.href = target.toString();
    }, 600);
  };

  if (!config.isAuthenticated) {
    setStatus('Entre na sua conta para receber uma recomendação surpresa. <a href="login.php">Fazer login</a>', 'error');
    return;
  }

  btn.disabled = true;
  startHyperdrive();
  setStatus('Buscando uma surpresa personalizada para você...', 'info');

  let redirecting = false;

  try {
    const [item] = await Promise.all([
      requestSurprise(),
      delay(1500),
    ]);

    if (!item) {
      const error = new Error('empty');
      error.code = 'empty';
      throw error;
    }

    setStatus('Encontramos algo especial para você! Prepare-se para o salto ✨', 'success');
    redirecting = true;
    redirectToDetails(item);
  } catch (error) {
    let message = 'Não foi possível encontrar uma recomendação surpresa agora. Tente novamente em instantes.';
    if (error && error.code === 'unauthorized') {
      message = 'Sua sessão expirou. <a href="login.php">Faça login novamente</a> para continuar.';
    } else if (error && error.code === 'empty') {
      message = 'Nenhum título inédito foi encontrado com o seu perfil. Experimente ajustar suas preferências!';
    } else if (error && error.code === 'network') {
      message = 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    setStatus(message, 'error');
  } finally {
    if (!redirecting) {
      stopHyperdrive();
      btn.disabled = false;
    }
  }
});
</script>

</body>
</html>

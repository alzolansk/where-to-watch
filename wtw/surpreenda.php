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

$assetBasePath = $appBasePath === '/' ? '' : rtrim($appBasePath, '/');
$introRevealText = 'WYWATCH';
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Surpreenda-me</title>
<link rel="stylesheet" href="<?php echo htmlspecialchars($assetBasePath . '/css/surpreenda.css', ENT_QUOTES); ?>">
</head>
<body>
  <div id="intro" aria-live="polite">
    <h1
      id="intro-text"
      data-intro-text="<?php echo htmlspecialchars($introRevealText, ENT_QUOTES); ?>"
    ></h1>
  </div>
  <div id="main-content" class="main-content">
    <canvas id="space"></canvas>
  <nav class="surprise-rail" aria-label="Atalhos surpresa">
    <div class="rail-logo" aria-hidden="true">
      <img
        src="<?php echo htmlspecialchars($assetBasePath . '/imagens/Where-you-Watch Logo-neon.png', ENT_QUOTES); ?>"
        alt="Where You Watch"
        loading="lazy"
      />
    </div>
    <a
      class="rail-link"
      href="<?php echo htmlspecialchars($assetBasePath . '/index.php', ENT_QUOTES); ?>"
      aria-label="Página inicial"
    >
      <svg viewBox="0 0 24 24" role="presentation" focusable="false">
        <path d="M4 11.3 12 4l8 7.3" />
        <path d="M6.5 10.5v8.5h4.2v-4h2.6v4h4.2v-8.5" />
      </svg>
    </a>
    <button
      type="button"
      class="rail-toggle"
      id="mediaToggle"
      data-media="movie"
      aria-pressed="false"
      title="Alternar entre filmes e séries"
    >
      <span class="rail-toggle-icon" aria-hidden="true">
        <svg class="icon-movie" viewBox="0 0 24 24">
          <path d="M4 7h16v10H4z" />
          <path d="m4 7 2-3 3 3 2-3 3 3 2-3 3 3" />
        </svg>
        <svg class="icon-tv" viewBox="0 0 24 24">
          <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
          <path d="M8 19h8" />
        </svg>
      </span>
      <span class="sr-only">Modo atual: <span id="mediaToggleLabel">Filmes</span></span>
    </button>
  </nav>
  <div class="orb"></div>
  <div class="roulette-station" id="rouletteStation">
    <button class="btn" id="trigger">Surpreenda-me</button>
    <div class="roulette-shell" id="rouletteShell" aria-hidden="true">
      <div class="roulette-wheel" >
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
    <div class="brand">
      <span class="brand-slot" data-brand-slot aria-hidden="true">
        <?php echo htmlspecialchars($introRevealText, ENT_QUOTES); ?>
      </span>
      <small>• O STREAMING DO IMPREVISÍVEL</small>
    </div>
    <div></div>
    <div class="footer-hud">Protótipo imersivo — “Hyperjump Experience”</div>
  </div>
  <div id="statusMessage" class="status-message" role="status" aria-live="polite"></div>
  </div>
<script id="wtw-client-config" type="application/json">
<?php echo json_encode($clientConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>
</script>
<script src="<?php echo htmlspecialchars($assetBasePath . '/js/surpreenda.js', ENT_QUOTES); ?>" defer></script>

</body>
</html>

<?php
// suporte a public/
$__candidateRoot = is_file(__DIR__ . '/../config/bootstrap.php') ? dirname(__DIR__) : __DIR__;
require_once $__candidateRoot . '/config/bootstrap.php';

// testa conexao com o banco
$dbConnected = false;
try {
    $pdo = get_pdo();
    $dbConnected = true;
} catch (Exception $e) {
    error_log("Erro ao conectar com o banco de dados: " . $e->getMessage());
    // pdo fica null se falhar
    $pdo = null;
}

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$scriptDir = str_replace('\\', '/', dirname($scriptName));
$scriptDir = ($scriptDir === '.' || $scriptDir === '') ? '/' : $scriptDir;
$appBasePath = $scriptDir === '/' ? '/' : '/' . ltrim($scriptDir, '/');

// monta api base url
$apiBaseEnv = trim(wyw_env('APP_API_BASE_URL', ''));
if ($apiBaseEnv === '') {
    $apiBaseUrl = $appBasePath === '/' ? '/api' : $appBasePath . '/api';
} else {
    $apiBaseUrl = $apiBaseEnv;
}

// normaliza a url se nao for http
if (!preg_match('#^https?://#i', $apiBaseUrl)) {
    $apiBaseUrl = str_replace('\\', '/', $apiBaseUrl);

    if ($apiBaseUrl === '') {
        $apiBaseUrl = $appBasePath;
    }

    // adiciona prefix se necessario
    if ($apiBaseUrl !== '' && $apiBaseUrl[0] !== '/') {
        $prefix = $appBasePath === '/' ? '/' : $appBasePath . '/';
        $apiBaseUrl = $prefix . ltrim($apiBaseUrl, '/');
    } elseif ($appBasePath !== '/' && strpos($apiBaseUrl, $appBasePath . '/') !== 0 && $apiBaseUrl !== $appBasePath) {
        $apiBaseUrl = rtrim($appBasePath, '/') . $apiBaseUrl;
    }

    // remove barras duplas
    $apiBaseUrl = preg_replace('#/{2,}#', '/', $apiBaseUrl);
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
      <div class="surprise-display" id="surpriseDisplay">
        <div class="surprise-display-poster" aria-hidden="true">
          <img id="roulettePoster" alt="Poster da recomendação surpresa" hidden>
        </div>
        <aside
          class="surprise-info-panel"
          id="surprisePanel"
          aria-live="polite"
          aria-hidden="true"
          hidden
        >
          <div class="surprise-panel-entrance" aria-hidden="true">
            <div class="surprise-panel-bars">
              <span class="surprise-panel-bar is-left"></span>
              <span class="surprise-panel-bar is-right"></span>
            </div>
          </div>
          <div class="surprise-panel-body">
            <div class="surprise-panel-boot" id="surprisePanelBoot" aria-hidden="true">
              <div class="surprise-panel-scan" aria-hidden="true"></div>
              <pre id="surpriseBootText" aria-hidden="true"></pre>
              <span class="surprise-panel-cursor" id="surpriseBootCursor" aria-hidden="true">&nbsp;</span>
            </div>
            <div class="surprise-panel-content" id="surprisePanelContent">
              <p class="surprise-panel-meta" id="surpriseMeta"></p>
              <h2 class="surprise-panel-title" id="surpriseTitle"></h2>
              <p class="surprise-panel-desc" id="surpriseOverview"></p>
              <div class="surprise-panel-insight" id="surpriseInsight"></div>
              <div class="surprise-panel-tags" id="surpriseTags" aria-live="polite"></div>
            </div>
          </div>
        </aside>
      </div>
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
  <div
    id="statusMessage"
    class="status-message"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="status-frame">
      <div class="status-scan" aria-hidden="true"></div>
      <div class="status-glow" aria-hidden="true"></div>
      <div class="status-inner">
        <div class="status-spinner" data-status-spinner aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="status-text" data-status-text></div>
      </div>
    </div>
  </div>
  </div>
<script id="wtw-client-config" type="application/json">
<?php echo json_encode($clientConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>
</script>
<script type="module" src="<?php echo htmlspecialchars($assetBasePath . '/js/surpreenda.js', ENT_QUOTES); ?>"></script>

</body>
</html>

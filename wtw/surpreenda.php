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
  <canvas id="space"></canvas>
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
    <div class="brand">WYWATCH <small>• O STREAMING DO IMPREVISÍVEL</small></div>
    <div></div>
    <div class="footer-hud">Protótipo imersivo — “Hyperjump Experience”</div>
  </div>
  <div id="statusMessage" class="status-message" role="status" aria-live="polite"></div>

<script id="wtw-client-config" type="application/json">
<?php echo json_encode($clientConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>
</script>
<script src="<?php echo htmlspecialchars($assetBasePath . '/js/surpreenda.js', ENT_QUOTES); ?>" defer></script>

</body>
</html>

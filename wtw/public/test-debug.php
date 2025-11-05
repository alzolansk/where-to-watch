<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔍 Debug - Where To Watch</h1>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:#eee} h2{color:#ff5370;margin-top:30px} .ok{color:#a6e22e} .fail{color:#ff5370} pre{background:#0f0f23;padding:10px;border-radius:5px;overflow:auto}</style>";

echo "<h2>1. Bootstrap</h2>";
try {
    require_once __DIR__ . '/../config/bootstrap.php';
    echo "<span class='ok'>✅ Bootstrap carregado</span><br>";
    echo "APP_BOOTSTRAPPED: " . (defined('APP_BOOTSTRAPPED') ? '<span class="ok">SIM</span>' : '<span class="fail">NÃO</span>') . "<br>";
} catch (Throwable $e) {
    echo "<span class='fail'>❌ ERRO: " . $e->getMessage() . "</span><br>";
}

echo "<h2>2. Paths</h2>";
$paths = ['ROOT_PATH', 'PUBLIC_PATH', 'INCLUDES_PATH', 'CONFIG_PATH', 'STORAGE_PATH', 'LOGS_PATH', 'CACHE_PATH'];
foreach ($paths as $path) {
    $val = defined($path) ? constant($path) : 'NÃO DEFINIDO';
    $status = defined($path) ? 'ok' : 'fail';
    echo "<span class='$status'>$path:</span> $val<br>";
}

echo "<h2>3. Dashboard</h2>";
$dashboardPath = __DIR__ . '/dashboard.php';
echo "Caminho: <code>$dashboardPath</code><br>";
echo "Existe? " . (file_exists($dashboardPath) ? '<span class="ok">✅ SIM</span>' : '<span class="fail">❌ NÃO</span>') . "<br>";

if (file_exists($dashboardPath)) {
    echo "<h3>Testando inclusão do dashboard...</h3>";
    ob_start();
    try {
        include_once($dashboardPath);
        $output = ob_get_clean();
        echo "<span class='ok'>✅ Dashboard incluído com sucesso</span><br>";
        echo "<details><summary>Ver output do dashboard</summary><pre>" . htmlspecialchars(substr($output, 0, 500)) . "...</pre></details>";
    } catch (Throwable $e) {
        ob_end_clean();
        echo "<span class='fail'>❌ ERRO ao incluir: " . $e->getMessage() . "</span><br>";
    }
}

echo "<h2>4. Config</h2>";
$configPath = __DIR__ . '/../config/config.php';
echo "Caminho: <code>$configPath</code><br>";
echo "Existe? " . (file_exists($configPath) ? '<span class="ok">✅ SIM</span>' : '<span class="fail">❌ NÃO</span>') . "<br>";

echo "<h2>5. Personalization Cache</h2>";
$persPath = __DIR__ . '/../includes/personalization-cache.php';
echo "Caminho: <code>$persPath</code><br>";
echo "Existe? " . (file_exists($persPath) ? '<span class="ok">✅ SIM</span>' : '<span class="fail">❌ NÃO</span>') . "<br>";

echo "<h2>6. Funções</h2>";
$functions = ['wyw_env', 'wyw_load_env', 'tmdb_get', 'tmdb_get_bulk', 'cache_get', 'cache_set'];
foreach ($functions as $fn) {
    $exists = function_exists($fn);
    $status = $exists ? 'ok' : 'fail';
    echo "<span class='$status'>$fn():</span> " . ($exists ? '✅' : '❌') . "<br>";
}

echo "<h2>7. Variáveis de Ambiente</h2>";
$envVars = ['APP_ENV', 'DB_HOST', 'DB_NAME', 'TMDB_API_KEY'];
foreach ($envVars as $var) {
    $value = wyw_env($var);
    $masked = $var === 'TMDB_API_KEY' && !empty($value) ? substr($value, 0, 10) . '...' : $value;
    $status = !empty($value) ? 'ok' : 'fail';
    echo "<span class='$status'>$var:</span> " . ($masked ?: '<span class="fail">NÃO DEFINIDA</span>') . "<br>";
}

echo "<h2>8. Sessão</h2>";
echo "Status: " . (session_status() === PHP_SESSION_ACTIVE ? '<span class="ok">✅ ATIVA</span>' : '<span class="fail">❌ INATIVA</span>') . "<br>";
echo "Session ID: " . (session_id() ?: '<span class="fail">NENHUMA</span>') . "<br>";
echo "User ID: " . ($_SESSION['id'] ?? '<span class="fail">NÃO LOGADO</span>') . "<br>";

echo "<h2>9. Banco de Dados</h2>";
try {
    $host = wyw_env('DB_HOST', 'localhost');
    $database = wyw_env('DB_NAME', 'db_login');
    $user = wyw_env('DB_USER', 'root');
    $password = wyw_env('DB_PASS', '');
    
    $conexao = new mysqli($host, $user, $password, $database);
    
    if ($conexao->connect_error) {
        echo "<span class='fail'>❌ Erro mysqli: " . $conexao->connect_error . "</span><br>";
    } else {
        echo "<span class='ok'>✅ Conexão mysqli OK</span><br>";
        echo "Host: $host<br>";
        echo "Database: $database<br>";
        $conexao->close();
    }
} catch (Throwable $e) {
    echo "<span class='fail'>❌ ERRO: " . $e->getMessage() . "</span><br>";
}

echo "<h2>10. TMDB API</h2>";
try {
    $result = tmdb_get('configuration');
    echo (!empty($result) ? '<span class="ok">✅ API funcionando</span>' : '<span class="fail">❌ API não respondeu</span>') . "<br>";
    if (!empty($result['images']['base_url'])) {
        echo "Base URL: " . $result['images']['base_url'] . "<br>";
    }
} catch (Throwable $e) {
    echo "<span class='fail'>❌ ERRO: " . $e->getMessage() . "</span><br>";
}

echo "<h2>✅ Teste Concluído</h2>";
echo "<p><strong>Próximo passo:</strong> Se todos os testes passaram, acesse <a href='index.php' style='color:#82aaff'>index.php</a></p>";
echo "<p style='color:#ff5370'><strong>IMPORTANTE:</strong> Delete este arquivo em produção!</p>";

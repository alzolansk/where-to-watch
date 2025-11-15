<?php
// cliente da api tmdb
// TODO: melhorar o sistema de cache, ta meio improvisado

require_once __DIR__ . '/env.php';

wyw_load_env(__DIR__);

if (!defined('TMDB_KEY')) {
    $tmdbKey = wyw_env('TMDB_API_KEY', '');
    define('TMDB_KEY', $tmdbKey);
}

if (!defined('TMDB_BASE')) {
    $tmdbBase = wyw_env('TMDB_API_BASE', 'https://api.themoviedb.org/3');
    define('TMDB_BASE', rtrim($tmdbBase, '/'));
}

// helpers de auth
if (!function_exists('tmdb_get_bearer')) {
    function tmdb_get_bearer() {
        $cands = ['TMDB_BEARER', 'TMDB_TOKEN', 'TMDB_V4_TOKEN'];
        foreach ($cands as $k) {
            $v = getenv($k) ?: ($_ENV[$k] ?? null);
            if (!empty($v)) return $v;
        }
        return null;
    }
}

if (!function_exists('tmdb_get_api_key')) {
    function tmdb_get_api_key() {
        $v = getenv('TMDB_API_KEY') ?: ($_ENV['TMDB_API_KEY'] ?? null);
        return !empty($v) ? $v : null;
    }
}

if (!function_exists('tmdb_default_headers')) {
    function tmdb_default_headers() {
        $h = ['Accept: application/json', 'User-Agent: WYWatch/1.0'];
        $bearer = tmdb_get_bearer();
        if ($bearer) $h[] = 'Authorization: Bearer ' . $bearer;
        return $h;
    }
}

// http helpers
if (!function_exists('http_get_single')) {
    function http_get_single($url, $timeout = 8, $headers = []) {
        $headers = array_values(array_filter($headers));
        
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => $timeout,
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_HTTPHEADER => $headers ?: tmdb_default_headers(),
            ]);
            $body = curl_exec($ch);
            $err = curl_error($ch);
            $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            
            if ($err || $code >= 400) return null;
            return $body !== false ? $body : null;
        } else {
            // fallback sem curl
            $h = $headers ?: tmdb_default_headers();
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'timeout' => $timeout,
                    'header' => implode("\r\n", $h) . "\r\n",
                ],
                'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
            ]);
            $body = @file_get_contents($url, false, $ctx);
            return $body !== false ? $body : null;
        }
    }
}

if (!function_exists('http_get_many')) {
    // requisicoes sequenciais - compativel com infinityfree
    function http_get_many($urls, $timeoutPerReq = 8, $headers = []) {
        $headers = $headers ?: tmdb_default_headers();
        
        $out = [];
        foreach ($urls as $i => $u) {
            $out[$i] = http_get_single($u, $timeoutPerReq, $headers);
        }
        return $out;
    }
}

// monta url v3
if (!function_exists('tmdb_build_url')) {
    function tmdb_build_url($path, $params = []) {
        $path = ltrim($path, '/');
        $base = defined('TMDB_BASE') ? rtrim(TMDB_BASE, '/') : 'https://api.themoviedb.org/3';
        $fullBase = $base . '/' . $path;
        
        // se nao tiver bearer, usa api_key
        if (!tmdb_get_bearer()) {
            if (!isset($params['api_key'])) {
                $apiKey = tmdb_get_api_key();
                if (!$apiKey && defined('TMDB_KEY')) {
                    $apiKey = TMDB_KEY;
                }
                if ($apiKey) $params['api_key'] = $apiKey;
            }
        }
        
        // adiciona language padrao
        if (!array_key_exists('language', $params)) {
            $params['language'] = 'pt-BR';
        } elseif ($params['language'] === null) {
            unset($params['language']);
        }
        
        return $fullBase . (empty($params) ? '' : ('?' . http_build_query($params)));
    }
}

// cache simples em arquivo
// FIXME: trocar por redis depois
if (!function_exists('cache_get')) {
    function cache_get($key, $ttl = 3600) {
        $f = sys_get_temp_dir() . "/wyw_" . md5($key) . ".json";
        if (is_file($f) && (time() - filemtime($f) < $ttl)) {
            return json_decode(file_get_contents($f), true);
        }
        return null;
    }
}

if (!function_exists('cache_set')) {
    function cache_set($key, $data) {
        if ($data === null) return;
        $f = sys_get_temp_dir() . "/wyw_" . md5($key) . ".json";
        file_put_contents($f, json_encode($data));
    }
}

// requisicao unica
if (!function_exists('tmdb_get')) {
    function tmdb_get($path, $params = []) {
        $url = tmdb_build_url($path, $params);
        $hit = cache_get($url, 3600);
        if ($hit !== null) {
            return $hit;
        }

        $json = http_get_single($url);
        if ($json === null || $json === false) {
            return [];
        }

        $data = json_decode($json, true);
        cache_set($url, $data);

        return is_array($data) ? $data : [];
    }
}

// requisicoes em lote
if (!function_exists('tmdb_get_bulk')) {
    function tmdb_get_bulk($requests) {
        $results = [];
        $pending = [];

        // verifica cache
        foreach ($requests as $key => $request) {
            if (!is_array($request) || empty($request['path'])) {
                $results[$key] = null;
                continue;
            }
            $params = $request['params'] ?? [];
            $url = tmdb_build_url($request['path'], $params);
            $cached = cache_get($url, 3600);
            if ($cached !== null) {
                $results[$key] = $cached;
            } else {
                $pending[$key] = $url;
            }
        }

        if (empty($pending)) {
            return $results;
        }

        // processa pendentes
        $urls = array_values($pending);
        $keys = array_keys($pending);
        $responses = http_get_many($urls, 8);

        foreach ($keys as $idx => $key) {
            $json = $responses[$idx] ?? null;
            if ($json === null || $json === false) {
                $results[$key] = null;
                continue;
            }
            $data = json_decode($json, true);
            $url = $pending[$key];
            cache_set($url, $data);
            $results[$key] = is_array($data) ? $data : null;
        }

        return $results;
    }
}

// teste de compatibilidade - acesse com ?__selftest
if (isset($_GET['__selftest'])) {
    header('Content-Type: text/plain; charset=utf-8');
    
    echo "=== TESTE TMDB ===" . PHP_EOL . PHP_EOL;
    
    echo "PHP: " . PHP_VERSION . PHP_EOL;
    echo "cURL: " . (function_exists('curl_init') ? 'yes' : 'no') . PHP_EOL;
    echo PHP_EOL;

    echo "Testando http_get_single()... ";
    $pong1 = http_get_single(tmdb_build_url('configuration'), 6);
    echo ($pong1 ? "OK" : "FAIL") . PHP_EOL;

    echo "Testando http_get_many()... ";
    $urls = [
        tmdb_build_url('movie/550'),
        tmdb_build_url('movie/680'),
    ];
    $many = http_get_many($urls, 6);
    $okMany = is_array($many) && count($many) === 2 && $many[0] !== null && $many[1] !== null;
    echo ($okMany ? "OK" : "FAIL") . PHP_EOL;
    
    echo "Testando tmdb_get()... ";
    $movie = tmdb_get('movie/550');
    echo (!empty($movie['title']) ? "OK (" . $movie['title'] . ")" : "FAIL") . PHP_EOL;
    
    echo "Testando tmdb_get_bulk()... ";
    $bulk = tmdb_get_bulk([
        'movie1' => ['path' => 'movie/550'],
        'movie2' => ['path' => 'movie/680'],
    ]);
    $okBulk = isset($bulk['movie1']['title']) && isset($bulk['movie2']['title']);
    echo ($okBulk ? "OK" : "FAIL") . PHP_EOL;

    echo PHP_EOL . "=== FIM ===" . PHP_EOL;
    exit;
}

<?php
const TMDB_KEY = 'dc3b4144ae24ddabacaeda024ff0585c';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// cache bobo em arquivo (pode trocar por Redis depois)
function cache_get($key, $ttl = 3600)
{
    $f = sys_get_temp_dir() . "/wyw_" . md5($key) . ".json";
    if (is_file($f) && (time() - filemtime($f) < $ttl)) {
        return json_decode(file_get_contents($f), true);
    }
    return null;
}

function cache_set($key, $data)
{
    if ($data === null) {
        return;
    }
    $f = sys_get_temp_dir() . "/wyw_" . md5($key) . ".json";
    file_put_contents($f, json_encode($data));
}

function tmdb_build_url(string $path, array $params = []): string
{
    $params['api_key'] = TMDB_KEY;
    if (!array_key_exists('language', $params)) {
        $params['language'] = 'pt-BR';
    } elseif ($params['language'] === null) {
        unset($params['language']);
    }
    ksort($params);
    $qs = http_build_query($params);
    return TMDB_BASE . $path . ($qs !== '' ? '?' . $qs : '');
}

function tmdb_get($path, $params = [])
{
    $url = tmdb_build_url($path, $params);
    $hit = cache_get($url, 3600);
    if ($hit !== null) {
        return $hit;
    }

    $json = @file_get_contents($url);
    if ($json === false) {
        return [];
    }

    $data = json_decode($json, true);
    cache_set($url, $data);

    return is_array($data) ? $data : [];
}

function tmdb_get_bulk(array $requests): array
{
    $results = [];
    $pending = [];

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

    if (!empty($pending) && function_exists('curl_multi_init')) {
        $multi = curl_multi_init();
        $handles = [];

        foreach ($pending as $key => $url) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            curl_multi_add_handle($multi, $ch);
            $handles[$key] = $ch;
        }

        do {
            $status = curl_multi_exec($multi, $running);
            if ($running) {
                curl_multi_select($multi, 1.0);
            }
        } while ($running && $status === CURLM_OK);

        foreach ($handles as $key => $ch) {
            $content = curl_multi_getcontent($ch);
            $data = json_decode($content, true);
            cache_set($pending[$key], $data);
            $results[$key] = is_array($data) ? $data : null;
            curl_multi_remove_handle($multi, $ch);
            curl_close($ch);
        }

        curl_multi_close($multi);
    }

    foreach ($pending as $key => $url) {
        if (array_key_exists($key, $results)) {
            continue;
        }
        $json = @file_get_contents($url);
        if ($json === false) {
            $results[$key] = null;
            continue;
        }
        $data = json_decode($json, true);
        cache_set($url, $data);
        $results[$key] = is_array($data) ? $data : null;
    }

    return $results;
}

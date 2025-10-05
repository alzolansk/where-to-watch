<?php
const TMDB_KEY = 'dc3b4144ae24ddabacaeda024ff0585c';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// cache bobo em arquivo (pode trocar por Redis depois)
function cache_get($key,$ttl=3600){
  $f = sys_get_temp_dir()."/wyw_".md5($key).".json";
  if (is_file($f) && (time()-filemtime($f) < $ttl)) return json_decode(file_get_contents($f), true);
  return null;
}
function cache_set($key,$data){
  $f = sys_get_temp_dir()."/wyw_".md5($key).".json";
  file_put_contents($f, json_encode($data));
}

function tmdb_get($path, $params = []) {
  $params['api_key'] = TMDB_KEY;
  $params['language'] = $params['language'] ?? 'pt-BR';
  ksort($params);
  $qs = http_build_query($params);
  $url = TMDB_BASE . $path . '?' . $qs;

  if ($hit = cache_get($url, 3600)) return $hit; // 1h
  $json = file_get_contents($url);
  $data = json_decode($json,true);
  cache_set($url,$data);
  return $data;
}
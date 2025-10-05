<?php
session_start();
if (!isset($_SESSION['id_user'])) { http_response_code(401); exit(json_encode(['error'=>'unauth'])); }
header('Content-Type: application/json');
require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

$userId = (int)$_SESSION['id_user'];
$limit  = max(10, min(60, (int)($_GET['limit'] ?? 40)));
$region = 'BR'; // pode vir de tb_users.country se quiser

// 1) prefs
$providers = $pdo->prepare("SELECT provider_id FROM user_providers WHERE user_id=? AND enabled=1");
$providers->execute([$userId]);
$providers = array_column($providers->fetchAll(),'provider_id');

$genresW = $pdo->prepare("SELECT genre_id, weight FROM user_genres WHERE user_id=?");
$genresW->execute([$userId]);
$genreWeights = [];
foreach ($genresW as $g) $genreWeights[(int)$g['genre_id']] = (float)$g['weight'];

// 2) pool (popular + trending) — pode aumentar com now_playing/top_rated
$pool = [];
$pop = tmdb_get('/movie/popular',['page'=>1]);
$trd = tmdb_get('/trending/movie/week');
foreach ([$pop['results']??[], $trd['results']??[]] as $arr) {
  foreach ($arr as $t) $pool[$t['id']] = $t; // dedupe por id
}
$pool = array_values($pool);

// 3) disponibilidade por provedor (cache rápido por título)
$checkProv = $pdo->prepare("SELECT provider_id FROM title_availability WHERE tmdb_id=? AND media_type='movie' AND region=?");
function availability_for($pdo,$tmdbId,$region){
  global $checkProv;
  $checkProv->execute([$tmdbId,$region]);
  return array_column($checkProv->fetchAll(),'provider_id');
}

// 4) scoring simples
$scored = [];
foreach ($pool as $t) {
  $gMatch = 0.0;
  foreach ($t['genre_ids'] ?? [] as $gid) {
    if (isset($genreWeights[$gid])) $gMatch += $genreWeights[$gid];
  }
  $gMatch = min(1.0, $gMatch / 3.0); // normaliza: até 3 gêneros fortes = 1.0

  $prov = availability_for($pdo, $t['id'], $region);
  $hasProvider = count(array_intersect($prov, $providers)) > 0 ? 1.0 : 0.0;

  $fresh = 0.5;
  if (!empty($t['release_date'])) {
    $y = (int)substr($t['release_date'],0,4);
    $fresh = max(0.2, min(1.0, 1 - max(0, (date('Y')-$y))/10)); // mais novo → maior
  }

  $popN = isset($t['popularity']) ? max(0.0, min(1.0, $t['popularity']/100.0)) : 0.3;

  $score = 0.45*$gMatch + 0.35*$hasProvider + 0.10*$fresh + 0.10*$popN;

  $scored[] = [
    'tmdb_id' => $t['id'],
    'title'   => $t['title'] ?? $t['name'] ?? '',
    'poster'  => $t['poster_path'] ?? null,
    'match'   => round($score,2),
    'why'     => [
      'genres' => $t['genre_ids'] ?? [],
      'providers' => $prov,
    ],
  ];
}

// 5) ordenar e limitar
usort($scored, fn($a,$b)=> $b['match'] <=> $a['match']);
$scored = array_slice($scored, 0, $limit);

echo json_encode(['items'=>$scored]);

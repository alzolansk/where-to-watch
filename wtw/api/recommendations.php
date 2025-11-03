<?php
// ========== API DE RECOMENDAÇÕES PERSONALIZADAS ==========
// Gera recomendações de filmes/séries baseadas nas preferências do usuário
// Algoritmo considera gêneros, pessoas favoritas, disponibilidade e popularidade

declare(strict_types=1);
session_start();
require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

header('Content-Type: application/json; charset=utf-8');

// ========== VALIDAÇÃO DE USUÁRIO ==========

$pdo = get_pdo();
$userId = (int)($_SESSION['id'] ?? 0);
if ($userId<=0) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }

// ========== PARÂMETROS DA REQUISIÇÃO ==========

$limit = max(1, min(50, (int)($_GET['limit'] ?? 20)));
$media = ($_GET['media_type'] ?? 'movie') === 'tv' ? 'tv' : 'movie';
$region = 'BR';

// ========== CARREGAMENTO DE PREFERÊNCIAS DO USUÁRIO ==========
// 1) Busca gêneros, pessoas e provedores favoritos do usuário

$genres = $pdo->prepare("SELECT genre_id, weight FROM user_genres WHERE user_id=:u");
$genres->execute([':u'=>$userId]);
$genres = $genres->fetchAll(PDO::FETCH_KEY_PAIR); // [genre_id => weight]

$people = $pdo->prepare("SELECT person_id, weight FROM user_people WHERE user_id=:u");
$people->execute([':u'=>$userId]);
$people = $people->fetchAll(PDO::FETCH_KEY_PAIR); // [person_id => weight]

$providers = $pdo->prepare("SELECT provider_id FROM user_providers WHERE user_id=:u AND enabled=1");
$providers->execute([':u'=>$userId]);
$providers = array_map('intval', array_column($providers->fetchAll(PDO::FETCH_ASSOC), 'provider_id'));

// ========== CONTEÚDO JÁ VISTO OU REJEITADO ==========
// Lista de títulos que não devem aparecer nas recomendações

$seenOrDislike = $pdo->prepare("SELECT tmdb_id, media_type FROM interactions WHERE user_id=:u AND interaction IN ('seen','dislike')");
$seenOrDislike->execute([':u'=>$userId]);
$ban = [];
foreach ($seenOrDislike as $r) { $ban["{$r['media_type']}:{$r['tmdb_id']}"]=true; }

// ========== BUSCA DE CANDIDATOS NO TMDB ==========
// 2) Coleta títulos candidatos usando diferentes estratégias

$candidates = [];

// a) Busca por gêneros favoritos (top 3 gêneros por peso)
if (!empty($genres)) {
  arsort($genres);
  $top = array_slice(array_keys($genres), 0, 3);
  $data = tmdb_get("/discover/{$media}", [
    'with_genres' => implode(',', $top),
    'sort_by'     => 'popularity.desc',
    'include_adult' => false,
    'page' => 1
  ]);
  foreach (($data['results'] ?? []) as $it) { $candidates[$it['id']] = $it; }
}

// b) Busca por pessoas favoritas (atores/diretores)
if (!empty($people)) {
  $topP = array_slice(array_keys($people), 0, 3);
  $data = tmdb_get("/discover/{$media}", [
    'with_people' => implode(',', $topP),
    'sort_by'     => 'popularity.desc',
    'include_adult' => false,
    'page' => 1
  ]);
  foreach (($data['results'] ?? []) as $it) { $candidates[$it['id']] = $it; }
}

// c) Adiciona trending para diversidade de conteúdo
$trend = tmdb_get("/trending/{$media}/week", ['page'=>1]);
foreach (($trend['results'] ?? []) as $it) { $candidates[$it['id']] = $it; }

// ========== CÁLCULO DE SCORE E DISPONIBILIDADE ==========
// 3) Calcula pontuação para cada candidato baseado em preferências

$out = [];
if (!empty($candidates)) {
  // Preparação da query de disponibilidade (cached)
  $in = implode(',', array_fill(0, count($providers), '?'));
  $availStmt = $pdo->prepare("
    SELECT tmdb_id, monetization FROM title_availability
    WHERE media_type=? AND region=? AND provider_id IN ($in)
  ");

  foreach ($candidates as $it) {
    $keyBan = "{$media}:{$it['id']}";
    if (isset($ban[$keyBan])) continue; // Pula conteúdo já visto/rejeitado

    $score = 0;

    // ========== PONTUAÇÃO POR GÊNEROS ==========
    // Adiciona pontos baseado nos gêneros favoritos do usuário
    
    if (!empty($it['genre_ids'] ?? [])) {
      $gScore = 0;
      foreach ($it['genre_ids'] as $gid) { if (isset($genres[$gid])) { $gScore += 2 * (int)$genres[$gid]; } }
      $score += min($gScore, 8); // cap
    }

    // ========== BONIFICAÇÕES ADICIONAIS ==========
    // pessoas (precisa de outra chamada para credits se quiser fino; v1 usa with_people acima)
    // bonus base por trending/vote
    if (($trend['results'] ?? null) && in_array($it, $trend['results'], true)) { $score += 1; }
    if ((float)($it['vote_average'] ?? 0) >= 7.0) { $score += 1; }

    // ========== VERIFICAÇÃO DE DISPONIBILIDADE ==========
    // Adiciona pontos se está disponível nos provedores do usuário
    
    $avail = [];
    if ($providers) {
      $params = array_merge([$media, $region], $providers);
      $availStmt->execute($params);
      foreach ($availStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        if ((int)$r['tmdb_id'] === (int)$it['id']) { $avail[] = $r['monetization']; }
      }
      if ($avail) { $score += 2; }
    }

    $out[] = [
      'tmdb_id' => (int)$it['id'],
      'title'   => $media==='movie' ? ($it['title'] ?? $it['name'] ?? '') : ($it['name'] ?? $it['title'] ?? ''),
      'score'   => $score,
      'providers' => $avail,
    ];
  }
}

// ========== ORDENAÇÃO E RESPOSTA FINAL ==========
// 4) Ordena por score e retorna os melhores resultados

usort($out, fn($a,$b) => $b['score'] <=> $a['score']);
$out = array_slice($out, 0, $limit);

echo json_encode([
  'user_id' => $userId,
  'media_type' => $media,
  'generated_at' => date('c'),
  'items' => $out
]);

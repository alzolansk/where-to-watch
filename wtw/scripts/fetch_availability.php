<?php
// ========== SCRIPT DE BUSCA DE DISPONIBILIDADE ==========
// Busca onde um título específico está disponível no Brasil
// Recebe tmdb_id via GET e salva os dados de disponibilidade

require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

// ========== VALIDAÇÃO DE PARÂMETROS ==========

$region = 'BR';
$tmdbId = (int)($_GET['tmdb_id'] ?? 0);
if ($tmdbId<=0) { die('tmdb_id obrigatório'); }

// ========== BUSCA DADOS DE DISPONIBILIDADE ==========

$data = tmdb_get("/movie/{$tmdbId}/watch/providers");
$br = $data['results'][$region] ?? null;
if (!$br) { echo "sem info"; exit; }

// ========== PROCESSAMENTO DOS PROVEDORES ==========

$providers = [];
foreach (['flatrate','rent','buy','ads','free'] as $k) {
  foreach ($br[$k] ?? [] as $p) $providers[] = ['id'=>$p['provider_id'],'monetization'=>$k];
}

// ========== SALVAMENTO NO BANCO DE DADOS ==========

$ins = $pdo->prepare("
  REPLACE INTO title_availability (tmdb_id, media_type, provider_id, region, monetization, last_checked_at)
  VALUES (?,?,?,?,?, NOW())
");
foreach ($providers as $p) $ins->execute([$tmdbId,'movie',$p['id'],$region,$p['monetization']]);

echo "ok: ".count($providers)." providers salvos para {$tmdbId}";

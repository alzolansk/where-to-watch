<?php
require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

$region = 'BR';
$data = tmdb_get('/watch/providers/movie', ['watch_region'=>$region]);
$rows = $data['results'] ?? [];

$stmt = $pdo->prepare("REPLACE INTO providers(provider_id,name,kind,logo_path) VALUES (?,?,?,?)");
foreach ($rows as $p) {
  $kind = 'streaming'; // TMDB não informa “kind” direto; ajuste depois se quiser
  $stmt->execute([$p['provider_id'], $p['provider_name'], $kind, $p['logo_path'] ?? null]);
}
echo "Providers (BR) atualizados: ".count($rows).PHP_EOL;

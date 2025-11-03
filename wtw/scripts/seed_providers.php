<?php
// ========== SCRIPT DE INICIALIZAÇÃO DE PROVEDORES ==========
// Popula a tabela de provedores com dados da API do TMDB
// Busca todos os provedores disponíveis no Brasil

require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

// ========== BUSCA PROVEDORES DISPONÍVEIS NO BRASIL ==========

$region = 'BR';
$data = tmdb_get('/watch/providers/movie', ['watch_region'=>$region]);
$rows = $data['results'] ?? [];

// ========== INSERÇÃO NO BANCO DE DADOS ==========

$stmt = $pdo->prepare("REPLACE INTO providers(provider_id,name,kind,logo_path) VALUES (?,?,?,?)");
foreach ($rows as $p) {
  $kind = 'streaming'; // TMDB não informa "kind" direto; ajuste depois se quiser
  $stmt->execute([$p['provider_id'], $p['provider_name'], $kind, $p['logo_path'] ?? null]);
}
echo "Providers (BR) atualizados: ".count($rows).PHP_EOL;

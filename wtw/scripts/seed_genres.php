<?php
// ========== SCRIPT DE INICIALIZAÇÃO DE GÊNEROS ==========
// Popula a tabela de gêneros com dados da API do TMDB
// Executa via linha de comando para setup inicial do banco

require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

// ========== BUSCA GÊNEROS DE FILMES E SÉRIES ==========

$genres = tmdb_get('/genre/movie/list');       // filmes
$genres_tv = tmdb_get('/genre/tv/list');       // séries

// ========== CONSOLIDAÇÃO DOS DADOS ==========

$map = [];
foreach (($genres['genres'] ?? []) as $g) $map[$g['id']] = $g['name'];
foreach (($genres_tv['genres'] ?? []) as $g) $map[$g['id']] = $g['name'];

// ========== INSERÇÃO NO BANCO DE DADOS ==========

$stmt = $pdo->prepare("REPLACE INTO genres(genre_id,name) VALUES (?,?)");
foreach ($map as $id=>$name) $stmt->execute([$id, $name]);

echo "Genres atualizados: ".count($map).PHP_EOL;

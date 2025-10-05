<?php
require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

$genres = tmdb_get('/genre/movie/list');       // filmes
$genres_tv = tmdb_get('/genre/tv/list');       // séries

$map = [];
foreach (($genres['genres'] ?? []) as $g) $map[$g['id']] = $g['name'];
foreach (($genres_tv['genres'] ?? []) as $g) $map[$g['id']] = $g['name'];

$stmt = $pdo->prepare("REPLACE INTO genres(genre_id,name) VALUES (?,?)");
foreach ($map as $id=>$name) $stmt->execute([$id, $name]);

echo "Genres atualizados: ".count($map).PHP_EOL;

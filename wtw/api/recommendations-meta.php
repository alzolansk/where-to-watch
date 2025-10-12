<?php
session_start();
if (!isset($_SESSION['id'])) {
    http_response_code(401);
    exit(json_encode(['error' => 'unauth']));
}

header('Content-Type: application/json');
require __DIR__ . '/../includes/db.php';
require __DIR__ . '/../includes/tmdb.php';

$providerStmt = $pdo->query('SELECT provider_id AS id, name, logo_path FROM providers ORDER BY name');
$genreStmt    = $pdo->query('SELECT genre_id AS id, name FROM genres ORDER BY name');

$providers = [];
foreach ($providerStmt as $row) {
    $providers[] = [
        'id'   => (int) $row['id'],
        'name' => $row['name'],
        'logo' => $row['logo_path'] ?? null,
    ];
}

$genres = [];
foreach ($genreStmt as $row) {
    $genres[] = [
        'id'   => (int) $row['id'],
        'name' => $row['name'],
    ];
}

$peopleData = tmdb_get('/person/popular', ['page' => 1]);
$people = [];
foreach (array_slice($peopleData['results'] ?? [], 0, 18) as $person) {
    if (empty($person['id']) || empty($person['name'])) {
        continue;
    }
    $knownFor = [];
    foreach (($person['known_for'] ?? []) as $entry) {
        if (!empty($entry['title'])) {
            $knownFor[] = $entry['title'];
        } elseif (!empty($entry['name'])) {
            $knownFor[] = $entry['name'];
        }
    }
    $people[] = [
        'id'        => (int) $person['id'],
        'name'      => $person['name'],
        'profile'   => $person['profile_path'] ?? null,
        'known_for' => array_slice($knownFor, 0, 2),
    ];
}

echo json_encode([
    'providers' => $providers,
    'genres'    => $genres,
    'people'    => $people,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);




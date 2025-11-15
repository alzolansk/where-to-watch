<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/includes/db.php';

$pdo = get_pdo();

$payload = json_decode(file_get_contents('php://input') ?: 'null', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'invalid_json']);
    exit;
}

$title = trim($payload['title'] ?? '');
$idTmdb = (int) ($payload['idTmdb'] ?? 0);
$genre = trim($payload['genre'] ?? '');
$poster = trim($payload['poster'] ?? '');
$mediaType = (int) ($payload['media_type'] ?? 0);

if ($title === '' || $idTmdb <= 0 || $mediaType <= 0) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'missing_required_fields']);
    exit;
}

$stmt = $pdo->prepare(
    'INSERT INTO items (title_item, tmdb_id, genre, img_url, type_item) VALUES (:title, :idTmdb, :genre, :poster, :mediaType)'
);

$stmt->bindValue(':title', $title, PDO::PARAM_STR);
$stmt->bindValue(':idTmdb', $idTmdb, PDO::PARAM_INT);
$stmt->bindValue(':genre', $genre !== '' ? $genre : null, $genre !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
$stmt->bindValue(':poster', $poster !== '' ? $poster : null, $poster !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
$stmt->bindValue(':mediaType', $mediaType, PDO::PARAM_INT);

$stmt->execute();
echo json_encode(['success' => true]);

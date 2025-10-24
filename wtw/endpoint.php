<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/includes/db.php';

try {
    $pdo = get_pdo();
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'database_unavailable',
        'message' => $exception->getMessage(),
    ]);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: 'null', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'invalid_json']);
    exit;
}

$title = trim((string) ($payload['title'] ?? ''));
$idTmdb = (int) ($payload['idTmdb'] ?? 0);
$genre = trim((string) ($payload['genre'] ?? ''));
$poster = trim((string) ($payload['poster'] ?? ''));
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

try {
    $stmt->execute();
    echo json_encode(['success' => true]);
} catch (PDOException $exception) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'insert_failed',
        'message' => $exception->getMessage(),
    ]);
}

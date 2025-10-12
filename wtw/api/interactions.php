<?php
session_start();
if (!isset($_SESSION['id'])) {
  http_response_code(401);
  header('Content-Type: application/json');
  echo json_encode(['error'=>'unauth']);
  exit;
}
header('Content-Type: application/json');
require __DIR__.'/../includes/db.php';

$body = json_decode(file_get_contents('php://input'), true) ?? [];

$userId     = (int)$_SESSION['id'];
$tmdbId     = (int)($body['tmdb_id'] ?? 0);
$mediaType  = in_array(($body['media_type'] ?? 'movie'), ['movie','tv']) ? $body['media_type'] : 'movie';
  $type       = $body['type'] ?? null;
  $weight     = isset($body['weight']) ? (float)$body['weight'] : 1.0; // opcional

  $allowed = ['view','click_trailer','add_watchlist','like','dislike','seen','watchlist','skip'];
  if ($tmdbId<=0 || !in_array($type,$allowed, true)) {
    http_response_code(400);
    echo json_encode(['error'=>'bad_request']);
    exit;
  }

$pdo = get_pdo();
$isState = in_array($type, ['like','dislike','seen','watchlist'], true);

try {
  if ($isState) {
    // UPSERT: mantém no máximo 1 linha por (user, item, tipo de estado)
    $stmt = $pdo->prepare("
      INSERT INTO interactions (user_id, tmdb_id, media_type, type, weight, created_at)
      VALUES (:u,:t,:m,:ty,:w, NOW())
      ON DUPLICATE KEY UPDATE
        weight = VALUES(weight),
        created_at = NOW()
    ");
    $stmt->execute([
      ':u'=>$userId, ':t'=>$tmdbId, ':m'=>$mediaType, ':ty'=>$type, ':w'=>$weight
    ]);
  } else {
    // Telemetria: pode ter várias linhas (INSERT puro)
    $stmt = $pdo->prepare("
      INSERT INTO interactions (user_id, tmdb_id, media_type, type, weight, created_at)
      VALUES (:u,:t,:m,:ty,:w, NOW())
    ");
    $stmt->execute([
      ':u'=>$userId, ':t'=>$tmdbId, ':m'=>$mediaType, ':ty'=>$type, ':w'=>$weight
    ]);
  }

  echo json_encode(['ok'=>true]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'db_error','msg'=>$e->getMessage()]);
}

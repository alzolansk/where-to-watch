<?php
session_start();
if (!isset($_SESSION['id_user'])) { http_response_code(401); exit(json_encode(['error'=>'unauth'])); }
header('Content-Type: application/json');
require __DIR__.'/../includes/db.php';

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$tmdb_id    = (int)($body['tmdb_id'] ?? 0);
$media_type = in_array($body['media_type'] ?? 'movie', ['movie','tv']) ? $body['media_type'] : 'movie';
$type       = $body['type'] ?? null;

$allowed = ['view','click_trailer','add_watchlist','like','dislike','skip'];
if ($tmdb_id<=0 || !in_array($type,$allowed)) { http_response_code(400); exit(json_encode(['error'=>'bad_request'])); }

$pdo->prepare("INSERT INTO interactions(user_id, tmdb_id, media_type, type, weight) VALUES (?,?,?,?,1.00)")
    ->execute([$_SESSION['id_user'], $tmdb_id, $media_type, $type]);

echo json_encode(['ok'=>true]);

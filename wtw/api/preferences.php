<?php
session_start();
if (!isset($_SESSION['id_user'])) { http_response_code(401); exit(json_encode(['error'=>'unauth'])); }
header('Content-Type: application/json');
require __DIR__.'/../includes/db.php';

$userId = (int)$_SESSION['id_user'];

if ($_SERVER['REQUEST_METHOD']==='GET') {
  // retorna prefs
  $providers = $pdo->prepare("SELECT provider_id FROM user_providers WHERE user_id=? AND enabled=1");
  $providers->execute([$userId]);
  $genres = $pdo->prepare("SELECT genre_id, weight FROM user_genres WHERE user_id=?");
  $genres->execute([$userId]);
  $people = $pdo->prepare("SELECT person_id, weight FROM user_people WHERE user_id=?");
  $people->execute([$userId]);

  echo json_encode([
    'providers'=>array_column($providers->fetchAll(),'provider_id'),
    'genres'=>$genres->fetchAll(),
    'people'=>$people->fetchAll(),
  ]);
  exit;
}

if ($_SERVER['REQUEST_METHOD']==='POST') {
  $body = json_decode(file_get_contents('php://input'), true) ?? [];
  $providers = array_unique(array_map('intval', $body['providers'] ?? []));
  $genres    = array_unique(array_map('intval', $body['genres'] ?? []));
  $people    = array_unique(array_map('intval', $body['people'] ?? []));

  // providers
  $pdo->prepare("DELETE FROM user_providers WHERE user_id=?")->execute([$userId]);
  $insP = $pdo->prepare("INSERT INTO user_providers(user_id,provider_id,enabled) VALUES (?,?,1)");
  foreach ($providers as $pid) $insP->execute([$userId,$pid]);

  // genres
  $pdo->prepare("DELETE FROM user_genres WHERE user_id=?")->execute([$userId]);
  $insG = $pdo->prepare("INSERT INTO user_genres(user_id,genre_id,weight) VALUES (?,?,1.00)");
  foreach ($genres as $gid) $insG->execute([$userId,$gid]);

  // people (opcional no começo)
  $pdo->prepare("DELETE FROM user_people WHERE user_id=?")->execute([$userId]);
  $insPe = $pdo->prepare("INSERT INTO user_people(user_id,person_id,weight) VALUES (?,?,1.00)");
  foreach ($people as $pid) $insPe->execute([$userId,$pid]);

  echo json_encode(['ok'=>true]);
  exit;
}

http_response_code(405);

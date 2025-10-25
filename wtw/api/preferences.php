<?php
declare(strict_types=1);
session_start();

// 1) Autenticação via sessão
if (!isset($_SESSION['id_user'])) {
  http_response_code(401);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => 'unauth']);
  exit;
}

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../includes/personalization-cache.php';

$userId = (int) $_SESSION['id_user'];

// 2) Bootstrap da conexão PDO (tenta includes/db.php; se não der, usa config.php)
$pdo = null;

// tente includes/db.php (pode estar em ../includes ou em includes na raiz)
$tryPaths = [
  __DIR__ . '/../includes/db.php',
  __DIR__ . '/includes/db.php',
  __DIR__ . '/../db.php',     // fallback: alguns projetos guardam db.php na raiz
  __DIR__ . '/db.php',
];

foreach ($tryPaths as $p) {
  if (is_file($p)) {
    require_once $p;
    if (isset($pdo) && $pdo instanceof PDO) {
      break;
    }
  }
}

// se ainda não houver $pdo, tente montar a partir do config.php (mysqli vars)
if (!($pdo instanceof PDO)) {
  $cfgPaths = [
    __DIR__ . '/../config.php',
    __DIR__ . '/config.php',
  ];
  foreach ($cfgPaths as $cp) {
    if (is_file($cp)) {
      // config.php define $host, $database, $usuario, $senha (e abre $conexao mysqli)
      require_once $cp;
      if (isset($host, $database, $usuario, $senha)) {
        try {
          $pdo = new PDO(
            "mysql:host={$host};dbname={$database};charset=utf8mb4",
            $usuario,
            $senha,
            [
              PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
              PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
          );
        } catch (Throwable $e) {
          // continua para retornar erro mais abaixo
        }
      }
      break;
    }
  }
}

if (!($pdo instanceof PDO)) {
  http_response_code(500);
  echo json_encode(['error' => 'missing_get_pdo', 'hint' => 'Verifique o caminho do includes/db.php ou use config.php para criar $pdo.']);
  exit;
}

// 3) Helpers
function readJsonBody(): array {
  $raw = file_get_contents('php://input') ?: '';
  $json = json_decode($raw, true);
  return is_array($json) ? $json : [];
}

function ensureArray($val): array {
  if (is_array($val)) return $val;
  if ($val === null) return [];
  // permite CSV simples
  if (is_string($val) && trim($val) !== '') {
    return array_values(array_filter(array_map('trim', explode(',', $val)), fn($x) => $x !== ''));
  }
  return [];
}

// 4) Métodos
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
  if ($method === 'GET') {
    // providers
    $st = $pdo->prepare("SELECT provider_id FROM user_providers WHERE user_id=? AND enabled=1");
    $st->execute([$userId]);
    $providers = array_map(fn($r) => (int)$r['provider_id'], $st->fetchAll());

    // genres
    $st = $pdo->prepare("SELECT genre_id, weight FROM user_genres WHERE user_id=?");
    $st->execute([$userId]);
    $genres = [];
    foreach ($st as $row) {
      $genres[(int)$row['genre_id']] = (float)$row['weight'];
    }

    // people
    $st = $pdo->prepare("SELECT person_id, weight FROM user_people WHERE user_id=?");
    $st->execute([$userId]);
    $people = [];
    foreach ($st as $row) {
      $people[(int)$row['person_id']] = (float)$row['weight'];
    }

    echo json_encode([
      'ok' => true,
      'user_id' => $userId,
      'providers' => $providers,
      'genres' => $genres,
      'people' => $people
    ]);
    exit;
  }

  if ($method === 'POST') {
    $body = readJsonBody();

    // Aceita arrays simples (ex.: [8, 119, 337]) para providers,
    // e para genres/people aceita tanto array de ids quanto mapa id=>peso.
    $providers = ensureArray($body['providers'] ?? []);
    $genresIn  = $body['genres'] ?? [];
    $peopleIn  = $body['people'] ?? [];

    // normaliza genres: se vier array [28,12] => vira [28=>1.0,12=>1.0]
    $genres = [];
    if (is_array($genresIn)) {
      $isAssoc = array_keys($genresIn) !== range(0, count($genresIn)-1);
      if ($isAssoc) {
        foreach ($genresIn as $gid => $w) {
          $gid = (int)$gid; if ($gid<=0) continue;
          $genres[$gid] = max(0.0, min(2.0, (float)$w));
        }
      } else {
        foreach ($genresIn as $gid) {
          $gid = (int)$gid; if ($gid<=0) continue;
          $genres[$gid] = 1.0;
        }
      }
    }

    // normaliza people
    $people = [];
    if (is_array($peopleIn)) {
      $isAssoc = array_keys($peopleIn) !== range(0, count($peopleIn)-1);
      if ($isAssoc) {
        foreach ($peopleIn as $pid => $w) {
          $pid = (int)$pid; if ($pid<=0) continue;
          $people[$pid] = max(0.0, min(2.0, (float)$w));
        }
      } else {
        foreach ($peopleIn as $pid) {
          $pid = (int)$pid; if ($pid<=0) continue;
          $people[$pid] = 1.0;
        }
      }
    }

    // valida providers
    $providers = array_values(array_unique(array_map('intval', array_filter($providers, fn($v)=> (int)$v>0))));

    $pdo->beginTransaction();

    // providers
    $pdo->prepare("DELETE FROM user_providers WHERE user_id=?")->execute([$userId]);
    if (!empty($providers)) {
      $insP = $pdo->prepare("INSERT INTO user_providers(user_id, provider_id, enabled) VALUES (?,?,1)");
      foreach ($providers as $pid) $insP->execute([$userId, $pid]);
    }

    // genres
    $pdo->prepare("DELETE FROM user_genres WHERE user_id=?")->execute([$userId]);
    if (!empty($genres)) {
      $insG = $pdo->prepare("INSERT INTO user_genres(user_id, genre_id, weight) VALUES (?,?,?)");
      foreach ($genres as $gid => $w) $insG->execute([$userId, $gid, $w]);
    }

    // people
    $pdo->prepare("DELETE FROM user_people WHERE user_id=?")->execute([$userId]);
    if (!empty($people)) {
      $insPe = $pdo->prepare("INSERT INTO user_people(user_id, person_id, weight) VALUES (?,?,?)");
      foreach ($people as $pid => $w) $insPe->execute([$userId, $pid, $w]);
    }

    $pdo->commit();

    wtw_bump_personalization_cache_token();

    echo json_encode(['ok' => true]);
    exit;
  }

  // Método não permitido
  http_response_code(405);
  echo json_encode(['error' => 'method_not_allowed', 'allowed' => ['GET', 'POST']]);
} catch (Throwable $e) {
  if ($pdo instanceof PDO && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  http_response_code(500);
  echo json_encode(['error' => 'internal_error', 'message' => $e->getMessage()]);
}

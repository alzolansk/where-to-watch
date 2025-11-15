<?php
// ========== API DE FAVORITOS ==========
// Gerencia títulos favoritos usando tabela user_titles

header('Content-Type: application/json');
$__candidateRoot = is_file(__DIR__ . '/../../config/bootstrap.php') ? dirname(dirname(__DIR__)) : dirname(__DIR__);
require_once $__candidateRoot . '/config/bootstrap.php';

// Detectar usuário logado (aceita múltiplas chaves de sessão)
$userId = null;
if (isset($_SESSION['id'])) { $userId = (int) $_SESSION['id']; }
elseif (isset($_SESSION['user_id'])) { $userId = (int) $_SESSION['user_id']; }
elseif (isset($_SESSION['id_user'])) { $userId = (int) $_SESSION['id_user']; }

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$pdo = function_exists('get_pdo') ? get_pdo() : null;
if (!$pdo) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Conexão DB indisponível']);
    exit;
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT tmdb_id, media_type, title, poster_path, poster_url, backdrop_path FROM user_favorite_titles WHERE user_id = ? ORDER BY favorited_at DESC, created_at DESC');
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'favorites' => $rows]);
        exit;
    }

    $inputRaw = file_get_contents('php://input');
    $data = json_decode($inputRaw, true) ?: [];

    if ($method === 'POST') {
        $tmdbId = (int) ($data['tmdb_id'] ?? 0);
        $mediaType = in_array(($data['media_type'] ?? 'movie'), ['movie','tv'], true) ? $data['media_type'] : 'movie';
        $title = trim((string) ($data['title'] ?? ''));
        if ($tmdbId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'tmdb_id inválido']);
            exit;
        }
        // Verificar se já existe
        $check = $pdo->prepare('SELECT 1 FROM user_favorite_titles WHERE user_id = ? AND tmdb_id = ? LIMIT 1');
        $check->execute([$userId, $tmdbId]);
        if ($check->fetch()) {
            echo json_encode(['success' => true, 'already' => true]);
            exit;
        }
        // Inserir
        $posterPath = isset($data['poster_path']) ? (string)$data['poster_path'] : null;
        $posterUrl  = isset($data['poster_url']) ? (string)$data['poster_url'] : null;
        $backdrop   = isset($data['backdrop_path']) ? (string)$data['backdrop_path'] : null;
        $insertSql = 'INSERT INTO user_favorite_titles (user_id, tmdb_id, media_type, title, poster_path, poster_url, backdrop_path, created_at) VALUES (?,?,?,?,?,?,?,NOW())';
        try {
            $stmt = $pdo->prepare($insertSql);
            $stmt->execute([$userId, $tmdbId, $mediaType, $title, $posterPath, $posterUrl, $backdrop]);
        } catch (Throwable $e) {
            // Fallback sem coluna title/created_at
            try {
                $stmt = $pdo->prepare('INSERT INTO user_favorite_titles (user_id, tmdb_id, media_type, title) VALUES (?,?,?,?)');
                $stmt->execute([$userId, $tmdbId, $mediaType, $title]);
            } catch (Throwable $inner) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Erro ao inserir favorito', 'error' => $inner->getMessage()]);
                exit;
            }
        }
        echo json_encode(['success' => true, 'added' => true]);
        exit;
    }

    if ($method === 'DELETE') {
        $tmdbId = (int) ($data['tmdb_id'] ?? 0);
        if ($tmdbId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'tmdb_id inválido']);
            exit;
        }
        $del = $pdo->prepare('DELETE FROM user_favorite_titles WHERE user_id = ? AND tmdb_id = ?');
        $del->execute([$userId, $tmdbId]);
        echo json_encode(['success' => true, 'removed' => true]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno', 'error' => $e->getMessage()]);
}

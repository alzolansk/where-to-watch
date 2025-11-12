<?php
session_start();
require_once '../../includes/db.php';

header('Content-Type: application/json');

// Verificar se o usuário está logado - suporta diferentes formatos de sessão
$user_id = null;
if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
} elseif (isset($_SESSION['id_user'])) {
    $user_id = $_SESSION['id_user'];
} elseif (isset($_SESSION['id'])) {
    $user_id = $_SESSION['id'];
}

if (!$user_id) {
    http_response_code(401);
    echo json_encode([
        'success' => false, 
        'message' => 'Usuário não autenticado',
        'debug' => [
            'session_keys' => array_keys($_SESSION),
            'has_user_id' => isset($_SESSION['user_id']),
            'has_id_user' => isset($_SESSION['id_user']),
            'has_id' => isset($_SESSION['id'])
        ]
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDbConnection();

    if ($method === 'GET') {
        // Listar todos os filmes marcados como "Assistir mais tarde"
        $stmt = $pdo->prepare("
            SELECT id, movie_id, movie_title, movie_poster, movie_backdrop, added_at
            FROM watch_later
            WHERE user_id = ?
            ORDER BY added_at DESC
        ");
        $stmt->execute([$user_id]);
        $movies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'movies' => $movies
        ]);

    } elseif ($method === 'POST') {
        // Adicionar filme à lista "Assistir mais tarde"
        $rawInput = file_get_contents('php://input');
        error_log('Watch Later POST - Raw input: ' . $rawInput);
        
        $data = json_decode($rawInput, true);
        $jsonError = json_last_error();
        
        if ($jsonError !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'JSON inválido: ' . json_last_error_msg(),
                'raw_input' => substr($rawInput, 0, 200)
            ]);
            exit;
        }

        if (!isset($data['movie_id']) || !isset($data['movie_title'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => 'Dados incompletos',
                'received' => array_keys($data ?? [])
            ]);
            exit;
        }

        $movie_id = (int)$data['movie_id'];
        $movie_title = trim($data['movie_title']);
        $movie_poster = isset($data['movie_poster']) ? trim($data['movie_poster']) : null;
        $movie_backdrop = isset($data['movie_backdrop']) ? trim($data['movie_backdrop']) : null;
        
        // Limpar valores vazios
        if ($movie_poster === '') $movie_poster = null;
        if ($movie_backdrop === '') $movie_backdrop = null;

        // Verificar se já existe
        $stmt = $pdo->prepare("SELECT id FROM watch_later WHERE user_id = ? AND movie_id = ?");
        $stmt->execute([$user_id, $movie_id]);
        
        if ($stmt->fetch()) {
            echo json_encode([
                'success' => true,
                'message' => 'Filme já está na lista',
                'already_exists' => true
            ]);
            exit;
        }

        // Inserir novo filme
        $stmt = $pdo->prepare("
            INSERT INTO watch_later (user_id, movie_id, movie_title, movie_poster, movie_backdrop)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$user_id, $movie_id, $movie_title, $movie_poster, $movie_backdrop]);

        echo json_encode([
            'success' => true,
            'message' => 'Filme adicionado à lista de assistir mais tarde',
            'id' => $pdo->lastInsertId()
        ]);

    } elseif ($method === 'DELETE') {
        // Remover filme da lista "Assistir mais tarde"
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['movie_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID do filme não fornecido']);
            exit;
        }

        $movie_id = $data['movie_id'];

        $stmt = $pdo->prepare("DELETE FROM watch_later WHERE user_id = ? AND movie_id = ?");
        $stmt->execute([$user_id, $movie_id]);

        echo json_encode([
            'success' => true,
            'message' => 'Filme removido da lista de assistir mais tarde'
        ]);

    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    }

} catch (PDOException $e) {
    error_log('Watch Later PDO Error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no banco de dados',
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    error_log('Watch Later General Error: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no servidor',
        'error' => $e->getMessage()
    ]);
}

<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

$userId = (int)($_SESSION['id'] ?? $_SESSION['id_user'] ?? 0);
if ($userId <= 0) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthenticated']);
    return;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = strtolower((string)($_GET['resource'] ?? ''));

if ($resource === 'titles') {
    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
        return;
    }

    try {
        $response = onboardingTitleSuggestions($_GET);
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) {
        error_log('onboarding_titles_error: ' . $e->getMessage());
        http_response_code(502);
        echo json_encode(['ok' => false, 'error' => 'tmdb_unavailable']);
    }
    return;
}

try {
    $pdo = wyw_bootstrap_pdo();
    ensure_onboarding_schema($pdo);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'database_unavailable']);
    return;
}

if ($method === 'GET') {
    echo json_encode(fetchPreferences($pdo, $userId), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return;
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_payload']);
        return;
    }

    $skipRequested = !empty($payload['skip']);

    try {
        if ($skipRequested) {
            $result = skipOnboarding($pdo, $userId);
        } else {
            $result = persistPreferences($pdo, $userId, $payload);
        }
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('onboarding_preferences_error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'internal_error']);
    }
    return;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);

function wyw_bootstrap_pdo(): PDO
{
    static $pdoInstance = null;
    if ($pdoInstance instanceof PDO) {
        return $pdoInstance;
    }

    $pdoPaths = [
        __DIR__ . '/../includes/db.php',
        __DIR__ . '/includes/db.php',
    ];

    foreach ($pdoPaths as $path) {
        if (is_file($path)) {
            $pdoCandidate = (static function (string $file) {
                $pdo = null;
                require $file;
                return $pdo instanceof PDO ? $pdo : null;
            })($path);

            if ($pdoCandidate instanceof PDO) {
                $pdoInstance = $pdoCandidate;
                return $pdoInstance;
            }
        }
    }

    $configPaths = [
        __DIR__ . '/../config/config.php',
        __DIR__ . '/config/config.php',
    ];

    foreach ($configPaths as $path) {
        if (!is_file($path)) {
            continue;
        }

        $credentials = (static function (string $file) {
            $usuario = $senha = $database = $host = null;
            require $file;
            return [
                'usuario' => $usuario ?? ($GLOBALS['usuario'] ?? null),
                'senha' => $senha ?? ($GLOBALS['senha'] ?? null),
                'database' => $database ?? ($GLOBALS['database'] ?? null),
                'host' => $host ?? ($GLOBALS['host'] ?? null),
            ];
        })($path);

        if (!empty($credentials['host']) && !empty($credentials['database'])) {
            $pdoInstance = new PDO(
                sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $credentials['host'], $credentials['database']),
                $credentials['usuario'] ?? '',
                $credentials['senha'] ?? '',
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
            return $pdoInstance;
        }
    }

    throw new RuntimeException('PDO connection unavailable');
}

function ensure_onboarding_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $ensured = true;

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM tb_users LIKE 'onboarding_completed_at'");
        $columnExists = ($stmt !== false && $stmt->fetch() !== false);
        if ($stmt instanceof PDOStatement) {
            $stmt->closeCursor();
        }
        if (!$columnExists) {
            $pdo->exec("ALTER TABLE tb_users ADD COLUMN onboarding_completed_at DATETIME NULL DEFAULT NULL AFTER email_user");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_users_error: ' . $e->getMessage());
    }

    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS user_keywords (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id INT UNSIGNED NOT NULL,
                keyword_id INT UNSIGNED DEFAULT NULL,
                label VARCHAR(120) NOT NULL,
                weight DECIMAL(4,2) NOT NULL DEFAULT 1.00,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_user_keyword_label (user_id, label),
                KEY idx_keyword_id (keyword_id),
                CONSTRAINT fk_user_keywords_user FOREIGN KEY (user_id) REFERENCES tb_users(id_user) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('onboarding_schema_keywords_error: ' . $e->getMessage());
    }

    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS user_favorite_titles (
                user_id INT UNSIGNED NOT NULL,
                tmdb_id INT UNSIGNED NOT NULL,
                media_type ENUM('movie','tv') NOT NULL DEFAULT 'movie',
                title VARCHAR(180) NOT NULL,
                logo_path VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, tmdb_id, media_type),
                CONSTRAINT fk_user_favorite_titles_user FOREIGN KEY (user_id) REFERENCES tb_users(id_user) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }
}

function fetchPreferences(PDO $pdo, int $userId): array
{
    $response = [
        'ok' => true,
        'user_id' => $userId,
        'completed' => null,
        'genres' => [],
        'keywords' => [],
        'providers' => [],
        'favorites' => [],
    ];

    $stmt = $pdo->prepare('SELECT onboarding_completed_at FROM tb_users WHERE id_user = ? LIMIT 1');
    $stmt->execute([$userId]);
    $response['completed'] = $stmt->fetchColumn() ?: null;

    $stmt = $pdo->prepare('SELECT genre_id, weight FROM user_genres WHERE user_id = ? ORDER BY genre_id');
    $stmt->execute([$userId]);
    $response['genres'] = array_map(static function (array $row) {
        return (int) $row['genre_id'];
    }, $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT keyword_id, label, weight FROM user_keywords WHERE user_id = ? ORDER BY label');
    $stmt->execute([$userId]);
    $response['keywords'] = array_map(static function (array $row) {
        return [
            'id' => $row['keyword_id'] !== null ? (int) $row['keyword_id'] : null,
            'label' => $row['label'],
            'weight' => (float) $row['weight'],
        ];
    }, $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT provider_id FROM user_providers WHERE user_id = ? AND enabled = 1 ORDER BY provider_id');
    $stmt->execute([$userId]);
    $response['providers'] = array_map('intval', array_column($stmt->fetchAll(), 'provider_id'));

    $stmt = $pdo->prepare('SELECT tmdb_id, media_type, title, logo_path FROM user_favorite_titles WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    $response['favorites'] = array_map(static function (array $row) {
        $logoPath = $row['logo_path'] ?? null;
        return [
            'tmdb_id' => (int) $row['tmdb_id'],
            'media_type' => $row['media_type'],
            'title' => $row['title'],
            'logo_path' => $logoPath,
            'logo_url' => tmdb_image_url($logoPath),
        ];
    }, $stmt->fetchAll());

    return $response;
}

function persistPreferences(PDO $pdo, int $userId, array $payload): array
{
    $genresInput = isset($payload['genres']) && is_array($payload['genres']) ? $payload['genres'] : [];
    $keywordsInput = isset($payload['keywords']) && is_array($payload['keywords']) ? $payload['keywords'] : [];
    $providersInput = isset($payload['providers']) && is_array($payload['providers']) ? $payload['providers'] : [];
    $favoritesInput = isset($payload['favorites']) && is_array($payload['favorites']) ? $payload['favorites'] : [];

    $genres = [];
    foreach ($genresInput as $value) {
        $id = (int) $value;
        if ($id > 0) {
            $genres[$id] = 1.0;
        }
    }

    $keywords = [];
    foreach ($keywordsInput as $keyword) {
        if (is_array($keyword)) {
            $id = (int) ($keyword['id'] ?? $keyword['keyword_id'] ?? 0);
            $label = normalise_label((string) ($keyword['label'] ?? $keyword['name'] ?? ''));
        } else {
            $id = (int) $keyword;
            $label = '';
        }
        if ($label === '') {
            continue;
        }
        $key = ($id > 0 ? (string) $id : 'custom') . ':' . mb_lower($label);
        $keywords[$key] = [
            'id' => $id > 0 ? $id : null,
            'label' => mb_limit($label, 120),
        ];
    }

    $providers = [];
    foreach ($providersInput as $value) {
        $id = (int) $value;
        if ($id > 0) {
            $providers[$id] = true;
        }
    }

        $favorites = [];
        foreach ($favoritesInput as $favorite) {
            if (!is_array($favorite)) {
            continue;
        }
        $id = (int) ($favorite['tmdb_id'] ?? $favorite['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }
        $mediaType = strtolower((string) ($favorite['media_type'] ?? $favorite['type'] ?? 'movie'));
        if ($mediaType !== 'movie' && $mediaType !== 'tv') {
            $mediaType = 'movie';
        }
        $title = normalise_label((string) ($favorite['title'] ?? $favorite['label'] ?? $favorite['name'] ?? ''));
        if ($title === '') {
            continue;
        }
        $logoPath = normalise_logo_path($favorite['logo_path'] ?? null, $favorite['logo_url'] ?? $favorite['logo'] ?? null);
        $key = $id . ':' . $mediaType;
        $favorites[$key] = [
            'tmdb_id' => $id,
            'media_type' => $mediaType,
            'title' => mb_limit($title, 180),
            'logo_path' => $logoPath,
        ];
    }

    $pdo->beginTransaction();

    $pdo->prepare('DELETE FROM user_genres WHERE user_id = ?')->execute([$userId]);
    if (!empty($genres)) {
        $stmt = $pdo->prepare('INSERT INTO user_genres (user_id, genre_id, weight) VALUES (?, ?, ?)');
        foreach ($genres as $genreId => $weight) {
            $stmt->execute([$userId, $genreId, $weight]);
        }
    }

    $pdo->prepare('DELETE FROM user_keywords WHERE user_id = ?')->execute([$userId]);
    if (!empty($keywords)) {
        $stmt = $pdo->prepare('INSERT INTO user_keywords (user_id, keyword_id, label, weight) VALUES (?, ?, ?, 1.0)');
        foreach ($keywords as $keyword) {
            $stmt->execute([$userId, $keyword['id'], $keyword['label']]);
        }
    }

    $pdo->prepare('DELETE FROM user_providers WHERE user_id = ?')->execute([$userId]);
    if (!empty($providers)) {
        $stmt = $pdo->prepare('INSERT INTO user_providers (user_id, provider_id, enabled) VALUES (?, ?, 1)');
        foreach (array_keys($providers) as $providerId) {
            $stmt->execute([$userId, $providerId]);
        }
    }

    $pdo->prepare('DELETE FROM user_favorite_titles WHERE user_id = ?')->execute([$userId]);
    if (!empty($favorites)) {
        $stmt = $pdo->prepare('INSERT INTO user_favorite_titles (user_id, tmdb_id, media_type, title, logo_path) VALUES (?, ?, ?, ?, ?)');
        foreach ($favorites as $favorite) {
            $stmt->execute([$userId, $favorite['tmdb_id'], $favorite['media_type'], $favorite['title'], $favorite['logo_path']]);
        }
    }

    $pdo->prepare('UPDATE tb_users SET onboarding_completed_at = NOW() WHERE id_user = ?')->execute([$userId]);

    $pdo->commit();

    markOnboardingSessionComplete();

    return ['ok' => true];
}

function skipOnboarding(PDO $pdo, int $userId): array
{
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE tb_users SET onboarding_completed_at = NOW() WHERE id_user = ?')->execute([$userId]);
    $pdo->commit();
    markOnboardingSessionComplete();
    return ['ok' => true];
}

function markOnboardingSessionComplete(): void
{
    $_SESSION['onboarding_pending'] = false;
    $_SESSION['onboarding_completed_at'] = date('c');
}

function normalise_label(string $value): string
{
    $trimmed = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    return $trimmed;
}

function mb_lower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function mb_limit(string $value, int $length): string
{
    if ($length <= 0) {
        return '';
    }
    return function_exists('mb_substr') ? mb_substr($value, 0, $length, 'UTF-8') : substr($value, 0, $length);
}

function normalise_logo_path($path, $url): ?string
{
    $pathValue = is_string($path) ? trim($path) : '';
    if ($pathValue !== '') {
        return $pathValue[0] === '/' ? $pathValue : '/' . $pathValue;
    }
    if (is_string($url) && $url !== '') {
        $parsed = parse_url($url, PHP_URL_PATH);
        if (is_string($parsed) && $parsed !== '') {
            return $parsed[0] === '/' ? $parsed : '/' . $parsed;
        }
    }
    return null;
}

function tmdb_image_url(?string $path): ?string
{
    if ($path === null || $path === '') {
        return null;
    }
    if (preg_match('/^https?:/i', $path)) {
        return $path;
    }
    return 'https://image.tmdb.org/t/p/w300' . ($path[0] === '/' ? $path : '/' . $path);
}

function onboardingTitleSuggestions(array $queryParams): array
{
    require_once __DIR__ . '/../includes/tmdb.php';

    $query = normalise_label((string)($queryParams['q'] ?? $queryParams['query'] ?? ''));
    $results = [];

    if ($query !== '') {
        $response = tmdb_get('/search/movie', [
            'query' => $query,
            'include_adult' => 'false',
            'page' => 1,
            'language' => 'pt-BR',
        ]);
    } else {
        $response = tmdb_get('/trending/movie/week', [
            'page' => 1,
            'language' => 'pt-BR',
        ]);
    }

    $items = $response['results'] ?? [];

    if (empty($items) && $query !== '') {
        $fallback = tmdb_get('/trending/movie/week', [
            'page' => 1,
            'language' => 'pt-BR',
        ]);
        $items = $fallback['results'] ?? [];
    }

    $items = array_slice($items, 0, 15);

    foreach ($items as $row) {
        $id = (int)($row['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }
        $title = normalise_label((string)($row['title'] ?? $row['name'] ?? ''));
        if ($title === '') {
            continue;
        }
        $logo = resolveTitleLogo('movie', $id);
        $results[] = [
            'tmdb_id' => $id,
            'media_type' => 'movie',
            'title' => $title,
            'logo_path' => $logo['path'] ?? null,
            'logo_url' => $logo['url'] ?? null,
            'release_year' => isset($row['release_date']) && $row['release_date'] !== '' ? substr($row['release_date'], 0, 4) : null,
        ];
    }

    return [
        'ok' => true,
        'results' => $results,
    ];
}

function resolveTitleLogo(string $mediaType, int $id): array
{
    static $cache = [];
    $key = $mediaType . ':' . $id;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    $path = null;
    try {
        $images = tmdb_get(sprintf('/%s/%d/images', $mediaType, $id), [
            'include_image_language' => 'pt,null,en',
        ]);
        if (!empty($images['logos'])) {
            foreach ($images['logos'] as $logo) {
                if (!empty($logo['file_path'])) {
                    $path = $logo['file_path'];
                    break;
                }
            }
        }
        if ($path === null && !empty($images['posters'])) {
            foreach ($images['posters'] as $poster) {
                if (!empty($poster['file_path'])) {
                    $path = $poster['file_path'];
                    break;
                }
            }
        }
    } catch (Throwable $e) {
        error_log('onboarding_logo_fetch_error: ' . $e->getMessage());
    }

    $cache[$key] = [
        'path' => $path,
        'url' => tmdb_image_url($path),
    ];

    return $cache[$key];
}

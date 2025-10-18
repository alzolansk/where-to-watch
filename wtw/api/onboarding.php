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

if ($resource === 'recommendations') {
    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
        return;
    }

    try {
        $pdo = wyw_bootstrap_pdo();
        ensure_onboarding_schema($pdo);
        $preferences = fetchPreferences($pdo, $userId);
        $favorites = is_array($preferences['favorites'] ?? null) ? $preferences['favorites'] : [];
        $response = onboardingFavoritesRecommendations($favorites);
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) {
        error_log('onboarding_recommendations_error: ' . $e->getMessage());
        http_response_code(502);
        echo json_encode(['ok' => false, 'error' => 'recommendations_unavailable']);
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
                poster_path VARCHAR(255) DEFAULT NULL,
                poster_url VARCHAR(255) DEFAULT NULL,
                backdrop_path VARCHAR(255) DEFAULT NULL,
                favorited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                genres VARCHAR(100) DEFAULT NULL,
                keywords VARCHAR(100) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, tmdb_id, media_type),
                CONSTRAINT fk_user_favorite_titles_user FOREIGN KEY (user_id) REFERENCES tb_users(id_user) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'poster_path'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN poster_path VARCHAR(255) DEFAULT NULL AFTER logo_path");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'poster_url'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN poster_url VARCHAR(255) DEFAULT NULL AFTER poster_path");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'backdrop_path'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN backdrop_path VARCHAR(255) DEFAULT NULL AFTER poster_url");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'favorited_at'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN favorited_at TIMESTAMP NULL DEFAULT NULL AFTER backdrop_path");
            $pdo->exec("UPDATE user_favorite_titles SET favorited_at = created_at WHERE favorited_at IS NULL");
            $pdo->exec("ALTER TABLE user_favorite_titles MODIFY COLUMN favorited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'genres'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN genres VARCHAR(100) DEFAULT NULL AFTER favorited_at");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'keywords'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN keywords VARCHAR(100) DEFAULT NULL AFTER genres");
        }
    } catch (Throwable $e) {
        error_log('onboarding_schema_favorites_error: ' . $e->getMessage());
    }

    try {
        $column = $pdo->query("SHOW COLUMNS FROM user_favorite_titles LIKE 'created_at'")->fetch(PDO::FETCH_ASSOC);
        if ($column === false) {
            $pdo->exec("ALTER TABLE user_favorite_titles ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER keywords");
        }
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

    $stmt = $pdo->prepare('SELECT tmdb_id, media_type, title, logo_path, poster_path, poster_url, backdrop_path, favorited_at, genres, keywords FROM user_favorite_titles WHERE user_id = ? ORDER BY favorited_at DESC, created_at DESC');
    $stmt->execute([$userId]);
    $favorites = array_map(static function (array $row) {
        $logoPath = $row['logo_path'] ?? null;
        $posterPath = $row['poster_path'] ?? null;
        $posterUrl = $row['poster_url'] ?? null;
        $backdropPath = $row['backdrop_path'] ?? null;
        if (!$posterUrl) {
            $posterUrl = tmdb_image_url($posterPath);
        }
        if (!$posterUrl) {
            $posterUrl = tmdb_image_url($backdropPath);
        }
        return [
            'tmdb_id' => (int) $row['tmdb_id'],
            'media_type' => $row['media_type'],
            'title' => $row['title'],
            'logo_path' => $logoPath,
            'logo_url' => tmdb_image_url($logoPath),
            'poster_path' => $posterPath,
            'poster_url' => $posterUrl,
            'backdrop_path' => $backdropPath,
            'favorited_at' => $row['favorited_at'] ?? null,
            'genres' => parse_favorite_terms($row['genres'] ?? null),
            'keywords' => parse_favorite_terms($row['keywords'] ?? null),
        ];
    }, $stmt->fetchAll());

    $favoritesToUpdate = [];
    foreach ($favorites as &$favorite) {
        if (!empty($favorite['poster_url']) || !empty($favorite['poster_path'])) {
            continue;
        }
        try {
            $details = load_favorite_details($favorite['media_type'], (int) $favorite['tmdb_id']);
        } catch (Throwable $e) {
            $details = [];
        }
        if (is_array($details)) {
            if (empty($favorite['poster_path']) && !empty($details['poster_path'])) {
                $favorite['poster_path'] = $details['poster_path'];
            }
            if (empty($favorite['poster_url']) && !empty($details['poster_url'])) {
                $favorite['poster_url'] = $details['poster_url'];
            }
            if (empty($favorite['backdrop_path']) && !empty($details['backdrop_path'])) {
                $favorite['backdrop_path'] = $details['backdrop_path'];
            }
        }
        if (empty($favorite['poster_url']) && !empty($favorite['poster_path'])) {
            $favorite['poster_url'] = tmdb_image_url($favorite['poster_path']);
        }
        if (empty($favorite['poster_url']) && !empty($favorite['backdrop_path'])) {
            $favorite['poster_url'] = tmdb_image_url($favorite['backdrop_path']);
        }

        if (isset($favorite['poster_path'])) {
            $favorite['poster_path'] = $favorite['poster_path'] !== null ? mb_limit((string) $favorite['poster_path'], 250) : null;
        }
        if (isset($favorite['poster_url'])) {
            $favorite['poster_url'] = $favorite['poster_url'] !== null ? mb_limit((string) $favorite['poster_url'], 250) : null;
        }
        if (isset($favorite['backdrop_path'])) {
            $favorite['backdrop_path'] = $favorite['backdrop_path'] !== null ? mb_limit((string) $favorite['backdrop_path'], 250) : null;
        }

        if (!empty($favorite['poster_path']) || !empty($favorite['poster_url']) || !empty($favorite['backdrop_path'])) {
            $favoritesToUpdate[] = [
                'tmdb_id' => (int) $favorite['tmdb_id'],
                'media_type' => $favorite['media_type'],
                'poster_path' => $favorite['poster_path'],
                'poster_url' => $favorite['poster_url'],
                'backdrop_path' => $favorite['backdrop_path'],
            ];
        }
    }
    unset($favorite);

    if (!empty($favoritesToUpdate)) {
        $updateStmt = $pdo->prepare('UPDATE user_favorite_titles SET poster_path = ?, poster_url = ?, backdrop_path = ? WHERE user_id = ? AND tmdb_id = ? AND media_type = ?');
        foreach ($favoritesToUpdate as $item) {
            $updateStmt->execute([
                $item['poster_path'],
                $item['poster_url'],
                $item['backdrop_path'],
                $userId,
                $item['tmdb_id'],
                $item['media_type'],
            ]);
        }
    }

    $response['favorites'] = $favorites;

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
        $logoPath = normalise_logo_path($favorite['logo_path'] ?? null, $favorite['logo_url'] ?? $favorite['logo'] ?? null);
        $logoPath = $logoPath !== null ? mb_limit($logoPath, 250) : null;

        $posterPath = normalise_logo_path($favorite['poster_path'] ?? null, $favorite['poster_url'] ?? null);
        $posterPath = $posterPath !== null ? mb_limit($posterPath, 250) : null;
        $posterUrlRaw = is_string($favorite['poster_url'] ?? null) ? trim((string) $favorite['poster_url']) : '';
        $posterUrl = $posterUrlRaw !== '' ? mb_limit($posterUrlRaw, 250) : null;
        $backdropPath = normalise_logo_path($favorite['backdrop_path'] ?? null, null);
        $backdropPath = $backdropPath !== null ? mb_limit($backdropPath, 250) : null;
        $key = $id . ':' . $mediaType;
        $favorites[$key] = [
            'tmdb_id' => $id,
            'media_type' => $mediaType,
            'title' => $title !== '' ? mb_limit($title, 180) : '',
            'logo_path' => $logoPath,
            'poster_path' => $posterPath,
            'poster_url' => $posterUrl,
            'backdrop_path' => $backdropPath,
            'genres' => [],
            'keywords' => [],
        ];
    }

    if (!empty($favorites)) {
        $favorites = enrich_favorite_selections($favorites, $genres, $keywords);
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
        $stmt = $pdo->prepare('INSERT INTO user_favorite_titles (user_id, tmdb_id, media_type, title, logo_path, poster_path, poster_url, backdrop_path, favorited_at, genres, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)');
        foreach ($favorites as $favorite) {
            if (($favorite['title'] ?? '') === '') {
                continue;
            }
            $genresText = format_favorite_terms_for_storage(array_values($favorite['genres'] ?? []));
            $keywordsText = format_favorite_terms_for_storage(array_map(static function (array $keyword) {
                return $keyword['label'] ?? '';
            }, $favorite['keywords'] ?? []));
            $stmt->execute([
                $userId,
                $favorite['tmdb_id'],
                $favorite['media_type'],
                mb_limit($favorite['title'], 180),
                $favorite['logo_path'],
                $favorite['poster_path'] ?? null,
                $favorite['poster_url'] ?? null,
                $favorite['backdrop_path'] ?? null,
                $genresText,
                $keywordsText,
            ]);
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

function enrich_favorite_selections(array $favorites, array &$genres, array &$keywords): array
{
    foreach ($favorites as $key => &$favorite) {
        $details = load_favorite_details($favorite['media_type'], $favorite['tmdb_id']);

        if (!empty($details['title']) && ($favorite['title'] ?? '') === '') {
            $favorite['title'] = mb_limit(normalise_label((string) $details['title']), 180);
        }

        if (!empty($details['genres']) && is_array($details['genres'])) {
            $favorite['genres'] = $details['genres'];
            foreach ($details['genres'] as $genreId => $genreName) {
                $genreId = (int) $genreId;
                if ($genreId > 0) {
                    $genres[$genreId] = 1.0;
                }
            }
        }

        if (!empty($details['keywords']) && is_array($details['keywords'])) {
            $favorite['keywords'] = $details['keywords'];
            foreach ($details['keywords'] as $keyword) {
                if (!is_array($keyword)) {
                    continue;
                }
                $label = normalise_label((string) ($keyword['label'] ?? $keyword['name'] ?? ''));
                if ($label === '') {
                    continue;
                }
                $keywordId = isset($keyword['id']) && (int) $keyword['id'] > 0 ? (int) $keyword['id'] : null;
                $keywordKey = ($keywordId !== null ? (string) $keywordId : 'tmdb') . ':' . mb_lower($label);
                $keywords[$keywordKey] = [
                    'id' => $keywordId,
                    'label' => mb_limit($label, 120),
                ];
            }
        }

        if (($favorite['poster_path'] ?? null) === null && !empty($details['poster_path'])) {
            $favorite['poster_path'] = normalise_logo_path($details['poster_path'], $details['poster_url'] ?? null);
        }

        $hasPosterUrl = is_string($favorite['poster_url'] ?? null) && $favorite['poster_url'] !== '';
        if (!$hasPosterUrl && !empty($details['poster_url'])) {
            $favorite['poster_url'] = mb_limit($details['poster_url'], 250);
            $hasPosterUrl = true;
        }
        if (!$hasPosterUrl && !empty($favorite['poster_path'])) {
            $favorite['poster_url'] = tmdb_image_url($favorite['poster_path']);
            $hasPosterUrl = is_string($favorite['poster_url']) && $favorite['poster_url'] !== '';
        }

        if (($favorite['backdrop_path'] ?? null) === null && !empty($details['backdrop_path'])) {
            $favorite['backdrop_path'] = normalise_logo_path($details['backdrop_path'], null);
        }

        if (isset($favorite['poster_path'])) {
            $favorite['poster_path'] = $favorite['poster_path'] !== null ? mb_limit($favorite['poster_path'], 250) : null;
        }
        if (isset($favorite['poster_url'])) {
            $favorite['poster_url'] = $favorite['poster_url'] !== null ? mb_limit($favorite['poster_url'], 250) : null;
        }
        if (isset($favorite['backdrop_path'])) {
            $favorite['backdrop_path'] = $favorite['backdrop_path'] !== null ? mb_limit($favorite['backdrop_path'], 250) : null;
        }

        if (($favorite['title'] ?? '') === '') {
            unset($favorites[$key]);
        }
    }
    unset($favorite);

    return $favorites;
}

function &favorite_details_cache(): array
{
    static $cache = [];
    return $cache;
}

function process_favorite_details_response(string $mediaType, int $tmdbId, array $response): array
{
    $title = normalise_label((string) ($response['title'] ?? $response['name'] ?? ''));

    $genres = [];
    if (!empty($response['genres']) && is_array($response['genres'])) {
        foreach ($response['genres'] as $genre) {
            if (!is_array($genre)) {
                continue;
            }
            $genreId = (int) ($genre['id'] ?? 0);
            $genreName = normalise_label((string) ($genre['name'] ?? ''));
            if ($genreId > 0 && $genreName !== '') {
                $genres[$genreId] = mb_limit($genreName, 80);
            }
        }
    }

    $keywords = [];
    $keywordSource = $response['keywords'] ?? [];
    if (isset($keywordSource['keywords']) && is_array($keywordSource['keywords'])) {
        $keywordSource = $keywordSource['keywords'];
    } elseif (isset($keywordSource['results']) && is_array($keywordSource['results'])) {
        $keywordSource = $keywordSource['results'];
    }

    if (is_array($keywordSource)) {
        foreach ($keywordSource as $keyword) {
            if (!is_array($keyword)) {
                continue;
            }
            $label = normalise_label((string) ($keyword['name'] ?? $keyword['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $keywords[] = [
                'id' => isset($keyword['id']) && (int) $keyword['id'] > 0 ? (int) $keyword['id'] : null,
                'label' => mb_limit($label, 120),
            ];
        }
    }

    $collection = null;
    if (!empty($response['belongs_to_collection']) && is_array($response['belongs_to_collection'])) {
        $collectionId = (int) ($response['belongs_to_collection']['id'] ?? 0);
        $collectionName = normalise_label((string) ($response['belongs_to_collection']['name'] ?? ''));
        if ($collectionId > 0 || $collectionName !== '') {
            $collection = [
                'id' => $collectionId > 0 ? $collectionId : null,
                'name' => $collectionName,
            ];
        }
    }

    $cast = [];
    if (!empty($response['credits']['cast']) && is_array($response['credits']['cast'])) {
        foreach ($response['credits']['cast'] as $index => $member) {
            if ($index >= 12) {
                break;
            }
            if (!is_array($member)) {
                continue;
            }
            $name = normalise_label((string) ($member['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $cast[] = [
                'id' => isset($member['id']) && (int) $member['id'] > 0 ? (int) $member['id'] : null,
                'name' => mb_limit($name, 120),
            ];
        }
    }

    $posterPath = normalise_logo_path($response['poster_path'] ?? null, null);
    $backdropPath = normalise_logo_path($response['backdrop_path'] ?? null, null);
    $posterUrl = tmdb_image_url($posterPath);
    if (!$posterUrl) {
        $posterUrl = tmdb_image_url($backdropPath);
    }

    return [
        'title' => $title,
        'genres' => $genres,
        'keywords' => $keywords,
        'collection' => $collection,
        'cast' => $cast,
        'poster_path' => $posterPath,
        'poster_url' => $posterUrl,
        'backdrop_path' => $backdropPath,
    ];
}

function load_favorite_details(string $mediaType, int $tmdbId): array
{
    $cache = &favorite_details_cache();
    $cacheKey = $mediaType . ':' . $tmdbId;
    if (array_key_exists($cacheKey, $cache)) {
        return $cache[$cacheKey];
    }

    require_once __DIR__ . '/../includes/tmdb.php';

    try {
        $response = tmdb_get(sprintf('/%s/%d', $mediaType, $tmdbId), [
            'append_to_response' => 'keywords,credits',
            'language' => 'pt-BR',
        ]);
    } catch (Throwable $e) {
        error_log('onboarding_favorite_metadata_error: ' . $e->getMessage());
        $cache[$cacheKey] = [];
        return [];
    }

    if (!is_array($response)) {
        $cache[$cacheKey] = [];
        return [];
    }

    $details = process_favorite_details_response($mediaType, $tmdbId, $response);
    $cache[$cacheKey] = $details;

    return $details;
}

function prefetch_favorite_details_bulk(string $mediaType, array $ids): array
{
    $cache = &favorite_details_cache();
    $uniqueIds = array_values(array_unique(array_filter(array_map('intval', $ids))));
    if (empty($uniqueIds)) {
        return [];
    }

    require_once __DIR__ . '/../includes/tmdb.php';

    $requests = [];
    foreach ($uniqueIds as $id) {
        $cacheKey = $mediaType . ':' . $id;
        if (!array_key_exists($cacheKey, $cache)) {
            $requests[$id] = [
                'path' => sprintf('/%s/%d', $mediaType, $id),
                'params' => [
                    'append_to_response' => 'keywords,credits',
                    'language' => 'pt-BR',
                ],
            ];
        }
    }

    $responses = [];
    if (!empty($requests)) {
        try {
            $responses = tmdb_get_bulk($requests);
        } catch (Throwable $e) {
            error_log('favorite_details_bulk_error: ' . $e->getMessage());
            $responses = [];
        }
    }

    $results = [];
    foreach ($uniqueIds as $id) {
        $cacheKey = $mediaType . ':' . $id;
        if (!array_key_exists($cacheKey, $cache)) {
            $response = $responses[$id] ?? null;
            if (!is_array($response)) {
                $cache[$cacheKey] = [];
                continue;
            }
            $cache[$cacheKey] = process_favorite_details_response($mediaType, $id, $response);
        }
        $results[$id] = $cache[$cacheKey];
    }

    return $results;
}

function format_favorite_terms_for_storage(array $terms, int $limit = 100): ?string
{
    if (empty($terms)) {
        return null;
    }

    $labels = [];
    foreach ($terms as $term) {
        if (is_array($term)) {
            $label = normalise_label((string) ($term['label'] ?? $term['name'] ?? ''));
        } else {
            $label = normalise_label((string) $term);
        }
        if ($label === '') {
            continue;
        }
        $labels[$label] = true;
    }

    if (empty($labels)) {
        return null;
    }

    $text = implode(', ', array_keys($labels));
    $text = mb_limit($text, $limit);

    return $text !== '' ? $text : null;
}

function parse_favorite_terms($value): array
{
    if (!is_string($value) || $value === '') {
        return [];
    }

    $parts = preg_split('/\s*,\s*/u', $value) ?: [];
    $results = [];
    foreach ($parts as $part) {
        $label = normalise_label((string) $part);
        if ($label !== '') {
            $results[] = $label;
        }
    }

    return $results;
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

    $prepared = [];
    foreach ($items as $row) {
        $id = (int)($row['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }
        $title = normalise_label((string)($row['title'] ?? $row['name'] ?? ''));
        if ($title === '') {
            continue;
        }
        $posterPath = normalise_logo_path($row['poster_path'] ?? null, null);
        $backdropPath = normalise_logo_path($row['backdrop_path'] ?? null, null);
        $posterUrl = tmdb_image_url($posterPath);
        if (!$posterUrl) {
            $posterUrl = tmdb_image_url($backdropPath);
        }

        $prepared[] = [
            'id' => $id,
            'title' => $title,
            'release_year' => isset($row['release_date']) && $row['release_date'] !== '' ? substr($row['release_date'], 0, 4) : null,
            'poster_path' => $posterPath,
            'poster_url' => $posterUrl,
            'backdrop_path' => $backdropPath,
        ];
    }

    if (!empty($prepared)) {
        $logos = resolveTitleLogosBulk('movie', array_column($prepared, 'id'));
        foreach ($prepared as $item) {
            $logo = $logos[$item['id']] ?? null;
            $results[] = [
                'tmdb_id' => $item['id'],
                'media_type' => 'movie',
                'title' => $item['title'],
                'logo_path' => $logo['path'] ?? null,
                'logo_url' => $logo['url'] ?? null,
                'release_year' => $item['release_year'],
                'poster_path' => $item['poster_path'],
                'poster_url' => $item['poster_url'],
                'backdrop_path' => $item['backdrop_path'],
            ];
        }
    }

    return [
        'ok' => true,
        'results' => $results,
    ];
}

function onboardingFavoritesRecommendations(array $favorites): array
{
    require_once __DIR__ . '/../includes/tmdb.php';

    $preparedFavorites = [];
    $existingKeys = [];

    foreach ($favorites as $favorite) {
        if (!is_array($favorite)) {
            continue;
        }
        $id = (int)($favorite['tmdb_id'] ?? $favorite['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }
        $mediaTypeRaw = strtolower((string)($favorite['media_type'] ?? $favorite['type'] ?? 'movie'));
        $mediaType = $mediaTypeRaw === 'tv' ? 'tv' : 'movie';
        $key = $id . ':' . $mediaType;
        $existingKeys[$key] = true;
        $preparedFavorites[] = [
            'tmdb_id' => $id,
            'media_type' => $mediaType,
        ];
    }

    if (empty($preparedFavorites)) {
        $fallback = onboardingTitleSuggestions([]);
        return [
            'ok' => $fallback['ok'] ?? true,
            'source' => 'fallback',
            'results' => $fallback['results'] ?? [],
        ];
    }

    $seedFavorites = array_slice($preparedFavorites, 0, 6);
    $seedProfiles = [];
    $candidates = [];

    foreach ($seedFavorites as $seedIndex => $favorite) {
        $seedKey = (int) $favorite['tmdb_id'] . ':' . $favorite['media_type'];
        if (!isset($seedProfiles[$seedKey])) {
            $seedDetails = load_favorite_details($favorite['media_type'], (int) $favorite['tmdb_id']);
            $seedProfiles[$seedKey] = build_recommendation_match_profile($seedDetails);
        }

        $items = [];
        try {
            $response = tmdb_get(sprintf('/%s/%d/recommendations', $favorite['media_type'], $favorite['tmdb_id']), [
                'language' => 'pt-BR',
                'page' => 1,
            ]);
            $items = $response['results'] ?? [];
            if (empty($items)) {
                $fallbackResponse = tmdb_get(sprintf('/%s/%d/similar', $favorite['media_type'], $favorite['tmdb_id']), [
                    'language' => 'pt-BR',
                    'page' => 1,
                ]);
                $items = $fallbackResponse['results'] ?? [];
            }
        } catch (Throwable $e) {
            error_log('onboarding_recommendations_fetch_error: ' . $e->getMessage());
        }

        if (empty($items)) {
            continue;
        }

        $items = array_slice($items, 0, 12);
        foreach ($items as $position => $item) {
            if (!is_array($item)) {
                continue;
            }
            $candidateId = (int)($item['id'] ?? 0);
            if ($candidateId <= 0) {
                continue;
            }

            $candidateTypeRaw = strtolower((string)($item['media_type'] ?? $favorite['media_type']));
            $candidateType = $candidateTypeRaw === 'tv' ? 'tv' : 'movie';
            $candidateKey = $candidateId . ':' . $candidateType;
            if (isset($existingKeys[$candidateKey])) {
                continue;
            }

            $title = normalise_label((string)($item['title'] ?? $item['name'] ?? ''));
            if ($title === '') {
                continue;
            }

            $posterPath = normalise_logo_path($item['poster_path'] ?? null, null);
            $backdropPath = normalise_logo_path($item['backdrop_path'] ?? null, null);
            $posterUrl = tmdb_image_url($posterPath);
            if ($posterUrl === null) {
                $posterUrl = tmdb_image_url($backdropPath);
            }

            $score = 120 - ($seedIndex * 14) - ($position * 2);
            if (isset($item['vote_average'])) {
                $score += (float)$item['vote_average'] * 1.5;
            }

            $existing = $candidates[$candidateKey] ?? null;
            $seedKeys = $existing['seed_keys'] ?? [];
            if (!in_array($seedKey, $seedKeys, true)) {
                $seedKeys[] = $seedKey;
            }

            if ($existing === null || $score > ($existing['score'] ?? -INF)) {
                $candidates[$candidateKey] = [
                    'tmdb_id' => $candidateId,
                    'media_type' => $candidateType,
                    'title' => $title,
                    'poster_path' => $posterPath,
                    'poster_url' => $posterUrl,
                    'backdrop_path' => $backdropPath,
                    'seed_keys' => $seedKeys,
                    'score' => $score,
                ];
            } else {
                $existing['seed_keys'] = $seedKeys;
                $candidates[$candidateKey] = $existing;
            }
        }
    }

    if (empty($candidates)) {
        $fallback = onboardingTitleSuggestions([]);
        return [
            'ok' => $fallback['ok'] ?? true,
            'source' => 'fallback',
            'results' => $fallback['results'] ?? [],
        ];
    }

    $byType = [];
    foreach ($candidates as $candidate) {
        $byType[$candidate['media_type']][] = (int)$candidate['tmdb_id'];
    }

    foreach ($byType as $type => $ids) {
        $uniqueIds = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (empty($uniqueIds)) {
            continue;
        }
        $logos = resolveTitleLogosBulk($type, $uniqueIds);
        foreach ($uniqueIds as $id) {
            $key = $type . ':' . $id;
            if (!isset($candidates[$key])) {
                continue;
            }
            $logo = $logos[$id] ?? null;
            $candidates[$key]['logo_path'] = $logo['path'] ?? null;
            $candidates[$key]['logo_url'] = $logo['url'] ?? null;
        }
    }

    if (!empty($candidates)) {
        $prefetchByType = [];
        foreach ($candidates as $candidate) {
            $type = $candidate['media_type'] ?? null;
            $id = isset($candidate['tmdb_id']) ? (int) $candidate['tmdb_id'] : 0;
            if ($type && $id > 0) {
                $prefetchByType[$type][] = $id;
            }
        }
        foreach ($prefetchByType as $type => $ids) {
            prefetch_favorite_details_bulk($type, $ids);
        }
    }

    foreach ($candidates as $candidateKey => &$candidate) {
        $details = load_favorite_details($candidate['media_type'], (int) $candidate['tmdb_id']);
        $profile = build_recommendation_match_profile($details);
        $match = summarize_candidate_match($candidate['seed_keys'] ?? [], $seedProfiles, $profile);
        if ($match !== null) {
            $candidate['match'] = $match;
        }
    }
    unset($candidate);

    $sorted = array_values($candidates);
    usort($sorted, static function (array $a, array $b): int {
        return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    });

    $limited = array_slice($sorted, 0, 15);
    foreach ($limited as &$entry) {
        unset($entry['score']);
    }
    unset($entry);

    return [
        'ok' => true,
        'source' => 'recommendations',
        'results' => $limited,
    ];
}

function build_recommendation_match_profile(array $details): array
{
    $genreIds = [];
    $genreLabels = [];
    if (!empty($details['genres']) && is_array($details['genres'])) {
        foreach ($details['genres'] as $genreId => $genreName) {
            $genreId = (int) $genreId;
            if ($genreId <= 0) {
                continue;
            }
            $genreIds[] = $genreId;
            $label = normalise_label((string) $genreName);
            if ($label !== '') {
                $genreLabels[$genreId] = mb_limit($label, 80);
            }
        }
    }

    $keywords = [];
    if (!empty($details['keywords']) && is_array($details['keywords'])) {
        foreach ($details['keywords'] as $keyword) {
            if (!is_array($keyword)) {
                continue;
            }
            $label = normalise_label((string) ($keyword['label'] ?? $keyword['name'] ?? ''));
            if ($label === '') {
                continue;
            }
            $keywords[mb_lower($label)] = mb_limit($label, 120);
        }
    }

    $cast = [];
    if (!empty($details['cast']) && is_array($details['cast'])) {
        foreach ($details['cast'] as $member) {
            if (!is_array($member)) {
                continue;
            }
            $name = normalise_label((string) ($member['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $id = isset($member['id']) && (int) $member['id'] > 0 ? (int) $member['id'] : null;
            $key = $id !== null ? 'id:' . $id : 'name:' . mb_lower($name);
            if (!isset($cast[$key])) {
                $cast[$key] = mb_limit($name, 120);
            }
        }
    }

    $collection = null;
    if (!empty($details['collection']) && is_array($details['collection'])) {
        $collectionId = isset($details['collection']['id']) ? (int) $details['collection']['id'] : 0;
        $collectionName = normalise_label((string) ($details['collection']['name'] ?? ''));
        if ($collectionId > 0 || $collectionName !== '') {
            $collection = [
                'id' => $collectionId > 0 ? $collectionId : null,
                'name' => $collectionName,
            ];
        }
    }

    return [
        'genre_ids' => array_values(array_unique($genreIds)),
        'genre_labels' => $genreLabels,
        'keywords' => $keywords,
        'cast' => $cast,
        'collection' => $collection,
    ];
}

function summarize_candidate_match(array $seedKeys, array $seedProfiles, array $candidateProfile): ?array
{
    $best = null;
    foreach ($seedKeys as $seedKey) {
        $seedProfile = $seedProfiles[$seedKey] ?? null;
        if ($seedProfile === null) {
            continue;
        }
        $result = evaluate_match_profiles($seedProfile, $candidateProfile);
        if ($result['score'] <= 0) {
            continue;
        }
        $result['seed'] = $seedKey;
        if ($best === null || $result['score'] > $best['score']) {
            $best = $result;
        }
    }

    return $best;
}

function evaluate_match_profiles(array $seedProfile, array $candidateProfile): array
{
    $score = 0;
    $reasons = [];

    $seedCollection = $seedProfile['collection'] ?? null;
    $candidateCollection = $candidateProfile['collection'] ?? null;
    if ($seedCollection && $candidateCollection) {
        $seedId = $seedCollection['id'] ?? null;
        $candidateId = $candidateCollection['id'] ?? null;
        if ($seedId !== null && $candidateId !== null && $seedId === $candidateId) {
            $reasons['collection'] = $candidateCollection['name'] ?: $seedCollection['name'];
            $score += 60;
        } elseif ($seedId === null && $candidateId === null) {
            $seedName = $seedCollection['name'] ?? '';
            $candidateName = $candidateCollection['name'] ?? '';
            if ($seedName !== '' && $candidateName !== '' && mb_lower($seedName) === mb_lower($candidateName)) {
                $reasons['collection'] = $candidateName;
                $score += 40;
            }
        }
    }

    $candidateCast = $candidateProfile['cast'] ?? [];
    $seedCast = $seedProfile['cast'] ?? [];
    if (!empty($candidateCast) && !empty($seedCast)) {
        $sharedCastKeys = array_intersect(array_keys($candidateCast), array_keys($seedCast));
        if (!empty($sharedCastKeys)) {
            $castNames = [];
            foreach ($sharedCastKeys as $index => $castKey) {
                if ($index >= 5) {
                    break;
                }
                $castNames[] = $candidateCast[$castKey] ?? $seedCast[$castKey];
            }
            if (!empty($castNames)) {
                $reasons['cast'] = array_values(array_unique($castNames));
                $score += count($sharedCastKeys) * 12;
            }
        }
    }

    $seedGenres = $seedProfile['genre_ids'] ?? [];
    $candidateGenres = $candidateProfile['genre_ids'] ?? [];
    if (!empty($seedGenres) && !empty($candidateGenres)) {
        $sharedGenres = array_values(array_intersect($candidateGenres, $seedGenres));
        if (!empty($sharedGenres)) {
            $genreLabels = [];
            foreach ($sharedGenres as $genreId) {
                if (isset($candidateProfile['genre_labels'][$genreId])) {
                    $genreLabels[] = $candidateProfile['genre_labels'][$genreId];
                } elseif (isset($seedProfile['genre_labels'][$genreId])) {
                    $genreLabels[] = $seedProfile['genre_labels'][$genreId];
                }
            }
            if (!empty($genreLabels)) {
                $reasons['genres'] = array_slice(array_values(array_unique($genreLabels)), 0, 4);
            }
            $score += count($sharedGenres) * 5;
        }
    }

    $seedKeywords = $seedProfile['keywords'] ?? [];
    $candidateKeywords = $candidateProfile['keywords'] ?? [];
    if (!empty($seedKeywords) && !empty($candidateKeywords)) {
        $sharedKeywords = array_values(array_intersect(array_keys($candidateKeywords), array_keys($seedKeywords)));
        if (!empty($sharedKeywords)) {
            $keywordLabels = [];
            foreach ($sharedKeywords as $key) {
                if (isset($candidateKeywords[$key])) {
                    $keywordLabels[] = $candidateKeywords[$key];
                } elseif (isset($seedKeywords[$key])) {
                    $keywordLabels[] = $seedKeywords[$key];
                }
            }
            if (!empty($keywordLabels)) {
                $reasons['keywords'] = array_slice(array_values(array_unique($keywordLabels)), 0, 4);
            }
            $score += count($sharedKeywords) * 4;
        }
    }

    return [
        'score' => $score,
        'reasons' => $reasons,
    ];
}

function resolveTitleLogosBulk(string $mediaType, array $ids): array
{
    static $cache = [];

    $resolved = [];
    $toFetch = [];

    foreach ($ids as $id) {
        $id = (int) $id;
        if ($id <= 0) {
            continue;
        }
        $key = $mediaType . ':' . $id;
        if (array_key_exists($key, $cache)) {
            $resolved[$id] = $cache[$key];
        } else {
            $toFetch[$id] = [
                'path' => sprintf('/%s/%d/images', $mediaType, $id),
                'params' => [
                    'include_image_language' => 'pt,null,en',
                    'language' => null,
                ],
            ];
        }
    }

    if (!empty($toFetch)) {
        try {
            $responses = tmdb_get_bulk($toFetch);
        } catch (Throwable $e) {
            $responses = [];
            error_log('onboarding_logo_fetch_error: ' . $e->getMessage());
        }

        foreach ($toFetch as $id => $_) {
            $key = $mediaType . ':' . $id;
            $data = $responses[$id] ?? null;
            $path = null;
            if (is_array($data)) {
                if (!empty($data['logos'])) {
                    foreach ($data['logos'] as $logo) {
                        if (!empty($logo['file_path'])) {
                            $path = $logo['file_path'];
                            break;
                        }
                    }
                }
                if ($path === null && !empty($data['posters'])) {
                    foreach ($data['posters'] as $poster) {
                        if (!empty($poster['file_path'])) {
                            $path = $poster['file_path'];
                            break;
                        }
                    }
                }
            }
            $value = [
                'path' => $path,
                'url' => tmdb_image_url($path),
            ];
            $cache[$key] = $value;
            $resolved[$id] = $value;
        }
    }

    return $resolved;
}

function resolveTitleLogo(string $mediaType, int $id): array
{
    $logos = resolveTitleLogosBulk($mediaType, [$id]);
    return $logos[(int) $id] ?? ['path' => null, 'url' => null];
}

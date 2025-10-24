<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$isAuthenticated = isset($_SESSION['id']) || isset($_SESSION['id_user']);
$rawUserName = isset($_SESSION['nome']) ? trim((string) $_SESSION['nome']) : '';
$hasPersonalName = $rawUserName !== '';
$userName = $hasPersonalName ? $rawUserName : 'Visitante';


$onboardingCompletedAt = $_SESSION['onboarding_completed_at'] ?? null;
$formattedCompletion = null;
if (is_string($onboardingCompletedAt) && $onboardingCompletedAt !== '') {
    try {
        $date = new DateTime($onboardingCompletedAt);
        $date->setTimezone(new DateTimeZone('America/Sao_Paulo'));
        $formattedCompletion = $date->format('d \d\e F \d\e Y');
    } catch (Throwable $e) {
        $formattedCompletion = null;
    }
}

$genreOptions = [
    ['id' => 28, 'label' => 'Ação'],
    ['id' => 16, 'label' => 'Animação'],
    ['id' => 12, 'label' => 'Aventura'],
    ['id' => 35, 'label' => 'Comédia'],
    ['id' => 80, 'label' => 'Crime'],
    ['id' => 99, 'label' => 'Documentário'],
    ['id' => 18, 'label' => 'Drama'],
    ['id' => 10751, 'label' => 'Família'],
    ['id' => 14, 'label' => 'Fantasia'],
    ['id' => 878, 'label' => 'Ficção científica'],
    ['id' => 9648, 'label' => 'Mistério'],
    ['id' => 10749, 'label' => 'Romance'],
    ['id' => 53, 'label' => 'Suspense'],
    ['id' => 27, 'label' => 'Terror'],
];

$keywordOptions = [
    ['id' => 1308, 'label' => 'baseado em fatos reais'],
    ['id' => 13088, 'label' => 'distopia'],
    ['id' => 9715, 'label' => 'super-herói'],
    ['id' => 9672, 'label' => 'viagem no tempo'],
    ['id' => 9713, 'label' => 'amizade'],
    ['id' => 14703, 'label' => 'golpe planejado'],
    ['id' => 210024, 'label' => 'multiverso'],
    ['id' => 1568, 'label' => 'vingança'],
    ['id' => 13190, 'label' => 'comédia romântica'],
    ['id' => 258, 'label' => 'magia'],
    ['id' => 679, 'label' => 'investigação'],
    ['id' => 10183, 'label' => 'road trip'],
    ['id' => 9717, 'label' => 'amizade improvável'],
    ['id' => 627, 'label' => 'jornada do herói'],
    ['id' => 1552, 'label' => 'ficção científica'],
];

$providerOptions = [
    ['id' => 8, 'label' => 'Netflix', 'logo' => 'https://image.tmdb.org/t/p/w154/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg'],
    ['id' => 119, 'label' => 'Prime Video', 'logo' => 'https://image.tmdb.org/t/p/w154/68MNrwlkpF7WnmNPXLah69CR5cb.jpg'],
    ['id' => 337, 'label' => 'Disney+', 'logo' => 'https://image.tmdb.org/t/p/w154/97yvRBw1GzX7fXprcF80er19ot.jpg'],
    ['id' => 1899, 'label' => 'HBO Max', 'logo' => 'https://image.tmdb.org/t/p/w154/jbe4gVSfRlbPTdESXhEKpornsfu.jpg'],
    ['id' => 350, 'label' => 'Apple TV+', 'logo' => 'https://image.tmdb.org/t/p/w154/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg'],
];

$streamingProvidersCatalog = [];
$hasStreamingProvidersCatalog = false;


$userId = (int)($_SESSION['id'] ?? $_SESSION['id_user'] ?? 0);

if (!function_exists('wyw_tmdb_image_url')) {
    function wyw_tmdb_image_url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }
        if (preg_match('/^https?:/i', $path)) {
            return $path;
        }
        return 'https://image.tmdb.org/t/p/w300' . ($path[0] === '/' ? $path : '/' . $path);
    }
}

if (!function_exists('wyw_table_has_column')) {
    function wyw_table_has_column(PDO $pdo, string $table, string $column): bool
    {
        static $cache = [];
        $tableKey = strtolower($table);
        $columnKey = strtolower($column);
        $cacheKey = $tableKey . ':' . $columnKey;
        if (array_key_exists($cacheKey, $cache)) {
            return $cache[$cacheKey];
        }

        try {
            $tableSql = '`' . str_replace('`', '``', $table) . '`';
            $stmt = $pdo->prepare('SHOW COLUMNS FROM ' . $tableSql . ' LIKE ?');
            $stmt->execute([$column]);
            $exists = $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (Throwable $e) {
            $exists = false;
        }

        $cache[$cacheKey] = $exists;
        return $exists;
    }
}

if (!function_exists('wyw_fetch_favorite_posters')) {
    function wyw_fetch_favorite_posters(array $favorites): array
    {
        $requests = [];
        foreach ($favorites as $favorite) {
            $posterPath = is_string($favorite['poster_path'] ?? null) ? trim((string) $favorite['poster_path']) : '';
            $posterUrl = is_string($favorite['poster_url'] ?? null) ? trim((string) $favorite['poster_url']) : '';
            if ($posterPath !== '' || $posterUrl !== '') {
                continue;
            }
            $tmdbId = isset($favorite['tmdb_id']) ? (int) $favorite['tmdb_id'] : 0;
            if ($tmdbId <= 0) {
                continue;
            }
            $mediaType = strtolower((string) ($favorite['media_type'] ?? 'movie'));
            if ($mediaType !== 'tv') {
                $mediaType = 'movie';
            }
            $key = $mediaType . ':' . $tmdbId;
            if (isset($requests[$key])) {
                continue;
            }
            $requests[$key] = [
                'path' => sprintf('/%s/%d', $mediaType, $tmdbId),
                'params' => [
                    'language' => 'pt-BR',
                ],
            ];
        }

        if (empty($requests)) {
            return [];
        }

        try {
            require_once __DIR__ . '/includes/tmdb.php';
        } catch (Throwable $e) {
            return [];
        }

        if (!function_exists('tmdb_get_bulk')) {
            return [];
        }

        try {
            $responses = tmdb_get_bulk($requests);
        } catch (Throwable $e) {
            error_log('profile_fetch_posters_error: ' . $e->getMessage());
            $responses = [];
        }

        $resolved = [];
        foreach ($requests as $key => $_request) {
            $data = $responses[$key] ?? null;
            if (!is_array($data)) {
                continue;
            }
            $posterPath = is_string($data['poster_path'] ?? null) ? trim((string) $data['poster_path']) : '';
            $backdropPath = is_string($data['backdrop_path'] ?? null) ? trim((string) $data['backdrop_path']) : '';
            $path = $posterPath !== '' ? $posterPath : ($backdropPath !== '' ? $backdropPath : null);
            if ($path === null) {
                continue;
            }
            $resolved[$key] = [
                'poster_path' => $path,
                'poster_url' => wyw_tmdb_image_url($path),
            ];
        }

        return $resolved;
    }
}

if (!function_exists('wyw_parse_terms')) {
    function wyw_parse_terms($value): array
    {
        if (!is_string($value) || $value === '') {
            return [];
        }
        $parts = preg_split('/\s*,\s*/u', $value) ?: [];
        $results = [];
        foreach ($parts as $part) {
            $label = trim($part);
            if ($label !== '') {
                $results[] = $label;
            }
        }
        return $results;
    }
}

if (!function_exists('wyw_initial_letter')) {
    function wyw_initial_letter(string $label): string
    {
        $trimmed = trim($label);
        if ($trimmed === '') {
            return '#';
        }
        if (function_exists('mb_substr')) {
            $initial = mb_substr($trimmed, 0, 1, 'UTF-8');
            return mb_strtoupper($initial, 'UTF-8');
        }
        return strtoupper(substr($trimmed, 0, 1));
    }
}

$initialState = [
    'genres' => [],
    'keywords' => [],
    'providers' => [],
    'favorites' => [],
    'completed' => is_string($onboardingCompletedAt) && $onboardingCompletedAt !== '' ? $onboardingCompletedAt : null,
];

$initialFeedbackMessage = null;
$initialFeedbackTone = null;

if ($isAuthenticated && $userId > 0) {
    $pdo = null;
    $pdoCandidates = [
        __DIR__ . '/includes/db.php',
        __DIR__ . '/../includes/db.php',
    ];

    foreach ($pdoCandidates as $candidate) {
        if (!is_file($candidate)) {
            continue;
        }
        $pdoAttempt = (static function (string $file) {
            $pdo = null;
            require $file;
            return $pdo instanceof PDO ? $pdo : null;
        })($candidate);
        if ($pdoAttempt instanceof PDO) {
            $pdo = $pdoAttempt;
            break;
        }
    }

    if (!($pdo instanceof PDO)) {
        $configCandidates = [
            __DIR__ . '/config/config.php',
            __DIR__ . '/../config/config.php',
        ];
        foreach ($configCandidates as $config) {
            if (!is_file($config)) {
                continue;
            }
            $credentials = (static function (string $file) {
                $host = $database = $usuario = $senha = null;
                require $file;
                return [
                    'host' => $host ?? ($GLOBALS['host'] ?? null),
                    'database' => $database ?? ($GLOBALS['database'] ?? null),
                    'usuario' => $usuario ?? ($GLOBALS['usuario'] ?? null),
                    'senha' => $senha ?? ($GLOBALS['senha'] ?? null),
                ];
            })($config);

            if (!empty($credentials['host']) && !empty($credentials['database']) && isset($credentials['usuario'])) {
                try {
                    $pdo = new PDO(
                        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $credentials['host'], $credentials['database']),
                        $credentials['usuario'],
                        $credentials['senha'] ?? '',
                        [
                            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        ]
                    );
                } catch (Throwable $e) {
                    $pdo = null;
                }
            }

            if ($pdo instanceof PDO) {
                break;
            }
        }
    }

    if ($pdo instanceof PDO) {
        try {
            $stmt = $pdo->prepare('SELECT onboarding_completed_at FROM tb_users WHERE id_user = ? LIMIT 1');
            $stmt->execute([$userId]);
            $completedAt = $stmt->fetchColumn();
            if (is_string($completedAt) && $completedAt !== '') {
                $initialState['completed'] = $completedAt;
                try {
                    $date = new DateTime($completedAt);
                    $date->setTimezone(new DateTimeZone('America/Sao_Paulo'));
                    $formattedCompletion = $date->format('d \\d\\e F \\d\\e Y');
                } catch (Throwable $e) {
                    // ignore formatting errors
                }
            }

            $stmt = $pdo->prepare('SELECT genre_id, weight FROM user_genres WHERE user_id = ? ORDER BY genre_id');
            $stmt->execute([$userId]);
            $initialState['genres'] = array_map(static function (array $row) {
                return (int) $row['genre_id'];
            }, $stmt->fetchAll());

            $stmt = $pdo->prepare('SELECT keyword_id, label, weight FROM user_keywords WHERE user_id = ? ORDER BY label');
            $stmt->execute([$userId]);
            $initialState['keywords'] = array_map(static function (array $row) {
                return [
                    'id' => $row['keyword_id'] !== null ? (int) $row['keyword_id'] : null,
                    'label' => $row['label'],
                    'weight' => (float) $row['weight'],
                ];
            }, $stmt->fetchAll());

            $stmt = $pdo->prepare('SELECT provider_id FROM user_providers WHERE user_id = ? AND enabled = 1 ORDER BY provider_id');
            $stmt->execute([$userId]);
            $initialState['providers'] = array_map('intval', array_column($stmt->fetchAll(), 'provider_id'));
            try {
                $providersQuery = $pdo->query("SELECT provider_id, name, logo_path FROM providers WHERE kind = 'streaming' OR kind IS NULL ORDER BY name");
                $seenProviderIds = [];
                foreach ($providersQuery as $providerRow) {
                    $providerId = isset($providerRow['provider_id']) ? (int) $providerRow['provider_id'] : 0;
                    $providerLabel = is_string($providerRow['name'] ?? null) ? trim((string) $providerRow['name']) : '';
                    if ($providerId <= 0 || $providerLabel === '') {
                        continue;
                    }
                    if (isset($seenProviderIds[$providerId])) {
                        continue;
                    }
                    $seenProviderIds[$providerId] = true;
                    $logoPath = is_string($providerRow['logo_path'] ?? null) ? trim((string) $providerRow['logo_path']) : '';
                    $logoUrl = $logoPath !== '' ? wyw_tmdb_image_url($logoPath) : null;
                    $initial = wyw_initial_letter($providerLabel);
                    if (!isset($streamingProvidersCatalog[$initial])) {
                        $streamingProvidersCatalog[$initial] = [];
                    }
                    $streamingProvidersCatalog[$initial][] = [
                        'id' => $providerId,
                        'label' => $providerLabel,
                        'logo' => $logoUrl,
                    ];
                }
            } catch (Throwable $e) {
                $streamingProvidersCatalog = [];
            }

            if (!empty($streamingProvidersCatalog)) {
                ksort($streamingProvidersCatalog, SORT_NATURAL | SORT_FLAG_CASE);
                foreach ($streamingProvidersCatalog as $key => $providersGroup) {
                    usort($providersGroup, static function (array $a, array $b): int {
                        return strcasecmp($a['label'], $b['label']);
                    });
                    $streamingProvidersCatalog[$key] = $providersGroup;
                }
                $hasStreamingProvidersCatalog = true;
            } else {
                $hasStreamingProvidersCatalog = false;
            }

            $orderParts = [];
            if (wyw_table_has_column($pdo, 'user_favorite_titles', 'favorited_at')) {
                $orderParts[] = 'favorited_at DESC';
            }
            if (wyw_table_has_column($pdo, 'user_favorite_titles', 'created_at')) {
                $orderParts[] = 'created_at DESC';
            }
            if (empty($orderParts)) {
                $orderParts[] = 'tmdb_id DESC';
            }
            $orderClause = implode(', ', $orderParts);
            $favoriteColumns = ['tmdb_id', 'media_type', 'title', 'logo_path', 'favorited_at', 'genres', 'keywords'];
            $favoriteHasPosterPath = wyw_table_has_column($pdo, 'user_favorite_titles', 'poster_path');
            $favoriteHasPosterUrl = wyw_table_has_column($pdo, 'user_favorite_titles', 'poster_url');
            $favoriteHasBackdrop = wyw_table_has_column($pdo, 'user_favorite_titles', 'backdrop_path');
            if ($favoriteHasPosterPath) {
                $favoriteColumns[] = 'poster_path';
            }
            if ($favoriteHasPosterUrl) {
                $favoriteColumns[] = 'poster_url';
            }
            if ($favoriteHasBackdrop) {
                $favoriteColumns[] = 'backdrop_path';
            }
            $favoritesSelect = implode(', ', array_unique($favoriteColumns));
            $stmt = $pdo->prepare("SELECT {$favoritesSelect} FROM user_favorite_titles WHERE user_id = ? ORDER BY {$orderClause}");
            $stmt->execute([$userId]);
            $favoritesRows = $stmt->fetchAll();

            $postersLookup = wyw_fetch_favorite_posters($favoritesRows);

            foreach ($favoritesRows as $row) {
                $tmdbId = (int) $row['tmdb_id'];
                if ($tmdbId <= 0) {
                    continue;
                }
                $mediaType = strtolower((string) ($row['media_type'] ?? 'movie'));
                if ($mediaType !== 'tv') {
                    $mediaType = 'movie';
                }
                $title = is_string($row['title']) ? trim($row['title']) : '';
                if ($title === '') {
                    continue;
                }
                $logoPath = $row['logo_path'] ?? null;
                $logoUrl = $logoPath ? wyw_tmdb_image_url($logoPath) : null;

                $posterPath = $favoriteHasPosterPath ? ($row['poster_path'] ?? null) : null;
                $posterUrl = $favoriteHasPosterUrl ? ($row['poster_url'] ?? null) : null;
                if (!is_string($posterPath)) {
                    $posterPath = null;
                }
                if (!is_string($posterUrl)) {
                    $posterUrl = null;
                }
                $posterPath = $posterPath !== null ? trim($posterPath) : null;
                $posterUrl = $posterUrl !== null ? trim($posterUrl) : null;
                if ($posterPath === '') {
                    $posterPath = null;
                }
                if ($posterUrl === '') {
                    $posterUrl = null;
                }

                $lookupKey = $mediaType . ':' . $tmdbId;
                if (($posterPath === null && $posterUrl === null) && isset($postersLookup[$lookupKey])) {
                    $posterInfo = $postersLookup[$lookupKey];
                    if ($posterPath === null && isset($posterInfo['poster_path'])) {
                        $posterPath = $posterInfo['poster_path'];
                    }
                    if ($posterUrl === null && isset($posterInfo['poster_url'])) {
                        $posterUrl = $posterInfo['poster_url'];
                    }
                }

                if ($posterUrl === null && $posterPath !== null) {
                    $posterUrl = wyw_tmdb_image_url($posterPath);
                }

                $backdropPath = $favoriteHasBackdrop ? ($row['backdrop_path'] ?? null) : null;

                $initialState['favorites'][] = [
                    'tmdb_id' => $tmdbId,
                    'media_type' => $mediaType,
                    'title' => $title,
                    'logo_path' => $logoPath,
                    'logo_url' => $logoUrl,
                    'poster_path' => $posterPath,
                    'poster_url' => $posterUrl,
                    'backdrop_path' => $backdropPath,
                    'favorited_at' => $row['favorited_at'] ?? null,
                    'genres' => wyw_parse_terms($row['genres'] ?? null),
                    'keywords' => wyw_parse_terms($row['keywords'] ?? null),
                ];
            }
        } catch (Throwable $e) {
            $initialFeedbackMessage = 'Não foi possível carregar suas preferências agora.';
            $initialFeedbackTone = 'error';
        }
    } else {
        $initialFeedbackMessage = 'Não foi possível conectar ao banco de dados.';
        $initialFeedbackTone = 'error';
    }
}

$favorites = $initialState['favorites'];
$favoritesCount = count($favorites);
$preferencesCount = count($initialState['genres']) + count($initialState['providers']);

$favoritesBadgeLabel = $favoritesCount . ' ' . ($favoritesCount === 1 ? 'título' : 'títulos');
$favoritesTotalLabel = $favoritesBadgeLabel;
$preferencesBadgeLabel = $preferencesCount . ' ' . ($preferencesCount === 1 ? 'item' : 'itens');

$favoritesSummaryData = array_slice($favorites, 0, 12);
$favoritesSummaryCount = count($favoritesSummaryData);
$showFavoritesSummaryEmpty = $favoritesCount === 0 || $initialFeedbackMessage !== null;
$showFavoritesListEmpty = $showFavoritesSummaryEmpty;

$favoritesEmptyMessage = $initialFeedbackMessage ?? ($isAuthenticated ? 'Você ainda não selecionou nenhum favorito.' : 'Entre na sua conta para visualizar seus favoritos.');
$modalFavoritesEmptyMessage = $initialFeedbackMessage ?? ($isAuthenticated ? 'Você ainda não selecionou nenhum favorito. Adicione alguns títulos para receber recomendações mais certeiras.' : 'Entre na sua conta para visualizar seus favoritos.');

$initialStateJson = json_encode($initialState, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($initialStateJson)) {
    $initialStateJson = '{}';
}

$favoritesList = $favorites;
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <title>Meu perfil | where you watch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body class="profile-page has-fixed-header">
<?php include_once('dashboard.php'); ?>

<main class="profile-shell" data-profile-root data-authenticated="<?php echo $isAuthenticated ? 'true' : 'false'; ?>" data-api-url="api/onboarding.php" data-profile-initial="<?php echo htmlspecialchars($initialStateJson, ENT_QUOTES, 'UTF-8'); ?>">
    <section class="profile-hero" aria-labelledby="profileTitle">
        <div class="profile-hero__backdrop" aria-hidden="true"></div>
        <div class="profile-hero__content">
            <div class="profile-identity">
                <div class="profile-avatar" aria-hidden="true">
                    <span><?php echo htmlspecialchars(mb_strtoupper(mb_substr($userName, 0, 1, 'UTF-8'), 'UTF-8'), ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
                <div class="profile-identity__text">
                    <p class="profile-overline">Perfil pessoal</p>
                    <h1 class="profile-title" id="profileTitle"><?php echo htmlspecialchars($userName, ENT_QUOTES, 'UTF-8'); ?></h1>
                    <p class="profile-subtitle">
                        <?php if ($isAuthenticated): ?>
                            Gerencie seus filmes favoritos e refine as preferências que usamos nas recomendações personalizadas.
                        <?php else: ?>
                            Entre na sua conta para salvar favoritos e personalizar suas recomendações.
                        <?php endif; ?>
                    </p>
                </div>
            </div>
        </div>
    </section>

    <section class="profile-overview" aria-label="Resumo de favoritos e preferências">
        <div class="profile-overview__grid">
            <aside class="profile-option profile-option--preferences" aria-labelledby="preferencesTitle" data-profile-preferences-section>
                <header class="profile-option__header">
                    <p class="profile-option__eyebrow">Preferências</p>
                    <h2 class="profile-option__title" id="preferencesTitle">Sua curadoria</h2>
                    <p class="profile-option__subtitle">Os generos e provedores que guiam nossas recomendacoes.</p>
                </header>
                <?php if (!$isAuthenticated): ?>
                    <div class="profile-notice" role="alert">
                        <p>Faça <a href="login.php">login</a> para gerenciar suas preferências personalizadas.</p>
                    </div>
                <?php endif; ?>
                <dl class="profile-option__summary" aria-live="polite">
                    <div class="profile-option__group">
                        <dt>Gêneros</dt>
                        <dd><div class="profile-summary-chips" data-profile-genres-summary></div></dd>
                    </div>
                    <div class="profile-option__group">
                        <dt>Provedores</dt>
                        <dd><div class="profile-summary-chips" data-profile-providers-summary></div></dd>
                    </div>
                </dl>
                <div class="profile-option__actions">
                    <span class="profile-chip-counter" data-profile-preferences-count><?php echo htmlspecialchars($preferencesBadgeLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                    <button type="button" class="profile-button profile-button--primary" data-profile-open-modal="preferences" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Gerenciar preferências</button>
                    <a href="index.php" class="profile-button profile-button--ghost">Explorar recomendações</a>
                </div>
            </aside>

            <section class="profile-card profile-card--favorites" aria-labelledby="favoritesTitle">
                <header class="profile-card__header">
                    <div>
                        <h2 class="profile-card__title" id="favoritesTitle">Meus favoritos</h2>
                        <p class="profile-card__subtitle">Um painel rápido com alguns dos títulos que você marcou como indispensáveis.</p>
                    </div>
                    <div class="profile-card__actions">
                        <span class="profile-badge" data-profile-favorites-count><?php echo htmlspecialchars($favoritesBadgeLabel, ENT_QUOTES, 'UTF-8'); ?></span>
                        <button type="button" class="profile-button profile-button--primary" data-profile-open-modal="favorites" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Gerenciar favoritos</button>
                    </div>
                </header>
                <div class="profile-favorite-rail-wrapper">
                    <ul class="profile-favorite-rail" data-profile-favorites-summary role="list">
                        <?php foreach ($favoritesSummaryData as $summaryIndex => $favorite): ?>
                        <?php
                            $summaryPoster = $favorite['poster_url'] ?? null;
                            if (!$summaryPoster && !empty($favorite['poster_path'])) {
                                $summaryPoster = wyw_tmdb_image_url((string) $favorite['poster_path']);
                            }
                            if (!$summaryPoster && !empty($favorite['backdrop_path'])) {
                                $summaryPoster = wyw_tmdb_image_url((string) $favorite['backdrop_path']);
                            }
                            $summaryTitle = $favorite['title'] ?? '';
                            $summaryDepth = $favoritesSummaryCount > 1
                                ? $summaryIndex / ($favoritesSummaryCount - 1)
                                : 0;
                            $summaryLayer = $favoritesSummaryCount - $summaryIndex;
                        ?>
                        <li class="favorite-tile favorite-tile--poster" style="--favorite-depth: <?php echo htmlspecialchars(number_format($summaryDepth, 4, '.', ''), ENT_QUOTES, 'UTF-8'); ?>; --favorite-layer: <?php echo htmlspecialchars((string) $summaryLayer, ENT_QUOTES, 'UTF-8'); ?>;">
                            <figure class="favorite-tile__poster" aria-hidden="true">
                                <?php if ($summaryPoster): ?>
                                    <img src="<?php echo htmlspecialchars($summaryPoster, ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy" class="favorite-tile__image">
                                <?php else: ?>
                                    <span class="favorite-tile__fallback"><?php echo htmlspecialchars(wyw_initial_letter($summaryTitle), ENT_QUOTES, 'UTF-8'); ?></span>
                                <?php endif; ?>
                            </figure>
                        </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <p class="profile-empty profile-empty--rail" data-profile-favorites-summary-empty <?php echo $showFavoritesSummaryEmpty ? '' : 'hidden'; ?>>
                    <?php echo htmlspecialchars($favoritesEmptyMessage, ENT_QUOTES, 'UTF-8'); ?>
                </p>
            </section>
        </div>
    </section>

    <div class="profile-modal" data-profile-modal="favorites" role="dialog" aria-modal="true" aria-labelledby="favoritesModalTitle" aria-hidden="true">
        <div class="profile-modal__overlay" data-profile-modal-close aria-hidden="true"></div>
        <div class="profile-modal__window" role="document">
            <header class="profile-modal__header">
                <div>
                    <h2 class="profile-modal__title" id="favoritesModalTitle">Coleção de favoritos</h2>
                    <span class="favorites-modal-caption">Remova com "-" ou toque em um novo pôster para adicioná-lo imediatamente.</span>
                </div>
                <button type="button" class="profile-modal__close" data-profile-modal-close aria-label="Fechar">&times;</button>
            </header>
            <div class="profile-modal__body favorites-modal-body" data-profile-modal-focus tabindex="-1" aria-labelledby="favoritesDeckTitle">
                <div class="favorite-search-block">
                    <form class="favorite-search-form" data-profile-favorite-search novalidate>
                        <label class="favorite-search-field">
                            <span class="favorite-search-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                                    <path d="M11 4a7 7 0 0 1 5.45 11.45l3.55 3.55a1 1 0 0 1-1.41 1.41l-3.55-3.55A7 7 0 1 1 11 4zm0 2a5 5 0 1 0 3.54 8.54A5 5 0 0 0 11 6z" />
                                </svg>
                            </span>
                            <span class="sr-only">Pesquisar t&iacute;tulos para adicionar aos favoritos</span>
                            <input
                                type="search"
                                name="favoriteSearch"
                                class="favorite-search-input"
                                placeholder="Pesquisar nova s&eacute;rie ou filme"
                                autocomplete="off"
                                spellcheck="false"
                                data-profile-favorite-search-input
                                <?php echo $isAuthenticated ? '' : 'disabled'; ?>
                            >
                            <button type="submit" class="favorite-search-button" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>
                                <span class="favorite-search-button__label">Buscar</span>
                            </button>
                        </label>
                    </form>
                    <div class="favorite-search-results" data-profile-favorite-search-results role="status" aria-live="polite"></div>
                </div>
                <div class="favorite-poster-grid" data-profile-favorites-list role="list">
                        <?php foreach ($favoritesList as $favorite): ?>
                        <?php
                            $posterUrl = $favorite['poster_url'] ?? null;
                            if (!$posterUrl && !empty($favorite['poster_path'])) {
                                $posterUrl = wyw_tmdb_image_url((string) $favorite['poster_path']);
                            }
                            if (!$posterUrl && !empty($favorite['backdrop_path'])) {
                                $posterUrl = wyw_tmdb_image_url((string) $favorite['backdrop_path']);
                            }
                            $favoriteTitle = $favorite['title'] ?? '';
                            $favoriteKey = $favorite['tmdb_id'] . ':' . ($favorite['media_type'] ?? 'movie');
                            ?>
                            <article class="favorite-poster-card favorite-poster-card--selected" role="listitem" data-key="<?php echo htmlspecialchars($favoriteKey, ENT_QUOTES, 'UTF-8'); ?>">
                                <figure class="favorite-poster-card__media" aria-hidden="true">
                                    <?php if ($posterUrl): ?>
                                        <img src="<?php echo htmlspecialchars($posterUrl, ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                    <?php else: ?>
                                        <span class="favorite-poster-card__fallback"><?php echo htmlspecialchars(wyw_initial_letter($favoriteTitle), ENT_QUOTES, 'UTF-8'); ?></span>
                                    <?php endif; ?>
                                </figure>
                                <button type="button" class="favorite-poster-card__remove" aria-label="Remover dos favoritos" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>-</button>
                            </article>
                        <?php endforeach; ?>
                </div>
                <p class="profile-empty favorite-poster-grid__empty favorites-modal-empty" data-profile-favorites-empty <?php echo $showFavoritesListEmpty ? '' : 'hidden'; ?>>
                        <?php echo htmlspecialchars($modalFavoritesEmptyMessage, ENT_QUOTES, 'UTF-8'); ?>
                </p>
            </div>
        </div>
    </div>

    <div class="profile-modal" data-profile-modal="preferences" role="dialog" aria-modal="true" aria-labelledby="preferencesModalTitle" aria-hidden="true">
        <div class="profile-modal__overlay" data-profile-modal-close aria-hidden="true"></div>
        <div class="profile-modal__window" role="document">
            <header class="profile-modal__header">
                <div class="profile-modal__heading">
                    <h2 class="profile-modal__title" id="preferencesModalTitle">Gerenciar preferências</h2>
                    <p class="profile-modal__subtitle">Personalize sua experiência escolhendo gêneros, provedores e palavras-chave favoritos.</p>
                </div>
                <button type="button" class="profile-modal__close" data-profile-modal-close data-profile-modal-focus aria-label="Fechar">&times;</button>
            </header>
            <div class="profile-modal__body">
                <div class="profile-preferences" data-profile-preferences <?php echo $isAuthenticated ? '' : 'data-disabled="true"'; ?>>
                    <section class="preference-group" aria-labelledby="genresTitle">
                        <div class="preference-group__header">
                            <h3 id="genresTitle">Gêneros favoritos</h3>
                            <p>Selecione os estilos cinematográficos que mais combinam com você.</p>
                        </div>
                        <div class="chip-grid" data-profile-genres>
                            <?php foreach ($genreOptions as $genre): ?>
                                <button type="button" class="chip" data-genre-id="<?php echo (int) $genre['id']; ?>" aria-pressed="false" <?php echo $isAuthenticated ? '' : 'disabled'; ?>><?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?></button>
                            <?php endforeach; ?>
                        </div>
                    </section>


                    <section class="preference-group" aria-labelledby="providersTitle">
                        <div class="preference-group__header">
                            <h3 id="providersTitle">Provedores disponíveis</h3>
                            <p>Marque os serviços de streaming que você assina para filtrar resultados automaticamente.</p>
                        </div>
                        <div class="provider-grid" data-profile-providers>
                            <?php foreach ($providerOptions as $provider): ?>
                                <button type="button" class="provider-card" data-provider-id="<?php echo (int) $provider['id']; ?>" data-provider-label="<?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?>" aria-pressed="false" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>
                                    <span class="provider-card__logo" aria-hidden="true">
                                        <img src="<?php echo htmlspecialchars($provider['logo'], ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                    </span>
                                    <span class="provider-card__label"><?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                                </button>
                            <?php endforeach; ?>
                        </div>
                        <div class="provider-grid__actions">
                            <button type="button" class="profile-button profile-button--ghost profile-button--compact" data-profile-open-modal="providers-catalog" aria-controls="providersCatalogModal" <?php echo $isAuthenticated && $hasStreamingProvidersCatalog ? '' : 'disabled'; ?>>Outros provedores</button>
                        </div>
                    </section>
                </div>
            </div>
            <footer class="profile-modal__footer">
                <div class="profile-feedback" data-profile-feedback role="status" aria-live="polite"<?php echo $initialFeedbackTone ? ' data-feedback-tone="' . htmlspecialchars($initialFeedbackTone, ENT_QUOTES, 'UTF-8') . '"' : ''; ?>>
                    <?php if ($initialFeedbackMessage !== null): ?>
                        <?php echo htmlspecialchars($initialFeedbackMessage, ENT_QUOTES, 'UTF-8'); ?>
                    <?php endif; ?>
                </div>
                <button type="button" class="profile-button profile-button--ghost" data-profile-modal-close>Cancelar</button>
                <button type="button" class="profile-button profile-button--primary" data-profile-save <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Salvar alterações</button>
            </footer>
        </div>
    </div>
    <div class="profile-modal profile-modal--sidecar" data-profile-modal="providers-catalog" role="dialog" aria-modal="false" aria-labelledby="providersCatalogTitle" aria-hidden="true" id="providersCatalogModal">
        <div class="profile-modal__window profile-modal__window--sidecar" role="document">
            <header class="profile-modal__header profile-modal__header--sidecar">
                <div class="profile-modal__heading">
                    <h2 class="profile-modal__title" id="providersCatalogTitle">Outros provedores</h2>
                    <p class="profile-modal__subtitle">Selecione outros serviços de streaming disponíveis para assinatura.</p>
                </div>
                <button type="button" class="profile-modal__close" data-profile-modal-close aria-label="Fechar">&times;</button>
            </header>
            <div class="profile-modal__body profile-modal__body--sidecar">
                <?php if ($hasStreamingProvidersCatalog): ?>
                    <div class="providers-catalog__search">
                        <label for="providersCatalogSearch" class="sr-only">Buscar provedores</label>
                        <input type="search" id="providersCatalogSearch" class="providers-catalog__search-field" placeholder="Buscar provedores" data-profile-providers-search <?php echo $isAuthenticated ? '' : 'disabled'; ?> data-profile-modal-focus>
                    </div>
                    <div class="providers-catalog" data-profile-providers-catalog>
                        <?php foreach ($streamingProvidersCatalog as $initial => $providersGroup): ?>
                            <?php $initialLabel = htmlspecialchars($initial, ENT_QUOTES, 'UTF-8'); ?>
                            <section class="providers-catalog__group" data-provider-group aria-label="Provedores com inicial <?php echo $initialLabel; ?>">
                                <h3 class="providers-catalog__group-title"><?php echo $initialLabel; ?></h3>
                                <div class="providers-catalog__grid">
                                    <?php foreach ($providersGroup as $provider): ?>
                                        <?php $providerLabel = htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?>
                                        <button type="button" class="providers-catalog__item" data-provider-id="<?php echo (int) $provider['id']; ?>" data-provider-label="<?php echo $providerLabel; ?>" aria-pressed="false" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>
                                            <span class="providers-catalog__item-logo" aria-hidden="true">
                                                <?php if (!empty($provider['logo'])): ?>
                                                    <img src="<?php echo htmlspecialchars($provider['logo'], ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                                <?php else: ?>
                                                    <span class="providers-catalog__item-fallback"><?php echo htmlspecialchars(wyw_initial_letter($provider['label']), ENT_QUOTES, 'UTF-8'); ?></span>
                                                <?php endif; ?>
                                            </span>
                                            <span class="providers-catalog__item-label"><?php echo $providerLabel; ?></span>
                                        </button>
                                    <?php endforeach; ?>
                                </div>
                            </section>
                        <?php endforeach; ?>
                    </div>
                    <p class="providers-catalog__empty" data-profile-providers-empty hidden>Nenhum provedor encontrado com esse nome.</p>
                <?php else: ?>
                    <p class="providers-catalog__fallback">Não encontramos outros provedores de streaming no momento.</p>
                <?php endif; ?>
            </div>
        </div>
    </div>


    <section class="profile-card profile-card--shortcuts" aria-labelledby="shortcutsTitle">
        <header class="profile-card__header">
            <div>
                <h2 class="profile-card__title" id="shortcutsTitle">Minhas listas e atalhos</h2>
                <p class="profile-card__subtitle">Acesse rapidamente ferramentas para descobrir novos filmes.</p>
            </div>
        </header>
        <div class="profile-shortcuts">
            <a href="providers.php" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">🎯</span>
                <div class="shortcut-card__content">
                    <h3>Explorar por provedor</h3>
                    <p>Combine diferentes catálogos e descubra o que está em alta nos seus serviços favoritos.</p>
                </div>
            </a>
            <a href="index.php#search" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">🔍</span>
                <div class="shortcut-card__content">
                    <h3>Buscar títulos rapidamente</h3>
                    <p>Pesquise filmes e séries e veja onde estão disponíveis para assistir agora.</p>
                </div>
            </a>
            <a href="index.php" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">✨</span>
                <div class="shortcut-card__content">
                    <h3>Surpreenda-me</h3>
                    <p>Volte para a página inicial e receba sugestões criadas a partir das suas preferências.</p>
                </div>
            </a>
        </div>
    </section>
</main>

<script src="js/script.js"></script>
<script src="js/profile.js" defer></script>
</body>
</html>

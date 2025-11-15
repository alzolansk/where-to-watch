<?php
// Suporte a ambientes com/sem pasta public
$__candidateRoot = is_file(__DIR__ . '/../config/bootstrap.php') ? dirname(__DIR__) : __DIR__;
require_once $__candidateRoot . '/config/bootstrap.php';

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

        $maxRequests = 24;
        if (count($requests) > $maxRequests) {
            // Skip expensive poster hydration when too many favorites require it.
            return [];
        }

        // Bootstrap já incluiu tmdb.php, então não precisa incluir novamente
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
    // Bootstrap já carregou db.php, então usa get_pdo() diretamente
    $pdo = null;
    
    try {
        if (function_exists('get_pdo')) {
            $pdo = get_pdo();
        }
    } catch (Throwable $e) {
        $pdo = null;
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
    <link rel="stylesheet" href="css/profile-v2.css">
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

    <!-- Navegação por Tabs -->
    <nav class="profile-tabs" role="tablist" aria-label="Navegação do perfil">
        <button class="profile-tab profile-tab--active" role="tab" aria-selected="true" aria-controls="tab-overview" id="tab-btn-overview" data-profile-tab="overview">
            <svg class="profile-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="profile-tab__label">Visão Geral</span>
        </button>
        <button class="profile-tab" role="tab" aria-selected="false" aria-controls="tab-curadoria" id="tab-btn-curadoria" data-profile-tab="curadoria">
            <svg class="profile-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span class="profile-tab__label">Curadoria</span>
        </button>
        <button class="profile-tab" role="tab" aria-selected="false" aria-controls="tab-filmes" id="tab-btn-filmes" data-profile-tab="filmes">
            <svg class="profile-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                <path d="M12 9l-6 6h12l-6-6z"/>
            </svg>
            <span class="profile-tab__label">Meus Filmes</span>
        </button>
    </nav>

    <!-- Tab Content: Visão Geral -->
    <div class="profile-tab-content profile-tab-content--active" id="tab-overview" role="tabpanel" aria-labelledby="tab-btn-overview">
        <div class="profile-content-grid">
            <!-- Quick Stats -->
            <section class="profile-stats-card">
                <h2 class="profile-card__title">Estatísticas Rápidas</h2>
                <div class="profile-stats-grid">
                    <div class="stat-item">
                        <div class="stat-item__icon">🎬</div>
                        <div class="stat-item__content">
                            <span class="stat-item__value" data-profile-favorites-count><?php echo $favoritesCount; ?></span>
                            <span class="stat-item__label">Favoritos</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item__icon">⭐</div>
                        <div class="stat-item__content">
                            <span class="stat-item__value" data-profile-preferences-count><?php echo $preferencesCount; ?></span>
                            <span class="stat-item__label">Preferências</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item__icon">🎭</div>
                        <div class="stat-item__content">
                            <span class="stat-item__value"><?php echo count($initialState['genres']); ?></span>
                            <span class="stat-item__label">Gêneros</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item__icon">📺</div>
                        <div class="stat-item__content">
                            <span class="stat-item__value"><?php echo count($initialState['providers']); ?></span>
                            <span class="stat-item__label">Plataformas</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Favorites Preview -->
            <section class="profile-favorites-preview">
                <header class="section-header">
                    <h2 class="section-header__title">Seus Favoritos Recentes</h2>
                    <button class="section-header__action" data-profile-tab="filmes" aria-label="Ver todos os favoritos">
                        Ver todos →
                    </button>
                </header>
                <?php if ($favoritesCount === 0): ?>
                    <div class="empty-state">
                        <div class="empty-state__icon">🎬</div>
                        <h3 class="empty-state__title">Você ainda não tem favoritos</h3>
                        <p class="empty-state__description">Comece adicionando filmes e séries que você ama para receber recomendações personalizadas.</p>
                        <a href="search.php" class="btn btn--primary">Descobrir Filmes</a>
                    </div>
                <?php else: ?>
                    <div class="favorites-grid-preview">
                        <?php foreach (array_slice($favorites, 0, 6) as $favorite): ?>
                        <?php
                            $posterUrl = $favorite['poster_url'] ?? null;
                            if (!$posterUrl && !empty($favorite['poster_path'])) {
                                $posterUrl = wyw_tmdb_image_url((string) $favorite['poster_path']);
                            }
                        ?>
                        <div class="favorite-preview-card">
                            <?php if ($posterUrl): ?>
                                <img src="<?php echo htmlspecialchars($posterUrl, ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($favorite['title'], ENT_QUOTES, 'UTF-8'); ?>" class="favorite-preview-card__poster" loading="lazy">
                            <?php else: ?>
                                <div class="favorite-preview-card__fallback"><?php echo htmlspecialchars(wyw_initial_letter($favorite['title']), ENT_QUOTES, 'UTF-8'); ?></div>
                            <?php endif; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </section>

            <!-- Quick Actions -->
            <section class="profile-quick-actions">
                <h2 class="section-header__title">Ações Rápidas</h2>
                <div class="quick-actions-grid">
                    <a href="providers.php" class="quick-action-card">
                        <div class="quick-action-card__icon">🎯</div>
                        <h3 class="quick-action-card__title">Explorar por Provedor</h3>
                        <p class="quick-action-card__description">Veja o que está disponível nos seus serviços</p>
                    </a>
                    <a href="search.php" class="quick-action-card">
                        <div class="quick-action-card__icon">🔍</div>
                        <h3 class="quick-action-card__title">Buscar Títulos</h3>
                        <p class="quick-action-card__description">Pesquise filmes e séries rapidamente</p>
                    </a>
                    <a href="surpreenda.php" class="quick-action-card">
                        <div class="quick-action-card__icon">✨</div>
                        <h3 class="quick-action-card__title">Surpreenda-me</h3>
                        <p class="quick-action-card__description">Receba sugestões personalizadas</p>
                    </a>
                </div>
            </section>
        </div>
    </div>

    <!-- Tab Content: Curadoria -->
    <div class="profile-tab-content" id="tab-curadoria" role="tabpanel" aria-labelledby="tab-btn-curadoria" hidden>
        <div class="profile-content-wrapper">
            <?php if (!$isAuthenticated): ?>
                <div class="empty-state">
                    <div class="empty-state__icon">🔒</div>
                    <h3 class="empty-state__title">Login Necessário</h3>
                    <p class="empty-state__description">Faça <a href="login.php">login</a> para gerenciar suas preferências personalizadas.</p>
                </div>
            <?php else: ?>
                <header class="section-header section-header--large">
                    <div>
                        <h2 class="section-header__title">Sua Curadoria Pessoal</h2>
                        <p class="section-header__description">Defina seus gostos e receba recomendações cada vez mais precisas</p>
                    </div>
                </header>

                <div class="preferences-layout">
                    <div class="preferences-main">
                        <!-- Gêneros -->
                        <section class="preference-section">
                            <header class="preference-section__header">
                                <h3 class="preference-section__title">🎭 Gêneros Favoritos</h3>
                                <p class="preference-section__description">Selecione os estilos cinematográficos que mais combinam com você</p>
                            </header>
                            <div class="chip-grid" data-profile-genres>
                                <?php foreach ($genreOptions as $genre): ?>
                                    <button type="button" class="chip" data-genre-id="<?php echo (int) $genre['id']; ?>" aria-pressed="false">
                                        <?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?>
                                    </button>
                                <?php endforeach; ?>
                            </div>
                        </section>

                        <!-- Provedores -->
                        <section class="preference-section">
                            <header class="preference-section__header">
                                <h3 class="preference-section__title">📺 Serviços de Streaming</h3>
                                <p class="preference-section__description">Marque os serviços que você assina para filtrar recomendações</p>
                            </header>
                            <div class="provider-grid" data-profile-providers>
                                <?php foreach ($providerOptions as $provider): ?>
                                    <button type="button" class="provider-card" data-provider-id="<?php echo (int) $provider['id']; ?>" data-provider-label="<?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?>" aria-pressed="false">
                                        <span class="provider-card__logo" aria-hidden="true">
                                            <img src="<?php echo htmlspecialchars($provider['logo'], ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                        </span>
                                        <span class="provider-card__label"><?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                                    </button>
                                <?php endforeach; ?>
                            </div>
                            <?php if ($hasStreamingProvidersCatalog): ?>
                                <div class="preference-section__actions">
                                    <button type="button" class="btn btn--ghost" data-toggle-providers-panel>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"/>
                                            <path d="m21 21-4.35-4.35"/>
                                        </svg>
                                        Explorar catálogo completo
                                    </button>
                                </div>
                            <?php endif; ?>
                        </section>
                    </div>

                    <!-- Summary Info -->
                    <aside class="preferences-summary">
                        <h3 class="preferences-summary__title">📊 Resumo das Preferências</h3>
                        <div class="preferences-summary__content">
                            <div class="summary-item">
                                <span class="summary-item__label">Gêneros Selecionados</span>
                                <div class="profile-summary-chips" data-profile-genres-summary></div>
                            </div>
                            <div class="summary-item">
                                <span class="summary-item__label">Provedores Ativos</span>
                                <div class="profile-summary-chips" data-profile-providers-summary></div>
                            </div>
                            <div class="summary-item">
                                <span class="summary-item__label">Provedores</span>
                                <div class="profile-summary-chips" data-profile-providers-summary></div>
                            </div>
                        </div>
                    </aside>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Tab Content: Meus Filmes -->
    <div class="profile-tab-content" id="tab-filmes" role="tabpanel" aria-labelledby="tab-btn-filmes" hidden>
        <div class="profile-content-wrapper">
            <header class="section-header section-header--large">
                <div>
                    <h2 class="section-header__title">Meus Filmes e Séries</h2>
                    <p class="section-header__description">Gerencie sua coleção de favoritos e lista de assistir mais tarde</p>
                </div>
                <span class="section-header__badge" data-profile-favorites-count><?php echo htmlspecialchars($favoritesBadgeLabel, ENT_QUOTES, 'UTF-8'); ?></span>
            </header>

            <!-- Subnavegação para Favoritos e Assistir Mais Tarde -->
            <div class="profile-subsection-tabs">
                <button class="subsection-tab subsection-tab--active" data-subsection="favorites">
                    ⭐ Favoritos
                </button>
                <button class="subsection-tab" data-subsection="watch-later">
                    🕒 Assistir Mais Tarde
                </button>
            </div>

            <?php if (!$isAuthenticated): ?>
                <div class="empty-state">
                    <div class="empty-state__icon">🔒</div>
                    <h3 class="empty-state__title">Login Necessário</h3>
                    <p class="empty-state__description">Entre na sua conta para visualizar e gerenciar seus favoritos</p>
                    <a href="login.php" class="btn btn--primary">Fazer Login</a>
                </div>
            <?php else: ?>
                <!-- Seção de Favoritos -->
                <div class="profile-subsection profile-subsection--active" data-subsection-content="favorites">
                    <!-- Search -->
                    <div class="favorite-search-wrapper">
                        <form class="favorite-search-form" data-profile-favorite-search novalidate>
                            <label class="favorite-search-field">
                                <svg class="favorite-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="7"/>
                                    <path d="m21 21-4.35-4.35"/>
                                </svg>
                                <input
                                    type="search"
                                    name="favoriteSearch"
                                    class="favorite-search-input"
                                    placeholder="Pesquisar nova série ou filme"
                                    autocomplete="off"
                                    spellcheck="false"
                                    data-profile-favorite-search-input
                                >
                                <button type="submit" class="btn btn--primary btn--compact">Buscar</button>
                            </label>
                        </form>
                        <div class="favorite-search-results" data-profile-favorite-search-results role="status" aria-live="polite"></div>
                    </div>

                    <!-- Favorites Grid -->
                    <div class="favorites-container">
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
                                            <img src="<?php echo htmlspecialchars($posterUrl, ENT_QUOTES, 'UTF-8'); ?>" alt="<?php echo htmlspecialchars($favoriteTitle, ENT_QUOTES, 'UTF-8'); ?>" loading="lazy">
                                        <?php else: ?>
                                            <span class="favorite-poster-card__fallback"><?php echo htmlspecialchars(wyw_initial_letter($favoriteTitle), ENT_QUOTES, 'UTF-8'); ?></span>
                                        <?php endif; ?>
                                    </figure>
                                    <button type="button" class="favorite-poster-card__remove" aria-label="Remover <?php echo htmlspecialchars($favoriteTitle, ENT_QUOTES, 'UTF-8'); ?> dos favoritos">−</button>
                                </article>
                            <?php endforeach; ?>
                        </div>

                        <div class="empty-state" data-profile-favorites-empty <?php echo $showFavoritesListEmpty ? '' : 'hidden'; ?>>
                            <div class="empty-state__icon">🎬</div>
                            <h3 class="empty-state__title">Você ainda não tem favoritos</h3>
                            <p class="empty-state__description">Adicione filmes e séries que você ama para receber recomendações mais certeiras</p>
                            <a href="search.php" class="btn btn--primary">Descobrir Filmes</a>
                        </div>
                    </div>
                </div>

                <!-- Seção de Assistir Mais Tarde -->
                <div class="profile-subsection" data-subsection-content="watch-later">
                    <div class="favorites-container">
                        <div class="favorite-poster-grid" data-watch-later-list role="list">
                            <!-- Será preenchido dinamicamente via JavaScript -->
                        </div>

                        <div class="empty-state" data-watch-later-empty>
                            <div class="empty-state__icon">🕒</div>
                            <h3 class="empty-state__title">Nenhum filme na lista</h3>
                            <p class="empty-state__description">Adicione filmes que você deseja assistir mais tarde clicando no botão 🕒 na página do filme</p>
                            <a href="search.php" class="btn btn--primary">Descobrir Filmes</a>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Painel Lateral: Catálogo de Provedores -->
    <aside class="side-panel" data-side-panel="providers" aria-label="Catálogo completo de provedores" hidden>
        <div class="side-panel__header">
            <h2 class="side-panel__title">Todos os Provedores</h2>
            <button type="button" class="side-panel__close" data-close-panel aria-label="Fechar painel">&times;</button>
        </div>
        <div class="side-panel__body">
            <?php if ($hasStreamingProvidersCatalog): ?>
                <div class="providers-catalog__search">
                    <input type="search" class="providers-catalog__search-field" placeholder="Buscar provedores" data-profile-providers-search>
                </div>
                <div class="providers-catalog" data-profile-providers-catalog>
                    <?php foreach ($streamingProvidersCatalog as $initial => $providersGroup): ?>
                        <section class="providers-catalog__group" data-provider-group>
                            <h3 class="providers-catalog__group-title"><?php echo htmlspecialchars($initial, ENT_QUOTES, 'UTF-8'); ?></h3>
                            <div class="providers-catalog__grid">
                                <?php foreach ($providersGroup as $provider): ?>
                                    <button type="button" class="providers-catalog__item" data-provider-id="<?php echo (int) $provider['id']; ?>" data-provider-label="<?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?>" aria-pressed="false">
                                        <span class="providers-catalog__item-logo">
                                            <?php if (!empty($provider['logo'])): ?>
                                                <img src="<?php echo htmlspecialchars($provider['logo'], ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                            <?php else: ?>
                                                <span class="providers-catalog__item-fallback"><?php echo htmlspecialchars(wyw_initial_letter($provider['label']), ENT_QUOTES, 'UTF-8'); ?></span>
                                            <?php endif; ?>
                                        </span>
                                        <span class="providers-catalog__item-label"><?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                                    </button>
                                <?php endforeach; ?>
                            </div>
                        </section>
                    <?php endforeach; ?>
                </div>
                <p class="providers-catalog__empty" data-profile-providers-empty hidden>Nenhum provedor encontrado</p>
            <?php endif; ?>
        </div>
    </aside>

    <!-- Rodapé Fixo com Ações (aparece nas tabs de edição) -->
    <footer class="profile-footer" data-profile-footer hidden>
        <div class="profile-footer__content">
            <div class="profile-feedback" data-profile-feedback role="status" aria-live="polite"<?php echo $initialFeedbackTone ? ' data-feedback-tone="' . htmlspecialchars($initialFeedbackTone, ENT_QUOTES, 'UTF-8') . '"' : ''; ?>>
                <?php if ($initialFeedbackMessage !== null): ?>
                    <?php echo htmlspecialchars($initialFeedbackMessage, ENT_QUOTES, 'UTF-8'); ?>
                <?php endif; ?>
            </div>
            <div class="profile-footer__actions">
                <button type="button" class="btn btn--ghost" data-profile-cancel>Cancelar</button>
                <button type="button" class="btn btn--primary" data-profile-save>Salvar Alterações</button>
            </div>
        </div>
    </footer>

    <section class="profile-card profile-card--shortcuts" aria-labelledby="shortcutsTitle" style="display: none;">
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
            <a href="search.php" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">🔍</span>
                <div class="shortcut-card__content">
                    <h3>Buscar títulos rapidamente</h3>
                    <p>Pesquise filmes e séries e veja onde estão disponíveis para assistir agora.</p>
                </div>
            </a>
            <a href="surpreenda.php" class="shortcut-card">
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
<script src="js/profile-v2.js" defer></script>
</body>
</html>

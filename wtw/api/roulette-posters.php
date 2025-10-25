<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['id'])) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'error' => 'unauthorized',
        'message' => 'Entre na sua conta para usar a roleta.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/../includes/env.php';
wyw_load_env(__DIR__ . '/..');

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/tmdb.php';

if (!defined('TMDB_KEY') || TMDB_KEY === '') {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'error' => 'tmdb_unconfigured',
        'message' => 'Integracao com o TMDB indisponivel para o embaralhamento.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $pdo = get_pdo();
} catch (Throwable $exception) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'error' => 'database_unavailable',
        'message' => 'Nao foi possivel conectar ao banco de dados.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * @return array<int>
 */
function wyw_cached_user_providers(PDO $pdo, int $userId, int $ttl = 300): array
{
    $cacheKey = sprintf('user_providers_%d', $userId);
    $cached = cache_get($cacheKey, $ttl);
    if (is_array($cached)) {
        $normalized = [];
        foreach ($cached as $value) {
            $id = (int) $value;
            if ($id > 0) {
                $normalized[$id] = $id;
            }
        }
        return array_values($normalized);
    }

    $stmt = $pdo->prepare('SELECT provider_id FROM user_providers WHERE user_id = :u AND enabled = 1 ORDER BY provider_id');
    $stmt->execute([':u' => $userId]);
    $ids = [];
    foreach ($stmt as $row) {
        $providerId = isset($row['provider_id']) ? (int) $row['provider_id'] : 0;
        if ($providerId > 0) {
            $ids[$providerId] = $providerId;
        }
    }

    $final = array_values($ids);
    cache_set($cacheKey, $final);

    return $final;
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode([
        'status' => 'error',
        'error' => 'method_not_allowed',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$userId = (int) $_SESSION['id'];
$providerCacheTtl = 300;
$providerIds = wyw_cached_user_providers($pdo, $userId, $providerCacheTtl);

if (empty($providerIds)) {
    http_response_code(412);
    echo json_encode([
        'status' => 'error',
        'error' => 'missing_providers',
        'message' => 'Cadastre pelo menos um provedor favorito para receber surpresas.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$mediaParam = strtolower((string) ($_GET['media_type'] ?? 'movie'));
$mediaType = $mediaParam === 'tv' ? 'tv' : 'movie';
$language = (string) ($_GET['language'] ?? 'pt-BR');
$region = strtoupper((string) ($_GET['region'] ?? 'BR'));
$limit = (int) ($_GET['limit'] ?? 20);
$limit = max(6, min(30, $limit));
$pages = (int) ($_GET['pages'] ?? 2);
$pages = max(1, min(3, $pages));
$poolTtl = 600;
$posterHistoryLimit = max(30, $limit * 2);
$posterHistoryKey = 'wtw_roulette_history';
if (!isset($_SESSION[$posterHistoryKey]) || !is_array($_SESSION[$posterHistoryKey])) {
    $_SESSION[$posterHistoryKey] = [];
}
if (!isset($_SESSION[$posterHistoryKey][$userId]) || !is_array($_SESSION[$posterHistoryKey][$userId])) {
    $_SESSION[$posterHistoryKey][$userId] = [];
}
if (!isset($_SESSION[$posterHistoryKey][$userId][$mediaType]) || !is_array($_SESSION[$posterHistoryKey][$userId][$mediaType])) {
    $_SESSION[$posterHistoryKey][$userId][$mediaType] = [];
}
$posterHistoryQueue = [];
$posterHistorySet = [];
foreach ($_SESSION[$posterHistoryKey][$userId][$mediaType] as $historyValue) {
    $value = (int) $historyValue;
    if ($value > 0 && !isset($posterHistorySet[$value])) {
        $posterHistorySet[$value] = true;
        $posterHistoryQueue[] = $value;
    }
}
$providerSignature = implode('-', $providerIds);

$cacheKey = sprintf(
    'roulette_pool_%s_%s_%d_%d_%s',
    $mediaType,
    md5($language . '|' . $region),
    $limit,
    $pages,
    md5($providerSignature !== '' ? $providerSignature : 'none')
);

$poolPayload = null;
$cached = cache_get($cacheKey, $poolTtl);
if (is_array($cached)) {
    if (!empty($cached['pool']) && is_array($cached['pool'])) {
        $poolPayload = $cached;
    } elseif (!empty($cached['posters']) && is_array($cached['posters'])) {
        $cached['pool'] = $cached['posters'];
        $poolPayload = $cached;
    }
}

$imageBase = rtrim((string) wyw_env('TMDB_IMAGE_BASE_URL', 'https://image.tmdb.org/t/p'), '/');
if ($imageBase === '') {
    $imageBase = 'https://image.tmdb.org/t/p';
}
$posterSize = trim((string) wyw_env('TMDB_ROULETTE_POSTER_SIZE', 'w342'), '/');
if ($posterSize === '') {
    $posterSize = 'w342';
}

$path = sprintf('discover/%s', $mediaType);
$pool = [];
$discoverBase = [
    'language' => $language,
    'include_adult' => 'false',
    'sort_by' => 'popularity.desc',
    'page' => 1,
    'with_watch_providers' => implode('|', $providerIds),
    'watch_region' => $region,
    'with_watch_monetization_types' => 'flatrate|ads|free|rent|buy',
];

if ($mediaType === 'movie') {
    $discoverBase['region'] = $region;
}

if ($poolPayload === null) {
    for ($page = 1; $page <= $pages; $page++) {
        $discoverBase['page'] = $page;
        $response = tmdb_get($path, $discoverBase);

        if (!is_array($response)) {
            continue;
        }

        foreach (($response['results'] ?? []) as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $tmdbId = isset($entry['id']) ? (int) $entry['id'] : 0;
            $posterPath = $entry['poster_path'] ?? null;
            if ($tmdbId <= 0 || $posterPath === null) {
                continue;
            }
            $key = $mediaType . ':' . $tmdbId;
            if (isset($pool[$key])) {
                continue;
            }
            $title = (string) ($entry['title'] ?? $entry['name'] ?? '');
            $pool[$key] = [
                'tmdb_id' => $tmdbId,
                'media_type' => $mediaType,
                'title' => $title,
                'poster_path' => $posterPath,
                'poster_url' => sprintf('%s/%s%s', $imageBase, $posterSize, $posterPath),
            ];
        }
    }

    if (empty($pool)) {
        http_response_code(204);
        exit;
    }

    $items = array_values($pool);
    if (!empty($items)) {
        shuffle($items);
    }

    $poolPayload = [
        'status' => 'ok',
        'media_type' => $mediaType,
        'language' => $language,
        'region' => $region,
        'limit' => $limit,
        'source' => $path,
        'generated_at' => date(DATE_ATOM),
        'ttl' => $poolTtl,
        'cache_expires_at' => date(DATE_ATOM, time() + $poolTtl),
        'providers' => $providerIds,
        'pool' => $items,
    ];

    cache_set($cacheKey, $poolPayload);
}

if ($poolPayload === null || empty($poolPayload['pool']) || !is_array($poolPayload['pool'])) {
    http_response_code(204);
    exit;
}

$allPosters = $poolPayload['pool'];
$fresh = [];
$stale = [];
foreach ($allPosters as $entry) {
    if (!is_array($entry)) {
        continue;
    }
    $tmdbId = isset($entry['tmdb_id']) ? (int) $entry['tmdb_id'] : 0;
    if ($tmdbId <= 0) {
        continue;
    }
    if (!isset($posterHistorySet[$tmdbId])) {
        $fresh[] = $entry;
    } else {
        $stale[] = $entry;
    }
}

if (!empty($fresh)) {
    shuffle($fresh);
}
if (!empty($stale)) {
    shuffle($stale);
}

$ordered = array_merge($fresh, $stale);
if (empty($ordered)) {
    http_response_code(204);
    exit;
}

$responsePosters = array_slice($ordered, 0, min($limit, count($ordered)));
if (empty($responsePosters)) {
    http_response_code(204);
    exit;
}

foreach ($responsePosters as $posterEntry) {
    $posterId = isset($posterEntry['tmdb_id']) ? (int) $posterEntry['tmdb_id'] : 0;
    if ($posterId <= 0) {
        continue;
    }
    if (isset($posterHistorySet[$posterId])) {
        $filteredQueue = [];
        foreach ($posterHistoryQueue as $queuedId) {
            if ($queuedId !== $posterId) {
                $filteredQueue[] = $queuedId;
            }
        }
        $posterHistoryQueue = $filteredQueue;
    }
    $posterHistoryQueue[] = $posterId;
    $posterHistorySet[$posterId] = true;
    while (count($posterHistoryQueue) > $posterHistoryLimit) {
        $removed = array_shift($posterHistoryQueue);
        if ($removed === null) {
            break;
        }
        unset($posterHistorySet[$removed]);
    }
}
$_SESSION[$posterHistoryKey][$userId][$mediaType] = $posterHistoryQueue;

$response = [
    'status' => 'ok',
    'media_type' => $poolPayload['media_type'] ?? $mediaType,
    'language' => $poolPayload['language'] ?? $language,
    'region' => $poolPayload['region'] ?? $region,
    'limit' => $limit,
    'source' => $poolPayload['source'] ?? $path,
    'generated_at' => date(DATE_ATOM),
    'ttl' => $poolPayload['ttl'] ?? $poolTtl,
    'cache_expires_at' => $poolPayload['cache_expires_at'] ?? date(DATE_ATOM, time() + $poolTtl),
    'providers' => $poolPayload['providers'] ?? $providerIds,
    'posters' => $responsePosters,
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

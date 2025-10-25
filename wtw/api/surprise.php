<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['id'])) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'error' => 'unauthorized',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/tmdb.php';

try {
    $pdo = get_pdo();
} catch (Throwable $exception) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'error' => 'database_unavailable',
        'message' => 'Não foi possível conectar ao banco de dados.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!defined('TMDB_KEY') || TMDB_KEY === '') {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'error' => 'tmdb_unconfigured',
        'message' => 'A integração com o TMDB não está configurada.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

const CACHE_TTL_SECONDS = 600;
const SHORTLIST_SIZE = 15;
const HISTORY_LIMIT = 50;
const FATIGUE_WINDOW = 5;
const MIN_POOL_THRESHOLD = 60;
const TARGET_POOL_MIN = 150;
const TARGET_POOL_MAX = 320;
const DETAIL_ENRICH_LIMIT = 80;
const SHORTLIST_RERANK_SIZE = 20;
const EPSILON = 0.2;
const DIVERSITY_LAMBDA = 0.7;

/** @var array<int, array<int, float>> */
$GENRE_NEIGHBORS = [
    878 => [53 => 1.0, 12 => 0.8, 18 => 0.4],
    53  => [9648 => 0.9, 80 => 0.6, 18 => 0.4],
    12  => [28 => 0.9, 14 => 0.6, 16 => 0.4],
    28  => [12 => 0.8, 53 => 0.6, 80 => 0.4],
    18  => [35 => 0.5, 10749 => 0.5, 36 => 0.4],
    35  => [10749 => 0.6, 16 => 0.4, 14 => 0.3],
    10749 => [18 => 0.6, 35 => 0.5, 14 => 0.4],
    27  => [53 => 0.7, 9648 => 0.5, 14 => 0.3],
    80  => [53 => 0.8, 9648 => 0.6, 18 => 0.3],
    99  => [36 => 0.6, 10752 => 0.4],
];

$userId = (int) $_SESSION['id'];
$mediaType = (isset($_GET['media_type']) && $_GET['media_type'] === 'tv') ? 'tv' : 'movie';
$language = (string) ($_GET['language'] ?? 'pt-BR');
$region = strtoupper((string) ($_GET['region'] ?? 'BR'));
$now = new DateTimeImmutable('now');

$preferences = fetchUserPreferences($pdo, $userId);
$providerIds = $preferences['providers'];

$seedString = buildCacheSeed($now, $providerIds);
$cacheKey = sprintf('surprise_v1:%s:%s', $mediaType, hash('sha1', $seedString));
$cachedPayload = loadCachedShortlist($pdo, $userId, $cacheKey, $now);

if ($cachedPayload !== null) {
    $shortlist = $cachedPayload['items'];
    $responseItems = pickFinalItems($shortlist, $seedString, $providerIds);
    if (!empty($responseItems)) {
        logImpressions($pdo, $userId, $mediaType, $responseItems);
        updateSessionHistory($userId, $mediaType, $responseItems);
        $response = buildResponse($userId, $mediaType, $responseItems, [
            'from_cache' => true,
            'cache_key' => $cacheKey,
            'seed' => $seedString,
            'candidate_count' => $cachedPayload['diagnostics']['candidate_count'] ?? null,
            'pool_size' => $cachedPayload['diagnostics']['pool_size'] ?? null,
        ]);
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

$banList = buildBanList($pdo, $userId, $mediaType, $now);
$recentHistory = loadRecentHistoryProfile($userId, $mediaType);

$candidatePool = buildCandidatePool(
    $mediaType,
    $language,
    $region,
    $preferences,
    $banList,
    $GENRE_NEIGHBORS
);

if (count($candidatePool) < MIN_POOL_THRESHOLD) {
    relaxCandidatePool(
        $candidatePool,
        $mediaType,
        $language,
        $region,
        $preferences,
        $banList,
        $GENRE_NEIGHBORS
    );
}

if (empty($candidatePool)) {
    http_response_code(204);
    echo json_encode([
        'status' => 'empty',
        'message' => 'Nenhum candidato encontrado para as preferências atuais.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$enriched = enrichCandidates($candidatePool, $mediaType, $language);
$availability = fetchAvailability($pdo, $mediaType, $region, $providerIds, array_keys($enriched));
$providerNames = fetchProviderNames($pdo, $providerIds);

$scored = scoreCandidates(
    $enriched,
    $availability,
    $providerIds,
    $providerNames,
    $preferences,
    $recentHistory
);

if (empty($scored)) {
    http_response_code(204);
    echo json_encode([
        'status' => 'empty',
        'message' => 'Nenhum título elegível para surpresa.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$reranked = mmrRerank($scored, DIVERSITY_LAMBDA, SHORTLIST_RERANK_SIZE);
$shortlist = array_slice($reranked, 0, SHORTLIST_SIZE);

storeCachedShortlist($pdo, $userId, $cacheKey, $seedString, $shortlist, $now, [
    'candidate_count' => count($candidatePool),
    'pool_size' => count($enriched),
]);

$responseItems = pickFinalItems($shortlist, $seedString, $providerIds);

if (empty($responseItems)) {
    http_response_code(204);
    echo json_encode([
        'status' => 'empty',
        'message' => 'Nenhum título disponível após filtros de diversidade.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

logImpressions($pdo, $userId, $mediaType, $responseItems);
updateSessionHistory($userId, $mediaType, $responseItems);

$response = buildResponse($userId, $mediaType, $responseItems, [
    'from_cache' => false,
    'cache_key' => $cacheKey,
    'seed' => $seedString,
    'candidate_count' => count($candidatePool),
    'pool_size' => count($enriched),
]);

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

/**
 * @return array{genres:array<int,float>,comfort_genres:array<int,float>,people:array<int,float>,keywords:array<int,float>,keyword_labels:array<string,float>,providers:array<int>}
 */
function fetchUserPreferences(PDO $pdo, int $userId): array
{
    $genres = [];
    $stmt = $pdo->prepare('SELECT genre_id, weight FROM user_genres WHERE user_id = :u ORDER BY weight DESC, genre_id ASC');
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $genreId = isset($row['genre_id']) ? (int) $row['genre_id'] : 0;
        if ($genreId > 0) {
            $genres[$genreId] = max(0.0, min(1.0, (float) ($row['weight'] ?? 1.0)));
        }
    }

    $people = [];
    $stmt = $pdo->prepare('SELECT person_id, weight FROM user_people WHERE user_id = :u ORDER BY weight DESC, person_id ASC');
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $personId = isset($row['person_id']) ? (int) $row['person_id'] : 0;
        if ($personId > 0) {
            $people[$personId] = max(0.0, min(1.0, (float) ($row['weight'] ?? 1.0)));
        }
    }

    $keywordIds = [];
    $keywordLabels = [];
    $stmt = $pdo->prepare('SELECT keyword_id, label, weight FROM user_keywords WHERE user_id = :u ORDER BY weight DESC, id ASC');
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $label = trim((string) ($row['label'] ?? ''));
        if ($label === '') {
            continue;
        }
        $weight = max(0.0, min(1.0, (float) ($row['weight'] ?? 1.0)));
        if (!empty($row['keyword_id'])) {
            $keywordIds[(int) $row['keyword_id']] = $weight;
        }
        $keywordLabels[strtolower($label)] = $weight;
    }

    $providers = [];
    $stmt = $pdo->prepare('SELECT provider_id FROM user_providers WHERE user_id = :u AND enabled = 1 ORDER BY provider_id');
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $providerId = isset($row['provider_id']) ? (int) $row['provider_id'] : 0;
        if ($providerId > 0) {
            $providers[] = $providerId;
        }
    }

    return [
        'genres' => $genres,
        'comfort_genres' => array_slice($genres, 0, 5, true),
        'people' => $people,
        'keywords' => $keywordIds,
        'keyword_labels' => $keywordLabels,
        'providers' => $providers,
    ];
}

function buildCacheSeed(DateTimeImmutable $now, array $providerIds): string
{
    sort($providerIds);
    $providerMix = empty($providerIds) ? 'none' : implode('-', $providerIds);
    $dayOfWeek = $now->format('N');
    $hourBlock = $now->format('H');
    return sprintf('%s|%s|%s', $dayOfWeek, $hourBlock, $providerMix);
}

/**
 * @return array{items:array<int,array<string,mixed>>,diagnostics:array<string,mixed>}|null
 */
function loadCachedShortlist(PDO $pdo, int $userId, string $cacheKey, DateTimeImmutable $now): ?array
{
    try {
        $stmt = $pdo->prepare('SELECT payload FROM recommendations_cache WHERE user_id = :u AND cache_key = :k AND expires_at > :now LIMIT 1');
        $stmt->execute([
            ':u' => $userId,
            ':k' => $cacheKey,
            ':now' => $now->format('Y-m-d H:i:s'),
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }
        $payload = json_decode((string) $row['payload'], true);
        if (!is_array($payload)) {
            return null;
        }
        return $payload;
    } catch (Throwable $exception) {
        return null;
    }
}

/**
 * @param array<int,array<string,mixed>> $shortlist
 * @param array<string,mixed> $diagnostics
 */
function storeCachedShortlist(
    PDO $pdo,
    int $userId,
    string $cacheKey,
    string $seed,
    array $shortlist,
    DateTimeImmutable $now,
    array $diagnostics
): void {
    $payload = [
        'seed' => $seed,
        'items' => array_values($shortlist),
        'diagnostics' => $diagnostics,
        'stored_at' => $now->format(DATE_ATOM),
    ];

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO recommendations_cache (user_id, cache_key, seed, payload, created_at, expires_at) '
            . 'VALUES (:u, :k, :s, :p, NOW(), :e) '
            . 'ON DUPLICATE KEY UPDATE seed = VALUES(seed), payload = VALUES(payload), expires_at = VALUES(expires_at), created_at = NOW()'
        );
        $stmt->execute([
            ':u' => $userId,
            ':k' => $cacheKey,
            ':s' => $seed,
            ':p' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ':e' => $now->modify(sprintf('+%d seconds', CACHE_TTL_SECONDS))->format('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $exception) {
        // ignora falhas de cache
    }
}
/**
 * @return array<string,bool>
 */
function buildBanList(PDO $pdo, int $userId, string $mediaType, DateTimeImmutable $now): array
{
    $ban = [];
    $stmt = $pdo->prepare(
        "SELECT tmdb_id, media_type FROM interactions "
        . "WHERE user_id = :u AND created_at >= DATE_SUB(:now, INTERVAL 60 DAY) "
        . "AND type IN ('seen','dislike','like','skip')"
    );
    $stmt->execute([
        ':u' => $userId,
        ':now' => $now->format('Y-m-d H:i:s'),
    ]);
    foreach ($stmt as $row) {
        $tmdb = isset($row['tmdb_id']) ? (int) $row['tmdb_id'] : 0;
        if ($tmdb <= 0) {
            continue;
        }
        $kind = ($row['media_type'] ?? '') === 'tv' ? 'tv' : 'movie';
        $ban[$kind . ':' . $tmdb] = true;
    }

    if (!isset($_SESSION['wtw_surprise_recent_v2'][$userId][$mediaType])) {
        return $ban;
    }

    foreach ($_SESSION['wtw_surprise_recent_v2'][$userId][$mediaType] as $entry) {
        $tmdbId = isset($entry['tmdb_id']) ? (int) $entry['tmdb_id'] : 0;
        if ($tmdbId > 0) {
            $ban[$mediaType . ':' . $tmdbId] = true;
        }
    }

    return $ban;
}

/**
 * @return array<int,array<string,mixed>>
 */
function loadRecentHistoryProfile(int $userId, string $mediaType): array
{
    return $_SESSION['wtw_surprise_recent_v2'][$userId][$mediaType] ?? [];
}

/**
 * @param array<int,array<string,mixed>> $items
 */
function updateSessionHistory(int $userId, string $mediaType, array $items): void
{
    if (!isset($_SESSION['wtw_surprise_recent_v2'])) {
        $_SESSION['wtw_surprise_recent_v2'] = [];
    }
    $history = $_SESSION['wtw_surprise_recent_v2'][$userId][$mediaType] ?? [];
    foreach ($items as $item) {
        $entry = [
            'tmdb_id' => (int) ($item['id'] ?? $item['tmdb_id'] ?? 0),
            'genres' => array_map('intval', array_column($item['genres'] ?? [], 'id')),
            'people' => array_map('intval', array_keys($item['people'] ?? [])),
            'collection' => $item['collection'] ?? null,
        ];
        array_unshift($history, $entry);
    }
    if (count($history) > HISTORY_LIMIT) {
        $history = array_slice($history, 0, HISTORY_LIMIT);
    }
    $_SESSION['wtw_surprise_recent_v2'][$userId][$mediaType] = $history;
}

/**
 * @return array<int,array<string,mixed>>
 */
function buildCandidatePool(
    string $mediaType,
    string $language,
    string $region,
    array $preferences,
    array $banList,
    array $genreNeighbors
): array {
    $pool = [];

    $comfort = buildComfortBucket($mediaType, $language, $region, $preferences, $banList);
    foreach ($comfort as $candidate) {
        $pool[$candidate['id']] = $candidate;
    }

    $adjacent = buildAdjacentBucket($mediaType, $language, $region, $preferences, $banList, $genreNeighbors);
    foreach ($adjacent as $candidate) {
        if (!isset($pool[$candidate['id']])) {
            $pool[$candidate['id']] = $candidate;
        } else {
            $pool[$candidate['id']]['buckets']['adjacent'] = ($pool[$candidate['id']]['buckets']['adjacent'] ?? 0) + 1;
        }
    }

    $hidden = buildHiddenGemsBucket($mediaType, $language, $region, $preferences, $banList);
    foreach ($hidden as $candidate) {
        if (!isset($pool[$candidate['id']])) {
            $pool[$candidate['id']] = $candidate;
        } else {
            $pool[$candidate['id']]['buckets']['hidden_gem'] = ($pool[$candidate['id']]['buckets']['hidden_gem'] ?? 0) + 1;
        }
    }

    $trending = buildTrendingBucket($mediaType, $language, $banList);
    foreach ($trending as $candidate) {
        if (!isset($pool[$candidate['id']])) {
            $pool[$candidate['id']] = $candidate;
        } else {
            $pool[$candidate['id']]['buckets']['trending'] = ($pool[$candidate['id']]['buckets']['trending'] ?? 0) + 1;
        }
    }

    $wildcards = buildWildcardBucket($mediaType, $language, $region, $banList);
    foreach ($wildcards as $candidate) {
        if (!isset($pool[$candidate['id']])) {
            $pool[$candidate['id']] = $candidate;
        } else {
            $pool[$candidate['id']]['buckets']['wildcard'] = ($pool[$candidate['id']]['buckets']['wildcard'] ?? 0) + 1;
        }
    }

    return $pool;
}

function relaxCandidatePool(
    array &$pool,
    string $mediaType,
    string $language,
    string $region,
    array $preferences,
    array $banList,
    array $genreNeighbors
): void {
    if (count($pool) >= TARGET_POOL_MIN) {
        return;
    }

    $relaxedPrefs = $preferences;
    $relaxedPrefs['keywords'] = [];
    $relaxedPrefs['keyword_labels'] = [];
    $adjacent = buildAdjacentBucket($mediaType, $language, $region, $relaxedPrefs, $banList, $genreNeighbors, true);
    foreach ($adjacent as $candidate) {
        if (!isset($pool[$candidate['id']])) {
            $pool[$candidate['id']] = $candidate;
        }
    }

    if (count($pool) >= MIN_POOL_THRESHOLD) {
        return;
    }

    $popular = tmdb_get('/' . $mediaType . '/popular', [
        'language' => $language,
        'region' => $region,
        'page' => 1,
    ]);
    foreach (($popular['results'] ?? []) as $entry) {
        $candidate = normalizeCandidate($entry, $mediaType, 'fallback_popular');
        if ($candidate === null) {
            continue;
        }
        $banKey = $mediaType . ':' . $candidate['id'];
        if (isset($banList[$banKey])) {
            continue;
        }
        if (!isset($pool[$candidate['id']])) {
            $pool[$candidate['id']] = $candidate;
        }
    }
}

/**
 * @return array<int,array<string,mixed>>
 */
function buildComfortBucket(
    string $mediaType,
    string $language,
    string $region,
    array $preferences,
    array $banList
): array {
    $results = [];
    $topGenres = array_slice(array_keys($preferences['comfort_genres']), 0, 3);
    $topPeople = array_slice(array_keys($preferences['people']), 0, 3);
    $topKeywords = array_slice(array_keys($preferences['keywords']), 0, 4);

    $baseParams = [
        'include_adult' => 'false',
        'language' => $language,
        'sort_by' => 'vote_average.desc',
        'vote_count.gte' => 150,
    ];
    if ($mediaType === 'movie') {
        $baseParams['region'] = $region;
    }

    if (!empty($topGenres)) {
        for ($page = 1; $page <= 3; $page++) {
            $params = $baseParams;
            $params['page'] = $page;
            $params['with_genres'] = implode(',', $topGenres);
            $data = tmdb_get('/discover/' . $mediaType, $params);
            appendBucketResults($results, $data['results'] ?? [], $mediaType, 'comfort', $banList);
        }
    }

    if (!empty($topPeople)) {
        for ($page = 1; $page <= 2; $page++) {
            $params = $baseParams;
            $params['page'] = $page;
            $params['with_people'] = implode(',', $topPeople);
            $data = tmdb_get('/discover/' . $mediaType, $params);
            appendBucketResults($results, $data['results'] ?? [], $mediaType, 'comfort_people', $banList);
        }
    }

    if (!empty($topKeywords)) {
        $params = $baseParams;
        $params['page'] = 1;
        $params['with_keywords'] = implode(',', $topKeywords);
        $data = tmdb_get('/discover/' . $mediaType, $params);
        appendBucketResults($results, $data['results'] ?? [], $mediaType, 'comfort_keywords', $banList);
    }

    return $results;
}

/**
 * @return array<int,array<string,mixed>>
 */
function buildAdjacentBucket(
    string $mediaType,
    string $language,
    string $region,
    array $preferences,
    array $banList,
    array $genreNeighbors,
    bool $relaxed = false
): array {
    $results = [];
    $topGenres = array_slice(array_keys($preferences['comfort_genres']), 0, 4);
    if (empty($topGenres)) {
        return $results;
    }
    foreach ($topGenres as $genreId) {
        $neighbors = $genreNeighbors[$genreId] ?? [];
        if ($relaxed && empty($neighbors)) {
            continue;
        }
        foreach ($neighbors as $neighborId => $weight) {
            $params = [
                'include_adult' => 'false',
                'language' => $language,
                'sort_by' => 'popularity.desc',
                'page' => 1,
                'with_genres' => (string) $neighborId,
                'vote_average.gte' => $relaxed ? 6.0 : 6.5,
            ];
            if ($mediaType === 'movie') {
                $params['region'] = $region;
            }
            $data = tmdb_get('/discover/' . $mediaType, $params);
            appendBucketResults($results, $data['results'] ?? [], $mediaType, 'adjacent', $banList);
        }
    }
    return $results;
}

/**
 * @return array<int,array<string,mixed>>
 */
function buildHiddenGemsBucket(
    string $mediaType,
    string $language,
    string $region,
    array $preferences,
    array $banList
): array {
    $params = [
        'include_adult' => 'false',
        'language' => $language,
        'sort_by' => 'vote_average.desc',
        'vote_average.gte' => 7.2,
        'vote_count.gte' => 40,
        'page' => 1,
    ];
    if ($mediaType === 'movie') {
        $params['region'] = $region;
    }
    $data = tmdb_get('/discover/' . $mediaType, $params);
    $filtered = [];
    foreach (($data['results'] ?? []) as $entry) {
        $popularity = (float) ($entry['popularity'] ?? 0.0);
        if ($popularity > 120.0) {
            continue;
        }
        $filtered[] = $entry;
    }
    $results = [];
    appendBucketResults($results, $filtered, $mediaType, 'hidden_gem', $banList);
    return $results;
}

/**
 * @return array<int,array<string,mixed>>
 */
function buildTrendingBucket(string $mediaType, string $language, array $banList): array
{
    $results = [];
    $data = tmdb_get('/trending/' . $mediaType . '/week', ['language' => $language]);
    appendBucketResults($results, $data['results'] ?? [], $mediaType, 'trending', $banList);
    return $results;
}

/**
 * @return array<int,array<string,mixed>>
 */
function buildWildcardBucket(string $mediaType, string $language, string $region, array $banList): array
{
    $params = [
        'include_adult' => 'false',
        'language' => $language,
        'sort_by' => 'popularity.desc',
        'vote_average.gte' => 6.5,
        'vote_count.gte' => 30,
        'page' => 1,
    ];
    if ($mediaType === 'movie') {
        $params['region'] = $region;
    }
    $data = tmdb_get('/discover/' . $mediaType, $params);
    $results = [];
    appendBucketResults($results, $data['results'] ?? [], $mediaType, 'wildcard', $banList);
    return $results;
}

/**
 * @param array<int,mixed> $items
 */
function appendBucketResults(array &$results, array $items, string $mediaType, string $bucket, array $banList): void
{
    foreach ($items as $entry) {
        $candidate = normalizeCandidate($entry, $mediaType, $bucket);
        if ($candidate === null) {
            continue;
        }
        $banKey = $mediaType . ':' . $candidate['id'];
        if (isset($banList[$banKey])) {
            continue;
        }
        if (!isset($results[$candidate['id']])) {
            $results[$candidate['id']] = $candidate;
        } else {
            $results[$candidate['id']]['buckets'][$bucket] = ($results[$candidate['id']]['buckets'][$bucket] ?? 0) + 1;
        }
    }
}

/**
 * @return array<string,mixed>|null
 */
function normalizeCandidate(array $entry, string $mediaType, string $bucket): ?array
{
    if (!is_array($entry)) {
        return null;
    }
    $id = isset($entry['id']) ? (int) $entry['id'] : 0;
    if ($id <= 0) {
        return null;
    }
    $title = $mediaType === 'movie' ? ($entry['title'] ?? $entry['name'] ?? '') : ($entry['name'] ?? $entry['title'] ?? '');
    $release = $entry['release_date'] ?? $entry['first_air_date'] ?? null;
    return [
        'id' => $id,
        'media_type' => $mediaType,
        'title' => (string) $title,
        'overview' => (string) ($entry['overview'] ?? ''),
        'poster_path' => $entry['poster_path'] ?? null,
        'backdrop_path' => $entry['backdrop_path'] ?? null,
        'vote_average' => isset($entry['vote_average']) ? (float) $entry['vote_average'] : null,
        'vote_count' => isset($entry['vote_count']) ? (int) $entry['vote_count'] : null,
        'popularity' => isset($entry['popularity']) ? (float) $entry['popularity'] : 0.0,
        'release_date' => $release,
        'genre_ids' => array_map('intval', $entry['genre_ids'] ?? []),
        'buckets' => [$bucket => 1],
    ];
}
/**
 * @param array<int,array<string,mixed>> $pool
 * @return array<int,array<string,mixed>>
 */
function enrichCandidates(array $pool, string $mediaType, string $language): array
{
    if (empty($pool)) {
        return [];
    }

    $candidates = array_values($pool);
    usort($candidates, static function (array $a, array $b): int {
        $scoreA = ((float) ($a['vote_average'] ?? 0.0)) + log((float) ($a['popularity'] ?? 0.0) + 1.0);
        $scoreB = ((float) ($b['vote_average'] ?? 0.0)) + log((float) ($b['popularity'] ?? 0.0) + 1.0);
        return $scoreB <=> $scoreA;
    });

    $limited = array_slice($candidates, 0, min(DETAIL_ENRICH_LIMIT, count($candidates)));
    $requests = [];
    foreach ($limited as $candidate) {
        $requests[$candidate['id']] = [
            'path' => sprintf('/%s/%d', $mediaType, $candidate['id']),
            'params' => [
                'language' => $language,
                'append_to_response' => 'credits,keywords,watch/providers',
            ],
        ];
    }

    $details = tmdb_get_bulk($requests);

    $enriched = [];
    foreach ($pool as $id => $candidate) {
        $detail = $details[$id] ?? null;
        if (is_array($detail)) {
            $candidate['genres'] = array_map(
                static fn ($genre) => [
                    'id' => (int) ($genre['id'] ?? 0),
                    'name' => (string) ($genre['name'] ?? ''),
                ],
                $detail['genres'] ?? []
            );
            $candidate['collection'] = isset($detail['belongs_to_collection']['id'])
                ? (int) $detail['belongs_to_collection']['id']
                : null;
            $candidate['runtime'] = $detail['runtime'] ?? ($detail['episode_run_time'][0] ?? null);
            $candidate['vote_average'] = isset($detail['vote_average']) ? (float) $detail['vote_average'] : $candidate['vote_average'];
            $candidate['vote_count'] = isset($detail['vote_count']) ? (int) $detail['vote_count'] : $candidate['vote_count'];
            $candidate['popularity'] = isset($detail['popularity']) ? (float) $detail['popularity'] : $candidate['popularity'];
            $candidate['release_date'] = $detail['release_date'] ?? $detail['first_air_date'] ?? $candidate['release_date'];
            $candidate['overview'] = $detail['overview'] ?? $candidate['overview'];

            $credits = $detail['credits'] ?? [];
            $candidate['people'] = [];
            if (!empty($credits['cast'])) {
                foreach (array_slice($credits['cast'], 0, 5) as $castMember) {
                    $personId = isset($castMember['id']) ? (int) $castMember['id'] : 0;
                    if ($personId > 0) {
                        $candidate['people'][$personId] = [
                            'name' => (string) ($castMember['name'] ?? ''),
                            'character' => (string) ($castMember['character'] ?? ''),
                        ];
                    }
                }
            }
            if (!empty($credits['crew'])) {
                foreach ($credits['crew'] as $crewMember) {
                    $department = $crewMember['department'] ?? '';
                    if (!in_array($department, ['Directing', 'Writing'], true)) {
                        continue;
                    }
                    $personId = isset($crewMember['id']) ? (int) $crewMember['id'] : 0;
                    if ($personId > 0 && !isset($candidate['people'][$personId])) {
                        $candidate['people'][$personId] = [
                            'name' => (string) ($crewMember['name'] ?? ''),
                            'character' => (string) ($crewMember['job'] ?? ''),
                        ];
                    }
                }
            }

            $candidate['keywords'] = [];
            $keywordsRaw = $detail['keywords']['results'] ?? $detail['keywords'] ?? [];
            foreach ($keywordsRaw as $keyword) {
                $keywordId = isset($keyword['id']) ? (int) $keyword['id'] : 0;
                if ($keywordId > 0) {
                    $candidate['keywords'][$keywordId] = (string) ($keyword['name'] ?? '');
                }
            }

            $candidate['watch_providers'] = $detail['watch/providers']['results'] ?? [];
        } else {
            $candidate['genres'] = [];
            $candidate['collection'] = null;
            $candidate['people'] = [];
            $candidate['keywords'] = [];
            $candidate['watch_providers'] = [];
        }
        $enriched[$id] = $candidate;
    }

    return $enriched;
}

/**
 * @param array<int> $candidateIds
 * @return array<int,array<int,array<string,mixed>>>
 */
function fetchAvailability(PDO $pdo, string $mediaType, string $region, array $providerIds, array $candidateIds): array
{
    if (empty($providerIds) || empty($candidateIds)) {
        return [];
    }
    $placeholdersIds = implode(',', array_fill(0, count($candidateIds), '?'));
    $placeholdersProviders = implode(',', array_fill(0, count($providerIds), '?'));
    $sql = 'SELECT tmdb_id, provider_id, monetization FROM title_availability'
        . ' WHERE media_type = ? AND region = ?'
        . ' AND tmdb_id IN (' . $placeholdersIds . ')'
        . ' AND provider_id IN (' . $placeholdersProviders . ')';
    $params = array_merge([$mediaType, $region], $candidateIds, $providerIds);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $availability = [];
    foreach ($stmt as $row) {
        $tmdbId = isset($row['tmdb_id']) ? (int) $row['tmdb_id'] : 0;
        $providerId = isset($row['provider_id']) ? (int) $row['provider_id'] : 0;
        if ($tmdbId <= 0 || $providerId <= 0) {
            continue;
        }
        if (!isset($availability[$tmdbId])) {
            $availability[$tmdbId] = [];
        }
        $availability[$tmdbId][$providerId] = [
            'monetization' => $row['monetization'] ?? null,
        ];
    }
    return $availability;
}

/**
 * @param array<int> $providerIds
 * @return array<int,string>
 */
function fetchProviderNames(PDO $pdo, array $providerIds): array
{
    if (empty($providerIds)) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($providerIds), '?'));
    $stmt = $pdo->prepare('SELECT provider_id, name FROM providers WHERE provider_id IN (' . $placeholders . ')');
    $stmt->execute($providerIds);
    $names = [];
    foreach ($stmt as $row) {
        $id = isset($row['provider_id']) ? (int) $row['provider_id'] : 0;
        $name = trim((string) ($row['name'] ?? ''));
        if ($id > 0 && $name !== '') {
            $names[$id] = $name;
        }
    }
    return $names;
}
/**
 * @param array<int,array<string,mixed>> $candidates
 * @param array<int,array<int,array<string,mixed>>> $availability
 * @param array<int> $providerIds
 * @param array<int,string> $providerNames
 * @param array<string,mixed> $preferences
 * @param array<int,array<string,mixed>> $recentHistory
 * @return array<int,array<string,mixed>>
 */
function scoreCandidates(
    array $candidates,
    array $availability,
    array $providerIds,
    array $providerNames,
    array $preferences,
    array $recentHistory
): array {
    if (empty($candidates)) {
        return [];
    }

    $scores = [];
    $genreWeights = $preferences['genres'];
    $peopleWeights = $preferences['people'];
    $keywordWeights = $preferences['keywords'];
    $keywordLabels = $preferences['keyword_labels'];

    $voteValues = array_map(static fn ($c) => (float) ($c['vote_average'] ?? 0.0), $candidates);
    $popValues = array_map(static fn ($c) => log((float) ($c['popularity'] ?? 0.0) + 1.0), $candidates);
    $voteMin = min($voteValues);
    $voteMax = max($voteValues);
    $popMin = min($popValues);
    $popMax = max($popValues);
    $voteRange = max(0.0001, $voteMax - $voteMin);
    $popRange = max(0.0001, $popMax - $popMin);

    foreach ($candidates as $candidate) {
        $candidateId = (int) $candidate['id'];
        $candidateGenres = array_map(static fn ($genre) => (int) ($genre['id'] ?? $genre), $candidate['genres'] ?? $candidate['genre_ids'] ?? []);
        $candidatePeople = array_keys($candidate['people'] ?? []);
        $candidateKeywords = array_keys($candidate['keywords'] ?? []);
        $candidateKeywordLabels = array_map('strtolower', array_values($candidate['keywords'] ?? []));

        $genreIntersectionWeight = 0.0;
        $genreWeightSum = array_sum($genreWeights) ?: 1.0;
        foreach ($candidateGenres as $genreId) {
            if (isset($genreWeights[$genreId])) {
                $genreIntersectionWeight += $genreWeights[$genreId];
            }
        }
        $genreAffinity = min(1.0, $genreIntersectionWeight / $genreWeightSum);

        $peopleMatches = 0.0;
        foreach ($candidatePeople as $personId) {
            if (isset($peopleWeights[$personId])) {
                $peopleMatches += 0.15;
            }
        }

        $keywordMatches = 0.0;
        foreach ($candidateKeywords as $keywordId) {
            if (isset($keywordWeights[$keywordId])) {
                $keywordMatches += 0.1;
            }
        }
        foreach ($candidateKeywordLabels as $label) {
            if (isset($keywordLabels[$label])) {
                $keywordMatches += 0.08;
            }
        }

        $affinity = max(0.0, min(1.0, $genreAffinity + $peopleMatches + $keywordMatches));

        $voteAvg = (float) ($candidate['vote_average'] ?? 0.0);
        $popularity = log((float) ($candidate['popularity'] ?? 0.0) + 1.0);
        $voteNorm = ($voteAvg - $voteMin) / $voteRange;
        $popNorm = ($popularity - $popMin) / $popRange;
        $quality = max(0.0, min(1.0, 0.7 * $voteNorm + 0.3 * $popNorm));

        $historyOverlap = computeHistoryOverlap($candidateGenres, $candidatePeople, $recentHistory);
        $novelty = max(0.0, min(1.0, 1.0 - $historyOverlap));
        if (!empty($candidate['buckets']['adjacent'])) {
            $novelty = min(1.0, $novelty + 0.1);
        }

        $availabilityEntry = $availability[$candidateId] ?? [];
        $availableProviders = array_keys($availabilityEntry);
        $availabilityFit = 0.0;
        $availabilityReason = null;
        if (!empty($providerIds)) {
            $overlap = array_intersect($availableProviders, $providerIds);
            if (!empty($overlap)) {
                $availabilityFit = 1.0;
                $names = [];
                foreach ($overlap as $providerId) {
                    if (isset($providerNames[$providerId])) {
                        $names[] = $providerNames[$providerId];
                    }
                }
                if (!empty($names)) {
                    $availabilityReason = 'Disponível em ' . implode(', ', array_slice($names, 0, 3));
                }
            }
        } elseif (!empty($availableProviders)) {
            $availabilityFit = 1.0;
        }

        $fatigue = computeFatigue($candidateGenres, $candidatePeople, $candidate['collection'] ?? null, $recentHistory);
        $bucketBoost = computeBucketBoost($candidate['buckets'] ?? []);

        $score = (0.40 * $affinity)
            + (0.25 * $quality)
            + (0.20 * $novelty)
            + (0.10 * $availabilityFit)
            - (0.10 * $fatigue)
            + (0.05 * $bucketBoost);

        $reasons = buildReasons(
            $candidate,
            $affinity,
            $genreWeights,
            $peopleWeights,
            $keywordLabels,
            $availabilityReason,
            $bucketBoost
        );

        $scores[] = array_merge($candidate, [
            'score' => $score,
            'components' => [
                'affinity' => $affinity,
                'quality' => $quality,
                'novelty' => $novelty,
                'availability' => $availabilityFit,
                'fatigue' => $fatigue,
                'bucket_boost' => $bucketBoost,
            ],
            'reasons' => $reasons,
            'available_providers' => $availableProviders,
            'fatigue_blocked' => $fatigue >= 1.0,
        ]);
    }

    usort($scores, static fn ($a, $b) => ($b['score'] ?? 0.0) <=> ($a['score'] ?? 0.0));

    return $scores;
}

/**
 * @param array<int,int> $candidateGenres
 * @param array<int,int> $candidatePeople
 * @param array<int,array<string,mixed>> $recentHistory
 */
function computeHistoryOverlap(array $candidateGenres, array $candidatePeople, array $recentHistory): float
{
    if (empty($recentHistory)) {
        return 0.0;
    }
    $maxOverlap = 0.0;
    foreach ($recentHistory as $entry) {
        $historyGenres = $entry['genres'] ?? [];
        $historyPeople = $entry['people'] ?? [];
        $genreOverlap = jaccard($candidateGenres, $historyGenres);
        $peopleOverlap = jaccard($candidatePeople, $historyPeople);
        $overlap = max($genreOverlap, $peopleOverlap * 1.2);
        if ($overlap > $maxOverlap) {
            $maxOverlap = $overlap;
        }
    }
    return max(0.0, min(1.0, $maxOverlap));
}

/**
 * @param array<int,int> $candidateGenres
 * @param array<int,int> $candidatePeople
 * @param array<int,array<string,mixed>> $recentHistory
 */
function computeFatigue(array $candidateGenres, array $candidatePeople, ?int $collectionId, array $recentHistory): float
{
    if (empty($recentHistory)) {
        return 0.0;
    }
    $recentSlice = array_slice($recentHistory, 0, FATIGUE_WINDOW);
    $genreHits = 0;
    $peopleHits = 0;
    $collectionHits = 0;
    foreach ($recentSlice as $entry) {
        if ($collectionId !== null && isset($entry['collection']) && $collectionId === $entry['collection']) {
            $collectionHits++;
        }
        if (!empty($candidateGenres) && !empty($entry['genres'])) {
            if (jaccard($candidateGenres, $entry['genres']) > 0.6) {
                $genreHits++;
            }
        }
        if (!empty($candidatePeople) && !empty($entry['people'])) {
            if (jaccard($candidatePeople, $entry['people']) > 0.5) {
                $peopleHits++;
            }
        }
    }
    $fatigue = 0.0;
    if ($genreHits >= 2) {
        $fatigue += 0.6;
    }
    if ($peopleHits >= 1) {
        $fatigue += 0.5;
    }
    if ($collectionHits >= 1) {
        $fatigue += 0.7;
    }
    return min(1.0, $fatigue);
}

function computeBucketBoost(array $buckets): float
{
    $boost = 0.0;
    if (isset($buckets['hidden_gem'])) {
        $boost = max($boost, 0.07);
    }
    if (isset($buckets['adjacent'])) {
        $boost = max($boost, 0.05);
    }
    if (isset($buckets['trending'])) {
        $boost = max($boost, 0.03);
    }
    if (isset($buckets['wildcard'])) {
        $boost = max($boost, 0.02);
    }
    return $boost;
}

/**
 * @param array<string,mixed> $candidate
 * @param array<int,float> $genreWeights
 * @param array<int,float> $peopleWeights
 * @param array<string,float> $keywordLabels
 * @return array<int,string>
 */
function buildReasons(
    array $candidate,
    float $affinity,
    array $genreWeights,
    array $peopleWeights,
    array $keywordLabels,
    ?string $availability,
    float $bucketBoost
): array {
    $reasons = [];
    $topGenre = null;
    foreach ($candidate['genres'] ?? [] as $genre) {
        $id = (int) ($genre['id'] ?? 0);
        if ($id > 0 && isset($genreWeights[$id])) {
            $topGenre = $genre['name'] ?? null;
            break;
        }
    }
    if ($topGenre !== null && $affinity > 0.3) {
        $reasons[] = sprintf('Porque você curte %s', $topGenre);
    }

    $topPerson = null;
    foreach ($candidate['people'] ?? [] as $personId => $info) {
        if (isset($peopleWeights[$personId])) {
            $topPerson = $info['name'] ?? null;
            if ($topPerson) {
                break;
            }
        }
    }
    if ($topPerson) {
        $reasons[] = sprintf('Com %s no elenco', $topPerson);
    }

    if (empty($topPerson) && !empty($candidate['keywords'])) {
        foreach ($candidate['keywords'] as $label) {
            $normalized = strtolower($label);
            if (isset($keywordLabels[$normalized])) {
                $reasons[] = sprintf('Toque de %s que você curte', $label);
                break;
            }
        }
    }

    if ($availability) {
        $reasons[] = $availability;
    }

    if ($bucketBoost >= 0.07) {
        $reasons[] = 'Garimpado como joia escondida';
    } elseif ($bucketBoost >= 0.05) {
        $reasons[] = 'Aposta fora do óbvio para expandir seu repertório';
    } elseif ($bucketBoost >= 0.03) {
        $reasons[] = 'Em alta nesta semana — vale conferir';
    }

    $reasons = array_values(array_unique($reasons));
    if (count($reasons) > 2) {
        $reasons = array_slice($reasons, 0, 2);
    }

    return $reasons;
}
/**
 * @param array<int,array<string,mixed>> $scored
 * @return array<int,array<string,mixed>>
 */
function mmrRerank(array $scored, float $lambda, int $limit): array
{
    $selected = [];
    $remaining = $scored;
    while (!empty($remaining) && count($selected) < $limit) {
        $bestIndex = null;
        $bestValue = -INF;
        foreach ($remaining as $index => $candidate) {
            $score = (float) ($candidate['score'] ?? 0.0);
            $maxSim = 0.0;
            foreach ($selected as $picked) {
                $overlap = diversityOverlap($candidate, $picked);
                if ($overlap > $maxSim) {
                    $maxSim = $overlap;
                }
            }
            $value = ($lambda * $score) - ((1.0 - $lambda) * $maxSim);
            if ($value > $bestValue) {
                $bestValue = $value;
                $bestIndex = $index;
            }
        }
        if ($bestIndex === null) {
            break;
        }
        $selected[] = $remaining[$bestIndex];
        unset($remaining[$bestIndex]);
    }
    return array_values($selected);
}

function diversityOverlap(array $a, array $b): float
{
    $genresA = array_map('intval', array_column($a['genres'] ?? [], 'id'));
    $genresB = array_map('intval', array_column($b['genres'] ?? [], 'id'));
    $peopleA = array_keys($a['people'] ?? []);
    $peopleB = array_keys($b['people'] ?? []);

    $genreOverlap = jaccard($genresA, $genresB);
    $peopleOverlap = jaccard($peopleA, $peopleB);

    return min(1.0, $genreOverlap + (0.5 * $peopleOverlap));
}

/**
 * @param array<int,mixed> $a
 * @param array<int,mixed> $b
 */
function jaccard(array $a, array $b): float
{
    $setA = array_unique(array_values($a));
    $setB = array_unique(array_values($b));
    if (empty($setA) && empty($setB)) {
        return 0.0;
    }
    $intersection = array_intersect($setA, $setB);
    $union = array_unique(array_merge($setA, $setB));
    if (empty($union)) {
        return 0.0;
    }
    return count($intersection) / count($union);
}

/**
 * @param array<int> $providerIds
 * @return array<int,array<string,mixed>>
 */
function pickFinalItems(array $shortlist, string $seedString, array $providerIds): array
{
    if (empty($shortlist)) {
        return [];
    }
    $seed = crc32($seedString . '|pick');
    mt_srand($seed);
    $targetCount = min(3, max(1, mt_rand(1, 3)));
    $shouldExplore = (mt_rand() / mt_getrandmax()) <= EPSILON;

    $selected = [];
    $usedIds = [];

    if ($shouldExplore) {
        foreach ($shortlist as $candidate) {
            $buckets = array_keys($candidate['buckets'] ?? []);
            if (in_array('adjacent', $buckets, true) || in_array('hidden_gem', $buckets, true)) {
                $selected[] = $candidate;
                $usedIds[$candidate['id']] = true;
                break;
            }
        }
    }

    foreach ($shortlist as $candidate) {
        if (count($selected) >= $targetCount) {
            break;
        }
        if (isset($usedIds[$candidate['id']])) {
            continue;
        }
        if (!empty($candidate['fatigue_blocked'])) {
            continue;
        }
        $selected[] = $candidate;
        $usedIds[$candidate['id']] = true;
    }

    if (empty($selected)) {
        $selected[] = $shortlist[0];
    }

    $adjacencyCount = 0;
    foreach ($selected as $candidate) {
        $buckets = array_keys($candidate['buckets'] ?? []);
        if (in_array('adjacent', $buckets, true) || in_array('hidden_gem', $buckets, true)) {
            $adjacencyCount++;
        }
    }
    if ($adjacencyCount < ceil(count($selected) * 0.25)) {
        foreach ($shortlist as $candidate) {
            if (isset($usedIds[$candidate['id']])) {
                continue;
            }
            $buckets = array_keys($candidate['buckets'] ?? []);
            if (in_array('adjacent', $buckets, true) || in_array('hidden_gem', $buckets, true)) {
                $selected[count($selected) - 1] = $candidate;
                break;
            }
        }
    }

    foreach ($selected as &$entry) {
        $entry['providers_note'] = buildProviderNote($entry, $providerIds);
    }
    unset($entry);

    return $selected;
}

/**
 * @param array<int> $providerIds
 */
function buildProviderNote(array $candidate, array $providerIds): ?string
{
    if (empty($providerIds)) {
        return null;
    }
    $available = $candidate['available_providers'] ?? [];
    if (empty($available)) {
        return 'Sem disponibilidade confirmada nos seus provedores preferidos.';
    }
    return null;
}

/**
 * @param array<int,array<string,mixed>> $items
 */
function logImpressions(PDO $pdo, int $userId, string $mediaType, array $items): void
{
    $stmt = $pdo->prepare('INSERT INTO interactions (user_id, tmdb_id, media_type, type, weight, created_at) VALUES (:u, :t, :m, :ty, :w, NOW())');
    foreach ($items as $item) {
        $tmdbId = (int) ($item['id'] ?? $item['tmdb_id'] ?? 0);
        if ($tmdbId <= 0) {
            continue;
        }
        try {
            $stmt->execute([
                ':u' => $userId,
                ':t' => $tmdbId,
                ':m' => $mediaType,
                ':ty' => 'impression',
                ':w' => (float) ($item['score'] ?? 0.0),
            ]);
        } catch (Throwable $exception) {
            // ignora falhas individuais de telemetria
        }
    }
}

/**
 * @param array<int,array<string,mixed>> $items
 * @param array<string,mixed> $diagnostics
 */
function buildResponse(int $userId, string $mediaType, array $items, array $diagnostics): array
{
    $payloadItems = [];
    foreach ($items as $item) {
        $releaseDate = $item['release_date'] ?? null;
        $year = $releaseDate ? substr((string) $releaseDate, 0, 4) : null;
        $genres = array_map(static fn ($genre) => $genre['name'] ?? '', $item['genres'] ?? []);
        $posterPath = $item['poster_path'] ?? null;
        $backdropPath = $item['backdrop_path'] ?? null;
        $posterUrl = $posterPath ? sprintf('https://image.tmdb.org/t/p/w780%s', $posterPath) : null;
        $backdropUrl = $backdropPath ? sprintf('https://image.tmdb.org/t/p/w1280%s', $backdropPath) : null;

        $payloadItems[] = [
            'tmdb_id' => (int) $item['id'],
            'media_type' => $mediaType,
            'title' => (string) ($item['title'] ?? ''),
            'overview' => (string) ($item['overview'] ?? ''),
            'release_date' => $releaseDate,
            'genres' => $genres,
            'poster_path' => $posterPath,
            'poster_url' => $posterUrl,
            'backdrop_path' => $backdropPath,
            'backdrop_url' => $backdropUrl,
            'score' => (float) ($item['score'] ?? 0.0),
            'reasons' => $item['reasons'] ?? [],
            'components' => $item['components'] ?? [],
            'buckets' => array_keys($item['buckets'] ?? []),
            'providers_note' => $item['providers_note'] ?? null,
        ];
    }

    $primaryItem = $payloadItems[0] ?? null;

    return [
        'status' => 'ok',
        'user_id' => $userId,
        'media_type' => $mediaType,
        'generated_at' => date(DATE_ATOM),
        'item' => $primaryItem,
        'items' => $payloadItems,
        'diagnostics' => $diagnostics,
    ];
}

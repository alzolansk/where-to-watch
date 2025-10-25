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

$userId = (int) $_SESSION['id'];
$mediaType = (isset($_GET['media_type']) && $_GET['media_type'] === 'tv') ? 'tv' : 'movie';
$language = (string) ($_GET['language'] ?? 'pt-BR');
$region = strtoupper((string) ($_GET['region'] ?? 'BR'));
$maxPages = max(1, min(3, (int) ($_GET['pages'] ?? 3)));
$minVote = max(0.0, min(10.0, (float) ($_GET['min_vote'] ?? 0.0)));

$sessionSurpriseKey = 'wtw_surprise_history';
$sessionSurpriseLimit = 50;
if (!isset($_SESSION[$sessionSurpriseKey]) || !is_array($_SESSION[$sessionSurpriseKey])) {
    $_SESSION[$sessionSurpriseKey] = [];
}
if (!isset($_SESSION[$sessionSurpriseKey][$userId]) || !is_array($_SESSION[$sessionSurpriseKey][$userId])) {
    $_SESSION[$sessionSurpriseKey][$userId] = [];
}
if (!isset($_SESSION[$sessionSurpriseKey][$userId][$mediaType]) || !is_array($_SESSION[$sessionSurpriseKey][$userId][$mediaType])) {
    $_SESSION[$sessionSurpriseKey][$userId][$mediaType] = [];
}
$sessionSurpriseHistory = [];
foreach ($_SESSION[$sessionSurpriseKey][$userId][$mediaType] as $historyValue) {
    $value = (int) $historyValue;
    if ($value > 0) {
        $sessionSurpriseHistory[] = $value;
    }
}

/**
 * @return array<int, array{value:int,weight:float}>
 */
function wyw_fetch_weighted_ids(PDO $pdo, string $sql, int $userId, string $column): array
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':u' => $userId]);
    $result = [];
    foreach ($stmt as $row) {
        $value = isset($row[$column]) ? (int) $row[$column] : 0;
        if ($value <= 0) {
            continue;
        }
        $weight = isset($row['weight']) ? (float) $row['weight'] : 1.0;
        $result[] = [
            'value' => $value,
            'weight' => max(0.1, $weight),
        ];
    }
    return $result;
}

$genresWeighted = wyw_fetch_weighted_ids(
    $pdo,
    'SELECT genre_id, weight FROM user_genres WHERE user_id = :u ORDER BY weight DESC, genre_id ASC',
    $userId,
    'genre_id'
);

$peopleWeighted = wyw_fetch_weighted_ids(
    $pdo,
    'SELECT person_id, weight FROM user_people WHERE user_id = :u ORDER BY weight DESC, person_id ASC',
    $userId,
    'person_id'
);

$providers = [];
try {
    $stmt = $pdo->prepare('SELECT provider_id FROM user_providers WHERE user_id = :u AND enabled = 1 ORDER BY provider_id');
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $providerId = isset($row['provider_id']) ? (int) $row['provider_id'] : 0;
        if ($providerId > 0) {
            $providers[$providerId] = $providerId;
        }
    }
} catch (Throwable $exception) {
    $providers = [];
}
$providerIds = array_values($providers);

$keywordIds = [];
$keywordLabels = [];
try {
    $stmt = $pdo->prepare('SELECT keyword_id, label, weight FROM user_keywords WHERE user_id = :u ORDER BY weight DESC, id ASC');
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $keywordId = ($row['keyword_id'] ?? null) !== null ? (int) $row['keyword_id'] : null;
        $label = trim((string) ($row['label'] ?? ''));
        if ($keywordId) {
            $keywordIds[$keywordId] = $keywordId;
        } elseif ($label !== '') {
            $keywordLabels[] = $label;
        }
    }
} catch (Throwable $exception) {
    $keywordIds = [];
    $keywordLabels = [];
}
$keywordIds = array_values($keywordIds);

$banList = [];
try {
    $stmt = $pdo->prepare("SELECT tmdb_id, media_type FROM interactions WHERE user_id = :u AND type IN ('seen','dislike')");
    $stmt->execute([':u' => $userId]);
    foreach ($stmt as $row) {
        $tmdb = isset($row['tmdb_id']) ? (int) $row['tmdb_id'] : 0;
        if ($tmdb <= 0) {
            continue;
        }
        $kind = ($row['media_type'] ?? '') === 'tv' ? 'tv' : 'movie';
        $banList[$kind . ':' . $tmdb] = true;
    }
} catch (Throwable $exception) {
    try {
        $stmt = $pdo->prepare("SELECT tmdb_id, media_type FROM interactions WHERE user_id = :u AND interaction IN ('seen','dislike')");
        $stmt->execute([':u' => $userId]);
        foreach ($stmt as $row) {
            $tmdb = isset($row['tmdb_id']) ? (int) $row['tmdb_id'] : 0;
            if ($tmdb <= 0) {
                continue;
            }
            $kind = ($row['media_type'] ?? '') === 'tv' ? 'tv' : 'movie';
            $banList[$kind . ':' . $tmdb] = true;
        }
    } catch (Throwable $ignored) {
        $banList = [];
    }
}

foreach ($sessionSurpriseHistory as $recentId) {
    $banList[$mediaType . ':' . $recentId] = true;
}

$discoverBase = [
    'include_adult' => 'false',
    'language' => $language,
    'sort_by' => 'popularity.desc',
    'page' => 1,
];

if ($mediaType === 'movie') {
    $discoverBase['region'] = $region;
}

if ($minVote > 0) {
    $discoverBase['vote_average.gte'] = $minVote;
}

if (!empty($providerIds)) {
    $discoverBase['with_watch_providers'] = implode('|', $providerIds);
    $discoverBase['watch_region'] = $region;
    $discoverBase['with_watch_monetization_types'] = 'flatrate|ads|free|rent|buy';
}

/**
 * @param array<int, array<string, mixed>> $results
 */
function wyw_add_candidates(array &$pool, array $results, string $source, string $mediaType, array $banList): void
{
    foreach ($results as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $id = isset($entry['id']) ? (int) $entry['id'] : 0;
        if ($id <= 0) {
            continue;
        }
        $banKey = $mediaType . ':' . $id;
        if (isset($banList[$banKey])) {
            continue;
        }
        if (!isset($pool[$id])) {
            $pool[$id] = [
                'id' => $id,
                'media_type' => $mediaType,
                'title' => $mediaType === 'movie' ? ($entry['title'] ?? $entry['name'] ?? '') : ($entry['name'] ?? $entry['title'] ?? ''),
                'overview' => $entry['overview'] ?? '',
                'poster_path' => $entry['poster_path'] ?? null,
                'backdrop_path' => $entry['backdrop_path'] ?? null,
                'vote_average' => isset($entry['vote_average']) ? (float) $entry['vote_average'] : null,
                'vote_count' => isset($entry['vote_count']) ? (int) $entry['vote_count'] : null,
                'release_date' => $entry['release_date'] ?? $entry['first_air_date'] ?? null,
                'sources' => [$source],
                'score' => isset($entry['vote_average']) ? (float) $entry['vote_average'] : 0.0,
            ];
        } else {
            if (!in_array($source, $pool[$id]['sources'], true)) {
                $pool[$id]['sources'][] = $source;
                $pool[$id]['score'] += 0.75;
            }
        }
    }
}

$candidatePool = [];

$topGenreIds = array_slice(array_map(static fn ($item) => $item['value'], $genresWeighted), 0, 3);
if (!empty($topGenreIds)) {
    for ($page = 1; $page <= $maxPages; $page++) {
        $params = $discoverBase;
        $params['page'] = $page;
        $params['with_genres'] = implode(',', $topGenreIds);
        $data = tmdb_get('/discover/' . $mediaType, $params);
        wyw_add_candidates($candidatePool, $data['results'] ?? [], 'genres', $mediaType, $banList);
    }
}

$topPeople = array_slice(array_map(static fn ($item) => $item['value'], $peopleWeighted), 0, 3);
if (!empty($topPeople)) {
    for ($page = 1; $page <= max(1, $maxPages - 1); $page++) {
        $params = $discoverBase;
        $params['page'] = $page;
        $params['with_people'] = implode(',', $topPeople);
        $data = tmdb_get('/discover/' . $mediaType, $params);
        wyw_add_candidates($candidatePool, $data['results'] ?? [], 'people', $mediaType, $banList);
    }
}

$topKeywordIds = array_slice($keywordIds, 0, 5);
if (!empty($topKeywordIds)) {
    $params = $discoverBase;
    $params['with_keywords'] = implode(',', $topKeywordIds);
    $data = tmdb_get('/discover/' . $mediaType, $params);
    wyw_add_candidates($candidatePool, $data['results'] ?? [], 'keywords', $mediaType, $banList);
}

$trending = tmdb_get('/trending/' . $mediaType . '/week', ['language' => $language]);
wyw_add_candidates($candidatePool, $trending['results'] ?? [], 'trending', $mediaType, $banList);

if (empty($candidatePool)) {
    $popular = tmdb_get('/' . $mediaType . '/popular', ['language' => $language, 'page' => 1]);
    wyw_add_candidates($candidatePool, $popular['results'] ?? [], 'popular', $mediaType, $banList);
}

if (empty($candidatePool)) {
    http_response_code(204);
    echo json_encode([
        'status' => 'empty',
        'message' => 'Nenhum candidato encontrado para as preferências atuais.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$candidateList = array_values($candidatePool);
foreach ($candidateList as &$candidate) {
    $candidate['score'] = ($candidate['score'] ?? 0.0) + count($candidate['sources']) * 0.35;
    if (!empty($candidate['vote_count'])) {
        $candidate['score'] += min(2.0, log((int) $candidate['vote_count'] + 1, 10));
    }
}
unset($candidate);

usort($candidateList, static function (array $a, array $b): int {
    $scoreA = (float) ($a['score'] ?? 0.0);
    $scoreB = (float) ($b['score'] ?? 0.0);
    if ($scoreA === $scoreB) {
        $voteA = (int) ($a['vote_count'] ?? 0);
        $voteB = (int) ($b['vote_count'] ?? 0);
        return $voteB <=> $voteA;
    }
    return $scoreB <=> $scoreA;
});

$topSliceSize = max(1, min(12, (int) ceil(count($candidateList) * 0.4)));
$topCandidates = array_slice($candidateList, 0, $topSliceSize);

try {
    $selected = $topCandidates[random_int(0, count($topCandidates) - 1)];
} catch (Throwable $exception) {
    $selected = $topCandidates[0];
}

$details = tmdb_get('/' . $mediaType . '/' . $selected['id'], [
    'language' => $language,
    'append_to_response' => 'videos,watch/providers,release_dates,content_ratings',
]);

$releaseDate = $details['release_date'] ?? $details['first_air_date'] ?? $selected['release_date'] ?? null;
$year = $releaseDate ? substr((string) $releaseDate, 0, 4) : null;
$genres = [];
foreach (($details['genres'] ?? []) as $genre) {
    if (!empty($genre['name'])) {
        $genres[] = $genre['name'];
    }
}

$runtimeMinutes = null;
if ($mediaType === 'movie') {
    if (isset($details['runtime'])) {
        $runtimeMinutes = (int) $details['runtime'];
    }
} else {
    if (!empty($details['episode_run_time'][0])) {
        $runtimeMinutes = (int) $details['episode_run_time'][0];
    } elseif (!empty($details['last_episode_to_air']['runtime'])) {
        $runtimeMinutes = (int) $details['last_episode_to_air']['runtime'];
    }
}

$runtimeLabel = null;
if ($runtimeMinutes && $runtimeMinutes > 0) {
    $hours = intdiv($runtimeMinutes, 60);
    $minutes = $runtimeMinutes % 60;
    if ($hours > 0) {
        $runtimeLabel = $minutes > 0 ? sprintf('%dh%02d', $hours, $minutes) : sprintf('%dh', $hours);
    } else {
        $runtimeLabel = sprintf('%dmin', $minutes);
    }
    if ($mediaType === 'tv') {
        $runtimeLabel .= ' por episódio';
    }
}

$subtitleParts = [];
if (!empty($genres)) {
    $subtitleParts[] = $genres[0];
}
if ($year) {
    $subtitleParts[] = $year;
}
if ($runtimeLabel) {
    $subtitleParts[] = $runtimeLabel;
}
$subtitle = implode(' • ', $subtitleParts);

$posterPath = $details['poster_path'] ?? $selected['poster_path'] ?? null;
$backdropPath = $details['backdrop_path'] ?? $selected['backdrop_path'] ?? null;
$posterUrl = $posterPath ? sprintf('https://image.tmdb.org/t/p/w780%s', $posterPath) : null;
$backdropUrl = $backdropPath ? sprintf('https://image.tmdb.org/t/p/w1280%s', $backdropPath) : null;

$providerEntries = [];
$providersNote = null;
$watchData = $details['watch/providers']['results'][$region] ?? [];
$monetizations = ['flatrate', 'ads', 'free', 'rent', 'buy'];
foreach ($monetizations as $monetization) {
    foreach (($watchData[$monetization] ?? []) as $entry) {
        $pid = isset($entry['provider_id']) ? (int) $entry['provider_id'] : 0;
        if ($pid <= 0) {
            continue;
        }
        $providerEntries[$pid] = [
            'id' => $pid,
            'name' => $entry['provider_name'] ?? '',
            'logo_path' => $entry['logo_path'] ?? null,
            'monetization' => $monetization,
        ];
    }
}

if (!empty($providerEntries)) {
    $ids = array_keys($providerEntries);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    try {
        $stmt = $pdo->prepare('SELECT provider_id, name, logo_path FROM providers WHERE provider_id IN (' . $placeholders . ')');
        $stmt->execute($ids);
        foreach ($stmt as $row) {
            $pid = isset($row['provider_id']) ? (int) $row['provider_id'] : 0;
            if ($pid <= 0 || !isset($providerEntries[$pid])) {
                continue;
            }
            if (!empty($row['name'])) {
                $providerEntries[$pid]['name'] = $row['name'];
            }
            if (!empty($row['logo_path']) && empty($providerEntries[$pid]['logo_path'])) {
                $providerEntries[$pid]['logo_path'] = $row['logo_path'];
            }
        }
    } catch (Throwable $exception) {
        // ignora enriquecimento se falhar
    }

    foreach ($providerEntries as $pid => $provider) {
        $providerEntries[$pid]['logo_url'] = !empty($provider['logo_path'])
            ? sprintf('https://image.tmdb.org/t/p/w154%s', $provider['logo_path'])
            : null;
    }
} else {
    if (!empty($providerIds)) {
        $providersNote = 'Sem disponibilidade confirmada nos seus provedores preferidos.';
    } else {
        $providersNote = 'Disponibilidade não informada para este título.';
    }
}

$providerList = array_values($providerEntries);

$trailerUrl = null;
foreach (($details['videos']['results'] ?? []) as $video) {
    if (!is_array($video)) {
        continue;
    }
    $site = $video['site'] ?? '';
    $type = $video['type'] ?? '';
    $key = $video['key'] ?? '';
    if ($site === 'YouTube' && in_array($type, ['Trailer', 'Teaser', 'Clip'], true) && $key !== '') {
        $trailerUrl = 'https://www.youtube.com/watch?v=' . $key;
        break;
    }
}

$selectedId = isset($selected['id']) ? (int) $selected['id'] : 0;
if ($selectedId > 0) {
    $normalizedHistory = [];
    foreach ($sessionSurpriseHistory as $historyId) {
        $historyValue = (int) $historyId;
        if ($historyValue > 0 && $historyValue !== $selectedId) {
            $normalizedHistory[] = $historyValue;
        }
    }
    $normalizedHistory[] = $selectedId;
    if (count($normalizedHistory) > $sessionSurpriseLimit) {
        $normalizedHistory = array_slice($normalizedHistory, -$sessionSurpriseLimit);
    }
    $sessionSurpriseHistory = $normalizedHistory;
    $_SESSION[$sessionSurpriseKey][$userId][$mediaType] = $sessionSurpriseHistory;
}

$response = [
    'status' => 'ok',
    'user_id' => $userId,
    'media_type' => $mediaType,
    'generated_at' => date(DATE_ATOM),
    'item' => [
        'tmdb_id' => $selected['id'],
        'media_type' => $mediaType,
        'title' => $details['title'] ?? $details['name'] ?? $selected['title'] ?? '',
        'original_title' => $details['original_title'] ?? $details['original_name'] ?? null,
        'overview' => $details['overview'] ?? $selected['overview'] ?? '',
        'tagline' => $details['tagline'] ?? null,
        'subtitle' => $subtitle,
        'meta_summary' => $subtitle,
        'genres' => $genres,
        'release_date' => $releaseDate,
        'runtime' => $runtimeMinutes,
        'runtime_label' => $runtimeLabel,
        'poster_path' => $posterPath,
        'poster_url' => $posterUrl,
        'backdrop_path' => $backdropPath,
        'backdrop_url' => $backdropUrl,
        'providers' => $providerList,
        'providers_note' => $providersNote,
        'trailer_url' => $trailerUrl,
        'vote_average' => $details['vote_average'] ?? $selected['vote_average'] ?? null,
        'vote_count' => $details['vote_count'] ?? $selected['vote_count'] ?? null,
        'homepage' => $details['homepage'] ?? null,
        'source_tags' => $selected['sources'] ?? [],
    ],
    'diagnostics' => [
        'candidate_count' => count($candidateList),
        'top_slice' => count($topCandidates),
        'filters' => [
            'genres' => $topGenreIds,
            'people' => $topPeople,
            'keywords' => $topKeywordIds,
            'providers' => $providerIds,
            'keyword_labels' => $keywordLabels,
        ],
        'ban_count' => count($banList),
    ],
];

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

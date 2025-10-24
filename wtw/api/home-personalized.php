<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/../includes/tmdb.php';

function wtw_resolve_pdo(): ?PDO
{
    static $cached = null;

    if ($cached instanceof PDO) {
        return $cached;
    }

    if (isset($GLOBALS['pdo']) && $GLOBALS['pdo'] instanceof PDO) {
        $cached = $GLOBALS['pdo'];
        return $cached;
    }

    $dbFile = __DIR__ . '/../includes/db.php';
    if (is_file($dbFile)) {
        try {
            require_once $dbFile;
            if (isset($GLOBALS['pdo']) && $GLOBALS['pdo'] instanceof PDO) {
                $cached = $GLOBALS['pdo'];
                return $cached;
            }
            if (function_exists('get_pdo')) {
                $candidate = get_pdo();
                if ($candidate instanceof PDO) {
                    $cached = $candidate;
                    return $cached;
                }
            }
        } catch (Throwable $exception) {
        }
    }

    $host = getenv('DB_HOST') ?: 'localhost';
    $database = getenv('DB_NAME') ?: 'db_login';
    $user = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASS') ?: '';

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $database);

    try {
        $cached = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        return $cached;
    } catch (Throwable $exception) {
        return null;
    }
}

$pdo = wtw_resolve_pdo();
if (!($pdo instanceof PDO)) {
    http_response_code(503);
    echo json_encode(['error' => 'database_unavailable'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$userId = (int) $_SESSION['id'];
$media = (isset($_GET['media_type']) && $_GET['media_type'] === 'tv') ? 'tv' : 'movie';
$limit = (int) ($_GET['limit'] ?? 20);
$limit = max(6, min(30, $limit));

$genreWeights = [];
try {
    $stmt = $pdo->prepare('SELECT genre_id, weight FROM user_genres WHERE user_id = ?');
    $stmt->execute([$userId]);
    foreach ($stmt as $row) {
        $genreId = (int) ($row['genre_id'] ?? 0);
        if ($genreId > 0) {
            $genreWeights[$genreId] = max(0.2, (float) ($row['weight'] ?? 1.0));
        }
    }
} catch (Throwable $exception) {
}

$keywordIdWeights = [];
$keywordLabelWeights = [];
try {
    $stmt = $pdo->prepare('SELECT keyword_id, label, weight FROM user_keywords WHERE user_id = ? ORDER BY weight DESC, id ASC');
    $stmt->execute([$userId]);
    foreach ($stmt as $row) {
        $weight = max(0.2, (float) ($row['weight'] ?? 1.0));
        $label = trim((string) ($row['label'] ?? ''));
        $keywordId = $row['keyword_id'] !== null ? (int) $row['keyword_id'] : null;
        if ($keywordId) {
            $keywordIdWeights[$keywordId] = $weight;
        } elseif ($label !== '') {
            $keywordLabelWeights[$label] = $weight;
        }
    }
} catch (Throwable $exception) {
}

$peopleWeights = [];
try {
    $stmt = $pdo->prepare('SELECT person_id, weight FROM user_people WHERE user_id = ? ORDER BY weight DESC, person_id ASC');
    $stmt->execute([$userId]);
    foreach ($stmt as $row) {
        $personId = (int) ($row['person_id'] ?? 0);
        if ($personId > 0) {
            $peopleWeights[$personId] = max(0.2, (float) ($row['weight'] ?? 1.0));
        }
    }
} catch (Throwable $exception) {
}

$favorites = [];
$favoritesSet = [];
try {
    $stmt = $pdo->prepare('SELECT tmdb_id, media_type, title, favorited_at FROM user_favorite_titles WHERE user_id = ? ORDER BY favorited_at DESC LIMIT 20');
    $stmt->execute([$userId]);
    foreach ($stmt as $row) {
        $tmdbId = (int) ($row['tmdb_id'] ?? 0);
        $mediaType = ($row['media_type'] ?? '') === 'tv' ? 'tv' : 'movie';
        if ($tmdbId <= 0) {
            continue;
        }
        $favorites[] = [
            'tmdb_id' => $tmdbId,
            'media_type' => $mediaType,
            'title' => $row['title'] ?? '',
            'favorited_at' => $row['favorited_at'] ?? null,
        ];
        if ($mediaType === $media) {
            $favoritesSet[$tmdbId] = true;
        }
    }
} catch (Throwable $exception) {
}

$providerIds = [];
try {
    $stmt = $pdo->prepare('SELECT provider_id FROM user_providers WHERE user_id = ? AND enabled = 1');
    $stmt->execute([$userId]);
    foreach ($stmt as $row) {
        $provider = (int) ($row['provider_id'] ?? 0);
        if ($provider > 0) {
            $providerIds[$provider] = $provider;
        }
    }
} catch (Throwable $exception) {
}
$providerIds = array_values($providerIds);

if (empty($genreWeights) && empty($keywordIdWeights) && empty($keywordLabelWeights) && empty($peopleWeights) && empty($favorites)) {
    echo json_encode([
        'results' => [],
        'generated_at' => date('c'),
        'message' => 'no_personalization_data',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$requests = [];
$requestMeta = [];

$discoverBase = [
    'include_adult' => 'false',
    'page' => 1,
    'sort_by' => 'popularity.desc',
];

if ($media === 'movie') {
    $discoverBase['region'] = 'BR';
}

if (!empty($providerIds)) {
    $discoverBase['with_watch_providers'] = implode('|', $providerIds);
    $discoverBase['watch_region'] = 'BR';
    $discoverBase['with_watch_monetization_types'] = 'flatrate|ads|free|rent|buy';
}

if (!empty($genreWeights)) {
    $sortedGenres = array_keys($genreWeights);
    usort($sortedGenres, static function ($a, $b) use ($genreWeights) {
        return $genreWeights[$b] <=> $genreWeights[$a];
    });
    $topGenres = array_slice($sortedGenres, 0, 3);
    if (!empty($topGenres)) {
        $requests['genres-mix'] = [
            'path' => "/discover/{$media}",
            'params' => array_merge($discoverBase, [
                'with_genres' => implode(',', $topGenres),
            ]),
        ];
        $requestMeta['genres-mix'] = [
            'type' => 'genre',
            'genre_ids' => $topGenres,
            'weight' => 3.0 + array_sum(array_map(static function ($gid) use ($genreWeights) {
                return $genreWeights[$gid] ?? 0;
            }, $topGenres)),
        ];
    }
    foreach ($topGenres as $genreId) {
        $requests['genre-' . $genreId] = [
            'path' => "/discover/{$media}",
            'params' => array_merge($discoverBase, [
                'with_genres' => (string) $genreId,
            ]),
        ];
        $requestMeta['genre-' . $genreId] = [
            'type' => 'genre',
            'genre_ids' => [$genreId],
            'weight' => 2.2 + ($genreWeights[$genreId] ?? 1.0),
        ];
    }
}

if (!empty($keywordIdWeights)) {
    $sortedKeywordIds = array_keys($keywordIdWeights);
    usort($sortedKeywordIds, static function ($a, $b) use ($keywordIdWeights) {
        return $keywordIdWeights[$b] <=> $keywordIdWeights[$a];
    });
    $chunks = array_chunk($sortedKeywordIds, 2);
    foreach (array_slice($chunks, 0, 3) as $index => $chunk) {
        $requests['kwid-' . $index] = [
            'path' => "/discover/{$media}",
            'params' => array_merge($discoverBase, [
                'with_keywords' => implode(',', $chunk),
            ]),
        ];
        $requestMeta['kwid-' . $index] = [
            'type' => 'keyword',
            'keywords' => array_map(static function ($id) {
                return ['id' => $id, 'label' => null];
            }, $chunk),
            'weight' => 2.5 + array_sum(array_map(static function ($id) use ($keywordIdWeights) {
                return $keywordIdWeights[$id] ?? 1.0;
            }, $chunk)),
        ];
    }
}

if (!empty($keywordLabelWeights)) {
    $labelKeys = array_keys($keywordLabelWeights);
    usort($labelKeys, static function ($a, $b) use ($keywordLabelWeights) {
        return $keywordLabelWeights[$b] <=> $keywordLabelWeights[$a];
    });
    $searchPath = $media === 'tv' ? '/search/tv' : '/search/movie';
    foreach (array_slice($labelKeys, 0, 3) as $idx => $label) {
        $requests['kwlabel-' . $idx] = [
            'path' => $searchPath,
            'params' => [
                'query' => $label,
                'include_adult' => 'false',
                'page' => 1,
            ],
        ];
        $requestMeta['kwlabel-' . $idx] = [
            'type' => 'keyword',
            'keywords' => [['id' => null, 'label' => $label]],
            'weight' => 1.8 + ($keywordLabelWeights[$label] ?? 1.0),
        ];
    }
}

if (!empty($peopleWeights)) {
    $sortedPeople = array_keys($peopleWeights);
    usort($sortedPeople, static function ($a, $b) use ($peopleWeights) {
        return $peopleWeights[$b] <=> $peopleWeights[$a];
    });
    $topPeople = array_slice($sortedPeople, 0, 3);
    if (!empty($topPeople)) {
        $requests['people-mix'] = [
            'path' => "/discover/{$media}",
            'params' => array_merge($discoverBase, [
                'with_people' => implode(',', $topPeople),
            ]),
        ];
        $requestMeta['people-mix'] = [
            'type' => 'person',
            'people_ids' => $topPeople,
            'weight' => 2.3 + array_sum(array_map(static function ($id) use ($peopleWeights) {
                return $peopleWeights[$id] ?? 1.0;
            }, $topPeople)),
        ];
    }
}

if (!empty($favorites)) {
    foreach (array_slice($favorites, 0, 5) as $favorite) {
        if ($favorite['media_type'] !== $media) {
            continue;
        }
        $favId = (int) $favorite['tmdb_id'];
        $requests['fav-' . $favId] = [
            'path' => sprintf('/%s/%d/recommendations', $media, $favId),
            'params' => ['page' => 1],
        ];
        $requestMeta['fav-' . $favId] = [
            'type' => 'favorite',
            'favorite_id' => $favId,
            'favorite_title' => $favorite['title'] ?? '',
            'weight' => 3.4,
        ];
    }
}

$requests['trending'] = [
    'path' => "/trending/{$media}/week",
    'params' => ['page' => 1],
];
$requestMeta['trending'] = [
    'type' => 'trending',
    'weight' => 0.9,
];

$candidates = [];

$responses = tmdb_get_bulk($requests);
foreach ($responses as $key => $payload) {
    if (!is_array($payload)) {
        continue;
    }
    $items = $payload['results'] ?? [];
    if (!is_array($items) || empty($items)) {
        continue;
    }
    $meta = $requestMeta[$key] ?? [];
    $slice = array_slice($items, 0, 20);
    foreach ($slice as $item) {
        register_candidate($item, $meta, $media, $candidates, $favoritesSet);
    }
}

if (empty($candidates)) {
    echo json_encode([
        'results' => [],
        'generated_at' => date('c'),
        'message' => 'no_candidates',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

finalize_candidate_scores($candidates, $genreWeights, $keywordIdWeights, $keywordLabelWeights, $peopleWeights);

$candidateEntries = array_values($candidates);

usort($candidateEntries, static function ($a, $b) {
    $scoreComparison = ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
    if ($scoreComparison !== 0) {
        return $scoreComparison;
    }
    $dateA = $a['data']['release_date'] ?? $a['data']['first_air_date'] ?? '';
    $dateB = $b['data']['release_date'] ?? $b['data']['first_air_date'] ?? '';
    return strcmp($dateB, $dateA);
});

$selected = array_map(static function ($entry) {
    return $entry['data'];
}, array_slice($candidateEntries, 0, $limit));

if (empty($selected)) {
    echo json_encode([
        'results' => [],
        'generated_at' => date('c'),
        'message' => 'no_selection',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

echo json_encode([
    'results' => $selected,
    'generated_at' => date('c'),
    'context' => [
        'media_type' => $media,
        'limit' => $limit,
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

function register_candidate(array $item, array $meta, string $media, array &$candidates, array $favoritesSet): void
{
    $id = isset($item['id']) ? (int) $item['id'] : 0;
    if ($id <= 0) {
        return;
    }

    if (isset($favoritesSet[$id])) {
        return;
    }

    $itemMedia = isset($item['media_type']) ? ($item['media_type'] === 'tv' ? 'tv' : 'movie') : $media;
    if ($itemMedia !== $media) {
        return;
    }

    if (!isset($candidates[$id])) {
        $item['media_type'] = $media;
        $candidates[$id] = [
            'data' => $item,
            'score' => 0.0,
            'sources' => [],
            'reasons' => [
                'genres' => [],
                'keywords' => [],
                'favorites' => [],
                'people' => [],
            ],
        ];
    } else {
        $existing = &$candidates[$id]['data'];
        if (empty($existing['poster_path']) && !empty($item['poster_path'])) {
            $existing['poster_path'] = $item['poster_path'];
        }
        if (empty($existing['backdrop_path']) && !empty($item['backdrop_path'])) {
            $existing['backdrop_path'] = $item['backdrop_path'];
        }
        if (empty($existing['overview']) && !empty($item['overview'])) {
            $existing['overview'] = $item['overview'];
        }
    }

    $weight = isset($meta['weight']) ? (float) $meta['weight'] : 1.0;
    $candidates[$id]['score'] += $weight;

    if (!empty($meta['type'])) {
        $candidates[$id]['sources'][] = (string) $meta['type'];
    }

    $type = $meta['type'] ?? '';
    if ($type === 'genre') {
        foreach ($meta['genre_ids'] ?? [] as $genreId) {
            $candidates[$id]['reasons']['genres'][(int) $genreId] = true;
        }
    } elseif ($type === 'keyword') {
        foreach ($meta['keywords'] ?? [] as $keywordMeta) {
            $keywordId = isset($keywordMeta['id']) ? $keywordMeta['id'] : null;
            $keywordLabel = isset($keywordMeta['label']) ? (string) $keywordMeta['label'] : '';
            $key = $keywordId !== null ? 'id:' . (int) $keywordId : 'label:' . $keywordLabel;
            $candidates[$id]['reasons']['keywords'][$key] = [
                'id' => $keywordId !== null ? (int) $keywordId : null,
                'label' => $keywordLabel,
            ];
        }
    } elseif ($type === 'favorite') {
        if (!empty($meta['favorite_id'])) {
            $favId = (int) $meta['favorite_id'];
            $candidates[$id]['reasons']['favorites'][$favId] = $meta['favorite_title'] ?? '';
        }
    } elseif ($type === 'person') {
        foreach ($meta['people_ids'] ?? [] as $personId) {
            $candidates[$id]['reasons']['people'][(int) $personId] = true;
        }
    }
}

function finalize_candidate_scores(array &$candidates, array $genreWeights, array $keywordIdWeights, array $keywordLabelWeights, array $peopleWeights): void
{
    foreach ($candidates as &$entry) {
        $data = $entry['data'];
        $score = (float) ($entry['score'] ?? 0);

        if (!empty($data['genre_ids']) && is_array($data['genre_ids'])) {
            foreach ($data['genre_ids'] as $gid) {
                $gid = (int) $gid;
                if (isset($genreWeights[$gid])) {
                    $score += 1.5 * max(0.3, (float) $genreWeights[$gid]);
                    $entry['reasons']['genres'][$gid] = true;
                }
            }
        }

        foreach ($entry['reasons']['keywords'] as $keywordInfo) {
            $keywordScore = 1.0;
            if ($keywordInfo['id'] !== null && isset($keywordIdWeights[$keywordInfo['id']])) {
                $keywordScore = (float) $keywordIdWeights[$keywordInfo['id']];
            } elseif (!empty($keywordInfo['label']) && isset($keywordLabelWeights[$keywordInfo['label']])) {
                $keywordScore = (float) $keywordLabelWeights[$keywordInfo['label']];
            }
            $score += 1.1 * max(0.3, $keywordScore);
        }

        if (!empty($entry['reasons']['favorites'])) {
            $score += 1.2 * count($entry['reasons']['favorites']);
        }

        foreach (array_keys($entry['reasons']['people']) as $personId) {
            if (isset($peopleWeights[$personId])) {
                $score += 1.0 * max(0.3, (float) $peopleWeights[$personId]);
            }
        }

        $voteAverage = isset($data['vote_average']) ? (float) $data['vote_average'] : 0.0;
        if ($voteAverage > 7.5) {
            $score += min(($voteAverage - 7.5) * 0.4, 1.6);
        } elseif ($voteAverage > 6.5) {
            $score += min(($voteAverage - 6.5) * 0.2, 0.6);
        }

        $entry['score'] = $score;
        $entry['sources'] = array_values(array_unique($entry['sources']));

        $keywordsSummary = [];
        foreach ($entry['reasons']['keywords'] as $info) {
            if (!empty($info['label'])) {
                $keywordsSummary[] = $info['label'];
            } elseif ($info['id'] !== null) {
                $keywordsSummary[] = (string) $info['id'];
            }
        }
        $keywordsSummary = array_values(array_unique(array_filter($keywordsSummary, static function ($value) {
            return $value !== '';
        })));

        $favoritesSummary = array_values(array_filter(array_map(static function ($value) {
            return is_string($value) && $value !== '' ? $value : null;
        }, $entry['reasons']['favorites'])));

        $entry['data']['wtw_score'] = round($score, 3);
        $entry['data']['wtw_sources'] = $entry['sources'];
        $entry['data']['wtw_personalization'] = [
            'genres' => array_map('intval', array_keys($entry['reasons']['genres'])),
            'keywords' => $keywordsSummary,
            'favorites' => $favoritesSummary,
        ];
    }
    unset($entry);
}

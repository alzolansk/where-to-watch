<?php
require __DIR__.'/../includes/db.php';
require __DIR__.'/../includes/tmdb.php';

$options = getopt('', ['region::', 'ids::', 'limit::']);
$region = strtoupper($options['region'] ?? 'BR');
$limit  = max(10, min(200, (int)($options['limit'] ?? 80)));

$ids = [];
if (!empty($options['ids'])) {
    foreach (explode(',', $options['ids']) as $piece) {
        [$id, $type] = array_pad(explode(':', trim($piece), 2), 2, 'movie');
        $id = (int)$id;
        if ($id > 0) {
            $ids[$type][$id] = true;
        }
    }
}

if (!$ids) {
    // fallback: usa popular + trending movies/tv
    $sources = [
        ['path' => '/movie/popular',   'type' => 'movie'],
        ['path' => '/trending/movie/week', 'type' => 'movie'],
        ['path' => '/tv/popular',      'type' => 'tv'],
        ['path' => '/trending/tv/week','type' => 'tv'],
    ];
    foreach ($sources as $source) {
        $data = tmdb_get($source['path'], ['page' => 1]);
        foreach (($data['results'] ?? []) as $item) {
            $id = (int)($item['id'] ?? 0);
            if ($id > 0) {
                $ids[$source['type']][$id] = true;
            }
        }
    }
}

$ins = $pdo->prepare("REPLACE INTO title_availability (tmdb_id, media_type, provider_id, region, monetization, last_checked_at) VALUES (?,?,?,?,?, NOW())");
$del = $pdo->prepare("DELETE FROM title_availability WHERE tmdb_id=? AND media_type=? AND region=?");

$totalProcessed = 0;
$totalProviders = 0;

foreach ($ids as $mediaType => $tmdbIds) {
    $chunk = array_slice(array_keys($tmdbIds), 0, $limit);
    foreach ($chunk as $tmdbId) {
        $data = tmdb_get("/{$mediaType}/{$tmdbId}/watch/providers");
        $regionData = $data['results'][$region] ?? null;

        $del->execute([$tmdbId, $mediaType, $region]);

        if (!$regionData) {
            echo "[{$mediaType}] {$tmdbId}: sem dados para {$region}\n";
            $totalProcessed++;
            continue;
        }

        $providers = [];
        foreach (['flatrate','rent','buy','ads','free'] as $bucket) {
            foreach (($regionData[$bucket] ?? []) as $provider) {
                $providers[] = [
                    'id' => (int)$provider['provider_id'],
                    'monetization' => $bucket,
                ];

                $upProvider = $pdo->prepare("
                INSERT INTO providers (provider_id, name, kind, logo_path, last_seen_at)
                VALUES (:id, :name, 'streaming', :logo, NOW())
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    logo_path = VALUES(logo_path),
                    last_seen_at = NOW()
                ");

                $insAvail = $pdo->prepare("
                INSERT INTO title_availability
                    (tmdb_id, media_type, provider_id, region, monetization, last_checked_at)
                VALUES (:tmdb, :media, :prov, :region, :mono, NOW())
                ON DUPLICATE KEY UPDATE last_checked_at = VALUES(last_checked_at)
                ");

                foreach (['flatrate','rent','buy','ads','free'] as $kind) {
                foreach ($br[$kind] ?? [] as $p) {
                    $pid  = (int)$p['provider_id'];
                    $pname= (string)($p['provider_name'] ?? '');
                    $plogo= $p['logo_path'] ?? null;

                    // 1) garante existência do provider (evita FK)
                    $upProvider->execute([':id'=>$pid, ':name'=>$pname, ':logo'=>$plogo]);

                    // 2) grava disponibilidade
                    $insAvail->execute([
                    ':tmdb' => $tmdbId,
                    ':media'=> $mediaType,     // 'movie' ou 'tv' conforme seu loop
                    ':prov' => $pid,
                    ':region'=> $region,       // 'BR'
                    ':mono' => $kind,
                    ]);
                }'  '
                }
            }   
        }

        if (!$providers) {
            echo "[{$mediaType}] {$tmdbId}: região {$region} sem provedores\n";
            $totalProcessed++;
            continue;
        }

        foreach ($providers as $provider) {
            $ins->execute([$tmdbId, $mediaType, $provider['id'], $region, $provider['monetization']]);
            $totalProviders++;
        }

        echo "[{$mediaType}] {$tmdbId}: sincronizado (".count($providers)." provedores)\n";
        $totalProcessed++;
    }
}

echo "Finalizado: {$totalProcessed} títulos, {$totalProviders} registros de disponibilidade.\n";
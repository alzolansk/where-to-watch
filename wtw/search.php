<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$query = trim($_GET['q'] ?? '');

$normalizeToUtf8 = static function (string $value): string {
    if ($value === '') {
        return $value;
    }

    $hasMbSupport = function_exists('mb_detect_encoding') && function_exists('mb_convert_encoding');

    if ($hasMbSupport) {
        $encoding = mb_detect_encoding($value, ['UTF-8', 'ISO-8859-1', 'WINDOWS-1252'], true);
        if ($encoding === false) {
            $encoding = 'ISO-8859-1';
        } elseif (
            $encoding === 'UTF-8'
            && function_exists('mb_check_encoding')
            && !mb_check_encoding($value, 'UTF-8')
        ) {
            $encoding = 'ISO-8859-1';
        }

        if ($encoding !== 'UTF-8') {
            return mb_convert_encoding($value, 'UTF-8', $encoding);
        }

        return $value;
    }

    if (function_exists('iconv')) {
        $converted = @iconv('WINDOWS-1252', 'UTF-8//IGNORE', $value);
        if ($converted !== false) {
            return $converted;
        }

        $converted = @iconv('ISO-8859-1', 'UTF-8//IGNORE', $value);
        if ($converted !== false) {
            return $converted;
        }
    }

    if (function_exists('utf8_encode')) {
        return utf8_encode($value);
    }

    return $value;
};

$query = $normalizeToUtf8($query);
$queryForScript = json_encode($query, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($queryForScript === false) {
    $queryForScript = '""';
}

// Override with normalized UTF-8 labels to avoid legacy encoding issues.
$genreOptions = [
    ['id' => 28, 'label' => "A\u{00E7}\u{00E3}o"],
    ['id' => 12, 'label' => 'Aventura'],
    ['id' => 16, 'label' => "Anima\u{00E7}\u{00E3}o"],
    ['id' => 35, 'label' => "Com\u{00E9}dia"],
    ['id' => 80, 'label' => 'Crime'],
    ['id' => 99, 'label' => "Document\u{00E1}rio"],
    ['id' => 18, 'label' => 'Drama'],
    ['id' => 10751, 'label' => "Fam\u{00ED}lia"],
    ['id' => 14, 'label' => 'Fantasia'],
    ['id' => 878, 'label' => "Fic\u{00E7}\u{00E3}o cient\u{00ED}fica"],
    ['id' => 9648, 'label' => "Mist\u{00E9}rio"],
    ['id' => 10749, 'label' => 'Romance'],
    ['id' => 53, 'label' => 'Suspense'],
    ['id' => 27, 'label' => 'Terror'],
    ['id' => 10759, 'label' => "A\u{00E7}\u{00E3}o e aventura"],
    ['id' => 10762, 'label' => 'Infantil'],
    ['id' => 10765, 'label' => 'Sci-Fi & Fantasia'],
    ['id' => 10768, 'label' => "Guerra & Pol\u{00ED}tica"],
];

$releaseOptions = [
    ['id' => 'all', 'label' => 'Todos'],
    ['id' => 'new', 'label' => "\u{00DA}ltimos 12 meses"],
    ['id' => '2010s', 'label' => 'Anos 2010'],
    ['id' => '2000s', 'label' => 'Anos 2000'],
    ['id' => '90s', 'label' => 'Anos 90'],
    ['id' => '80s', 'label' => 'Anos 80'],
    ['id' => 'classic', 'label' => "Cl\u{00E1}ssicos"],
];

$sortOptions = [
    ['id' => 'popularity.desc', 'label' => 'Popularidade'],
    ['id' => 'release_date.desc', 'label' => 'Mais recentes'],
    ['id' => 'release_date.asc', 'label' => 'Mais antigos'],
    ['id' => 'vote_average.desc', 'label' => 'Melhor avaliados'],
];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <title>Resultados da pesquisa | WhereYouWatch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/search-results.css">
</head>
<body class="search-results-page has-fixed-header">
<?php include_once('dashboard.php'); ?>

<main class="search-results-shell" data-search-root>
    <header class="search-results-hero">
            <h1 class="search-results-hero__title">Explorar t&#237;tulos para <span data-search-term><?php echo htmlspecialchars($query, ENT_QUOTES, 'UTF-8'); ?></span></h1>
        </div>
        <div class="search-results-hero__meta">
            <span class="search-results-hero__count" data-result-count>0 resultados</span>
        </div>
    </header>

    <div class="search-results-layout">
        <aside class="search-filters" aria-label="Filtros da pesquisa">
            <button type="button" class="search-results-hero__reset" data-reset-filters>Limpar filtros</button>
            <section class="search-filter-section" data-filter-section>
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="true" aria-controls="filter-panel-type" role="heading" aria-level="2">
                    <span class="search-filter-title">Tipos</span>
                </button>
                <div class="search-filter-content" id="filter-panel-type" data-filter-content>
                    <div class="search-filter-chips" role="group" aria-label="Filtrar por tipo de m&#237;dia">
                        <button type="button" class="search-chip is-active" data-media-filter="both" data-default-active>Filmes &amp; s&#233;ries</button>
                        <button type="button" class="search-chip" data-media-filter="movie">Filmes</button>
                        <button type="button" class="search-chip" data-media-filter="tv">S&#233;ries</button>
                    </div>
                </div>
            </section>
            <section class="search-filter-section is-collapsed" data-filter-section>
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-panel-genre" role="heading" aria-level="2">
                    <span class="search-filter-title">G&#234;nero</span>
                </button>
                <div class="search-filter-content" id="filter-panel-genre" data-filter-content hidden>
                    <div class="search-filter-chips search-filter-chips--wrap" role="group" aria-label="Filtrar por g&#234;nero">
                        <?php foreach ($genreOptions as $genre): ?>
                            <button type="button" class="search-chip" data-genre-option="<?php echo (int) $genre['id']; ?>">
                                <?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>
            </section>
            <section class="search-filter-section is-collapsed" data-filter-section>
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-panel-release" role="heading" aria-level="2">
                    <span class="search-filter-title">Lan&#231;amento</span>
                </button>
                <div class="search-filter-content" id="filter-panel-release" data-filter-content hidden>
                    <div class="search-filter-chips search-filter-chips--wrap" role="group" aria-label="Filtrar por per&#237;odo de lan&#231;amento">
                        <?php foreach ($releaseOptions as $period): ?>
                            <button type="button" class="search-chip<?php echo $period['id'] === 'all' ? ' is-active' : ''; ?>" data-release-option="<?php echo htmlspecialchars($period['id'], ENT_QUOTES, 'UTF-8'); ?>"<?php echo $period['id'] === 'all' ? ' data-default-active' : ''; ?>">
                                <?php echo htmlspecialchars($period['label'], ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>
            </section>
            <section class="search-filter-section is-collapsed" data-filter-section>
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-panel-sort" role="heading" aria-level="2">
                    <span class="search-filter-title">Ordenar por</span>
                </button>
                <div class="search-filter-content" id="filter-panel-sort" data-filter-content hidden>
                    <div class="search-filter-chips search-filter-chips--wrap" role="group" aria-label="Ordenar resultados">
                        <?php foreach ($sortOptions as $sort): ?>
                            <button type="button" class="search-chip<?php echo $sort['id'] === 'popularity.desc' ? ' is-active' : ''; ?>" data-sort-option="<?php echo htmlspecialchars($sort['id'], ENT_QUOTES, 'UTF-8'); ?>"<?php echo $sort['id'] === 'popularity.desc' ? ' data-default-active' : ''; ?>">
                                <?php echo htmlspecialchars($sort['label'], ENT_QUOTES, 'UTF-8'); ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>
            </section>
        </aside>

        <section class="search-results" aria-live="polite" aria-busy="false">
            <div class="search-results__grid" data-search-results></div>
            <div class="search-results__empty" data-search-empty hidden>
                <h2>Nenhum resultado encontrado</h2>
                <p>Tente ajustar os filtros ou realizar uma nova pesquisa.</p>
            </div>
        </section>
    </div>
</main>

<script>
    window.__INITIAL_SEARCH_QUERY__ = <?php echo $queryForScript; ?>;
</script>
<script src="js/script.js"></script>
<script src="js/search.js"></script>
<script src="js/search-results.js"></script>
</body>
</html>






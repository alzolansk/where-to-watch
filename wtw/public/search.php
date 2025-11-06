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
    <!-- Breadcrumb Navigation -->
    <nav class="breadcrumb" aria-label="Navegação breadcrumb">
        <a href="index.php" class="breadcrumb__link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Início
        </a>
        <svg class="breadcrumb__separator" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span class="breadcrumb__current">Resultados da pesquisa</span>
    </nav>

    <header class="search-results-hero">
        <div class="search-results-hero__info">
            <div class="hero-badge-group">
                <span class="hero-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    Pesquisa
                </span>
                <span class="hero-badge hero-badge--active" data-active-filters-badge hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span data-active-filters-count>0</span> filtros
                </span>
            </div>
            <h1 class="search-results-hero__title">
                <span class="title-query" data-search-term><?php echo htmlspecialchars($query, ENT_QUOTES, 'UTF-8'); ?></span>
            </h1>
            <p class="search-results-hero__providers-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                </svg>
                Títulos com disponibilidade confirmada em plataformas de streaming
            </p>
        </div>
        <div class="search-results-hero__meta">
            <div class="result-counter">
                <span class="result-counter__number" data-result-count>0</span>
                <span class="result-counter__label">resultados</span>
            </div>
        </div>
    </header>

    <!-- Mobile Search Bar -->
    <div class="mobile-search-bar" data-mobile-search-bar>
        <div class="mobile-search-bar__container">
            <form class="mobile-search-form" data-mobile-search-form>
                <div class="mobile-search-field">
                    <svg class="mobile-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="search" 
                        class="mobile-search-input" 
                        data-mobile-search-input
                        placeholder="Pesquisar filmes e séries..."
                        value="<?php echo htmlspecialchars($query, ENT_QUOTES, 'UTF-8'); ?>"
                        autocomplete="off"
                    />
                    <button type="button" class="mobile-search-clear" data-mobile-search-clear hidden aria-label="Limpar pesquisa">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <button type="button" class="mobile-filters-toggle" data-mobile-filters-toggle aria-label="Abrir filtros">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span class="mobile-filters-badge" data-mobile-filters-badge hidden></span>
                </button>
            </form>
            <div class="mobile-search-results-count">
                <span data-mobile-result-count>0</span> resultados
            </div>
        </div>
    </div>

    <div class="search-results-layout">
        <aside class="search-filters" data-search-filters aria-label="Filtros da pesquisa">
            <div class="filters-header">
                <h2 class="filters-header__title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    Filtros
                </h2>
                <button type="button" class="filters-reset" data-reset-filters aria-label="Limpar filtros aplicados">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                    </svg>
                    Limpar filtros
                    <span class="filters-reset__count" data-active-filters-count hidden aria-live="polite">0</span>
                </button>
            </div>

            <section class="search-filter-section" data-filter-section>
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="true" aria-controls="filter-panel-type" role="heading" aria-level="3">
                    <span class="search-filter-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                            <polyline points="17 2 12 7 7 2"></polyline>
                        </svg>
                        Tipo de conteúdo
                    </span>
                    <span class="filter-counter" data-filter-counter="type">1</span>
                </button>
                <div class="search-filter-content" id="filter-panel-type" data-filter-content>
                    <div class="search-filter-chips" role="group" aria-label="Filtrar por tipo de mídia">
                        <button type="button" class="search-chip is-active" data-media-filter="both" data-default-active>
                            <span class="chip-icon">🎬</span>
                            Filmes &amp; séries
                        </button>
                        <button type="button" class="search-chip" data-media-filter="movie">
                            <span class="chip-icon">🎥</span>
                            Filmes
                        </button>
                        <button type="button" class="search-chip" data-media-filter="tv">
                            <span class="chip-icon">📺</span>
                            Séries
                        </button>
                    </div>
                </div>
            </section>
            <section class="search-filter-section is-collapsed" data-filter-section>
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-panel-genre" role="heading" aria-level="3">
                    <span class="search-filter-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m16 6 4 14"></path>
                            <path d="M12 6v14"></path>
                            <path d="M8 8v12"></path>
                            <path d="M4 4v16"></path>
                        </svg>
                        G&#234;nero
                    </span>
                    <span class="filter-counter" data-filter-counter="genre">0</span>
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
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-panel-release" role="heading" aria-level="3">
                    <span class="search-filter-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Lan&#231;amento
                    </span>
                    <span class="filter-counter" data-filter-counter="release">1</span>
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
                <button type="button" class="search-filter-toggle" data-filter-toggle aria-expanded="false" aria-controls="filter-panel-sort" role="heading" aria-level="3">
                    <span class="search-filter-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m3 16 4 4 4-4"></path>
                            <path d="M7 20V4"></path>
                            <path d="m21 8-4-4-4 4"></path>
                            <path d="M17 4v16"></path>
                        </svg>
                        Ordenar por
                    </span>
                    <span class="filter-counter" data-filter-counter="sort">1</span>
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
            
            <!-- Quick Search Suggestions -->
            <div class="quick-suggestions">
                <h3 class="quick-suggestions__title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path>
                    </svg>
                    Sugestões populares
                </h3>
                <div class="quick-suggestions__list">
                    <a href="?q=stranger+things" class="suggestion-tag">Stranger Things</a>
                    <a href="?q=dune" class="suggestion-tag">Dune</a>
                    <a href="?q=breaking+bad" class="suggestion-tag">Breaking Bad</a>
                    <a href="?q=avatar" class="suggestion-tag">Avatar</a>
                    <a href="?q=one+piece" class="suggestion-tag">One Piece</a>
                </div>
            </div>
        </aside>

        <section class="search-results" aria-live="polite" aria-busy="false">
            <!-- Loading State -->
            <div class="search-loading" data-search-loading hidden>
                <div class="loading-spinner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                </div>
                <p>Buscando títulos...</p>
            </div>

            <!-- Results Grid -->
            <div class="search-results__grid" data-search-results></div>

            <!-- Empty State -->
            <div class="search-results__empty" data-search-empty hidden>
                <div class="empty-state">
                    <div class="empty-state__icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </div>
                    <h2 class="empty-state__title">Nenhum resultado encontrado</h2>
                    <p class="empty-state__message">Não encontramos títulos que correspondam à sua busca.</p>
                    <div class="empty-state__suggestions">
                        <p class="suggestions-title">Tente:</p>
                        <ul class="suggestions-list">
                            <li>Verificar a ortografia das palavras</li>
                            <li>Usar termos mais genéricos</li>
                            <li>Remover alguns filtros</li>
                            <li>Buscar por um ator ou diretor</li>
                        </ul>
                    </div>
                    <button type="button" class="empty-state__action" onclick="window.location.href='index.php'">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        </svg>
                        Voltar ao início
                    </button>
                </div>
            </div>
        </section>
    </div>
</main>

<script>
    window.__INITIAL_SEARCH_QUERY__ = <?php echo $queryForScript; ?>;
</script>
<script src="js/script.js"></script>
<script type="module" src="js/search.js"></script>
<script type="module" src="js/search-results.js"></script>
</body>
</html>






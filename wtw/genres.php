<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <meta name="description" content="Descubra filmes e séries por categorias semelhantes e refine sua busca com filtros avançados.">
    <title>Categorias em destaque | WhereYouWatch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/providers.css">
    <link rel="stylesheet" href="css/genres.css">
</head>
<body class="genre-catalog-page has-fixed-header">
<?php include_once('dashboard.php'); ?>

<main class="providers-shell genre-shell" data-genres-root>
    <section class="genres-hero">
        <div class="genres-hero__content">
            <span class="genres-hero__tag">Explore por categorias</span>
            <h1 class="genres-hero__title" id="genreHeroTitle">Filmes e séries por categoria</h1>
            <p class="genres-hero__subtitle" id="genreHeroSubtitle">
                Selecione categorias, explore gêneros e temas e descubra títulos que combinam com o seu momento.
            </p>
        </div>
        <div class="genre-hero__selected" id="genreHeroSelected" role="group" aria-label="Categorias e sugestões"></div>
        <div class="genres-hero__glow" aria-hidden="true"></div>
    </section>

    <section class="providers-toolbar" aria-labelledby="genresFiltersTitle">
        <h2 id="genresFiltersTitle" class="sr-only">Filtros do catálogo por categorias</h2>
        <div class="filters-inline">
            <fieldset class="filter-chip-group" data-filter-media>
                <legend class="filter-chip-group__legend">Filtros</legend>
                <button type="button" class="filter-chip is-active" data-media-filter="both">Filmes e séries</button>
                <button type="button" class="filter-chip" data-media-filter="movie">Filmes</button>
                <button type="button" class="filter-chip" data-media-filter="tv">Séries</button>
            </fieldset>

            <div class="filter-dropdown" data-filter-dropdown="year">
                <button type="button" class="filter-dropdown__trigger" data-filter-trigger="year" data-default-label="Ano" aria-haspopup="true" aria-expanded="false">
                    <span class="filter-dropdown__label">Ano</span>
                    <span class="filter-dropdown__value" data-filter-trigger-value="year">Todos</span>
                    <span class="filter-dropdown__icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 6 8 10 12 6"></polyline>
                        </svg>
                    </span>
                </button>
                <div class="filter-dropdown__menu" data-filter-menu="year" role="menu" aria-label="Filtrar por ano">
                    <div class="filter-dropdown__header">
                        <span class="filter-dropdown__title">Anos</span>
                        <button type="button" class="filter-dropdown__reset" data-filter-reset="year">Reinicializar</button>
                    </div>
                    <div class="filter-dropdown__options filter-dropdown__options--list" data-filter-options="year"></div>
                </div>
            </div>

            <div class="filter-dropdown" data-filter-dropdown="sort">
                <button type="button" class="filter-dropdown__trigger" data-filter-trigger="sort" data-default-label="Ordenar" aria-haspopup="true" aria-expanded="false">
                    <span class="filter-dropdown__label">Ordenar</span>
                    <span class="filter-dropdown__value" data-filter-trigger-value="sort">Popularidade</span>
                    <span class="filter-dropdown__icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 6 8 10 12 6"></polyline>
                        </svg>
                    </span>
                </button>
                <div class="filter-dropdown__menu" data-filter-menu="sort" role="menu" aria-label="Ordenar resultados">
                    <div class="filter-dropdown__header">
                        <span class="filter-dropdown__title">Ordenar por</span>
                        <button type="button" class="filter-dropdown__reset" data-filter-reset="sort" disabled>Padrão</button>
                    </div>
                    <div class="filter-dropdown__options filter-dropdown__options--list" data-filter-options="sort"></div>
                </div>
            </div>
        </div>
    </section>

    <section class="providers-results genre-results" aria-labelledby="genreResultsTitle">
        <div class="providers-results__header">
            <div>
                <h2 class="providers-results__title" id="genreResultsTitle">Destaques da categoria</h2>
                <p class="providers-results__caption" id="genreResultsCaption">Selecione uma categoria para começar.</p>
            </div>
            <div class="providers-results__meta">
                <span class="providers-results__status" id="genreResultsStatus" hidden aria-live="polite"></span>
                <span class="providers-results__count" id="genreResultsCount"></span>
            </div>
        </div>
        <div class="providers-empty" id="genreEmptyState" hidden>
            <div class="providers-empty__card">
                <h3>Nenhuma categoria selecionada</h3>
                <p>Escolha pelo menos uma categoria para ver filmes e séries relacionados.</p>
            </div>
        </div>
        <div class="providers-grid" id="genreResultsGrid"></div>
    </section>
</main>

<script src="js/script.js"></script>
<script src="js/genres.js"></script>
<script src="js/search.js"></script>
</body>
</html>

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
    <meta name="description" content="Combine provedores de streaming e descubra os filmes mais populares disponiveis para voce.">
    <title>Filmes em alta por provedor | WhereYouWatch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/providers.css">
</head>
<body class="provider-catalog-page has-fixed-header">
<?php include_once('dashboard.php'); ?>

<main class="providers-shell" data-providers-root>
    <section class="providers-hero">
        <div class="providers-hero__content">
            <span class="providers-hero__tag">Catalogo personalizado</span>
            <h1 class="providers-hero__title">Filmes e series em alta por provedor</h1>
            <p class="providers-hero__subtitle" id="providersHeroSubtitle">
                Combine provedores, escolha filtros e descubra os conteudos mais populares que estao disponiveis para voce.
            </p>
        </div>
        <div class="providers-hero__rail-surface">
            <div class="providers-hero__rail" id="providersRail" aria-label="Selecione provedores para montar seu catalogo"></div>
        </div>
        <div class="providers-hero__glow" aria-hidden="true"></div>
    </section>

    <section class="providers-toolbar" aria-labelledby="providersFiltersTitle">
        <h2 id="providersFiltersTitle" class="sr-only">Filtros do catalogo</h2>
        <div class="filters-inline">
            <fieldset class="filter-chip-group" data-filter-media>
                <legend class="filter-chip-group__legend">Filtros</legend>
                <button type="button" class="filter-chip is-active" data-media-filter="both">Filmes e series</button>
                <button type="button" class="filter-chip" data-media-filter="movie">Filmes</button>
                <button type="button" class="filter-chip" data-media-filter="tv">Series</button>
            </fieldset>

            <div class="filter-dropdown" data-filter-dropdown="genre">
                <button type="button" class="filter-dropdown__trigger" data-filter-trigger="genre" data-default-label="Genero" aria-haspopup="true" aria-expanded="false">
                    <span class="filter-dropdown__label">Genero</span>
                    <span class="filter-dropdown__value" data-filter-trigger-value="genre">Todos</span>
                    <span class="filter-dropdown__icon" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 6 8 10 12 6"></polyline>
                        </svg>
                    </span>
                </button>
                <div class="filter-dropdown__menu" data-filter-menu="genre" role="menu" aria-label="Filtrar por genero">
                    <div class="filter-dropdown__header">
                        <span class="filter-dropdown__title">Generos</span>
                        <button type="button" class="filter-dropdown__reset" data-filter-reset="genre">Reinicializar</button>
                    </div>
                    <div class="filter-dropdown__options filter-dropdown__options--grid" data-filter-options="genre"></div>
                </div>
            </div>

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
                        <button type="button" class="filter-dropdown__reset" data-filter-reset="sort" disabled>Padrao</button>
                    </div>
                    <div class="filter-dropdown__options filter-dropdown__options--list" data-filter-options="sort"></div>
                </div>
            </div>
        </div>
    </section>

    <section class="providers-results" aria-labelledby="providersResultsTitle">
        <div class="providers-results__header">
            <div>
                <h2 class="providers-results__title" id="providersResultsTitle">Destaques em alta</h2>
                <p class="providers-results__caption" id="providersResultsCaption">Descubra os titulos em alta nos provedores escolhidos. Sem selecao, exibimos destaques de todos os provedores.</p>
            </div>
            <span class="providers-results__count" id="providersResultsCount"></span>
        </div>
        <div class="providers-empty" id="providersEmptyState" hidden>
            <div class="providers-empty__card">
                <h3>Selecione um provedor</h3>
                <p>Toque em um dos provedores acima para montar seu catalogo personalizado.</p>
            </div>
        </div>
        <div class="providers-grid" id="providersGrid"></div>
    </section>
</main>

<div class="providers-loading" id="providersLoading" hidden aria-live="assertive" aria-busy="true">
    <div class="providers-loading__spinner"></div>
    <p>Carregando filmes em alta...</p>
</div>

<script src="js/script.js"></script>
<script src="js/search.js"></script>
<script src="js/providers.js"></script>
</body>
</html>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/movie.css">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <title id="title-movie"></title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
</head>
<body class="has-fixed-header">

    <?php include_once('dashboard.php'); ?>

    <main class="interface-section movie-page">
        <div class="page-shell is-loading">
            <div id="movieSkeleton" class="movie-skeleton" aria-hidden="true">
                <section class="movie-skeleton__hero">
                    <span class="movie-skeleton__hero-backdrop" aria-hidden="true"></span>
                    <div class="movie-skeleton__hero-grid">
                        <div class="movie-skeleton__poster-column">
                            <span class="skeleton-block movie-skeleton__poster"></span>
                            <div class="movie-skeleton__provider-chips">
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                            </div>
                        </div>
                        <div class="movie-skeleton__hero-body">
                            <div class="movie-skeleton__title-group">
                                <span class="skeleton-block skeleton-line movie-skeleton__title"></span>
                                <span class="skeleton-block skeleton-line movie-skeleton__subtitle"></span>
                            </div>
                            <div class="movie-skeleton__meta-chips">
                                <span class="skeleton-block skeleton-chip"></span>
                                <span class="skeleton-block skeleton-chip"></span>
                                <span class="skeleton-block skeleton-chip"></span>
                                <span class="skeleton-block skeleton-chip"></span>
                            </div>
                            <div class="movie-skeleton__overview">
                                <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                                <span class="skeleton-block skeleton-line skeleton-line--md"></span>
                                <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                                <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
                            </div>
                            <div class="movie-skeleton__tag-cloud">
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                            </div>
                            <div class="movie-skeleton__actions">
                                <span class="skeleton-block skeleton-button skeleton-button--primary"></span>
                                <span class="skeleton-block skeleton-button"></span>
                            </div>
                            <div class="movie-skeleton__highlight-grid">
                                <span class="skeleton-block movie-skeleton__highlight-card"></span>
                                <span class="skeleton-block movie-skeleton__highlight-card"></span>
                                <span class="skeleton-block movie-skeleton__highlight-card"></span>
                            </div>
                            <div class="movie-skeleton__crew">
                                <span class="skeleton-block skeleton-line skeleton-line--md"></span>
                                <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                                <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="movie-skeleton__section movie-skeleton__section--providers">
                    <div class="movie-skeleton__section-heading">
                        <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                    </div>
                    <div class="movie-skeleton__providers-grid">
                        <div class="movie-skeleton__providers-column">
                            <span class="skeleton-block skeleton-line skeleton-line--md movie-skeleton__section-title"></span>
                            <div class="movie-skeleton__pill-group">
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                            </div>
                        </div>
                        <div class="movie-skeleton__providers-column">
                            <span class="skeleton-block skeleton-line skeleton-line--md movie-skeleton__section-title"></span>
                            <div class="movie-skeleton__pill-group">
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                            </div>
                        </div>
                        <div class="movie-skeleton__providers-column">
                            <span class="skeleton-block skeleton-line skeleton-line--md movie-skeleton__section-title"></span>
                            <div class="movie-skeleton__pill-group">
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                                <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="movie-skeleton__section movie-skeleton__section--seasons">
                    <div class="movie-skeleton__section-heading">
                        <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                    </div>
                    <div class="movie-skeleton__carousel movie-skeleton__carousel--seasons">
                        <span class="skeleton-block movie-skeleton__nav-pill"></span>
                        <div class="movie-skeleton__carousel-track">
                            <span class="skeleton-block movie-skeleton__season-card"></span>
                            <span class="skeleton-block movie-skeleton__season-card"></span>
                            <span class="skeleton-block movie-skeleton__season-card"></span>
                            <span class="skeleton-block movie-skeleton__season-card"></span>
                            <span class="skeleton-block movie-skeleton__season-card"></span>
                        </div>
                        <span class="skeleton-block movie-skeleton__nav-pill"></span>
                    </div>
                </section>

                <section class="movie-skeleton__section movie-skeleton__section--cast">
                    <div class="movie-skeleton__section-heading">
                        <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                    </div>
                    <div class="movie-skeleton__cast-grid">
                        <div class="movie-skeleton__cast-card">
                            <span class="skeleton-block movie-skeleton__cast-avatar"></span>
                            <span class="skeleton-block skeleton-line movie-skeleton__cast-name"></span>
                            <span class="skeleton-block skeleton-line skeleton-line--xs movie-skeleton__cast-role"></span>
                        </div>
                        <div class="movie-skeleton__cast-card">
                            <span class="skeleton-block movie-skeleton__cast-avatar"></span>
                            <span class="skeleton-block skeleton-line movie-skeleton__cast-name"></span>
                            <span class="skeleton-block skeleton-line skeleton-line--xs movie-skeleton__cast-role"></span>
                        </div>
                        <div class="movie-skeleton__cast-card">
                            <span class="skeleton-block movie-skeleton__cast-avatar"></span>
                            <span class="skeleton-block skeleton-line movie-skeleton__cast-name"></span>
                            <span class="skeleton-block skeleton-line skeleton-line--xs movie-skeleton__cast-role"></span>
                        </div>
                        <div class="movie-skeleton__cast-card">
                            <span class="skeleton-block movie-skeleton__cast-avatar"></span>
                            <span class="skeleton-block skeleton-line movie-skeleton__cast-name"></span>
                            <span class="skeleton-block skeleton-line skeleton-line--xs movie-skeleton__cast-role"></span>
                        </div>
                        <div class="movie-skeleton__cast-card">
                            <span class="skeleton-block movie-skeleton__cast-avatar"></span>
                            <span class="skeleton-block skeleton-line movie-skeleton__cast-name"></span>
                            <span class="skeleton-block skeleton-line skeleton-line--xs movie-skeleton__cast-role"></span>
                        </div>
                        <div class="movie-skeleton__cast-card">
                            <span class="skeleton-block movie-skeleton__cast-avatar"></span>
                            <span class="skeleton-block skeleton-line movie-skeleton__cast-name"></span>
                            <span class="skeleton-block skeleton-line skeleton-line--xs movie-skeleton__cast-role"></span>
                        </div>
                    </div>
                </section>

                <section class="movie-skeleton__section movie-skeleton__section--gallery">
                    <div class="movie-skeleton__section-heading">
                        <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                    </div>
                    <div class="movie-skeleton__gallery-grid">
                        <span class="skeleton-block movie-skeleton__gallery-card"></span>
                        <span class="skeleton-block movie-skeleton__gallery-card"></span>
                        <span class="skeleton-block movie-skeleton__gallery-card"></span>
                        <span class="skeleton-block movie-skeleton__gallery-card"></span>
                    </div>
                </section>
            </div>

            <div id="movieContent" class="movie-content" aria-live="polite" aria-hidden="true">
            <dialog id="dialog" class="dialog">
                <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
                <button id="close-trailer" type="button" aria-label="Fechar trailer" data-dialog-initial-focus>X</button>
            </dialog>

            <section class="movie-hero">
                <div class="hero-backdrop">
                    <img id="backdropImage" src="" alt="Imagem de fundo">
                    <div class="hero-backdrop__gradient"></div>
                </div>
                <div class="hero-content">
                    <div class="hero-poster-column">
                        <div class="poster-frame">
                            <img id="itemPoster" class="hero-poster" src="" alt="Poster do título">
                        </div>
                        <div id="providerBadges" class="provider-badges"></div>
                    </div>
                    <div class="hero-text-column">
                        <div class="hero-heading">
                            <h1 id="itemName" class="hero-title"></h1>
                        </div>
                        <div class="hero-meta">
                            <span id="certificationBadge" class="meta-chip"></span>
                            <span id="release-date" class="meta-chip"></span>
                            <span id="runtime" class="meta-chip"></span>
                            <span id="mediaTypeBadge" class="meta-chip"></span>
                        </div>
                        <p id="movieOverview" class="hero-overview"></p>
                        <div id="tagList" class="tag-list"></div>
                        <div class="hero-actions">
                            <a id="trailerLink" class="action-btn action-btn--primary" href="#">▶ Ver trailer</a>
                            <a id="providersCta" class="action-btn action-btn--glass" href="#providersSection">🍿 Onde assistir</a>
                        </div>
                        <div class="hero-highlights">
                            <div class="highlight-card">
                                <span class="highlight-label">Pontuação TMDB</span>
                                <span id="highlightScore" class="highlight-value">—</span>
                            </div>
                            <div class="highlight-card">
                                <span class="highlight-label">Popularidade</span>
                                <span id="highlightPopularity" class="highlight-value">—</span>
                            </div>
                            <div class="highlight-card">
                                <span class="highlight-label">Votos</span>
                                <span id="highlightVotes" class="highlight-value">—</span>
                            </div>
                        </div>
                        <div class="hero-crew" id="crewList"></div>
                    </div>
                </div>
            </section>

            <section class="providers-section card-section" id="providersSection">
                  <span class="liquid-sheen" aria-hidden="true"></span>
                <div class="section-heading">
                    <h2>Onde assistir</h2>
                    <p class="section-subtitle">Provedores disponíveis no Brasil</p>
                </div>
                <div class="providers-grid">
                    <article class="provider-column" id="streamingColumn">
                        <h3>Streaming</h3>
                        <div id="streamingProviders" class="provider-pills"></div>
                    </article>
                    <article class="provider-column" id="rentalColumn">
                        <h3>Aluguel</h3>
                        <div id="rentalProviders" class="provider-pills"></div>
                    </article>
                    <article class="provider-column" id="buyColumn">
                        <h3>Compra</h3>
                        <div id="buyProviders" class="provider-pills"></div>
                    </article>
                </div>
            </section>

            <section class="seasons-section card-section is-hidden" id="seasonSection">
                <div class="section-heading">
                    <h2>Temporadas</h2>
                    <p class="section-subtitle">Explore cada capítulo da série</p>
                </div>
                <div class="carousel-container seasons-carousel">
                    <button class="nav-arrow slider-prev" data-target="seasons-container">&#10094;</button>
                    <div id="seasons-container" class="season-list"></div>
                    <button class="nav-arrow slider-next" data-target="seasons-container">&#10095;</button>
                </div>
            </section>

            <section class="cast-section card-section">
                <div class="section-heading">
                    <h2>Elenco</h2>
                    <p class="section-subtitle">Principais talentos diante das câmeras</p>
                </div>
                <div class="carousel-container">
                    <button class="nav-arrow slider-prev" data-target="cast-list">&#10094;</button>
                    <div id="cast-list" class="cast-list"></div>
                    <button class="nav-arrow slider-next" data-target="cast-list">&#10095;</button>
                </div>
            </section>

            <section class="gallery-section card-section is-hidden" id="gallerySection">
                <div class="section-heading">
                    <h2>Galeria</h2>
                    <p class="section-subtitle">Backdrops e fotos oficiais</p>
                </div>
                <div class="carousel-container">
                    <button class="nav-arrow slider-prev" data-target="gallery-track">&#10094;</button>
                    <div id="gallery-track" class="gallery-track"></div>
                    <button class="nav-arrow slider-next" data-target="gallery-track">&#10095;</button>
                </div>
            </section>

            <dialog id="seasonDialog" class="season-dialog">
                <div class="season-dialog__content">
                    <button type="button" id="closeSeasonDialog" class="season-dialog__close" aria-label="Fechar modal">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <header class="season-dialog__header">
                        <span id="seasonDialogBadge" class="season-dialog__badge"></span>
                        <h3 class="season-dialog__title">Em qual streaming deseja assistir?</h3>
                        <p class="season-dialog__subtitle">Escolha uma plataforma disponível para o Brasil</p>
                    </header>
                    <section class="season-dialog__body">
                        <div class="season-dialog__meta">
                            <p id="seasonDialogMeta"></p>
                            <p id="seasonDialogOverview" class="season-dialog__overview"></p>
                        </div>
                        <div class="season-dialog__providers" id="seasonStreamingList"></div>
                        <p id="seasonStreamingEmpty" class="season-dialog__empty is-hidden">Nenhum streaming disponível para esta temporada no momento.</p>
                    </section>
                </div>
            </dialog>

            <dialog id="actorDialog" class="actor-dialog">
                <div id="actorContent" class="modal-class">
                    <div class="poster-actor">
                        <img src="" alt="Poster Ator" id="actorPoster" class="profileImg">
                        <div class="actor-meta">
                            <h2 id="actorName"></h2>
                            <p id="actorOverview" class="bio"></p>
                            <button id="closeItem" class="btn btn-danger">Fechar</button>
                        </div>
                    </div>
                </div>
                <div class="overlay-modal"></div>
            </dialog>
        </div>
        </div>
    </main>

    <script src="js/filme.js"></script>
    <script src="js/script.js"></script>
    <script src="js/search.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.2/color-thief.umd.js"></script>
</body>
</html>

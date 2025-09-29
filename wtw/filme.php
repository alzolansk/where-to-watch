<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        <div class="page-shell">
            <dialog id="dialog" class="dialog">
                <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                <button id="close-trailer" onclick="closeTrailer()">X</button>
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
                            <img id="movieLogo" class="hero-logo" src="" alt="Logo do título">
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
                            <a id="homepageCta" class="action-btn action-btn--ghost" href="#">Site oficial</a>
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
    </main>

    <script src="js/filme.js"></script>
    <script src="js/script.js"></script>
    <script src="js/search.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.2/color-thief.umd.js"></script>
</body>
</html>

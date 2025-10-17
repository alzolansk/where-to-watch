<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/onboarding.css">
    <!--<link rel="stylesheet" href="css/searchmovie.css">-->
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">

    <title>where you watch</title>

</head>

<body>    

    <?php
        include_once('dashboard.php');
        include_once('config/config.php');

        $genreOptions = [
            ['id' => 28, 'label' => 'Ação'],
            ['id' => 16, 'label' => 'Animação'],
            ['id' => 12, 'label' => 'Aventura'],
            ['id' => 35, 'label' => 'Comédia'],
            ['id' => 80, 'label' => 'Crime'],
            ['id' => 99, 'label' => 'Documentário'],
            ['id' => 18, 'label' => 'Drama'],
            ['id' => 10751, 'label' => 'Família'],
            ['id' => 14, 'label' => 'Fantasia'],
            ['id' => 878, 'label' => 'Ficção científica'],
            ['id' => 9648, 'label' => 'Mistério'],
            ['id' => 10749, 'label' => 'Romance'],
            ['id' => 53, 'label' => 'Suspense'],
            ['id' => 27, 'label' => 'Terror'],
        ];

        $keywordOptions = [
            ['id' => 1308, 'label' => 'baseado em fatos reais'],
            ['id' => 13088, 'label' => 'distopia'],
            ['id' => 9715, 'label' => 'super-herói'],
            ['id' => 9672, 'label' => 'viagem no tempo'],
            ['id' => 9713, 'label' => 'amizade'],
            ['id' => 14703, 'label' => 'golpe planejado'],
            ['id' => 210024, 'label' => 'multiverso'],
            ['id' => 1568, 'label' => 'vingança'],
            ['id' => 13190, 'label' => 'comédia romântica'],
            ['id' => 258, 'label' => 'magia'],
            ['id' => 679, 'label' => 'investigação'],
            ['id' => 10183, 'label' => 'road trip'],
            ['id' => 9717, 'label' => 'amizade improvável'],
            ['id' => 627, 'label' => 'jornada do herói'],
            ['id' => 1552, 'label' => 'ficção científica'],
        ];

        $providerOptions = [
            ['id' => 8, 'label' => 'Netflix', 'logo' => 'https://image.tmdb.org/t/p/w154/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg'],
            ['id' => 119, 'label' => 'Prime Video', 'logo' => 'https://image.tmdb.org/t/p/w154/68MNrwlkpF7WnmNPXLah69CR5cb.jpg'],
            ['id' => 337, 'label' => 'Disney+', 'logo' => 'https://image.tmdb.org/t/p/w154/97yvRBw1GzX7fXprcF80er19ot.jpg'],
            ['id' => 1899, 'label' => 'HBO Max', 'logo' => 'https://image.tmdb.org/t/p/w154/jbe4gVSfRlbPTdESXhEKpornsfu.jpg'],
            ['id' => 350, 'label' => 'Apple TV+', 'logo' => 'https://image.tmdb.org/t/p/w154/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg'],
        ];

        $onboardingRequired = !empty($_SESSION['onboarding_pending']);
    ?>

    <div class="onboarding-backdrop" data-onboarding-backdrop <?php echo $onboardingRequired ? '' : 'hidden'; ?> aria-hidden="<?php echo $onboardingRequired ? 'false' : 'true'; ?>">
        <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle" data-onboarding-modal>
            <div class="onboarding-header">
                <h2 class="onboarding-title" id="onboardingTitle">Personalize sua experiência</h2>
                <p class="onboarding-subtitle">Selecione os gêneros, provedores e filmes que têm a ver com você.</p>
            </div>

            <div class="onboarding-steps" data-onboarding-steps>
                <section class="onboarding-step" data-onboarding-step="genres" aria-label="Escolha seus gêneros e temas favoritos">
                    <header class="onboarding-step__header">
                        <h3>Gêneros e palavras-chave</h3>
                        <p>Escolha os estilos de filmes que você mais gosta e alguns temas que sempre te interessam.</p>
                    </header>
                    <div class="onboarding-section">
                        <h4 class="onboarding-section__title">Gêneros favoritos</h4>
                        <div class="onboarding-chip-grid" data-onboarding-genres>
                            <?php foreach ($genreOptions as $genre): ?>
                                <button type="button" class="onboarding-chip" data-genre-id="<?php echo (int) $genre['id']; ?>">
                                    <?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?>
                                </button>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <div class="onboarding-section">
                        <h4 class="onboarding-section__title">Palavras-chave preferidas</h4>
                        <div class="onboarding-chip-grid" data-onboarding-keywords>
                            <?php foreach ($keywordOptions as $keyword): ?>
                                <button type="button" class="onboarding-chip" data-keyword-id="<?php echo (int) $keyword['id']; ?>" data-keyword-label="<?php echo htmlspecialchars($keyword['label'], ENT_QUOTES, 'UTF-8'); ?>">
                                    <?php echo htmlspecialchars($keyword['label'], ENT_QUOTES, 'UTF-8'); ?>
                                </button>
                            <?php endforeach; ?>
                        </div>
                        <form class="onboarding-keyword-form" data-onboarding-keyword-form>
                            <label for="onboardingKeywordInput" class="sr-only">Adicionar palavra-chave</label>
                            <input type="text" id="onboardingKeywordInput" class="onboarding-input" placeholder="Digite outra palavra-chave" data-onboarding-keyword-input>
                            <button type="submit" class="onboarding-button onboarding-button--inline onboarding-button--primary" data-onboarding-keyword-add>Adicionar</button>
                        </form>
                    </div>
                </section>

                <section class="onboarding-step" data-onboarding-step="providers" aria-label="Selecione os provedores disponíveis para você" hidden>
                    <header class="onboarding-step__header">
                        <h3>Quais provedores você assina?</h3>
                        <p>Conte para a gente onde você pode assistir. Assim mostramos resultados que fazem sentido para você.</p>
                    </header>
                    <div class="onboarding-grid onboarding-grid--providers" data-onboarding-providers>
                        <?php foreach ($providerOptions as $provider): ?>
                            <button type="button" class="onboarding-card onboarding-card--provider" data-provider-id="<?php echo (int) $provider['id']; ?>">
                                <span class="onboarding-card__media" aria-hidden="true">
                                    <img src="<?php echo htmlspecialchars($provider['logo'], ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                </span>
                                <span class="onboarding-card__label"><?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </section>

                <section class="onboarding-step" data-onboarding-step="favorites" aria-label="Escolha seus filmes favoritos" hidden>
                    <header class="onboarding-step__header">
                        <h3>Filmes que são a sua cara</h3>
                        <p>Selecione alguns títulos que você ama. Usaremos essas referências para encontrar recomendações melhores.</p>
                    </header>
                    <div class="onboarding-section onboarding-section--search">
                        <div class="onboarding-search" data-onboarding-favorites-search-wrapper>
                            <label for="onboardingFavoriteSearch" class="sr-only">Buscar filmes</label>
                            <input type="search" id="onboardingFavoriteSearch" class="onboarding-input" placeholder="Busque por filmes que você ama" data-onboarding-favorites-search>
                            <button type="button" class="onboarding-button onboarding-button--inline onboarding-button--primary" data-onboarding-favorites-refresh>Buscar</button>
                        </div>
                        <p class="onboarding-helper-text">Mostramos opções populares automaticamente. Busque para encontrar qualquer título disponível na API.</p>
                        <div class="onboarding-grid onboarding-grid--favorites" data-onboarding-favorites></div>
                        <p class="onboarding-helper-text" data-onboarding-favorites-empty hidden>Nenhum título encontrado. Tente outra busca.</p>
                        <p class="onboarding-helper-text" data-onboarding-favorites-loading hidden>Carregando opções…</p>
                    </div>
                </section>
            </div>

            <footer class="onboarding-footer">
                <button type="button" class="onboarding-button onboarding-button--ghost" data-onboarding-action="back" disabled>Voltar</button>
                <div class="onboarding-progress" role="group" aria-label="Progresso">
                    <span class="onboarding-progress__dot is-active" data-onboarding-progress-step="0"></span>
                    <span class="onboarding-progress__dot" data-onboarding-progress-step="1"></span>
                    <span class="onboarding-progress__dot" data-onboarding-progress-step="2"></span>
                </div>
                <button type="button" class="onboarding-button onboarding-button--ghost" data-onboarding-action="skip">Pular por enquanto</button>
                <button type="button" class="onboarding-button onboarding-button--primary" data-onboarding-action="next">Continuar</button>
                <button type="button" class="onboarding-button onboarding-button--primary onboarding-button--finish" data-onboarding-action="finish" hidden>Concluir</button>
                <p class="onboarding-error" data-onboarding-error hidden></p>
            </footer>
        </div>
    </div>

    <section id="interface" class="interface-section">

        <!-- Modal para o trailer -->
        <dialog id="dialog" class="dialog">
            <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            <button id="close-trailer" onclick="closeTrailer()">X</button>
        </dialog>

        <div id="surprise-me" class="wrap" tabindex="-1">
            <button id="btnLeft" class="prev" onclick="scrollLeftCustom()">&#10094;</button>
            <div id="container-wrap">
            <!--Primeiro container com trailer e backdrop-->
            </div>
            <button id="btnRight" class="next" onclick="scrollRight()">&#10095;</button>
        </div>

        <div class="hero-progress" data-hero-progress hidden>
            <div class="hero-progress__track" data-hero-progress-track></div>
            <span class="sr-only" data-hero-progress-label aria-live="polite" role="status"></span>
        </div>

        <div class="provider-btn-container">
            <div class="provider-btn-div" data-provider-picker data-catalog-url="providers.php">
                <button type="button" class="provider-btn" data-provider-id="337" data-provider-name="Disney+" aria-label="Disney+">
                    <img src="https://image.tmdb.org/t/p/w300/97yvRBw1GzX7fXprcF80er19ot.jpg" alt="Disney+">
                </button>
                <button type="button" class="provider-btn" data-provider-id="8" data-provider-name="Netflix" aria-label="Netflix">
                    <img src="https://image.tmdb.org/t/p/w300/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" alt="Netflix">
                </button>
                <button type="button" class="provider-btn" data-provider-id="119" data-provider-name="Prime Video" aria-label="Prime Video">
                    <img src="https://image.tmdb.org/t/p/w92/68MNrwlkpF7WnmNPXLah69CR5cb.jpg" alt="Prime Video">
                </button>
                <button type="button" class="provider-btn" data-provider-id="350" data-provider-name="Apple TV+" aria-label="Apple TV+">
                    <img src="https://image.tmdb.org/t/p/w300/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg" alt="Apple TV+">
                </button>
                <button type="button" class="provider-btn" data-provider-id="1899" data-provider-name="HBO Max" aria-label="HBO Max">
                    <img src="https://image.tmdb.org/t/p/w300/jbe4gVSfRlbPTdESXhEKpornsfu.jpg" alt="HBO Max">
                </button>
            </div>
        </div>

        <div class="category-buttons">
            <div class="style-buttons">
                <button id="showMovies" class="btn-category active">Filmes</button>
                <button id="showSeries" class="btn-category">S&eacute;rie</button>
            </div>
        </div>
        <div class="media-section">
            <div class="container">
                <div id="media-sections-root" class="media-sections-root" data-section-root></div>
            </div>
            <footer>
                <p class="justwatch-attr">
                    Dados de provedores fornecidos por 
                    <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">JustWatch</a>
                </p>
            </footer>
        </div> <!-- end media-section -->

    </section>
    <script>
        window.wtwOnboarding = <?php echo json_encode([
            'required' => $onboardingRequired,
            'apiUrl' => 'api/onboarding.php',
            'titlesEndpoint' => 'api/onboarding.php?resource=titles',
            'tmdbImageBase' => 'https://image.tmdb.org/t/p',
            'options' => [
                'genres' => $genreOptions,
                'keywords' => $keywordOptions,
                'providers' => $providerOptions,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="js/onboarding.js"></script>
    <script src="js/container.js"></script>
    <script src="js/script.js"></script>
    <script src="js/search.js"></script>
</body>

</html>




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
        // carrega bootstrap
        $__candidateRoot = is_file(__DIR__ . '/../config/bootstrap.php') ? dirname(__DIR__) : __DIR__;
        require_once $__candidateRoot . '/config/bootstrap.php';
        
        include_once(__DIR__ . '/dashboard.php');
        require_once $__candidateRoot . '/config/config.php';
        require_once $__candidateRoot . '/includes/personalization-cache.php';
        
        // conexao mysqli pra codigo legado
        if (!isset($conexao)) {
            $host = wyw_env('DB_HOST', 'localhost');
            $database = wyw_env('DB_NAME', 'db_login');
            $user = wyw_env('DB_USER', 'root');
            $password = wyw_env('DB_PASS', '');
            
            $conexao = new mysqli($host, $user, $password, $database);
            
            if ($conexao->connect_error) {
                error_log("Erro mysqli: " . $conexao->connect_error);
                die("Erro de conexão com banco de dados");
            }
            
            $conexao->set_charset('utf8mb4');
        }

        // personalizacao
        $personalizedRowEnabled = false;
        $personalizedPreferenceCount = 0;
        $personalizationCacheToken = null;
        $personalizationTables = [
            'SELECT COUNT(*) FROM user_genres WHERE user_id = ?',
            'SELECT COUNT(*) FROM user_keywords WHERE user_id = ?',
            'SELECT COUNT(*) FROM user_people WHERE user_id = ?',
            'SELECT COUNT(*) FROM user_providers WHERE user_id = ? AND enabled = 1',
            'SELECT COUNT(*) FROM user_favorite_titles WHERE user_id = ?',
        ];

        $sessionUserId = (int)($_SESSION['id'] ?? 0);

        // verifica preferencias do usuario
        if ($sessionUserId > 0 && isset($conexao)) {
            foreach ($personalizationTables as $sql) {
                $stmt = $conexao->prepare($sql);
                if (!$stmt) continue;
                
                $stmt->bind_param('i', $sessionUserId);
                $stmt->execute();
                $stmt->bind_result($rowCount);
                if ($stmt->fetch()) {
                    $personalizedPreferenceCount += (int) $rowCount;
                }
                $stmt->close();
            }

            $personalizedRowEnabled = $personalizedPreferenceCount > 0;
            if ($personalizedRowEnabled) {
                $personalizationCacheToken = wtw_personalization_cache_token();
            }
        }

        // ========== OPÇÕES DE GÊNEROS PARA ONBOARDING ==========
        // Lista de gêneros de filmes disponíveis para seleção no onboarding
        
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

        // ========== OPÇÕES DE PALAVRAS-CHAVE PARA ONBOARDING ==========
        // Lista de palavras-chave/temas disponíveis para seleção
        
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

        // ========== OPÇÕES DE PROVEDORES PARA ONBOARDING ==========
        // Lista de serviços de streaming disponíveis no Brasil
        
        $providerOptions = [
            ['id' => 8, 'label' => 'Netflix', 'logo' => 'https://image.tmdb.org/t/p/w154/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg'],
            ['id' => 119, 'label' => 'Prime Video', 'logo' => 'https://image.tmdb.org/t/p/w154/68MNrwlkpF7WnmNPXLah69CR5cb.jpg'],
            ['id' => 337, 'label' => 'Disney+', 'logo' => 'https://image.tmdb.org/t/p/w154/97yvRBw1GzX7fXprcF80er19ot.jpg'],
            ['id' => 1899, 'label' => 'HBO Max', 'logo' => 'https://image.tmdb.org/t/p/w154/jbe4gVSfRlbPTdESXhEKpornsfu.jpg'],
            ['id' => 350, 'label' => 'Apple TV+', 'logo' => 'https://image.tmdb.org/t/p/w154/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg'],
        ];

        // ========== VERIFICAÇÃO DE ONBOARDING PENDENTE ==========
        // Verifica se usuário precisa completar processo de onboarding
        
        $onboardingRequired = !empty($_SESSION['onboarding_pending']);
        
        // ========== GERAÇÃO DE URLs PARA APIs ==========
        // Determina o caminho base correto para as APIs
        $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php');
        $apiBasePath = ($scriptDir === '/' || $scriptDir === '.' || $scriptDir === '') ? '' : rtrim($scriptDir, '/');
        $onboardingApiUrl = $apiBasePath . '/api/onboarding.php';
        $onboardingTitlesUrl = $apiBasePath . '/api/onboarding.php?resource=titles';
        $personalizedApiUrl = $apiBasePath . '/api/home-personalized.php';
    ?>

    <!-- ========== MODAL DE ONBOARDING ========== -->
    <!-- Modal para coleta de preferências do usuário na primeira utilização -->
    
    <div class="onboarding-backdrop" data-onboarding-backdrop <?php echo $onboardingRequired ? '' : 'hidden'; ?> aria-hidden="<?php echo $onboardingRequired ? 'false' : 'true'; ?>">
        <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboardingTitle" data-onboarding-modal>
            <div class="onboarding-header">
                <h2 class="onboarding-title" id="onboardingTitle">Personalize sua experiência</h2>
                <p class="onboarding-subtitle">Selecione os gêneros, provedores e filmes e séries que têm a ver com você.</p>
            </div>

            <div class="onboarding-steps" data-onboarding-steps>
                <section class="onboarding-step" data-onboarding-step="genres" aria-label="Escolha seus gêneros e temas favoritos">
                    <!-- ========== ETAPA 1: SELEÇÃO DE GÊNEROS E PALAVRAS-CHAVE ========== -->
                    
                    <header class="onboarding-step__header">
                        <h3>Gêneros e palavras-chave</h3>
                        <p>Escolha os estilos de filmes que você mais gosta e adicione temas que sempre te interessam.</p>
                    </header>
                    <div class="onboarding-section">
                        <h4 class="onboarding-section__title">Gêneros favoritos</h4>
                        <div class="onboarding-chip-grid" data-onboarding-genres>
                            <?php foreach ($genreOptions as $genre): ?>
                                <button type="button" class="onboarding-chip" data-genre-id="<?php echo (int) $genre['id']; ?>" data-genre-label="<?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?>">
                                    <?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?>
                                </button>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <div class="onboarding-section">
                        <h4 class="onboarding-section__title">Adicionar palavras-chave</h4>
                        <p class="onboarding-helper-text">Digite temas, estilos ou conceitos que você ama (ex: "viagem no tempo", "super-heróis", "romance").</p>
                        <div class="onboarding-chip-grid" data-onboarding-keywords style="min-height: 40px; margin-bottom: 12px;">
                            <!-- Palavras-chave adicionadas aparecerão aqui -->
                        </div>
                        <form class="onboarding-keyword-form" data-onboarding-keyword-form>
                            <label for="onboardingKeywordInput" class="sr-only">Adicionar palavra-chave</label>
                            <input type="text" id="onboardingKeywordInput" class="onboarding-input" placeholder="Digite uma palavra-chave ou tema" data-onboarding-keyword-input>
                            <button type="submit" class="onboarding-button onboarding-button--inline onboarding-button--primary" data-onboarding-keyword-add>Adicionar</button>
                        </form>
                    </div>
                </section>

                <!-- ========== ETAPA 2: SELEÇÃO DE PROVEDORES ========== -->
                
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

                <!-- ========== ETAPA 3: SELEÇÃO DE TÍTULOS FAVORITOS + RECOMENDAÇÕES ========== -->
                
                <section class="onboarding-step" data-onboarding-step="favorites" aria-label="Escolha seus filmes e séries favoritos" hidden>
                    <header class="onboarding-step__header">
                        <h3>Personalize sua experiência</h3>
                        <p>Selecione os filmes e séries que têm a ver com você. Mostramos sugestões baseadas nas suas preferências.</p>
                    </header>
                    <div class="onboarding-section onboarding-section--search">
                        <div class="onboarding-search" data-onboarding-favorites-search-wrapper>
                            <label for="onboardingFavoriteSearch" class="sr-only">Buscar filmes e séries</label>
                            <input type="search" id="onboardingFavoriteSearch" class="onboarding-input" placeholder="Busque por filmes ou séries" data-onboarding-favorites-search>
                            <button type="button" class="onboarding-button onboarding-button--inline onboarding-button--primary" data-onboarding-favorites-refresh>Buscar</button>
                        </div>
                        <div class="onboarding-grid onboarding-grid--favorites" data-onboarding-favorites></div>
                        <p class="onboarding-helper-text" data-onboarding-favorites-empty hidden>Nenhum título encontrado. Tente outra busca.</p>
                        <p class="onboarding-helper-text" data-onboarding-favorites-loading hidden aria-live="polite" role="status">Carregando sugestões…</p>
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

    <!-- ========== INTERFACE PRINCIPAL ========== -->
    <!-- Seção principal com carrossel de filmes e controles -->
    
    <section id="interface" class="interface-section">

        <!-- ========== MODAL PARA TRAILERS ========== -->
        <!-- Modal que exibe trailers dos filmes/séries -->

        <dialog id="dialog" class="dialog">
            <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
            <button id="close-trailer" type="button" aria-label="Fechar trailer" data-dialog-initial-focus>X</button>
        </dialog>

        <!-- ========== CARROSSEL PRINCIPAL DE CONTEÚDO ========== -->
        <!-- Container principal que exibe filmes/séries em destaque -->

        <div id="surprise-me" class="wrap" tabindex="-1">
            <button id="btnLeft" class="prev" onclick="scrollLeftCustom()">&#10094;</button>
            <div id="container-wrap">
            <!--Primeiro container com trailer e backdrop-->
            </div>
            <button id="btnRight" class="next" onclick="scrollRight()">&#10095;</button>
        </div>

        <!-- ========== BARRA DE PROGRESSO DO HERÓI ========== -->
        <!-- Indicador de progresso para navegação no carrossel -->

        <div class="hero-progress" data-hero-progress hidden>
            <div class="hero-progress__track" data-hero-progress-track></div>
            <span class="sr-only" data-hero-progress-label aria-live="polite" role="status"></span>
        </div>

        <!-- ========== BOTÕES DE PROVEDOR DE STREAMING ========== -->
        <!-- Botões para filtrar conteúdo por serviço de streaming -->

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

        <!-- ========== BOTÕES DE CATEGORIA ========== -->
        <!-- Alternar entre visualização de filmes e séries -->

        <div class="category-buttons">
            <div class="style-buttons">
                <button id="showMovies" class="btn-category active">Filmes</button>
                <button id="showSeries" class="btn-category">S&eacute;rie</button>
            </div>
        </div>
        
        <!-- ========== SEÇÕES DE MÍDIA ========== -->
        <!-- Container que contém todas as seções de filmes/séries organizadas -->
        
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
    
    <!-- ========== CONFIGURAÇÕES JAVASCRIPT ========== -->
    <!-- Scripts de configuração para personalização e onboarding -->
    
    <script>
        window.wtwPersonalization = <?php echo json_encode([
            'enabled' => $personalizedRowEnabled,
            'mediaTypes' => ['movie', 'tv'],
            'endpoint' => $personalizedApiUrl,
            'preferenceCount' => $personalizedPreferenceCount,
            'cacheToken' => $personalizationCacheToken,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script>
        window.wtwOnboarding = <?php echo json_encode([
            'required' => $onboardingRequired,
            'apiUrl' => $onboardingApiUrl,
            'titlesEndpoint' => $onboardingTitlesUrl,
            'tmdbImageBase' => 'https://image.tmdb.org/t/p',
            'options' => [
                'genres' => $genreOptions,
                'keywords' => $keywordOptions,
                'providers' => $providerOptions,
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    </script>
    <script src="js/onboarding.js"></script>
    <script src="js/hero-responsive.js"></script>
    <script type="module" src="js/container.js"></script>
    <script src="js/script.js"></script>
    <script type="module" src="js/search.js"></script>
</body>

</html>




<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$isAuthenticated = isset($_SESSION['id']) || isset($_SESSION['id_user']);
$userName = isset($_SESSION['nome']) ? trim((string) $_SESSION['nome']) : '';
if ($userName === '') {
    $userName = 'Visitante';
}

$onboardingCompletedAt = $_SESSION['onboarding_completed_at'] ?? null;
$formattedCompletion = null;
if (is_string($onboardingCompletedAt) && $onboardingCompletedAt !== '') {
    try {
        $date = new DateTime($onboardingCompletedAt);
        $date->setTimezone(new DateTimeZone('America/Sao_Paulo'));
        $formattedCompletion = $date->format('d \d\e F \d\e Y');
    } catch (Throwable $e) {
        $formattedCompletion = null;
    }
}

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

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark">
    <title>Meu perfil | where you watch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body class="profile-page has-fixed-header">
<?php include_once('dashboard.php'); ?>

<main class="profile-shell" data-profile-root data-authenticated="<?php echo $isAuthenticated ? 'true' : 'false'; ?>" data-api-url="api/onboarding.php">
    <section class="profile-hero" aria-labelledby="profileTitle">
        <div class="profile-hero__backdrop" aria-hidden="true"></div>
        <div class="profile-hero__content">
            <div class="profile-identity">
                <div class="profile-avatar" aria-hidden="true">
                    <span><?php echo htmlspecialchars(mb_strtoupper(mb_substr($userName, 0, 1, 'UTF-8'), 'UTF-8'), ENT_QUOTES, 'UTF-8'); ?></span>
                </div>
                <div class="profile-identity__text">
                    <p class="profile-overline">Perfil pessoal</p>
                    <h1 class="profile-title" id="profileTitle"><?php echo htmlspecialchars($userName, ENT_QUOTES, 'UTF-8'); ?></h1>
                    <p class="profile-subtitle">
                        <?php if ($isAuthenticated): ?>
                            Gerencie seus filmes favoritos e refine as preferências que usamos nas recomendações personalizadas.
                        <?php else: ?>
                            Entre na sua conta para salvar favoritos e personalizar suas recomendações.
                        <?php endif; ?>
                    </p>
                </div>
            </div>
            <dl class="profile-stats" aria-label="Resumo do perfil">
                <div class="profile-stat">
                    <dt>Favoritos</dt>
                    <dd data-profile-stat="favorites">0</dd>
                </div>
                <div class="profile-stat">
                    <dt>Preferências salvas</dt>
                    <dd data-profile-stat="preferences">0</dd>
                </div>
                <div class="profile-stat">
                    <dt>Atualizado</dt>
                    <dd data-profile-stat="updated"><?php echo $formattedCompletion ? htmlspecialchars($formattedCompletion, ENT_QUOTES, 'UTF-8') : '—'; ?></dd>
                </div>
            </dl>
        </div>
    </section>

    <section class="profile-overview" aria-label="Resumo de favoritos e preferências">
        <div class="profile-overview__grid">
            <aside class="profile-option profile-option--preferences" aria-labelledby="preferencesTitle" data-profile-preferences-section>
                <header class="profile-option__header">
                    <p class="profile-option__eyebrow">Preferências</p>
                    <h2 class="profile-option__title" id="preferencesTitle">Sua curadoria</h2>
                    <p class="profile-option__subtitle">Os gêneros, temas e provedores que guiam nossas recomendações.</p>
                </header>
                <?php if (!$isAuthenticated): ?>
                    <div class="profile-notice" role="alert">
                        <p>Faça <a href="login.php">login</a> para gerenciar suas preferências personalizadas.</p>
                    </div>
                <?php endif; ?>
                <dl class="profile-option__summary" aria-live="polite">
                    <div class="profile-option__group">
                        <dt>Gêneros</dt>
                        <dd><div class="profile-summary-chips" data-profile-genres-summary></div></dd>
                    </div>
                    <div class="profile-option__group">
                        <dt>Temas</dt>
                        <dd><div class="profile-summary-chips" data-profile-keywords-summary></div></dd>
                    </div>
                    <div class="profile-option__group">
                        <dt>Provedores</dt>
                        <dd><div class="profile-summary-chips" data-profile-providers-summary></div></dd>
                    </div>
                </dl>
                <div class="profile-option__actions">
                    <span class="profile-chip-counter" data-profile-preferences-count>0 itens</span>
                    <button type="button" class="profile-button profile-button--primary" data-profile-open-modal="preferences" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Gerenciar preferências</button>
                    <a href="index.php" class="profile-button profile-button--ghost">Explorar recomendações</a>
                </div>
            </aside>

            <section class="profile-card profile-card--favorites" aria-labelledby="favoritesTitle">
                <header class="profile-card__header">
                    <div>
                        <h2 class="profile-card__title" id="favoritesTitle">Meus favoritos</h2>
                        <p class="profile-card__subtitle">Um painel rápido com alguns dos títulos que você marcou como indispensáveis.</p>
                    </div>
                    <div class="profile-card__actions">
                        <span class="profile-badge" data-profile-favorites-count>0 títulos</span>
                        <button type="button" class="profile-button profile-button--primary" data-profile-open-modal="favorites" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Gerenciar favoritos</button>
                    </div>
                </header>
                <ul class="profile-favorite-rail" data-profile-favorites-summary role="list"></ul>
                <p class="profile-empty profile-empty--rail" data-profile-favorites-summary-empty hidden>Você ainda não selecionou nenhum favorito.</p>
            </section>
        </div>
    </section>

    <div class="profile-modal" data-profile-modal="favorites" role="dialog" aria-modal="true" aria-labelledby="favoritesModalTitle" aria-hidden="true">
        <div class="profile-modal__overlay" data-profile-modal-close aria-hidden="true"></div>
        <div class="profile-modal__window" role="document">
            <header class="profile-modal__header">
                <div>
                    <h2 class="profile-modal__title" id="favoritesModalTitle">Gerenciar favoritos</h2>
                    <span class="profile-modal__badge" data-profile-favorites-total>0 títulos</span>
                </div>
                <button type="button" class="profile-modal__close" data-profile-modal-close aria-label="Fechar">&times;</button>
            </header>
            <div class="profile-modal__body">
                <div class="profile-favorites" data-profile-favorites-list role="list"></div>
                <p class="profile-empty" data-profile-favorites-empty hidden>Você ainda não selecionou nenhum favorito. Adicione alguns títulos para receber recomendações mais certeiras.</p>
                <div class="profile-favorites__search" aria-labelledby="favoritesSearchLabel">
                    <div class="profile-favorites__search-header">
                        <h3 class="profile-favorites__title" id="favoritesSearchLabel">Adicionar novo favorito</h3>
                        <p class="profile-favorites__caption">Busque por filmes e séries que você ama e mantenha sua lista sempre atualizada.</p>
                    </div>
                    <form class="profile-search-form" data-profile-favorites-form>
                        <label for="profileFavoriteSearch" class="sr-only">Buscar título favorito</label>
                        <input type="search" id="profileFavoriteSearch" name="favorite" placeholder="Buscar por título" autocomplete="off" data-profile-favorites-search data-profile-modal-focus <?php echo $isAuthenticated ? '' : 'disabled'; ?>>
                        <button type="submit" class="profile-button profile-button--primary" data-profile-favorites-submit <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Buscar</button>
                    </form>
                    <div class="profile-search-results" data-profile-favorites-results aria-live="polite"></div>
                </div>
            </div>
            <footer class="profile-modal__footer">
                <button type="button" class="profile-button profile-button--ghost" data-profile-modal-close>Fechar</button>
            </footer>
        </div>
    </div>

    <div class="profile-modal" data-profile-modal="preferences" role="dialog" aria-modal="true" aria-labelledby="preferencesModalTitle" aria-hidden="true">
        <div class="profile-modal__overlay" data-profile-modal-close aria-hidden="true"></div>
        <div class="profile-modal__window" role="document">
            <header class="profile-modal__header">
                <h2 class="profile-modal__title" id="preferencesModalTitle">Gerenciar preferências</h2>
                <button type="button" class="profile-modal__close" data-profile-modal-close data-profile-modal-focus aria-label="Fechar">&times;</button>
            </header>
            <div class="profile-modal__body">
                <div class="profile-preferences" data-profile-preferences <?php echo $isAuthenticated ? '' : 'data-disabled="true"'; ?>>
                    <section class="preference-group" aria-labelledby="genresTitle">
                        <div class="preference-group__header">
                            <h3 id="genresTitle">Gêneros favoritos</h3>
                            <p>Selecione os estilos cinematográficos que mais combinam com você.</p>
                        </div>
                        <div class="chip-grid" data-profile-genres>
                            <?php foreach ($genreOptions as $genre): ?>
                                <button type="button" class="chip" data-genre-id="<?php echo (int) $genre['id']; ?>" aria-pressed="false" <?php echo $isAuthenticated ? '' : 'disabled'; ?>><?php echo htmlspecialchars($genre['label'], ENT_QUOTES, 'UTF-8'); ?></button>
                            <?php endforeach; ?>
                        </div>
                    </section>

                    <section class="preference-group" aria-labelledby="keywordsTitle">
                        <div class="preference-group__header">
                            <h3 id="keywordsTitle">Temas e palavras-chave</h3>
                            <p>Combine ideias centrais para refinar ainda mais suas recomendações.</p>
                        </div>
                        <div class="profile-keywords">
                            <div class="profile-keywords__selected" data-profile-keywords-list aria-live="polite"></div>
                            <div class="chip-grid chip-grid--suggestions" data-profile-keyword-suggestions>
                                <?php foreach ($keywordOptions as $keyword): ?>
                                    <button type="button" class="chip chip--outline" data-keyword-id="<?php echo (int) $keyword['id']; ?>" data-keyword-label="<?php echo htmlspecialchars($keyword['label'], ENT_QUOTES, 'UTF-8'); ?>" <?php echo $isAuthenticated ? '' : 'disabled'; ?>><?php echo htmlspecialchars($keyword['label'], ENT_QUOTES, 'UTF-8'); ?></button>
                                <?php endforeach; ?>
                            </div>
                            <form class="profile-keywords__form" data-profile-keyword-form>
                                <label for="profileKeywordInput" class="sr-only">Adicionar palavra-chave</label>
                                <input type="text" id="profileKeywordInput" placeholder="Adicionar nova palavra-chave" data-profile-keyword-input <?php echo $isAuthenticated ? '' : 'disabled'; ?>>
                                <button type="submit" class="profile-button profile-button--primary" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Adicionar</button>
                            </form>
                        </div>
                    </section>

                    <section class="preference-group" aria-labelledby="providersTitle">
                        <div class="preference-group__header">
                            <h3 id="providersTitle">Provedores disponíveis</h3>
                            <p>Marque os serviços de streaming que você assina para filtrar resultados automaticamente.</p>
                        </div>
                        <div class="provider-grid" data-profile-providers>
                            <?php foreach ($providerOptions as $provider): ?>
                                <button type="button" class="provider-card" data-provider-id="<?php echo (int) $provider['id']; ?>" aria-pressed="false" <?php echo $isAuthenticated ? '' : 'disabled'; ?>>
                                    <span class="provider-card__logo" aria-hidden="true">
                                        <img src="<?php echo htmlspecialchars($provider['logo'], ENT_QUOTES, 'UTF-8'); ?>" alt="" loading="lazy">
                                    </span>
                                    <span class="provider-card__label"><?php echo htmlspecialchars($provider['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                                </button>
                            <?php endforeach; ?>
                        </div>
                    </section>
                </div>
            </div>
            <footer class="profile-modal__footer">
                <div class="profile-feedback" data-profile-feedback role="status" aria-live="polite"></div>
                <button type="button" class="profile-button profile-button--ghost" data-profile-modal-close>Cancelar</button>
                <button type="button" class="profile-button profile-button--primary" data-profile-save <?php echo $isAuthenticated ? '' : 'disabled'; ?>>Salvar alterações</button>
            </footer>
        </div>
    </div>

    <section class="profile-card profile-card--shortcuts" aria-labelledby="shortcutsTitle">
        <header class="profile-card__header">
            <div>
                <h2 class="profile-card__title" id="shortcutsTitle">Minhas listas e atalhos</h2>
                <p class="profile-card__subtitle">Acesse rapidamente ferramentas para descobrir novos filmes.</p>
            </div>
        </header>
        <div class="profile-shortcuts">
            <a href="providers.php" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">🎯</span>
                <div class="shortcut-card__content">
                    <h3>Explorar por provedor</h3>
                    <p>Combine diferentes catálogos e descubra o que está em alta nos seus serviços favoritos.</p>
                </div>
            </a>
            <a href="index.php#search" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">🔍</span>
                <div class="shortcut-card__content">
                    <h3>Buscar títulos rapidamente</h3>
                    <p>Pesquise filmes e séries e veja onde estão disponíveis para assistir agora.</p>
                </div>
            </a>
            <a href="index.php" class="shortcut-card">
                <span class="shortcut-card__icon" aria-hidden="true">✨</span>
                <div class="shortcut-card__content">
                    <h3>Surpreenda-me</h3>
                    <p>Volte para a página inicial e receba sugestões criadas a partir das suas preferências.</p>
                </div>
            </a>
        </div>
    </section>
</main>

<script src="js/script.js"></script>
<script src="js/profile.js" defer></script>
</body>
</html>

<?php
include_once("dashboard.php");
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Where You Watch - Linha do tempo do artista</title>
  <link rel="stylesheet" href="css/brand.css">
  <link rel="stylesheet" href="css/timeline.css">
</head>
<body class="has-fixed-header">
  <main class="timeline-page interface-section is-loading">
    <div id="timelinePageSkeleton" class="timeline-page__skeleton" aria-hidden="true">
      <div class="timeline-page__skeleton-header glass-panel">
        <span class="skeleton-block skeleton-avatar"></span>
        <div class="timeline-page__skeleton-text">
          <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
          <span class="skeleton-block skeleton-line skeleton-line--md"></span>
        </div>
      </div>
      <div class="timeline-page__skeleton-controls glass-panel">
        <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
        <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
        <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
        <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
      </div>
      <div class="timeline-page__skeleton-timeline glass-panel">
        <div class="timeline-page__skeleton-year">
          <span class="skeleton-block skeleton-line skeleton-line--md"></span>
          <div class="timeline-page__skeleton-cards">
            <span class="skeleton-block skeleton-poster"></span>
            <span class="skeleton-block skeleton-poster"></span>
            <span class="skeleton-block skeleton-poster"></span>
            <span class="skeleton-block skeleton-poster"></span>
          </div>
        </div>
        <div class="timeline-page__skeleton-year">
          <span class="skeleton-block skeleton-line skeleton-line--md"></span>
          <div class="timeline-page__skeleton-cards">
            <span class="skeleton-block skeleton-poster"></span>
            <span class="skeleton-block skeleton-poster"></span>
            <span class="skeleton-block skeleton-poster"></span>
            <span class="skeleton-block skeleton-poster"></span>
          </div>
        </div>
      </div>
    </div>

    <section id="timelinePageContent" class="timeline-page__content" data-content hidden>
      <header class="timeline-page__header" id="timelineFloatingHeader">
        <div class="timeline-page__header-top">
          <div class="timeline-page__identity">
            <img id="timelineActorAvatar" class="timeline-page__avatar" src="" alt="Foto do(a) artista" loading="lazy">
            <div class="timeline-page__identity-text">
              <h1 id="timelineActorName" class="timeline-page__name">-</h1>
              <p id="timelineActorYears" class="timeline-page__years">Carregando...</p>
            </div>
          </div>
          <div class="timeline-page__actions" role="group" aria-label="Acoes rapidas">
            <button type="button" class="action-btn action-btn--glass" id="timelineFollowBtn">Seguir</button>
            <button type="button" class="action-btn action-btn--glass" id="timelineFavoriteBtn">Favoritar</button>
            <a id="timelineProfileLink" class="action-btn action-btn--primary" href="#">Ver perfil completo</a>
          </div>
        </div>
      </header>

      <div class="timeline-page__filters" id="timelineRoleFilter" role="radiogroup" aria-label="Filtrar por papel">
        <button type="button" class="filter-chip is-active" data-role="all">Tudo</button>
        <button type="button" class="filter-chip" data-role="acting">Atuacao</button>
        <button type="button" class="filter-chip" data-role="directing">Direcao</button>
        <button type="button" class="filter-chip" data-role="production">Producao</button>
        <button type="button" class="filter-chip" data-role="writing">Roteiro</button>
      </div>

      <div class="timeline-page__controls">
        <button type="button" class="action-btn action-btn--outline" id="toggleCompactYearsBtn" aria-pressed="false">Compactar anos</button>
        <nav id="timelineYearNav" class="timeline-page__year-nav" aria-label="Navegar por ano"></nav>
      </div>

      <section id="timelineYearsContainer" class="timeline-page__years" aria-label="Linha do tempo do artista">
        <div id="timelineYearsContent" class="timeline-content"></div>
      </section>
    </section>
  </main>

  <script src="js/timeline.js" type="module"></script>
</body>
</html>

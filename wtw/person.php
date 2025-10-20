<?php
include_once("dashboard.php")
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Where You Watch - Pessoa</title>

  <link rel="stylesheet" href="css/movie.css"> <!-- Para manter a base de variaveis/estetica -->
  <link rel="stylesheet" href="css/person.css">
  <link rel="stylesheet" href="css/brand.css">
</head>
<body class="has-fixed-header">

  <main class="page-shell interface-section is-loading">

    <div id="personSkeleton" class="person-skeleton" aria-hidden="true">
      <section class="glass-panel person-skeleton__hero">
        <div class="person-skeleton__hero-grid">
          <div class="skeleton-block skeleton-portrait"></div>

          <div class="person-skeleton__hero-body">
            <span class="skeleton-block skeleton-line skeleton-line--xl"></span>

            <div class="person-skeleton__hero-chips">
              <span class="skeleton-block skeleton-chip"></span>
              <span class="skeleton-block skeleton-chip"></span>
            </div>

            <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
            <span class="skeleton-block skeleton-line skeleton-line--md"></span>
            <span class="skeleton-block skeleton-line skeleton-line--sm"></span>

            <div class="person-skeleton__hero-chips">
              <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
              <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
              <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
            </div>
          </div>
        </div>
      </section>

      <section class="glass-panel person-skeleton__timeline">
        <div class="person-skeleton__section-heading">
          <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
          <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
        </div>

        <div class="person-skeleton__timeline-list">
          <span class="skeleton-block skeleton-poster"></span>
          <span class="skeleton-block skeleton-poster"></span>
          <span class="skeleton-block skeleton-poster"></span>
          <span class="skeleton-block skeleton-poster"></span>
          <span class="skeleton-block skeleton-poster"></span>
        </div>

        <div class="person-skeleton__actions">
          <span class="skeleton-block skeleton-button"></span>
        </div>
      </section>

      <section class="glass-panel person-skeleton__coworkers">
        <div class="person-skeleton__section-heading">
          <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
          <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
        </div>

        <div class="person-skeleton__coworkers-grid">
          <span class="skeleton-block skeleton-avatar"></span>
          <span class="skeleton-block skeleton-avatar"></span>
          <span class="skeleton-block skeleton-avatar"></span>
          <span class="skeleton-block skeleton-avatar"></span>
          <span class="skeleton-block skeleton-avatar"></span>
          <span class="skeleton-block skeleton-avatar"></span>
        </div>
      </section>

      <section class="glass-panel person-skeleton__info">
        <div class="person-skeleton__section-heading">
          <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
          <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
        </div>

        <div class="person-skeleton__info-grid">
          <div class="person-skeleton__info-item">
            <span class="skeleton-block skeleton-line skeleton-line--md"></span>
            <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
          </div>
          <div class="person-skeleton__info-item">
            <span class="skeleton-block skeleton-line skeleton-line--md"></span>
            <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
          </div>
          <div class="person-skeleton__info-item">
            <span class="skeleton-block skeleton-line skeleton-line--md"></span>
            <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
          </div>
          <div class="person-skeleton__info-item">
            <span class="skeleton-block skeleton-line skeleton-line--md"></span>
            <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
          </div>
        </div>
      </section>
    </div>

    <!-- ========== HERO ========== -->
    <section class="person-hero glass-panel" data-person-content>
      <div class="hero-grid">
        <figure class="portrait-frame">
          <img id="person-img" class="actor-photo" src="" alt="Foto do(a) artista">
        </figure>

        <div class="hero-text">
          <h1 id="person-name" class="person-name">-</h1>

          <div class="professions">
            <span id="profession-label-1" class="meta-chip">-</span>
            <span id="profession-label-2" class="meta-chip is-hidden">-</span>
          </div>

          <h3 id="bio-h3" class="section-miniheading">Biografia</h3>
          <p id="person-bio" class="person-bio">-</p>

          <div class="meta-chips" id="personMetaChips"></div>

          <div class="external-links" id="externalLinks">
            <!-- Instagram, X/Twitter, Facebook, Site oficial -->
          </div>
        </div>
      </div>
    </section>

    <!-- ========== TIMELINE ========== -->
    <section class="card-section glass-panel" data-person-content>
      <div class="section-heading">
        <h2>Timeline</h2>
        <p class="section-subtitle">Ordenamos por popularidade e ano.</p>
      </div>

      <div class="timeline-container" id="timeline-container"></div>

      <div class="show-movies">
        <button id="show-all-movies" class="action-btn action-btn--glass">Ver todos</button>
      </div>
    </section>

    <!-- ========== COLEGAS ==========- -->
    <section class="card-section glass-panel" id="coworkersSection" data-person-content>
      <div class="section-heading">
        <h2>Colaboracoes frequentes</h2>
        <p class="section-subtitle">Essas parcerias arrasam em cena!</p>
      </div>

      <div class="people-grid" id="coworkersGrid"></div>
    </section>

    <!-- ========== INFORMACOES / PREMIOS ========== -->
    <section class="card-section glass-panel" data-person-content>
      <div class="section-heading">
        <h2>Informacoes</h2>
        <p class="section-subtitle">Dados basicos e curiosidades.</p>
      </div>

      <div class="info-grid glass-panel" id="infoGrid">
        <!-- preenchido via JS -->
      </div>

      <div class="awards-wrap">
        <h3 class="section-miniheading">Premios / Indicacoes</h3>
        <p class="section-subtitle" id="awardsNote">
          O TMDB nao fornece premiacoes oficialmente. Podemos integrar uma fonte externa (IMDb/Awards API) depois.
        </p>
        <ul class="awards-list" id="awardsList"><!-- placeholder --></ul>
      </div>
    </section>
  </main>

  <!-- ========== MODAL: TODOS OS TRABALHOS ========== -->
  <dialog id="moviesModal" class="movie-dialog">
    <div class="modal-inner">
      <header class="modal-head">
        <div class="modal-identity">
          <img id="modalActorPhoto" class="modal-actor-photo" src="" alt="Foto do(a) artista" loading="lazy">
          <div class="modal-titles">
            <h3 id="moviesModalTitle">Todos os trabalhos</h3>
            <p id="modalResultCount" class="modal-result-count">&nbsp;</p>
          </div>
        </div>
        <button id="closeMoviesModal" class="modal-close-btn" type="button">Fechar</button>
      </header>

      <div class="modal-body wyw-scroll">
        <div class="modal-search">
          <input type="search" id="modalFilmographySearch" placeholder="Buscar na filmografia" autocomplete="off" aria-label="Buscar filmes na filmografia">
        </div>

        <p id="modalEmptyState" class="modal-empty is-hidden">Nenhum título encontrado.</p>

        <div class="all-grid" id="all-movies-list"></div>
      </div>
    </div>
  </dialog>

  <script src="js/person.js"></script>
  <script src="js/script.js"></script>
  <script src="js/search.js"></script>
</body>
</html>

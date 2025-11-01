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
    <section class="person-hero glass-panel actor-hero" data-person-content>
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
    <section class="card-section glass-panel timeline-shell timeline-shell--grid" data-person-content data-mode="grid">
      <div class="section-heading timeline-heading">
        <div class="timeline-heading__text">
          <h2>Timeline</h2>
          <p class="section-subtitle">Explore os destaques ano a ano, com filtros rápidos por papel.</p>
        </div>
        <div class="timeline-heading__actions">
          <button type="button" class="timeline-mode-toggle" id="timelineModeToggle" aria-pressed="false" aria-label="Ativar modo timeline imersivo">
            <span class="toggle-icon toggle-icon--grid" aria-hidden="true">📄</span>
            <span class="toggle-icon toggle-icon--timeline" aria-hidden="true">🕓</span>
          </button>
        </div>
      </div>

      <div class="timeline-layout">
        <aside class="timeline-sidebar" aria-label="Controles da timeline">
          <div class="timeline-mini-header" id="timelineMiniHeader">
            <div class="mini-identity">
              <img id="timelineActorPhoto" src="" alt="Foto do(a) artista" class="mini-portrait" loading="lazy">
              <div>
                <p id="timelineActorName" class="mini-name">-</p>
                <p id="timelineActorMeta" class="mini-meta">Carregando…</p>
              </div>
            </div>
            <div class="mini-actions" role="group" aria-label="Ações do artista">
              <button type="button" class="mini-action-btn" id="followActorBtn">Seguir</button>
              <button type="button" class="mini-action-btn" id="favoriteActorBtn">Favoritar</button>
              <button type="button" class="mini-action-btn" id="watchlistActorBtn">Ver onde assistir</button>
            </div>
          </div>

          <div class="timeline-filter" role="radiogroup" aria-label="Filtrar por papel" id="timelineRoleFilter">
            <button type="button" class="filter-chip is-active" data-role="all">Tudo</button>
            <button type="button" class="filter-chip" data-role="acting">Atuação</button>
            <button type="button" class="filter-chip" data-role="directing">Direção</button>
            <button type="button" class="filter-chip" data-role="production">Produção</button>
          </div>

          <nav class="timeline-year-nav" aria-label="Navegar por ano" id="timelineYearNav"></nav>
          <div class="timeline-decade-chips" id="timelineDecadeChips" role="radiogroup" aria-label="Navegar por década"></div>
        </aside>

        <div class="timeline-content" id="timeline-container" role="list" tabindex="0" aria-label="Lista de obras na timeline"></div>
      </div>

      <div class="show-movies">
        <button id="show-all-movies" class="action-btn action-btn--glass">Abrir filmografia completa</button>
      </div>
    </section>


    <!-- ========== COLEGAS ==========- -->
    <section class="card-section glass-panel" id="coworkersSection" data-person-content>
      <div class="section-heading">
        <h2>Colaboracoes frequentes</h2>
        <p class="section-subtitle">Essas parcerias arrasam em cena!</p>
      </div>

      <div class="coworkers-cta">
        <button class="action-btn action-btn--outline" id="openCoworkersCarousel">Ver colaborações frequentes</button>
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

  <button type="button" class="back-to-top" id="backToTopButton" aria-label="Voltar ao topo">
    <span aria-hidden="true">↑</span>
  </button>

  <!-- ========== MODAL: TODOS OS TRABALHOS ========== -->
  <dialog id="moviesModal" class="movie-dialog" role="dialog" aria-modal="true" aria-labelledby="moviesModalTitle">
    <div class="modal-inner" role="document">
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

      <div class="modal-controls" role="presentation">
        <div class="modal-tabs" role="tablist" aria-label="Categorias da filmografia">
          <button type="button" class="modal-tab is-active" role="tab" aria-selected="true" aria-controls="filmographyMovies" id="tabMovies">Filmes</button>
          <button type="button" class="modal-tab" role="tab" aria-selected="false" aria-controls="filmographyTv" id="tabTv">TV</button>
          <button type="button" class="modal-tab" role="tab" aria-selected="false" aria-controls="filmographyCrew" id="tabCrew">Equipe</button>
        </div>

        <div class="modal-filters" id="modalFilterControls">
          <label class="visually-hidden" for="modalFilmographySearch">Buscar na filmografia</label>
          <input type="search" id="modalFilmographySearch" placeholder="Buscar na filmografia" autocomplete="off">

          <label class="visually-hidden" for="modalSortSelect">Ordenar por</label>
          <select id="modalSortSelect">
            <option value="yearDesc">Ano (mais recente)</option>
            <option value="yearAsc">Ano (mais antigo)</option>
            <option value="popularity">Popularidade (TMDB)</option>
            <option value="rating">Nota média</option>
            <option value="availability">Onde assistir primeiro</option>
          </select>

          <label class="visually-hidden" for="modalRoleSelect">Filtrar papel</label>
          <select id="modalRoleSelect">
            <option value="all">Todos os papéis</option>
            <option value="acting">Atuação</option>
            <option value="directing">Direção</option>
            <option value="production">Produção</option>
            <option value="crew">Outros (equipe)</option>
          </select>

          <label class="visually-hidden" for="modalProviderSelect">Filtrar provedor</label>
          <select id="modalProviderSelect">
            <option value="all">Todos os provedores</option>
          </select>

          <label class="visually-hidden" for="modalGenreSelect">Filtrar gênero</label>
          <select id="modalGenreSelect">
            <option value="all">Todos os gêneros</option>
          </select>
        </div>
      </div>

      <div class="modal-body wyw-scroll" id="filmographyModalBody">
        <p id="modalEmptyState" class="modal-empty is-hidden">Nenhum título encontrado.</p>

        <div class="filmography-panel is-active" id="filmographyMovies" role="tabpanel" aria-labelledby="tabMovies">
          <div class="filmography-grid" id="moviesList"></div>
          <button type="button" class="load-more-btn is-hidden" data-target="moviesList">Carregar mais</button>
        </div>

        <div class="filmography-panel" id="filmographyTv" role="tabpanel" aria-labelledby="tabTv" hidden>
          <div class="filmography-grid" id="tvList"></div>
          <button type="button" class="load-more-btn is-hidden" data-target="tvList">Carregar mais</button>
        </div>

        <div class="filmography-panel" id="filmographyCrew" role="tabpanel" aria-labelledby="tabCrew" hidden>
          <div class="filmography-grid" id="crewList"></div>
          <button type="button" class="load-more-btn is-hidden" data-target="crewList">Carregar mais</button>
        </div>
      </div>
    </div>
  </dialog>

  <script src="js/person.js"></script>
  <script src="js/script.js"></script>
  <script src="js/search.js"></script>
</body>
</html>

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

  <main class="page-shell interface-section">

    <!-- ========== HERO ========== -->
    <section class="person-hero glass-panel">
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
    <section class="card-section glass-panel">
      <div class="section-heading">
        <h2>Timeline</h2>
        <p class="section-subtitle">Ordenamos por popularidade e ano.</p>
      </div>

      <div class="filmography-search">
        <input type="search" id="filmographySearch" placeholder="Buscar na filmografia" autocomplete="off" aria-label="Buscar filmes na filmografia">
        <button type="button" id="filmographyClear" class="filmography-search__clear" aria-label="Limpar busca">&times;</button>
      </div>

      <div class="filmography-results is-hidden" id="filmographyResults"></div>

      <div class="timeline-container" id="timeline-container"></div>

      <div class="show-movies">
        <button id="show-all-movies" class="action-btn action-btn--glass">Ver todos</button>
      </div>
    </section>

    <!-- ========== COLEGAS ==========- -->
    <section class="card-section glass-panel" id="coworkersSection">
      <div class="section-heading">
        <h2>Colaboracoes frequentes</h2>
        <p class="section-subtitle">Essas parcerias arrasam em cena!</p>
      </div>

      <div class="people-grid" id="coworkersGrid"></div>
    </section>

    <!-- ========== INFORMACOES / PREMIOS ========== -->
    <section class="card-section glass-panel">
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
    <div class="overlay-modal"></div>
    <div class="modal-inner">
      <div class="modal-head">
        <h3 id="moviesModalTitle">Todos os trabalhos</h3>
        <button id="closeMoviesModal" class="btn btn-danger">Fechar</button>
      </div>
      <div class="all-grid" id="all-movies-list"></div>
    </div>
  </dialog>

  <script>
    // Fallback simples para show/hide loading caso nao exista global
    window.showLoading = window.showLoading || function(){ 
      const el = document.getElementById('loadingOverlay'); 
      if (el) {
        el.classList.remove('is-hidden');
        el.setAttribute('aria-hidden', 'false');
      }
    };
    window.hideLoading = window.hideLoading || function(){ 
      const el = document.getElementById('loadingOverlay'); 
      if (el) {
        el.classList.add('is-hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    };
  </script>
  <script src="js/person.js"></script>
  <script src="js/script.js"></script>
  <script src="js/search.js"></script>
</body>
</html>

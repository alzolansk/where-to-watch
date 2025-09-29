<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<nav id="menu">
    
    <div class="faixa">

      <!-- <li><a href="index.php" class="logo"> <img src="imagens/Where-toWatch.png" alt="logo" style="width: 80px"></li></a> -->
                <a href="index.php" class="wyw-brand wyw-brand--sm dashboard-logo home-header" aria-label="Ir para a pÃƒÂ¡gina inicial">
            <span class="wyw-brand__where">where</span>
            <span class="wyw-brand__where wyw-brand__where--y">y</span>
            <img src="imagens/eye-icon2.svg" alt="o" class="wyw-brand__eye" />
            <span class="wyw-brand__where wyw-brand__where--u">u</span>
            <span class="wyw-brand__watch">WATCH</span>
        </a>

        <nav id="menu-buttons" class="hidden-menu">
            <ul id="ulBotoes">
                
                <li><a href="index.php">Pagina Inicial </a></li>
            </ul>
        </nav>



        <div id="search-div">
            <div class="search-panel">
                <div class="search-input-wrapper" id="searchInputWrapper">
                    <span class="search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="7"></circle>
                            <line x1="20" y1="20" x2="16.65" y2="16.65"></line>
                        </svg>
                    </span>
                    <input type="text" class="search-bar" id="searchmovie" placeholder="Pesquisar filme ou s&eacute;rie" autocomplete="off">
                    <button type="button" id="clearSearch" class="clear-search" aria-label="Limpar busca">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="results" class="search-results" style="display: none;"></div>
        </div>

        <div id="searchResults" style="display: none;"></div>

            <?php

            if(!isset($_SESSION['nome']) || !isset($_SESSION['id'])) {

            echo '<div class="user-menu">';
            echo "<ul><li><a href=login.php> Fazer login </a></li></ul>";
            echo '</div>';
            echo '<div class="menu-trigger">';
            echo '<img onclick="toggleMenu()" src="imagens/menu-icon.png" alt="Menu Icon" id="menuIcon" width="30px">';
            echo '</div>';

            } else if (isset($_SESSION['nome'])) {
                echo '<div class="user-greeting">';
                echo "<label>OlÃƒÆ’Ã‚Â¡, " . $_SESSION['nome'] . " ";
                echo '<a href= logout.php class=btn-danger> Sair </a>';
                echo '</div>';
                echo '<div class="menu-trigger">';
                echo '<img onclick="toggleMenu()" src="imagens/menu-icon.png" alt="Menu Icon" id="menuIcon" width="30px">';
                echo '</div>';
            }
            ?>  
    </div>
</nav>


<div id="loadingOverlay" class="loading-overlay is-hidden" role="status" aria-live="polite" aria-hidden="true">
    <div class="loading-content">
        <div class="iris">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1036.96 1068.64">
                <defs>
                    <style>
                        .fil1 {fill:#FEFEFE;}
                        .fil0 {fill:#D80814;}
                        .eyelid { transform-origin: center; animation: blink 1s infinite; }
                        @keyframes blink {
                            0%, 90%, 100% { transform: scaleY(1); }
                            95% { transform: scaleY(0.1); }
                        }
                    </style>
                </defs>
                <g id="Camada_1">
                    <g class="eyelid">
                        <path class="fil0" d="M532.42 0.03c-322.51,-0.12 -481.5,242.15 -531.95,492.2 347.34,-325.33 697.1,-320.9 1036.48,2.01 -30.69,-257.9 -229.35,-497.39 -504.53,-494.21z"/>
                    </g>
                    <path class="fil1" d="M531.95 1068.61c-322.51,0.12 -481.5,-242.15 -531.95,-492.2 347.34,325.33 697.1,320.9 1036.49,-2.01 -30.69,257.9 -229.36,497.39 -504.53,494.21z"/>
                    <ellipse class="fil0" cx="512.12" cy="527.36" rx="191.4" ry="191.94"/>
                </g>
            </svg>
        </div>
        <p>Carregando...</p>
    </div>
</div>


<style>
    
*{
    margin: 0;
    padding: 0;
    border:none;
    text-decoration: none;
    list-style: none;
}

/* Main Menu */
#menu{
    width: 100%;
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 1000;
    min-height: 0;
    background: linear-gradient(135deg, rgba(138, 138, 138, 0.15), rgba(255,255,255,0.05)); /*Glass transparency*/
    backdrop-filter: blur(10px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.034);
    isolation: isolate;
}

.faixa {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: clamp(8px, 1.2vw, 14px) clamp(18px, 3vw, 36px);
    gap: 16px;
    row-gap: 8px;
    font-family: Nunito;
}

.faixa ul{
    display: flex;
    text-decoration: none;
    list-style: none;
    margin: 0;
    font-size: 15px;
    margin-left: 20px;
}

.faixa ul li{
    padding: 8px;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-menu {
    display: flex;
    align-items: center;
    margin-left: auto;
}

.user-menu ul{
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
}

.user-menu ul li{
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px 8px 36px; /* espaÃƒÆ’Ã‚Â§o para a lupa */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z'/%3E%3C/svg%3E");
    background-position: 8px center;
    background-size: 20px 20px; /* largura altura */
    background-repeat: no-repeat;
}

.user-greeting {
    background-color: #1a1a1a;
    color: white;
    padding: 5px 20px;
    border-radius: 15px;
    font-size: 16px;
    font-family: 'Nunito', sans-serif;
    display: inline-block;
    animation: fadeInDown 0.6s ease;
    height: 60%; /* se estiver dentro de um nav fixo */
}

.user-greeting strong {
    color: #D7171E;
}

.user-greeting a {
    background-color: #D7171E;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 13px;
    text-decoration: none;
}

@keyframes fadeInDown {
    from {
        opacity: 0;
        transform: translateY(-15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

#menu a{
    color: rgb(247, 247, 247);
}

#menu ul li :hover{
    transition:60s;
}

#menu ul :hover{
    transition: 0.4s;
    background-color: rgba(77, 77, 77, 0.329);
    border-radius: 10px;
    text-decoration: none;
}

.menu-trigger{
    display: none;
    padding: 5px;
}

.menu-trigger:hover {
    background-color: rgba(77, 77, 77, 0.329);
    border-radius: 5px;
    transition: 0.4s;
}

@media (max-width: 440px){

    .menu-trigger{
        display: flex;
        cursor: pointer;
    }

    .hidden-menu {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: opacity 0.4s ease, max-height 0.4s ease;
    }

    .active-menu {
        opacity: 1;
        max-height: 500px; 
        transition: opacity 0.4s ease, max-height 0.4s ease;
    }
}

@media screen and (max-width: 500px) {
  .dashboard-logo {
    --wyw-brand-size: clamp(1.1rem, 5vw, 1.4rem);
    gap: 8px;
  }

}

/* Search Bar*/
#search-div {
    flex: 1 1 320px;
    min-width: 220px;
    max-width: 560px;
    margin: 0 clamp(12px, 3vw, 32px);
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.search-panel {
    position: relative;
    width: 100%;
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: clamp(12px, 1.2vw, 16px);
    padding: clamp(5px, 0.3vw, 8px) clamp(5px, 0.5vw, 10px);
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)); /*Glass transparency*/
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.034);
    border-radius: 10px;
    color: #f5f6ff;
    transition: box-shadow 0.25s ease, transform 0.25s ease;
    overflow: hidden;
}

.search-input-wrapper::after {
    content: "";
    position: absolute;
    inset: auto 18px -26px 18px;
    height: 60px;
    border-radius: 50%;
    opacity: 0.6;
    pointer-events: none;
}

.search-input-wrapper:focus-within {
    box-shadow: 0 20px 40px rgba(140, 26, 38, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
}

.search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.82);
}

.search-icon svg {
    width: clamp(18px, 2vw, 22px);
    height: clamp(18px, 2vw, 22px);
}

.search-bar {
    flex: 1;
    background: transparent;
    border: none;
    color: #f5f6ff;
    font-size: clamp(0.95rem, 1.4vw, 1.05rem);
    font-weight: 500;
    padding: 0;
    caret-color: #ff647c;
}

.search-bar:focus {
    outline: none;
}

.search-bar::placeholder {
    color: rgba(255, 255, 255, 0.55);
    font-weight: 400;
}

.clear-search {
    width: clamp(34px, 3vw, 40px);
    height: clamp(34px, 3vw, 40px);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.92);
}

.clear-search svg {
    width: 14px;
    height: 14px;
}

.clear-search:focus-visible {
    outline: 2px solid rgba(255, 100, 124, 0.8);
    outline-offset: 3px;
}

.search-input-wrapper.has-text .clear-search {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
}

.search-results {
    position: absolute;
    top: calc(100% + 16px);
    left: 0;
    width: 100%;
    max-height: clamp(280px, 36vh, 400px);
    overflow-y: auto;
    padding: clamp(10px, 1.5vw, 18px);
    border-radius: 15px;
    background: linear-gradient(135deg, rgba(16, 18, 32, 0.95), rgba(12, 12, 20, 0.88));
    box-shadow: 0 24px 48px rgba(5, 4, 14, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    z-index: 999;
}

.search-results::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at top right, rgba(255, 64, 87, 0.16), transparent 45%);
    pointer-events: none;
}

.search-results::-webkit-scrollbar {
    width: 6px;
}

.search-results::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
}

.search-result-card {
    display: grid;
    grid-template-columns: clamp(64px, 6vw, 80px) 1fr;
    gap: clamp(12px, 1.4vw, 18px);
    padding: clamp(12px, 1.3vw, 18px);
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(36, 38, 56, 0.75), rgba(18, 20, 34, 0.85));
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

.search-result-card + .search-result-card {
    margin-top: clamp(8px, 1vw, 12px);
}

.search-result-card::after {
    content: "";
    position: absolute;
    inset: auto -30px -50px;
    height: 120px;
    background: radial-gradient(circle, rgba(255, 83, 112, 0.28) 0%, rgba(255, 83, 112, 0) 60%);
    opacity: 0;
    transition: opacity 0.25s ease;
}

.search-result-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.12);
    background: linear-gradient(135deg, rgba(48, 50, 72, 0.86), rgba(24, 26, 42, 0.9));
}

.search-result-card:hover::after {
    opacity: 1;
}

.search-result-card img {
    width: 100%;
    height: clamp(88px, 10vh, 104px);
    object-fit: cover;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
}
.search-result-card figure {
    margin: 0;
}


.result-info {
    display: flex;
    flex-direction: column;
    gap: clamp(6px, 0.9vw, 9px);
    color: #f4f4f7;
}

.result-title {
    font-size: clamp(1rem, 1.6vw, 1.1rem);
    font-weight: 600;
    margin: 0;
    line-height: 1.4;
}

.result-tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.result-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.78rem;
    letter-spacing: 0.01em;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
}

.chip--type {
    background: linear-gradient(135deg, rgba(140, 35, 45, 0.92), rgba(210, 55, 66, 0.8));
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
}

.chip--year {
    background: linear-gradient(135deg, rgba(58, 58, 140, 0.92), rgba(94, 94, 180, 0.78));
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
}

.chip--genre {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.76);
}

.search-empty {
    margin: 0;
    padding: clamp(16px, 2vw, 20px);
    text-align: center;
    color: rgba(255, 255, 255, 0.68);
    font-size: clamp(0.9rem, 1.4vw, 1rem);
}


@media (max-width: 1000px) {
    #search-div {
        order: 3;
        margin-top: 16px;
        max-width: none;
    }

    .search-results {
        position: static;
    }
}

.dashboard-logo {
  --wyw-brand-size: clamp(1.35rem, 2.2vw, 1.8rem);
  --wyw-brand-eye-scale: 0.5;
  gap: 10px;
  align-items: center;
}

.dashboard-logo .wyw-brand__watch {
  text-shadow: none;
}
.home-header,
.home-header:hover,
.home-header:focus,
.home-header:visited {
    text-decoration: none;
}

</style>


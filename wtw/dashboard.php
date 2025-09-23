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

        <div id="loading" class="loading-overlay" style="display: none;">
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
                        <!-- PÃƒÆ’Ã‚Â¡lpebra (Eyelid) -->
                        <g class="eyelid">
                            <path class="fil0" d="M532.42 0.03c-322.51,-0.12 -481.5,242.15 -531.95,492.2 347.34,-325.33 697.1,-320.9 1036.48,2.01 -30.69,-257.9 -229.35,-497.39 -504.53,-494.21z"/>
                        </g>
                        <!-- Parte inferior branca -->
                        <path class="fil1" d="M531.95 1068.61c-322.51,0.12 -481.5,-242.15 -531.95,-492.2 347.34,325.33 697.1,320.9 1036.49,-2.01 -30.69,257.9 -229.36,497.39 -504.53,494.21z"/>
                        <!-- ÃƒÆ’Ã‚Âris -->
                        <ellipse class="fil0" cx="512.12" cy="527.36" rx="191.4" ry="191.94"/>
                    </g>
                </svg>
            </div>

            <p>Carregando...</p>
        </div>



        <div id = "search-div">

            <div>
                <input type="text" class="search-bar" id="searchmovie" placeholder="Pesquisar filme ou s&eacute;rie" autocomplete="off" >
                <!-- <button id="botaoPesquisar">Pesquisar</button> -->

                <div id="results" style="display: none;"></div>
            </div>

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
    max-width: 520px;
    margin: 0 clamp(12px, 3vw, 28px);
    position: relative;
}

.search-bar {
    width: 100%;
    height: 42px;
    padding: 0 0px 0 40px;
    border-radius: 30px;
    border: none;
    background: linear-gradient(0deg, #1f1f1f 0%, #2e2e2e 100%);
    color: white;
    font-size: 16px;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'><path fill-rule='evenodd' d='M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z' clip-rule='evenodd'/></svg>");
    background-position: 12px center;
    background-repeat: no-repeat;
    background-size: 18px 18px;
    transition: box-shadow 0.3s ease;
}

.search-bar:focus {
    outline: none;
}

input::placeholder {
    color: #aaa;
}

@media (max-width: 1000px) {
    #search-div {
    flex: 1 1 320px;
    min-width: 220px;
    max-width: 520px;
    margin: 0 clamp(12px, 3vw, 28px);
    position: relative;
}
}

#results {
    position: absolute;
    top: 100%;
    width: 100%;
    max-height: 280px;
    overflow-y: auto;
    background: rgba(20, 20, 20, 0.96);
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
    z-index: 999;
    margin-top: 8px;
    padding: 8px 0;
}

#results::-webkit-scrollbar {
    width: 8px;
}

#results::-webkit-scrollbar-thumb {
    background-color: #333;
    border-radius: 10px;
}

.resultsDiv {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    transition: background 0.2s ease;
}

.resultsDiv:hover {
    background-color: #111;
    cursor: pointer;
}

#results img {
    width: 50px;
    height: 70px;
    object-fit: cover;
    border-radius: 8px;
    margin-right: 12px;
    flex-shrink: 0;
}

#results h3 {
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    color: #eee;
}
.movie-info{
    top: 0;
    left: 0;
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














<nav id="menu">
    
    <div class="faixa">

      <!-- <li><a href="index.php" class="logo"> <img src="imagens/Where-toWatch.png" alt="logo" style="width: 80px"></li></a> -->
        <a href="index.php" class="home-header">
            <h2 class="logo">             
                <span class="logo-font">where you</span>
                <span class="logo-font2">
                    WATCH
                </span>
            </h2>
        </a>

        <nav id="menu-buttons" class="hidden-menu">
            <ul id="ulBotoes">
                
                <li><a href="index.php">Pagina Inicial </a></li>
                <?php 
                session_start();

                if(isset($_SESSION['nome'])){
                    echo "<li> <a href='tmdb_consult.php'> Adicionar Filme </a></li>";
                } 
                ?>
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
                        <!-- Pálpebra (Eyelid) -->
                        <g class="eyelid">
                            <path class="fil0" d="M532.42 0.03c-322.51,-0.12 -481.5,242.15 -531.95,492.2 347.34,-325.33 697.1,-320.9 1036.48,2.01 -30.69,-257.9 -229.35,-497.39 -504.53,-494.21z"/>
                        </g>
                        <!-- Parte inferior branca -->
                        <path class="fil1" d="M531.95 1068.61c-322.51,0.12 -481.5,-242.15 -531.95,-492.2 347.34,325.33 697.1,320.9 1036.49,-2.01 -30.69,257.9 -229.36,497.39 -504.53,494.21z"/>
                        <!-- Íris -->
                        <ellipse class="fil0" cx="512.12" cy="527.36" rx="191.4" ry="191.94"/>
                    </g>
                </svg>
            </div>

            <p>Carregando...</p>
        </div>



        <div id = "search-div">

            <div>
                <input type="text" class="search-bar" id="searchmovie" placeholder="Pesquisar filme ou série" autocomplete="off" >
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
                echo "<label>Olá, " . $_SESSION['nome'] . " ";
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
    max-width:100%;
    height: 64px;
}

.faixa {
    display: flex;
    top: 0; /* Define a posição no topo */
    left: 0; /* Define a posição na borda esquerda */
    max-width: 1400px; /* Faz o menu ocupar toda a largura da página */
    z-index: 1000; /* Garante que o menu fique acima de outros elementos */
    flex-direction: row;
    align-items: center; /* Centraliza verticalmente */
    border: solid 1px black;
    background-color: rgb(0, 0, 0);
    margin: 0 auto;
    height: 60px;
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

.user-menu ul li{
    padding-left: 30px; /* espaço para a lupa */
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
    border-radius: 5px;
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
  .logo-font {
    font-size: 24px;
  }

}


/* Search Bar*/

#search-div{
    width: 50%;
    margin: 0 auto;
}

.search-bar {
    margin: 0 auto;
    border-radius: 10px;
    height: 35px;
    width: 60%;
    background: #d7d7d7;
    background: -webkit-linear-gradient(0deg, #d7d7d7 0%, #eeeeee 100%);
    background: linear-gradient(0deg, #d7d7d7 0%, #eeeeee 100%);
    padding: 0px 10px; 
}

@media (max-width: 1000px) { 
    #search-div {
        display: none; /* Oculta a barra de pesquisa */
    }  

}

input::placeholder{
    padding: 10px;
}

input[type="text"] {
  background-color: #000;
  border: 1px solid #ccc;
  color: #fff;
  padding-left: 30px; /* espaço para a lupa */
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'><path fill-rule='evenodd' d='M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z' clip-rule='evenodd'/></svg>");
  background-position: 8px center;
  background-size: 20px 20px; /* largura altura */
  background-repeat: no-repeat;
}



/*Search Movie// procurar filmes*/

#results {
    position: absolute;
    height: 200px; 
    width: 38%;
    overflow-y: auto; /* Habilita rolagem vertical */
    padding: 5px 0px 0px 0px; 
    border-radius: 15px 15px 15px 15px;
    box-shadow: 0px 4px 8px rgb(0, 0, 0);
    z-index: 30;
    border-bottom: 1px solid #ddd;
    background-color: rgba(22, 22, 22, 0.92);
    transition: 4s ease-in-out;
}

#results {
    display: flex; 
    padding: 5px;
}

#results div:last-child {
    border-bottom: none; /* Remove a linha de separação do último item */
}

#results::-webkit-scrollbar {
    border: none;
}

#results::-webkit-scrollbar-track {
    background-color: rgb(48, 48, 48);
    border-radius: 15px;
}

#results::-webkit-scrollbar-thumb{
    background-color: #161616;
    border-radius: 15px; 
    height: 25px;
    box-shadow: 2px 2px 2px 1px rgba(0, 0, 0, 0.2);
} 

#results img {
    width: 80px; 
    height: 115px;
    background-size: cover;
    border-radius: 10px;
    margin-right: 10px;
}

#results h3 {
    font-size: 20px;
    margin: 0;
}

#results div:hover{
    background-color:rgb(0, 0, 0);
    cursor: pointer;
}

.resultsDiv{
    display: flex;
    padding: 10px 0px;
}

.movie-info{
    top: 0;
    left: 0;
}


.logo span {
  display: inline;
  padding: 0;
  margin: 0;
}

.logo-font{
    font-family: Quicksand;
    font-weight: 600;
    font-size: 30px;
}

.logo-font2{
    font-family: Bebas Neue;
    font-size: 35px;
    color: #D7171E;
}

.home-header,
.home-header:hover,
.home-header:focus,
.home-header:visited {
    text-decoration: none;
}

</style>

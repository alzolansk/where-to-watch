<nav id="menu">
    
    <div class="faixa">

       <li><a href="index.php" class="logo"> <img src="imagens/Where-toWatch.png" alt="logo" style="width: 80px"></li></a>

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
            <div class="spinner"></div>
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
                echo '<div class="user-menu">';
                echo "<label>Olá, " . $_SESSION['nome'] . " ";
                echo '<a href= logout.php class=btn-danger> Sair </a>';
                echo '</div>';
                echo '<div class="menu-trigger">';
                echo '<img onclick="toggleMenu()" src="imagens/menu-icon.png" alt="Menu Icon" id="menuIcon" width="30px">';
                echo '</div>';
            }
            ?>  



        <dialog id="addMovieScreen">
            <div id="moviecontent" class="modal-flex">
            <div class="poster-title-id">
                <img src="" alt="Poster Filme" id="moviePoster" class="img-fluid2">
            <div>
                <h2 id="movieTitle"></h2>
                <p id="idTMDB"></p>
                <p id="movieGenre"></p>
            <div>
                <p id="providerItem"></p>
                <p id="logoProvider"></p>
                <p id="mediaTypeP"></p>
            </div>
            <button id="addMovieButton" class="btn btn-danger">Adicionar filme/série</button>
            </div>
            </div>
            <p id="movieSinopse" class="sinopse"></p>
            <img id="backdrop" src="" style="display: none;" alt="Backdrop Image">
            <button id="closeModal" class="btn btn-secondary">Fechar</button>
            </div>
         <div class="overlay"></div> <!-- Camada de fundo preto -->
        </dialog>
    </div>
</nav>

<style>
    
/* Main Menu */

.faixa {
    display: flex;
    position: fixed; /* Fixa o elemento na janela de visualização */
    top: 0; /* Define a posição no topo */
    left: 0; /* Define a posição na borda esquerda */
    width: 100%; /* Faz o menu ocupar toda a largura da página */
    z-index: 1000; /* Garante que o menu fique acima de outros elementos */

    flex-direction: row;
    align-items: center; /* Centraliza verticalmente */
    height: auto;
    border: solid 1px black;
    background-color: rgb(12, 12, 12);
    padding: 10px 10px 10px 10px;
}

.faixa ul{
    display: flex;
    text-decoration: none;
    list-style: none;
    margin: 0;
    font-size: 15px;
}

.faixa ul li{
    padding: 8px;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-menu {
    display: column;
    white-space: nowrap;
    align-items: center; /* Alinha verticalmente os elementos */
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


/* Search Bar*/

#search-div{
    width: 50%;
    margin: 0 auto;
}

.search-bar {
    margin: 0 auto;
    border-radius: 10px;
    height: 35px;
    width: 75%;
    background: #d7d7d7;
    background: -webkit-linear-gradient(0deg, #d7d7d7 0%, #eeeeee 100%);
    background: linear-gradient(0deg, #d7d7d7 0%, #eeeeee 100%);
    padding: 0px 10px; 
}

@media (max-width: 1000px) { 
    #search-div {
        width: 30%; /* Oculta a barra de pesquisa */
    }  
}

@media (max-width: 800px) { 
    #search-div {
        display: none; /* Oculta a barra de pesquisa */
    }  

}

input::placeholder{
    padding: 10px;
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
</style>

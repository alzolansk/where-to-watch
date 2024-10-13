<nav id="menu">
    
    <div class="faixa">

       <li><a href="index.php" class="logo"> <img src="imagens/Where-toWatch.png" alt="logo" style="width: 80px; margin-bottom: 10px;"></li></a>

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

            <input type="text" class="search-bar" id="searchmovie" placeholder="Pesquisar filme ou série" autocomplete="off">
                <!-- <button id="botaoPesquisar">Pesquisar</button> -->

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

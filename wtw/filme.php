<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/movie.css">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    
    <title id="title-movie"></title>

    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">

</head>
<body>

    <?php include_once('dashboard.php'); ?>

  <main class="interface-section">

    <!-- Container centralizado -->
    <div class="page-container">
        
        <div id="movie-div" class="movieDiv">
            <div id="movie-info" class="movieInfo">
                <div class="poster-title">
                    <div class="poster-provider">
                        <img id="itemPoster" class="posterItem" src="" alt="Poster do Filme">
                        <h2 class="wtw-font">
                            <span class="wtw-white">
                                Onde
                            </span>
                        
                            <span class="wtw-red">
                            assistir?
                            </span>
                        </h2>
                        <p id="providers" class="providersNames"></p>
                    </div>
                    <div class="genre-title">
                        <h2 id="itemName" class="animate__animated animate__backInLeft"></h2>
                        <p id="genreMovie"></p>
                        <p id="release-date"></p>
                        <h4 id="overviewTitle"> Sinopse </h4>
                        <p id="movieOverview"></p>
                        
                        <li class="tools-section">
                            <a id="trailer-link" class="tools" href="#" target="_blank">▶ Assistir Trailer</a>
                            <a href="#" class="tools">&#128278; Assistir mais tarde</a>

                            <div class="tools notify-dropdown">
                                <span>&#128339; Avise-me se este <span id="media-type"></span> chegar em</span>
                                <button class="dropbtn">Netflix ▾</button>
                                <div class="dropdown-content">
                                    <a href="#">Netflix</a>
                                    <a href="#">Amazon Prime</a>
                                    <a href="#">Disney+</a>
                                    <a href="#">Max</a>
                                </div>
                            </div>
                        </li>

                        
                    </div>
                </div>
            </div>
            <div class="backdrop-container"> 
                <div id="leftGradient"></div>
                <img id="backdropImage" src="" alt="Backdrop">
            </div>
            <div id="backdropOverlay" class="overlay"></div> <!-- Camada de fundo preto --> 
        </div>
        
        <div class="castDiv">
            <h3 class="cast-label">Elenco</h3>
            <div id="cast-list"></div>
            <div class="cast-fade" id="castFade"></div> <!-- fade-out -->
        </div>

        <!-- Modal ATOR -->
        <dialog id="actorDialog" class="actor-dialog">
            <div id="actorContent" class="modal-class">
                <div class="poster-actor">
                    <img src="" alt="Poster Ator" id="actorPoster" class="profileImg">
                    <div class="">
                    <h2 id="actorName" class=""></h2>
                </div>
                <p id="actorOverview" class="bio"></p>
                <img id="backdrop" src="" style="display: none;" alt="">
                <button id="closeItem" class="btn btn-danger">Fechar</button>
            </div>
            <div class="overlay-modal"></div> <!-- Camada de fundo preto -->
        </dialog>
    </div>
  </main>

    <script src="js/filme.js"></script>
    <script src="js/script.js"></script>
    <script src="js/search.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.2/color-thief.umd.js"></script>
</body>
</html>
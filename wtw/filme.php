<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/movie.css">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    
    <title id="title-movie"></title>
</head>
<body>
    <?php

    include_once('dashboard.php');

    ?>

    <main>
        
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
                        <p id="movieOverview"></p>
                        <a id="trailer-link" href="#" target="_blank">Assistir Trailer</a>
                    </div>
                </div>
            </div>
            <img id="backdropImage" src="" alt="Backdrop">
            <div class="overlay"></div> <!-- Camada de fundo preto --> 
        </div>
        
        <div class="castDiv">
            <div id="cast-list"></div>
            <p id="cast-name"></p>
        </div>

        <!-- Modal ATOR -->
        <dialog id="actorDialog" class="actor-dialog">
            <div id="actorContent" class="modal-class">
                <div class="">
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

    </main>

    <script src="js/filme.js"></script>
    <script src="js/script.js"></script>
</body>
</html>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="icon" href="imagens/favicon-wtw.png">
    <link rel="stylesheet" href="style.css">
    <title>Adicionar novo filme</title>
</head>
<body>

    <?php
        include_once('dashboard.php');
    ?>

<section id="interface">

    <div id = "search-div">

        <button id="addMovie">Adicionar filme/série</button>

        <div>
            <input type="text" id="searchmovie" placeholder="Pesquisar filme ou série" autocomplete="off" style="display:none;">
            <!-- <button id="botaoPesquisar">Pesquisar</button> -->

            <div id="results" style="display: none;"></div>
        </div>

    </div>

    <dialog id="addMovieScreen">
        <div id="moviecontent" class="modal-flex">
            <div class="poster-title-id">
            <img src="" alt="Poster Filme" id="moviePoster" class="img-fluid">
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
            <button id="closeModal" class="btn btn-secondary">Fechar</button>
        </div>
    </dialog>

</section>
    
</body>

<script src="consultmovies.js"></script>
</html>
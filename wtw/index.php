<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <link rel="stylesheet" href="css/style.css">
    <!--<link rel="stylesheet" href="css/searchmovie.css">-->
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">

    <title>where you watch</title>

</head>

<body>    

    <?php

    include_once('dashboard.php');
    include_once('config/config.php');

    //$sql_consult_filmes = "SELECT * FROM tb_items WHERE type_item = 'Filme'";
    //$result_filmes = $conexao->query($sql_consult_filmes);

    //$sql_consult_serie = "SELECT * FROM tb_items WHERE type_item = 'Serie'";
    //$result_serie = $conexao->query($sql_consult_serie);

    ?>


    <section id="interface" class="interface-section">

            <!-- Modal para o trailer -->
            <dialog id="dialog" class="dialog">
                <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                <button id="close-trailer" onclick="closeTrailer()">X</button>
            </dialog>

            <div class="wrap">

               <!-- <div class="cinema-container" id="cinemaContainer">
                    <h2 class="cinema-font">
                        <span class="title-wrap">
                            chegando nos cinemas
                        </span>
                        
                        <span class="title-wrap2">
                            em breve!
                        </span>
                    </h2>
                </div>
                !-->

            <button id="btnLeft" class="prev" onclick="scrollLeftCustom()">&#10094;</button>

            <div id="container-wrap" class="container-wrap">
                <!--Primeiro container com trailer e backdrop-->
            </div>
            <button id="btnRight" class="next" onclick="scrollRight()">&#10095;</button>
            </div>

            <div class="category-buttons">
                <div class="style-buttons">
                    <button id="showMovies" class="btn-category active">Filmes</button>
                    <button id="showSeries" class="btn-category">Séries</button>
                </div>
            </div>
            
        <div class="media-section">
        <div class="container">

            <h2 class="logo"><b>|</b>
                <span class="maisPop">Mais populares no</span>

                <span class="logo-font"> where</span>
                <span class="logo-font-y"> y </span>
                <img src="imagens/eye-icon2.svg" alt="o" class="logo-eye" />
                <span class="logo-font">u</span>
                <span class="logo-font2">WATCH</span>
            </h2>

            <div class="carousel-container">
                <button class="nav-arrow slider-prev" data-target="popular-movies-container">&#10094;</button>
                <div class="row" id="popular-movies-container">
                    <!-- Os filmes populares serão ecibidos aqui -->
                </div>
                <button class="nav-arrow slider-next" data-target="popular-movies-container">&#10095;</button>
            </div>

            <h2 class="logo"><b>|</b>
                <span class="logo-font"> where</span>
                <span class="logo-font-y"> y </span>
                <img src="imagens/eye-icon2.svg" alt="o" class="logo-eye" />
                <span class="logo-font">u</span>
                <span class="logo-font2">WATCH</span>
                <span class="indicaSpan">
                    indica
                </span>
            </h2>

            <div class="carousel-container">
                <button class="nav-arrow slider-prev" data-target="top-movies-container">&#10094;</button>
                <div class="row" id="top-movies-container">
                    <!-- Os filmes com maiores notas serão ecibidos aqui -->
                </div>
                <button class="nav-arrow slider-next" data-target="top-movies-container">&#10095;</button>
            </div>

            <h2 class="logo"><b>|</b>
                <span class="logo-font"> Bombando</span>
                <span class="logo-font2">essa semana</span>
            </h2>

            <div class="carousel-container">
                <button class="nav-arrow slider-prev" data-target="trending-movies-container">&#10094;</button>
                <div class="row" id="trending-movies-container">
                    <!-- Os filmes com maiores notas serão ecibidos aqui -->
                </div>
                <button class="nav-arrow slider-next" data-target="trending-movies-container">&#10095;</button>
            </div>

            <h2 class="logo"><b>|</b>
                <span class="logo-font"> Para os amantes de </span>
                <span class="logo-font2">musicais</span>
            </h2>

            <div class="carousel-container">
                <button class="nav-arrow slider-prev" data-target="musical-movies-container">&#10094;</button>
                <div class="row" id="musical-movies-container">
                    <!-- Os filmes com maiores notas serão ecibidos aqui -->
                </div>
                <button class="nav-arrow slider-next" data-target="musical-movies-container">&#10095;</button>
            </div>
            <!--            
                <?php 

                if(isset($_SESSION['nome'])){

                echo ("<h2><b>|</b> Filmes perfeitos para " .($_SESSION['nome']) ."</h2>");
                } else{
                    echo "Filmes perfeitos para você";
                }
                ?>

            <div class="carousel-container">

                    <button class="prev" onclick="scrollLeftCustom()">&#10094;</button>  Seta anterior 
                <div class="row" id="popular-movies-container">
                        <?php if ($result_filmes->num_rows > 0): ?>
                        <?php while($row = $result_filmes->fetch_assoc()): ?>
                            <div class="col-md-3 movies">
                                <div class="description">
                                    <li id="movie-li-link">
                                        <img src="<?= $row['img_url'] ?>" alt="" class="img-fluid">
                                    </li>
                                    <img src="imagens/star-emoji.png" alt="" class="rating">
                                    <p class="rating-value"><?= $row['rate_item'] ?></p>
                                    <li class="movie-name"><a href="#"><?= $row['title_item'] ?></a></li>
                                    <li class="watch-trailer">
                                        <a href="#" onclick="showTrailer('<?= $row['trailer_url'] ?>')">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <p>Nenhum filme encontrado.</p>
                    <?php endif; ?>
                </div>

                  <button class="next" onclick="scrollRight()">&#10095;</button> Seta próximo 

            </div>

                <h2><b>|</b>Séries do Momento</h2>

                <div class="carousel-container">
                
                    <div class="row">
                            <?php if ($result_serie->num_rows > 0): ?>
                            <?php while($row = $result_serie->fetch_assoc()): ?>
                                <div class="col-md-3 movies">
                                    <div class="description">
                                        <li id="movie-li-link">
                                            <img src="<?= $row['img_url'] ?>" alt="" class="img-fluid">
                                        </li>
                                        <img src="imagens/star-emoji.png" alt="" class="rating">
                                        <p class="rating-value"><?= $row['rate_item'] ?></p>
                                        <li class="movie-name"><a href="#"><?= $row['title_item'] ?></a></li>
                                        <li class="watch-trailer">
                                            <a href="#" onclick="event.preventDefault(); showTrailer('<?= $row['trailer_url'] ?>')">
                                                <img src="imagens/video-start.png" alt=""> Trailer
                                            </a>
                                        </li>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <p>Nenhum filme encontrado.</p>
                        <?php endif; ?>
                    </div>
            </div>
                                            -->

        </div>        
        <footer>
            <p class="justwatch-attr">
                Dados de provedores fornecidos por 
                <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">JustWatch</a>
            </p>
        </footer>
        </div> <!-- end media-section -->
    </section>
</body>

<script src="js/container.js"></script>
<script src="js/script.js"></script>
<script src="js/search.js"></script>


</html>
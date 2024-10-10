<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
    <link rel="stylesheet" href="style.css">
    <link rel="icon" href="imagens/favicon-wtw.png">

    <title>Where To Watch?</title>

</head>

<body>    

    <?php

    include_once('dashboard.php');
    include_once('config.php');

    $sql_consult_filmes = "SELECT * FROM items WHERE type_item = 'Filme'";
    $result_filmes = $conexao->query($sql_consult_filmes);

    $sql_consult_serie = "SELECT * FROM items WHERE type_item = 'Serie'";
    $result_serie = $conexao->query($sql_consult_serie);

    ?>


    <section id="interface">

            <!-- Modal para o trailer -->
            <dialog id="dialog" class="dialog">
                <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                <button id="close-trailer" onclick="closeTrailer()">X</button>
            </dialog>

            <div class="wrap">

                <div class="cinema-container">
                    <h2 class="cinema-font">
                        <span class="title-wrap">
                            Chegando nos cinemas
                        </span>
                        
                        <span class="title-wrap2">
                            em breve!
                        </span>
                    </h2>
                </div>

            <button class="prev" onclick="scrollLeftCustom()">&#10094;</button>

            <div id="container-wrap" class="container-wrap">
                <!--Primeiro container com trailer e backdrop-->
            </div>

            <button class="next" onclick="scrollRight()">&#10095;</button>
            </div>

        <div class="container">

            <h2><b>|</b>
                <span>
                    Mais populares no
                </span>
                
                <span class="logo-font">
                    Where To
                </span>
                <span class="logo-font2">
                    WATCH
                </span>
            </h2>

            <div class="carousel-container">
                <div class="row" id="popular-movies-container">
                    <!-- Os filmes populares serão ecibidos aqui -->
                </div>
            </div>

            <h2><b>|</b>
                <span class="logo-font">
                    Where to
                </span>
                <span class="logo-font2">
                    WATCH
                </span>
                <span>
                    indica
                </span>
            </h2>

            <div class="carousel-container">
                <div class="row" id="top-movies-container">
                    <!-- Os filmes com maiores notas serão ecibidos aqui -->
                </div>
            </div>
            
            <h2><b>|</b> <?php echo "Filmes perfeitos para " . $_SESSION['nome'] . " "?> </h2>

            <div class="carousel-container">

                <!--    <button class="prev" onclick="scrollLeftCustom()">&#10094;</button>  Seta anterior -->

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

                <!--  <button class="next" onclick="scrollRight()">&#10095;</button> Seta próximo -->

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
        </div>        
    </section>
</body>

<script src="container.js"></script>
<script src="script.js"></script>

</html>
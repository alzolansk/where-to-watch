<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
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
            <dialog id="dialog">
                <iframe id="trailerFrame" width="809" height="465" src="" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                <button id="closeTrailer" onclick="closeTrailer()">X</button>
            </dialog>

        <div class="container">

        <h2><b>|</b> Filmes em destaque hoje</h2>

            <div class="row">
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

            <h2><b>|</b>Séries do Momento</h2>
             
            <div class="row">
                    <?php if ($result_serie->num_rows > 0): ?>
                    <?php while($row = $result_serie->fetch_assoc()): ?>
                        <div class="col-md-3 movies">
                            <div class="description">
                                <li id="movie-li-link">
                                     <a href="<?= $row['trailer_url'] ?>" id="movie-link">
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
            
    </section>

</body>

    <script src="script.js"></script>
    <script> 
    function showTrailer(trailerUrl) {
        document.getElementById('trailerFrame').src = trailerUrl.replace("watch?v=", "embed/");
        document.getElementById('dialog').showModal();
    }

    function closeTrailer() {
        document.getElementById('dialog').close();
        document.getElementById('trailerFrame').src = ""; 
    }
    </script>

</html>
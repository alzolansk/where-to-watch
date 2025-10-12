<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/style.css">
    <!--<link rel="stylesheet" href="css/searchmovie.css">-->
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">

    <title>where you watch</title>

</head>

<body>    

    <?php include_once('dashboard.php');
        include_once('config/config.php');
    ?>

    <section id="interface" class="interface-section">

        <!-- Modal para o trailer -->
        <dialog id="dialog" class="dialog">
            <iframe id="trailerFrame" src="" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            <button id="close-trailer" onclick="closeTrailer()">X</button>
        </dialog>

        <div class="wrap">
            <button id="btnLeft" class="prev" onclick="scrollLeftCustom()">&#10094;</button>
            <div id="container-wrap">
            <!--Primeiro container com trailer e backdrop-->
            </div>
            <button id="btnRight" class="next" onclick="scrollRight()">&#10095;</button>
        </div>

        <div class="provider-btn-container">
            <div class="provider-btn-div" data-provider-picker data-catalog-url="providers.php">
                <button type="button" class="provider-btn" data-provider-id="337" data-provider-name="Disney+" aria-label="Disney+">
                    <img src="https://image.tmdb.org/t/p/w300/97yvRBw1GzX7fXprcF80er19ot.jpg" alt="Disney+">
                </button>
                <button type="button" class="provider-btn" data-provider-id="8" data-provider-name="Netflix" aria-label="Netflix">
                    <img src="https://image.tmdb.org/t/p/w300/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" alt="Netflix">
                </button>
                <button type="button" class="provider-btn" data-provider-id="9" data-provider-name="Prime Video" aria-label="Prime Video">
                    <img src="https://image.tmdb.org/t/p/w92/68MNrwlkpF7WnmNPXLah69CR5cb.jpg" alt="Prime Video">
                </button>
                <button type="button" class="provider-btn" data-provider-id="350" data-provider-name="Apple TV+" aria-label="Apple TV+">
                    <img src="https://image.tmdb.org/t/p/w300/2E03IAZsX4ZaUqM7tXlctEPMGWS.jpg" alt="Apple TV+">
                </button>
                <button type="button" class="provider-btn" data-provider-id="384" data-provider-name="HBO Max" aria-label="HBO Max">
                    <img src="https://image.tmdb.org/t/p/w300/jbe4gVSfRlbPTdESXhEKpornsfu.jpg" alt="HBO Max">
                </button>
            </div>
        </div>

        <div class="category-buttons">
            <div class="style-buttons">
                <button id="showMovies" class="btn-category active">Filmes</button>
                <button id="showSeries" class="btn-category">S&eacute;rie</button>
            </div>
        </div>
        <div class="media-section">
            <div class="container">
                <div id="media-sections-root" class="media-sections-root" data-section-root></div>
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




<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <link rel="stylesheet" href="css/person.css">

    <title id="name-person"></title>
</head>
<body>
    <?php include_once('dashboard.php'); ?>
    <main class="interface-section">
        <div class="page-container">
            <div class="person-div" id="personDiv">
                <img id="person-img" src="" alt="Foto do ator" class="actor-photo">
                
                <div class="name-bio">
                    <h1 id="person-name"><span id="heart-icon">♡</span></h1>
                    <h2 id="profession-label-1" style="display: none;">Profissão</h2>
                    <p id="person-profession-1" style="display: none;"></p>   
                    <h3 id="bio-h3" class="bio-label">Biografia</h3>
                    <p id="person-bio" class="person-bio"></p>
                    <!-- LINHA DO TEMPO DE FILMES -->
                    <div class="timeline-container">
                        <div id="timeline-section" class="timeline-section">
                            <svg id="timeline-curve"></svg>
                            <div class="timeline-container" id="timeline-container">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <h2 id="profession-label-2">Profissão</h2>
            <p id="person-profession-2" class="person-profession-2 label-2">Profissão</p>

            <!-- SESSÃO: COLABOROU COM -->
            <h2 class="worked-title">Worked with</h2>
            <div class="worked-carousel" id="worked-with">
                <!-- Os atores serão inseridos aqui via JS -->
            </div>
        </div>
    </main>
</body>
<script src="js/person.js"></script>
<script src="js/search.js"></script>
<script src="js/script.js"></script>
</html>
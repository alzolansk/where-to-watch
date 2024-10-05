<nav id="menu">
    
    <div class="faixa">

       <li><a href="index.php" class="logo"> <img src="imagens/Where-toWatch.png" alt="logo" style="width: 80px"></li></a>

        <nav id="menu-buttons" class="hidden-menu">
            <ul id="ulBotoes">
                
                <li><a href="index.php">Pagina Inicial </a></li>
                <li><a href="tmdb_consult.php">Adicionar filme</a></li>

            </ul>
        </nav>

    <input type="text" class="search-bar" placeholder="Pesquisar na Where to Watch">

        <?php
            session_start();

            if(!isset($_SESSION['nome']) || !isset($_SESSION['id'])) {
                
            echo "<ul><li><a href=login.php> Fazer login </a></li></ul>";

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
    </div>
</nav>
<script src="script.js"></script>
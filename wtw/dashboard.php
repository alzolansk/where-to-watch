<nav id="menu">
    
<div class="faixa">

    <li><a href="index.php" class="logo"> <img src="imagens/Where-toWatch.png" alt="logo" width="70px"></li></a>

    <ul>
        
        <li><a href="index.php">Pagina Inicial </a></li>
        <li><a href="#"> Melhores Filmes </a></li>
        <li><a href="tmdb_consult.php">Adicionar filme</a></li>

    </ul>

    <input type="text" id="search-bar" placeholder="Pesquisar na IMDb">

    <?php

        session_start();

        if(!isset($_SESSION['nome']) || !isset($_SESSION['id'])) {
            
        echo "<ul
        ><li><a href=login.php> Fazer login </a></li>";

        } else if (isset($_SESSION['nome'])) {
            echo "<ul><li><a href= #>Olá, " . $_SESSION['nome'];
            echo "<a href= logout.php class=btn-danger> Sair </a>";
        }
        ?>


    </div>
</nav>
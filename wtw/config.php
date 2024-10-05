<?php 

    $usuario = 'root';
    $senha ='';
    $database = 'db_login';
    $host = 'localhost';    
        
$conexao = new mysqli($host, $usuario, $senha, $database);

if($conexao->error){
    die("somethin went wrong" . $conexao->error);
    echo("Algo deu errado.");
}
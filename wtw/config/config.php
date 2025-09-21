<?php

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$usuario = 'root';
$senha = '';
$database = 'db_login';
$host = 'localhost';

try {
    $conexao = new mysqli($host, $usuario, $senha, $database);
    $conexao->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    error_log('Database connection error: ' . $e->getMessage());
    exit('Database connection unavailable.');
}

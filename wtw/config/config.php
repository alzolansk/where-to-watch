<?php
// config do banco e api

require_once __DIR__ . '/../includes/env.php';

wyw_load_env(__DIR__);

// banco de dados
$host = wyw_env('DB_HOST', '127.0.0.1');
$port = (int) wyw_env('DB_PORT', '3306');
$database = wyw_env('DB_NAME', 'db_login');
$usuario = wyw_env('DB_USER', 'root');
$senha = wyw_env('DB_PASS', '');

// tmdb api
$tmdbApiBase = wyw_env('TMDB_API_BASE', 'https://api.themoviedb.org/3');
$tmdbApiKey = wyw_env('TMDB_API_KEY', '');

if (!defined('TMDB_API_BASE')) {
    define('TMDB_API_BASE', rtrim($tmdbApiBase, '/'));
}

if ($tmdbApiKey !== '' && !defined('TMDB_API_KEY')) {
    define('TMDB_API_KEY', $tmdbApiKey);
}

// conecta no mysql
$conexao = new mysqli($host, $usuario, $senha, $database, $port);

if ($conexao->connect_error) {
    error_log('DB error: ' . $conexao->connect_error);
    exit('Database connection unavailable.');
}

$conexao->set_charset('utf8mb4');


<?php
// ========== CONFIGURAÇÕES DO BANCO DE DADOS ==========
// Arquivo principal de configuração da aplicação
// Configura conexão MySQL e constantes da API do TMDB

declare(strict_types=1);

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../includes/env.php';

wyw_load_env(__DIR__);

// ========== PARÂMETROS DE CONEXÃO DO BANCO ==========

$host = (string) wyw_env('DB_HOST', '127.0.0.1');
$port = (int) wyw_env('DB_PORT', '3306');
$database = (string) wyw_env('DB_NAME', 'db_login');
$usuario = (string) wyw_env('DB_USER', 'root');
$senha = (string) wyw_env('DB_PASS', '');

// ========== CONFIGURAÇÕES DA API TMDB ==========

$tmdbApiBase = (string) wyw_env('TMDB_API_BASE', 'https://api.themoviedb.org/3');
$tmdbApiKey = (string) wyw_env('TMDB_API_KEY', '');

if (!defined('TMDB_API_BASE')) {
    define('TMDB_API_BASE', rtrim($tmdbApiBase, '/'));
}

if ($tmdbApiKey !== '' && !defined('TMDB_API_KEY')) {
    define('TMDB_API_KEY', $tmdbApiKey);
}

// ========== CONEXÃO COM MYSQL ==========

try {
    $conexao = new mysqli($host, $usuario, $senha, $database, $port);
    $conexao->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    error_log('Database connection error: ' . $e->getMessage());
    exit('Database connection unavailable.');
}


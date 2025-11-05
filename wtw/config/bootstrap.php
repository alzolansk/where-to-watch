<?php
/**
 * Bootstrap da aplicação
 * Carrega todas as dependências necessárias
 */

// Carrega definições de paths
require_once __DIR__ . '/paths.php';

// Define timezone padrão
date_default_timezone_set('America/Sao_Paulo');

// Carrega ambiente (.env)
require_project_file('includes/env.php');
wyw_load_env(ROOT_PATH);

// Carrega funções utilitárias
require_project_file('includes/db.php');
require_project_file('includes/tmdb.php');

// Configurações de erro baseadas no ambiente
$appEnv = wyw_env('APP_ENV', 'production');

if ($appEnv === 'production') {
    // Produção: não exibe erros, apenas loga
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    
    // Define arquivo de log se a pasta storage existir
    if (defined('LOGS_PATH') && is_dir(LOGS_PATH)) {
        ini_set('error_log', LOGS_PATH . '/php-errors.log');
    }
    
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
} else {
    // Desenvolvimento: exibe todos os erros
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
}

// Inicia sessão se ainda não estiver iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Define constante para indicar que o bootstrap foi carregado
define('APP_BOOTSTRAPPED', true);
<?php
// bootstrap - carrega tudo que precisa

require_once __DIR__ . '/paths.php';

date_default_timezone_set('America/Sao_Paulo');

// carrega .env
require_project_file('includes/env.php');
wyw_load_env(ROOT_PATH);

// carrega includes
require_project_file('includes/db.php');
require_project_file('includes/tmdb.php');
require_project_file('includes/personalization-cache.php');

$appEnv = wyw_env('APP_ENV', 'production');

if ($appEnv === 'production') {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    
    if (defined('LOGS_PATH') && is_dir(LOGS_PATH)) {
        ini_set('error_log', LOGS_PATH . '/php-errors.log');
    }
    
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
} else {
    // dev: mostra tudo
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
}

// inicia sessao se nao tiver
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('APP_BOOTSTRAPPED', true);
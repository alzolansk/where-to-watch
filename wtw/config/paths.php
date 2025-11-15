<?php
// paths do projeto
// TODO: ver se da pra simplificar isso aqui

define('ROOT_PATH', dirname(__DIR__));
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('INCLUDES_PATH', ROOT_PATH . '/includes');
define('CONFIG_PATH', ROOT_PATH . '/config');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('LOGS_PATH', STORAGE_PATH . '/logs');
define('CACHE_PATH', STORAGE_PATH . '/cache');

// detecta se ta dentro do public/ ou nao
$scriptPath = $_SERVER['SCRIPT_FILENAME'] ?? '';
$isInsidePublic = strpos($scriptPath, DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR) !== false;
define('IS_PUBLIC_FOLDER', $isInsidePublic);

define('ASSETS_BASE_PATH', IS_PUBLIC_FOLDER ? '' : '');

// helper pra incluir arquivos
function require_project_file($relativePath) {
    $fullPath = ROOT_PATH . '/' . ltrim($relativePath, '/');
    if (!file_exists($fullPath)) {
        throw new RuntimeException("File not found: {$fullPath}");
    }
    require_once $fullPath;
}

// gera url pros assets (css, js, img)
function asset_url($path) {
    $path = ltrim($path, '/');
    return $path; // por enquanto sempre retorna direto
}

// pega a url base da aplicação
function base_url() {
    static $baseUrl = null;
    
    if ($baseUrl !== null) {
        return $baseUrl;
    }
    
    // tenta pegar do .env primeiro
    if (function_exists('wyw_env')) {
        $envUrl = wyw_env('APP_URL', '');
        if ($envUrl !== '') {
            $parsed = parse_url($envUrl);
            $baseUrl = $parsed['path'] ?? '';
            return $baseUrl;
        }
    }
    
    // detecta automaticamente
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $scriptDir = dirname($scriptName);
    
    // FIXME: essa lógica ta meio confusa, funciona mas podia ser melhor
    if (IS_PUBLIC_FOLDER && substr($scriptDir, -7) === '/public') {
        $baseUrl = substr($scriptDir, 0, -7);
    } else {
        $baseUrl = $scriptDir;
    }
    
    return $baseUrl === '/' ? '' : $baseUrl;
}

// url completa pra rota da app
function app_url($path = '') {
    $base = base_url();
    $path = ltrim($path, '/');
    
    if ($path === '') {
        return $base ?: '/';
    }
    
    return $base . '/' . $path;
}
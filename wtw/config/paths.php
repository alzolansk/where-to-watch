<?php
/**
 * Definição de caminhos do projeto
 * Usado para facilitar a transição para estrutura public/
 */

define('ROOT_PATH', dirname(__DIR__));
define('PUBLIC_PATH', ROOT_PATH . '/public');
define('INCLUDES_PATH', ROOT_PATH . '/includes');
define('CONFIG_PATH', ROOT_PATH . '/config');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('LOGS_PATH', STORAGE_PATH . '/logs');
define('CACHE_PATH', STORAGE_PATH . '/cache');

// Helper para incluir arquivos de forma segura
function require_project_file(string $relativePath): void {
    $fullPath = ROOT_PATH . '/' . ltrim($relativePath, '/');
    if (!file_exists($fullPath)) {
        throw new RuntimeException("File not found: {$fullPath}");
    }
    require_once $fullPath;
}
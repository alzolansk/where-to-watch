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

// Detecta se estamos executando de dentro da pasta public/ ou diretamente da raiz
// Em desenvolvimento local: arquivos estão em /wtw/public/
// Em produção: arquivos estão em /wtw/ (sem public)
$scriptPath = $_SERVER['SCRIPT_FILENAME'] ?? '';
$isInsidePublic = strpos($scriptPath, DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR) !== false;
define('IS_PUBLIC_FOLDER', $isInsidePublic);

// Define o caminho base para URLs de assets (CSS, JS, imagens)
// Se estamos em public/, o base é vazio
// Se não estamos em public/, os assets estão no mesmo nível
define('ASSETS_BASE_PATH', IS_PUBLIC_FOLDER ? '' : '');

// Helper para incluir arquivos de forma segura
function require_project_file(string $relativePath): void {
    $fullPath = ROOT_PATH . '/' . ltrim($relativePath, '/');
    if (!file_exists($fullPath)) {
        throw new RuntimeException("File not found: {$fullPath}");
    }
    require_once $fullPath;
}

/**
 * Gera URL para assets (CSS, JS, imagens) de forma compatível com ambos ambientes
 * 
 * @param string $path Caminho relativo ao diretório público (ex: 'css/style.css')
 * @return string URL completa do asset
 */
function asset_url(string $path): string {
    $path = ltrim($path, '/');
    
    // Se estamos dentro de public/, retorna o caminho direto
    if (IS_PUBLIC_FOLDER) {
        return $path;
    }
    
    // Se não estamos em public/ (produção sem pasta public),
    // os arquivos estão no mesmo nível, então retorna o caminho direto também
    return $path;
}

/**
 * Gera URL base da aplicação
 * Detecta automaticamente baseado na requisição atual
 * 
 * @return string URL base (ex: '/wtw/public' ou '/wtw')
 */
function base_url(): string {
    static $baseUrl = null;
    
    if ($baseUrl !== null) {
        return $baseUrl;
    }
    
    // Tenta pegar do .env primeiro
    if (function_exists('wyw_env')) {
        $envUrl = wyw_env('APP_URL', '');
        if ($envUrl !== '') {
            $parsed = parse_url($envUrl);
            $baseUrl = $parsed['path'] ?? '';
            return $baseUrl;
        }
    }
    
    // Detecta automaticamente baseado no script atual
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $scriptDir = dirname($scriptName);
    
    // Remove /public do final se existir e não estivermos em produção
    if (IS_PUBLIC_FOLDER && substr($scriptDir, -7) === '/public') {
        $baseUrl = substr($scriptDir, 0, -7);
    } else {
        $baseUrl = $scriptDir;
    }
    
    return $baseUrl === '/' ? '' : $baseUrl;
}

/**
 * Gera URL completa para uma rota da aplicação
 * 
 * @param string $path Caminho relativo (ex: 'index.php', 'css/style.css')
 * @return string URL completa
 */
function app_url(string $path = ''): string {
    $base = base_url();
    $path = ltrim($path, '/');
    
    if ($path === '') {
        return $base ?: '/';
    }
    
    return $base . '/' . $path;
}
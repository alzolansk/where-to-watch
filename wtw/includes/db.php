<?php
declare(strict_types=1);

require_once __DIR__ . '/env.php';

wyw_load_env(__DIR__);

/**
 * Shared database configuration helper.
 */
function wyw_database_config(): array
{
    $host = (string) wyw_env('DB_HOST', '127.0.0.1');
    $port = (int) wyw_env('DB_PORT', '3306');
    $database = (string) wyw_env('DB_NAME', 'db_login');
    $user = (string) wyw_env('DB_USER', 'root');
    $password = (string) wyw_env('DB_PASS', '');

    return [
        'host' => $host,
        'port' => $port,
        'database' => $database,
        'user' => $user,
        'password' => $password,
    ];
}

/**
 * Returns a singleton PDO connection configured for the application.
 */
function get_pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = wyw_database_config();

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );

    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

/**
 * Returns a singleton mysqli connection configured for the application.
 */
function get_mysqli(): mysqli
{
    static $mysqli = null;

    if ($mysqli instanceof mysqli) {
        return $mysqli;
    }

    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $config = wyw_database_config();

    $mysqli = new mysqli(
        $config['host'],
        $config['user'],
        $config['password'],
        $config['database'],
        $config['port']
    );

    $mysqli->set_charset('utf8mb4');

    return $mysqli;
}

// Backwards compatibility: expose $pdo when this file is included.
$pdo = get_pdo();
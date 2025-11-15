<?php
// gerencia conexoes PDO e mysqli

require_once __DIR__ . '/env.php';

wyw_load_env(__DIR__);

// config do banco
function wyw_database_config() {
    $host = wyw_env('DB_HOST', '127.0.0.1');
    $port = (int) wyw_env('DB_PORT', '3306');
    $database = wyw_env('DB_NAME', 'db_login');
    $user = wyw_env('DB_USER', 'root');
    $password = wyw_env('DB_PASS', '');

    return [
        'host' => $host,
        'port' => $port,
        'database' => $database,
        'user' => $user,
        'password' => $password,
    ];
}

// pdo connection (singleton)
function get_pdo() {
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

// mysqli connection (singleton)
function get_mysqli() {
    static $mysqli = null;

    if ($mysqli instanceof mysqli) {
        return $mysqli;
    }

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

// compatibilidade: expoe $pdo quando incluir esse arquivo
$pdo = get_pdo();
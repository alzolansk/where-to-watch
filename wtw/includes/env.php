<?php

if (function_exists('wyw_env')) {
    return;
}

// carrega variaveis do .env
function wyw_load_env($hintDir = null) {
    static $loaded = false;
    if ($loaded) return;

    $loaded = true;

    $candidates = [];

    if ($hintDir !== null) {
        $dir = is_dir($hintDir) ? $hintDir : dirname($hintDir);
        $dir = rtrim($dir, DIRECTORY_SEPARATOR);
        if ($dir !== '') {
            $candidates[] = $dir . DIRECTORY_SEPARATOR . '.env';
            $candidates[] = dirname($dir) . DIRECTORY_SEPARATOR . '.env';
        }
    }

    $explicit = getenv('WY_WATCH_ENV_FILE');
    if (is_string($explicit) && $explicit !== '') {
        $candidates[] = $explicit;
    }

    $candidates[] = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    $candidates[] = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';

    $envFile = null;
    foreach ($candidates as $candidate) {
        if (!is_string($candidate)) continue;
        if (is_readable($candidate)) {
            $envFile = realpath($candidate) ?: $candidate;
            break;
        }
    }

    if ($envFile === null) return;

    $vars = wyw_parse_env_file($envFile);
    if (empty($vars)) return;

    foreach ($vars as $key => $value) {
        if ($key === '') continue;
        if (getenv($key) !== false) continue;
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

// pega variavel de ambiente com fallback
function wyw_env($key, $default = null) {
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    if (array_key_exists($key, $_SERVER)) {
        return $_SERVER[$key];
    }
    $value = getenv($key);
    return $value === false ? $default : $value;
}

// faz parse do arquivo .env
function wyw_parse_env_file($path) {
    $vars = [];
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

    foreach ($lines as $line) {
        $trimmed = ltrim($line);
        if ($trimmed === '' || $trimmed[0] === '#' || $trimmed[0] === ';') {
            continue;
        }

        if (strncasecmp($trimmed, 'export ', 7) === 0) {
            $trimmed = substr($trimmed, 7);
        }

        $separatorPos = strpos($trimmed, '=');
        if ($separatorPos === false) continue;

        $name = rtrim(substr($trimmed, 0, $separatorPos));
        $value = substr($trimmed, $separatorPos + 1);

        if ($name === '') continue;

        $value = trim($value);

        // remove aspas se tiver
        if ($value !== '') {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        $vars[$name] = $value;
    }

    return $vars;
}
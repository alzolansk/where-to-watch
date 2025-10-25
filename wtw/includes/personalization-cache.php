<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function wtw_generate_personalization_cache_token(): string
{
    $timestamp = (int) floor(microtime(true) * 1000);

    try {
        $random = bin2hex(random_bytes(8));
    } catch (Throwable $exception) {
        $random = bin2hex(hash('sha256', uniqid((string) mt_rand(), true), true));
    }

    return sprintf('%d-%s', $timestamp, substr($random, 0, 16));
}

function wtw_personalization_cache_token(): string
{
    if (!isset($_SESSION['wtw_personalization_cache_token']) || !is_string($_SESSION['wtw_personalization_cache_token'])) {
        $_SESSION['wtw_personalization_cache_token'] = wtw_generate_personalization_cache_token();
    }

    return $_SESSION['wtw_personalization_cache_token'];
}

function wtw_bump_personalization_cache_token(): string
{
    $token = wtw_generate_personalization_cache_token();
    $_SESSION['wtw_personalization_cache_token'] = $token;

    return $token;
}

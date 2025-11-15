<?php
// cache token pra personalizacao

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// gera token novo
function wtw_generate_personalization_cache_token() {
    $timestamp = (int) floor(microtime(true) * 1000);

    // tenta usar random_bytes, se nao der usa fallback
    try {
        $random = bin2hex(random_bytes(8));
    } catch (Exception $e) {
        // fallback antigo caso random_bytes nao funcione
        $random = bin2hex(hash('sha256', uniqid(mt_rand(), true), true));
    }

    return $timestamp . '-' . substr($random, 0, 16);
}

// pega token da sessao ou cria um novo
function wtw_personalization_cache_token() {
    if (!isset($_SESSION['wtw_personalization_cache_token'])) {
        $_SESSION['wtw_personalization_cache_token'] = wtw_generate_personalization_cache_token();
    }

    return $_SESSION['wtw_personalization_cache_token'];
}

// atualiza token (usado quando muda preferencias)
function wtw_bump_personalization_cache_token() {
    $token = wtw_generate_personalization_cache_token();
    $_SESSION['wtw_personalization_cache_token'] = $token;
    return $token;
}

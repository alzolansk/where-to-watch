<?php
// Verifica se a URL da imagem foi passada
if (isset($_GET['url'])) {
    $url = $_GET['url'];

    // Validação de segurança básica (evita URLs suspeitas)
    if (filter_var($url, FILTER_VALIDATE_URL) && str_starts_with($url, 'https://image.tmdb.org/')) {
        header('Content-Type: image/jpeg');
        readfile($url);
        exit;
    } else {
        http_response_code(403);
        echo 'URL inválida ou não permitida.';
    }
} else {
    http_response_code(400);
    echo 'URL da imagem não especificada.';
}
?>
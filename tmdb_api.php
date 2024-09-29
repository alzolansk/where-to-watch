<?php

$api_key = 'dc3b4144ae24ddabacaeda024ff0585c';
$movie_id = 550;
$url = "https://api.themoviedb.org/3/movie/$movie_id?api_key=$api_key&language=pt-BR";

$response = file_get_contents($url);
$providers = json_decode($response, true);

print_r($providers);


?>
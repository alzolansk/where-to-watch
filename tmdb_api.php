<?php

$api_key = 'dc3b4144ae24ddabacaeda024ff0585c';
$movie_id = 3;
$url = "https://api.themoviedb.org/3/search/multi?api_key=${api_key}&query=100&watch_region=BR";

$response = file_get_contents($url);
$providers = json_decode($response, true);

print_r($providers);


?>
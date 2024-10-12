<?php

include_once('config.php');

//filmes
$movies = [
    [ 
    'title_item'=>'THE SUBSTANCE',
    'type_item'=>'Filme',
    'gender'=>'Suspense',
    'trailer_url'=>'https://www.youtube.com/watch?v=LNlrGhBpYjc',
    'release_year'=>'2024',
    'img_url'=>'https://upload.wikimedia.org/wikipedia/pt/f/ff/The_Substance_poster.jpg?20240923222527'
    ], 
    [ 
        'title_item'=>'It Ends With Us',
        'type_item'=>'Filme',
        'gender'=>'Novel',
        'trailer_url'=>'https://www.youtube.com/watch?v=x4D3WHlquus',
        'release_year'=>'2024',
        'img_url'=>'https://upload.wikimedia.org/wikipedia/pt/f/ff/The_Substance_poster.jpg?20240923222527'
    ],  
    [ 
        'title_item'=>'BETTLEJUICE BETTLEJUICE',
        'type_item'=>'Filme',
        'gender'=>'Horror/Comedy',
        'trailer_url'=>'https://www.youtube.com/watch?v=jqVGSIIwLi0',
        'release_year'=>'2024',
        'img_url'=>'https://ingresso-a.akamaihd.net/prd/img/movie/os-fantasmas-ainda-se-divertem-beetlejuice-beetlejuice/fd193783-6e4b-4d27-b6a9-ae3bfdd722ea.webp'
    ],  
    [ 
        'title_item'=>'THE CROW',
        'type_item'=>'Filme',
        'gender'=>'Suspense',
        'trailer_url'=>'https://www.youtube.com/watch?v=djSKp_pwmOA',
        'release_year'=>'2024',
        'img_url'=>'https://m.media-amazon.com/images/M/MV5BMjEyOWJjMWQtZTY4Yi00ZjYyLWJhNDktZmRkNzEwMjlhZjQ3XkEyXkFqcGc@._V1_.jpg'
    ]
];

foreach ($movies as $movie){
    $sql_insert = "INSERT INTO items (title_item, type_item, gender, trailer_url, release_year, img_url) VALUES (?, ?, ?, ?, ?, ?)";

    $stmt = $conexao->prepare($sql_insert);
    $stmt->bind_param("ssssss", $movie['title_item'], $movie['type_item'], $movie['gender'], $movie['trailer_url'], $movie['release_year'], $movie['img_url']);

    if($stmt->execute()){
        echo "Filme adicionado: ".$movie['title_item']."\n";
    }
}; 

//series

$series = [
    [ 
    'title_item'=>'The White Lotus',
    'type_item'=>'Serie',
    'gender'=>'Suspense',
    'trailer_url'=>'https://www.youtube.com/watch?v=TGLq7_MonZ4',
    'release_year'=>'2022',
    'img_url'=>'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4BBTe7E3707B0laU2Xtvfmjmom166etz9eg&s'
    ], 
    [ 
        'title_item'=>'House of the Dragon',
        'type_item'=>'Serie',
        'gender'=>'Fantasy',
        'trailer_url'=>'https://www.youtube.com/watch?v=DotnJ7tTA34',
        'release_year'=>'2022',
        'img_url'=>'https://m.media-amazon.com/images/M/MV5BM2QzMGVkNjUtN2Y4Yi00ODMwLTg3YzktYzUxYjJlNjFjNDY1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg'
    ],  
    [ 
        'title_item'=>'Lord Of The Rings = The Rings of Power',
        'type_item'=>'Serie',
        'gender'=>'Fantasy',
        'trailer_url'=>'https://www.youtube.com/watch?v=TCwmXY_f-e0',
        'release_year'=>'2022',
        'img_url'=>'https://m.media-amazon.com/images/M/MV5BM2QzMGVkNjUtN2Y4Yi00ODMwLTg3YzktYzUxYjJlNjFjNDY1XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg'
    ],  
    [ 
        'title_item'=>'Agatha All Along',
        'type_item'=>'Serie',
        'gender'=>'Fantasy',
        'trailer_url'=>'https://www.youtube.com/watch?v=ARulRbzM7Jw',
        'release_year'=>'2024',
        'img_url'=>'https://cdn.marvel.com/content/1x/agathaallalong_lob_crd_02.jpg'
    ]
];

foreach ($series as $serie){
    $sql_insert = "INSERT INTO items (title_item, type_item, gender, trailer_url, release_year, img_url) VALUES (?, ?, ?, ?, ?, ?)";

    $stmt = $conexao->prepare($sql_insert);
    $stmt->bind_param("ssssss", $serie['title_item'], $serie['type_item'], $serie['gender'], $serie['trailer_url'], $serie['release_year'], $serie['img_url']);

    if($stmt->execute()){
        echo "Filme adicionado: ".$serie['title_item']."\n";
    }
};
$stmt->close();
$conexao->close();
?>
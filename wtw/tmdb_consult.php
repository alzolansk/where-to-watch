<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="icon" href="imagens/favicon-wtw.png">
    <link rel="stylesheet" href="style.css">
    <title>Adicionar novo filme</title>
</head>
<body>

    <?php
        include_once('dashboard.php');
    ?>

<section id="interface">

    <div id = "search-div">

        <input type="text" id="searchmovie" placeholder="Pesquisar filme ou série" autocomplete="off">
        <button id="botaoPesquisar">Pesquisar</button>

        <div id="results"></div>

    </div>

    
</section>
    
</body>

<script>

    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c'; 

    document.getElementById('searchmovie').addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length > 0) {
            const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`;

            fetch(url)
            .then(response => response.json())
            .then(data => {
                const resultsContainer = document.getElementById('results');
                resultsContainer.innerHTML = '';

                // Verifica se existem resultados
                if (data.results.length > 0) {
                    data.results.forEach(item => {
                        if (item.media_type === 'movie' || item.media_type === 'tv') {
                            const title = item.title || item.name; // Para pegar o título do filme ou da série
                            const imageUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
                            const idTmdb = item.id;

                            resultsContainer.innerHTML += `
                                <div>
                                    <img src="${imageUrl}" alt="${title}">
                                    <h3>${title}</h3>
                                    <p>ID TMDb: ${idTmdb}</p>
                                </div>
                            `;
                        }
                    });
                } else {
                    resultsContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>'; // Mensagem se não houver resultados
                }
            })
            .catch(error => console.error('Erro:', error));
        } else {
            // Limpa os resultados se o campo de pesquisa estiver vazio
            document.getElementById('results').innerHTML = '';
        }
    });
</script>
</html>
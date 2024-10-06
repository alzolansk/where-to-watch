<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trailer Test</title>
</head>
<body>
    <h1>teste trailer</h1>
    <p id=trailerURL></p>
</body>
<script>
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const url = `https://api.themoviedb.org/3/movie/158/videos?api_key=${apiKey}`;

    fetch(url)
    .then(response => response.json())
    .then(data => {

        let trailerName = '';
        const trailers = data.results;

        if (trailers) {
            trailerName = trailerName.map(trailer => trailer.name).join(", "); //String "join" separa os diversos gêneros
        }
    })

</script>
</html>
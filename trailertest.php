<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
  />
    <title>Trailer Test</title>
</head>
<body>
    <h1 class="animate__animated animate__swing">teste trailer</h1>
    <p id=trailerURL></p>
</body>
<script>

    <h2 class="animate__animated animate__bounce">TESTE</h2>
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
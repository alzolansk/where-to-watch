<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Testando API</title>
</head>
<body>
    <h1 id="providerItem"></h1>
    <img src="" alt="" id="logoProvider">
    <h1>teste</h1>

</body>

<script>
    const apiKey = "dc3b4144ae24ddabacaeda024ff0585c"
    
    const providerURL = `https://api.themoviedb.org/3/tv/1421/watch/providers?api_key=${apiKey}`;

    fetch(providerURL)
    .then(response => response.json())
    .then(providerData => {
        let providerNames = '';
        const providers = providerData.results?.BR; // Acessa os provedores para o país BR (ajuste conforme necessário)
        console.log(providers);

        if (providers) {

            const processProviders = (providerArray) => {
                return providerArray.map(p => {
                    const logoUrl = `https://image.tmdb.org/t/p/w45${p.logo_path}`; // Ajuste o tamanho da logo conforme necessário
                    return `<img src="${logoUrl}" alt="${p.provider_name}" title="${p.provider_name}">`; // Adiciona a imagem da logo
                }).join(" ");
            };


            const buyLogos = providers.buy && providers.buy.length > 0 ? processProviders(providers.buy) : '';
            const rentLogos = providers.rent && providers.rent.length > 0 ? processProviders(providers.rent) : '';
            const flatrateLogos = providers.flatrate && providers.flatrate.length > 0 ? processProviders(providers.flatrate) : '';

            // Concatena todas as categorias de provedores
            const allLogos = [buyLogos, rentLogos, flatrateLogos].filter(Boolean).join(" ");

            // Se houver logos de provedores, substitui a mensagem padrão
            if (allLogos) {
                providerLogos = allLogos;
            }
                
            document.getElementById('providerItem').innerHTML = `Provedores: ${providerLogos}`;


        }
    })
</script>

</html>
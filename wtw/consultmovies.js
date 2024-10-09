// Consultando API
const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c'; 

document.getElementById('addMovie').addEventListener('click', function() {
    const searchDiv = document.getElementById('searchmovie');
    searchDiv.style.display = 'block';
})

document.getElementById('searchmovie').addEventListener('input', function() {
    const query = this.value.trim();
    if (query.length > 0) {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`;

        fetch(url)
        .then(response => response.json())
        .then(data => {
            const resultsContainer = document.getElementById('results');
            resultsContainer.innerHTML = ''; // Limpa resultados anteriores

            // Verifica se existem resultados
            if (data.results && data.results.length > 0) {
                data.results.forEach(item => {
                    if (item.media_type === 'movie' || item.media_type === 'tv') {
                        const title = item.title || item.name; // Para pegar o título do filme ou da série
                        const imageUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}&language=pt-BR&page=1`;
                        const backdropUrl = `https://image.tmdb.org/t/p/w1280/${item.backdrop_path}}`;
                        const idTmdb = item.id;
                        const overview = item.overview; // Sinopse

                        const movieDiv = document.createElement('div');
                        movieDiv.innerHTML += `
                            <div>
                                <img src="${imageUrl}" alt="${title}">
                                <div class="movie-info">
                                    <h3>${title}</h3>
                                    <p>ID TMDb: ${idTmdb}</p>
                                </div>
                            </div>
                        `;

                        // Evento de clique para abrir o modal
                        movieDiv.addEventListener('click', function() {
                            // Nova requisição para obter detalhes do filme
                            const mediaType = item.media_type;
                            const mediaTypeText = item.media_type === 'movie' ? 'filme' : 'série';
                            const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${idTmdb}?api_key=${apiKey}&language=pt-BR&page=1`;
                            const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${idTmdb}/watch/providers?api_key=dc3b4144ae24ddabacaeda024ff0585c&language=pt-BR&page=1`;

                            fetch(detailsUrl)
                            .then(response => response.json())
                            .then(data => {
                            
                                const genresArray = data.genres;
                                let genresNames = '';
                                if (genresArray && genresArray.length > 0) {
                                    genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos gêneros
                                }

                                return fetch(providerUrl)
                                    .then(providerResponse => providerResponse.json())
                                    .then(providerData => {

                                        let providerNames = ''; // Mensagem caso não haja provedores
                                        const providers = providerData.results?.BR; // Acessa os provedores para o país BR
                                        let providerLogos = '';

                                        if (providers){

                                        /* Processo pegar logo
                                            const processProviders = (providerArray) => {
                                            return providerArray.map(p => {
                                                const logoUrl = `https://image.tmdb.org/t/p/w45${p.logo_path}`; 
                                                return `<img src="${logoUrl}" alt="${p.provider_name}" title="${p.provider_name}">`; // Adiciona a imagem da logo
                                            }).join(" ");
                                            };

                                            const buyLogos = providers.buy && providers.buy.length > 0 ? processProviders(providers.buy) : '';
                                            const rentLogos = providers.rent && providers.rent.length > 0 ? processProviders(providers.rent) : '';

                                            // Concatena todas as categorias de provedores
                                            const allLogos = [buyLogos, rentLogos].filter(Boolean).join(" ");

                                            // Se houver logos de provedores, substitui a mensagem padrão
                                            if (allLogos) {
                                                providerLogos = allLogos;
                                            }

                                        */

                                            const buyProviders = providers.buy ? providers.buy.map(p => p.provider_name).join(", ") : '';
                                            const rentProviders = providers.rent ? providers.rent.map(p => p.provider_name).join(", ") : '';
                                            const flatrateProviders = providers.flatrate ? providers.flatrate.map(p => p.provider_name).join(", ") : '';
                                
                                            const allProviders = [buyProviders, rentProviders, flatrateProviders].filter(Boolean).join(", ");
                                            
                                            if (allProviders) {
                                                providerNames = allProviders;
                                                console.log(`Provedores: ${allProviders}`);
                                            }
                                        }                               
                                    
                                        // Informações do modal com os dados do filme
                                        document.getElementById('movieTitle').innerText = title; // Define o título no modal
                                        document.getElementById('moviePoster').src = imageUrl; // Define a imagem no modal
                                        document.getElementById('movieSinopse').innerText = overview; // Define a sinopse
                                        document.getElementById('idTMDB').innerText = `ID TMDb: ${idTmdb}`; // Define ID TMDb
                                        document.getElementById('movieGenre').innerText = `Gêneros: ${genresNames}`; // Exibe os gêneros
                                        document.getElementById('providerItem').innerText = `Provedores: ${providerNames}`; // Exibe provedores
                                        document.getElementById('mediaTypeP').innerText = `Tipo: ${mediaTypeText}`;
                                        
                                        document.getElementById('addMovieButton').innerText = `Adicionar ${title} ao Where to Watch`; //Adicionar "serie" ou "filme" no Where To Watch
                                        
                                        const modal = document.getElementById('addMovieScreen');
                                        modal.style.backgroundImage = `url(${backdropUrl})`;

                                        const overlay = document.querySelector('.overlay');
                                        overlay.style.display = 'block'; // Torna a overlay visível 
                                        
                                        modal.showModal();
                                    });
                            })
                            .catch(error => console.error('Erro ao buscar detalhes do filme:', error)); 
                        });

                        resultsContainer.appendChild(movieDiv);
                    }
                });

                resultsContainer.style.display = 'block';
            } else {
                resultsContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>';
                resultsContainer.style.display = 'block';
            }
        })
        .catch(error => console.error('Erro:', error));
    } else {
        // Check empty
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }
});

document.getElementById('closeModal').addEventListener('click', function() {
    const modal = document.getElementById('addMovieScreen');
    modal.close();
    
    // Ocultar a overlay
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
});

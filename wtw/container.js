document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const popularUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`;
    const topRatedUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=pt-BR&page=1`;
    const upcomingUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=pt-BR&page=1`;

    function defineMovieConstants(movie, mediaType, apiKey) {
        const imgUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        const trailerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`;
        const rating = movie.vote_average.toFixed(2);
        const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}?api_key=${apiKey}&language=pt-BR&page=1`;
        const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/watch/providers?api_key=dc3b4144ae24ddabacaeda024ff0585c&language=pt-BR&page=1`
        const backdropUrl = `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}}`

        return { imgUrl, trailerUrl, rating, detailsUrl, providerUrl, backdropUrl };
    }

    function fetchPopularMovie(){
        fetch(popularUrl)
            .then(response => response.json())
            .then(popularData => {
                const movies = popularData.results;
                const container = document.getElementById('popular-movies-container');

                movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('col-md-3', 'movies');

                    const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl} = defineMovieConstants(movie, 'movie', apiKey);

                    fetch(providerUrl)
                    .then(response => response.json())
                    .then(providerData => {
                        let providerNames = '';
                        const providers = providerData.results?.BR;
                        const buyProviders = providers.buy ? providers.buy.slice(0,1).map(p => p.provider_name).join(", ") : '';
                        const rentProviders = providers.rent ? providers.rent.slice(0,1).map(p => p.provider_name).join(", ") : '';
                        const flatrateProviders = providers.flatrate ? providers.flatrate.slice(0,1).map(p => p.provider_name).join(", "): '';
                        const allProviders = [buyProviders, rentProviders, flatrateProviders].filter(Boolean).join(", ");
                        

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }

                    fetch(trailerUrl)
                        .then(response => response.json())
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (trailerPath && trailerPath.length > 0) {
                                trailerKey = trailerPath[0].key; 
                            }
                            const trailerYtUrl = `https://www.youtube.com/watch?v=${trailerKey}`;

                            movieDiv.innerHTML = `
                                <div class="description">
                                    <li id="movie-li-link">
                                            <img src="${imgUrl}" alt="${movie.title}" class="img-fluid">
                                    </li>

                                    <div class="info">
                                    <img src="imagens/star-emoji.png" alt="" class="rating">
                                    <p class="rating-value">${rating}</p>
                                    <li class="movie-name">
                                        <a href="#">${movie.title}</a>
                                        <p>${providerNames}</p>
                                    </li>
                                
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}')">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;

                            container.appendChild(movieDiv); 
                        
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
            .catch(error => console.error('Erro ao buscar filmes populares:', error));
        })
        }

    function fetchTopRatedMovie(){
        fetch(topRatedUrl)
            .then(response => response.json())
            .then(topData => {
                const movies = topData.results;
                const container = document.getElementById('top-movies-container');

                movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('col-md-3', 'movies');

                    const { imgUrl, trailerUrl, rating } = defineMovieConstants(movie, 'movie', apiKey);

                    const carouselDiv = document.createElement('div');

                    fetch(trailerUrl)
                        .then(response => response.json())
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (trailerPath && trailerPath.length > 0) {
                                trailerKey = trailerPath[0].key; 
                            } else {
                                trailerKey = '';
                            }

                            const trailerYtUrl = `https://www.youtube.com/watch?v=${trailerKey}`;

                            movieDiv.innerHTML = `
                                <div class="description">
                                    <li id="movie-li-link">
                                            <img src="${imgUrl}" alt="${movie.title}" class="img-fluid">
                                    </li>
                                    <div class="info">
                                    <img src="imagens/star-emoji.png" alt="" class="rating">
                                    <p class="rating-value">${rating}</p>
                                    <li class="movie-name">
                                        <a href="#">${movie.title}</a>
                                    </li>
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}')">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;

                            container.appendChild(movieDiv);                   


                                /*topMovieDiv.innerHTML = `
                                <div class="description">
                                    <li id="movie-li-link">
                                            <img src="${imgUrl}" alt="${movie.title}" class="img-fluid">
                                    </li>
                                    <div class="info">
                                    <img src="imagens/star-emoji.png" alt="" class="rating">
                                    <p class="rating-value">${truncatedRating}</p>
                                    <li class="movie-name">
                                        <a href="#">${movie.title}</a>
                                    </li>
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}')">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;
                            container.appendChild(topMovieDiv);*/
                                                    
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
            .catch(error => console.error('Erro ao buscar filmes populares:', error));
    }

    function fetchUpcomingMovies(){
        fetch(upcomingUrl)
            .then(response => response.json())
            .then(upcomingData => {
                const wrapMovies = upcomingData.results.slice(0, 10);
                const containerNew = document.getElementById('container-wrap');           

                wrapMovies.forEach(movie => {
                    const carouselDiv = document.createElement('div');
                    carouselDiv.classList.add('gallery-x'); 
                    const { imgUrl, trailerUrl, detailsUrl, backdropUrl } = defineMovieConstants(movie, 'movie', apiKey);

                    fetch(detailsUrl)
                    .then(response => response.json())
                    .then(data => {
                        const genresArray = data.genres;
                        let genresNames = '';
                        if (genresArray && genresArray.length > 0) {
                            genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos gêneros
                    }

                    fetch(trailerUrl)
                        .then(response => response.json())
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (trailerPath) {
                                trailerKey = trailerPath[0].key; 
                            } else {
                                trailerKey = '';
                            }
                            console.log(trailerKey);

                            const trailerYtUrl = `https://www.youtube.com/watch?v=${trailerKey}`;

                                carouselDiv.innerHTML = `
                                    <div class="backdropContainer">
                                        <div class="upcomingItem">
                                            <img src="${backdropUrl}" class="backdropImg">
                                            <div class="itemInfo">
                                                <h2 class="movie-title">${movie.original_title}</h2>
                                                <p class="movie-pt-title">${movie.title}</p>
                                                <p class="genre-name">${genresNames}</p>
                                                <button class="trailer-link" onclick="showTrailer('${trailerYtUrl}')">
                                                    <img src="imagens/video-start.png" alt="" id="trailer">
                                                </button>
                                            </div>
                                        
                                            <img src="${imgUrl}" class="frontImage">
                                        </div>
                                    </div>
                                `
                                containerNew.appendChild(carouselDiv);
                        })    
                        .catch(error => console.error(error))                        
                    })
                    .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
            .catch(error => console.error('Erro ao buscar filmes upcoming:', error));
    }

        fetchTopRatedMovie();
        fetchPopularMovie();
        fetchUpcomingMovies();
});


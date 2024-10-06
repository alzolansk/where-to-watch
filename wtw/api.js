document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const popularUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`;

    fetch(popularUrl)
        .then(response => response.json())
        .then(popularData => {
            const movies = popularData.results;
            const container = document.getElementById('popular-movies-container');

            movies.forEach(movie => {
                const mediaType = movie.media_type || 'movie'; // Caso o media_type não esteja disponível, assume que é filme
                const movieDiv = document.createElement('div');
                movieDiv.classList.add('col-md-3', 'movies');

                const imgUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
                console.log(imgUrl);
                const trailerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`;
                const rating = movie.vote_average;

                fetch(trailerUrl)
                    .then(response => response.json())
                    .then(trailerData => {
                        const trailerPath = trailerData.results;

                        let trailerKey = '';
                        if (trailerPath && trailerPath.length > 0) {
                            trailerKey = trailerPath[0].key; // Corrigido aqui: trailerPath[0].key, não trailerData[0].key
                        }

                        console.log('Trailer Key:', trailerKey); // Verifique a chave do trailer
                        const trailerYtUrl = `https://www.youtube.com/watch?v=${trailerKey}`;

                        movieDiv.innerHTML = `
                            <div class="description">
                                <li id="movie-li-link">
                                    <a href="#" id="movie-link">
                                        <img src="${imgUrl}" alt="${movie.title}" class="img-fluid">
                                    </a>
                                </li>
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
                        `;

                        container.appendChild(movieDiv);
                    })
                    .catch(error => console.error('Erro ao buscar o trailer:', error));
            });
        })
        .catch(error => console.error('Erro ao buscar filmes populares:', error));
});

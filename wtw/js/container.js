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

    function activateBackdropContainer(element) {
        // Remove a classe 'active' de todos os contêineres
        const allContainers = document.querySelectorAll('.backdropContainer');
        allContainers.forEach(container => {
            container.classList.remove('active');
        });

        let currentIndex = 0;
    
        // Adiciona a classe 'active' ao contêiner clicado
        element.classList.add('active');
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
                    carouselDiv.addEventListener('click', () => activateBackdropContainer(carouselDiv));

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
                            if (Array.isArray(trailerPath) && trailerPath.length > 0) {
                                trailerKey = trailerPath[0].key; 

                                if(!trailerKey){
                                    console.log("Trailer key vazia");
                                }
                            }
                            const trailerYtUrl = `https://www.youtube.com/watch?v=${trailerKey}`;

                                carouselDiv.innerHTML = `
                                    <div class="backdropContainer active">
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

                                setTimeout(() => {
                                    
                                let currentIndex = 0;
                                const items = document.querySelectorAll('.backdropContainer');
                                const containerWrap = document.querySelector('.container-wrap');
                                let autoScrollInterval; // Variável para o intervalo
                                items.forEach(container => {
                                    container.classList.remove('active');
                                });

                            
                                if (items.length > 0) {
                                    const intervalTime = 2500; 
                        
                                    // Função para centralizar o item ativo
                                    function showNextItem() {
                                        // Remova a classe 'active' do item atual
                                        items[currentIndex].classList.remove('active');
                                        
                                        // Mova para o próximo item
                                        currentIndex = (currentIndex + 1) % items.length;
                                        
                                        // Adiciona a classe 'active' ao próximo item
                                        items[currentIndex].classList.add('active');
                                        
                                        // Centraliza o item ativo no container
                                        const itemOffset = items[currentIndex].offsetLeft;
                                        const containerCenter = (containerWrap.clientWidth / 4.5) - (items[currentIndex].clientWidth / 4.5);
                                        
                                        // Ajuste o scroll para centralizar o item ativo
                                        containerWrap.scrollTo({
                                            left: itemOffset - containerCenter,
                                            behavior: 'smooth'
                                        });
                                    }

                                    function deactivateAllItemsExceptCurrent() {
                                        items.forEach((item, index) => {
                                            if (index !== currentIndex) {
                                                item.classList.remove('active');
                                            }
                                        });
                                    }

                                    function activateCurrentItem(){
                                        items.forEach(item => {
                                            item.classList.add('active')
                                        })
                                    }
                                                                        
                                    // Defina o primeiro item como ativo no início
                                    items[currentIndex].classList.add('active');
                                    const itemOffset = items[currentIndex].offsetLeft;
                                    const containerCenter = (containerWrap.clientWidth / 2) - (items[currentIndex].clientWidth / 2);
                                    containerWrap.scrollTo({
                                        left: itemOffset - containerCenter,
                                        behavior: 'smooth'
                                    });

                                    autoScrollInterval = setInterval(showNextItem, intervalTime);
                                    
                                    containerWrap.addEventListener('scroll', () => {
                                    clearInterval(autoScrollInterval); // Cancela o setInterval ao passar o mouse
                                    activateCurrentItem(); // Torna todos os itens ativos
                                    });     

                                    containerWrap.addEventListener('mouseenter', () => {
                                        clearInterval(autoScrollInterval); // Cancela o setInterval ao passar o mouse
                                        activateCurrentItem(); // Torna todos os itens ativos
                                    });

                                    // Retomar o comportamento original ao sair do mouse
                                    containerWrap.addEventListener('mouseleave', () => {
                                        deactivateAllItemsExceptCurrent(); // Volta a deixar apenas o item atual como 'active'
                                        autoScrollInterval = setInterval(showNextItem, intervalTime); // Retoma o setInterval
                                    });
                                                            
                        
                            } else {
                                console.error("Nenhum backdropContainer encontrado");
                            }
                        }, 100); // Ajuste o tempo se necessário para garantir que o DOM esteja pronto
                        
                            
                        })    
                    })
                    .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
            .catch(error => console.error('Erro ao buscar filmes upcoming:', error));
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
                        const rentProviders = providers.rent ? providers.rent.slice(0,1).map(p => p.provider_name).join(", ") : '';
                        const flatrateProviders = providers.flatrate ? providers.flatrate.slice(0,1).map(p => p.provider_name).join(", "): '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");


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

                                if(!trailerKey){
                                    console.log("Trailer key vazia");
                               }
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
                                        <p class="provider-name">${providerNames}</p>
                                    </li>
                                
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}')">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;

                            /*if(providerNames === 'Netflix'){
                                const providerLogo = movieDiv.querySelector('.provider-name');
                                providerLogo.style.fontFamily = "Bebas Neue"; 
                                providerLogo.style.fontWeight = "bold";
                                console.log(`Provider é ${providerNames}`);
                            }*/


                            container.appendChild(movieDiv); 
                            
                            // Evento de clique para abrir o modal
                            movieDiv.addEventListener('click', function() {
                            // Informações do modal com os dados do filme
                            document.getElementById('movieTitle').innerText = movie.title; // Define o título no modal
                            document.getElementById('moviePoster').src = imgUrl; // Define a imagem no modal
                            document.getElementById('providerItem').innerText = `Provedores: ${providerNames}`; // Exibe provedores
                                            
                            const modal = document.getElementById('addMovieScreen');
                            modal.style.backgroundImage = `url(${backdropUrl})`;

                            const overlay = document.querySelector('.overlay');
                            overlay.style.display = 'block'; // Torna a overlay visível 
                            
                            modal.showModal();
                        });
                        
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
        })
        .catch(error => console.error('Erro ao buscar filmes populares:', error));

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

                    const { imgUrl, trailerUrl, rating, providerUrl, backdropUrl } = defineMovieConstants(movie, 'movie', apiKey);

                    const carouselDiv = document.createElement('div');

                    fetch(providerUrl)
                    .then(response => response.json())
                    .then(providerData => {
                        let providerNames = '';
                        const providers = providerData.results?.BR;
                        const rentProviders = providers.rent ? providers.rent.slice(0,1).map(p => p.provider_name).join(", ") : '';
                        const flatrateProviders = providers.flatrate ? providers.flatrate.slice(0,1).map(p => p.provider_name).join(", "): '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");


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
                                        <p class="provider-name">${providerNames}</p>
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

                            const providerLogo = movieDiv.querySelector('.provider-name');

                            if (providerNames.toLowerCase().includes('netflix')) {  // Verifica se inclui "Netflix"
                                providerLogo.style.fontFamily = "Bebas Neue"; 
                                providerLogo.style.fontWeight = "bold";
                                console.log(`Provider é ${providerNames}`);
                            } else if(providerNames.toLocaleLowerCase().includes('max')){
                                providerLogo.style.fontFamily = "HBO Max"; 
                            }
                            
                            // Evento de clique para abrir o modal
                            movieDiv.addEventListener('click', function() {
                                // Informações do modal com os dados do filme
                                document.getElementById('movieTitle').innerText = movie.title; // Define o título no modal
                                document.getElementById('moviePoster').src = imgUrl; // Define a imagem no modal
                                document.getElementById('providerItem').innerText = `Provedores: ${providerNames}`; // Exibe provedores
                                                
                                const modal = document.getElementById('addMovieScreen');
                                modal.style.backgroundImage = `url(${backdropUrl})`;

                                const overlay = document.querySelector('.overlay');
                                overlay.style.display = 'block'; // Torna a overlay visível 
                                
                                modal.showModal();
                            });
                                                    
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
        });
    }

        fetchTopRatedMovie();
        fetchPopularMovie();
        fetchUpcomingMovies();
});



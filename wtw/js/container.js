document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    let mediaType = 'movie'; // Inicialmente filmes

    function defineMovieConstants(movie, mediaType, apiKey) {
        const imgUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        const trailerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`;
        const rating = movie.vote_average.toFixed(2);
        const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}?api_key=${apiKey}&language=pt-BR&page=1`;
        const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/watch/providers?api_key=${apiKey}&language=pt-BR&page=1sort_by=display_priority.cresc`
        const backdropUrl = `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}}`
        const creditsUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/credits?api_key=${apiKey}&language=pt-BR&page=1`

        return { imgUrl, trailerUrl, rating, detailsUrl, providerUrl, backdropUrl, creditsUrl };
    }

    function activateBackdropContainer(element) {
        // Remove a classe 'active' de todos os contêineres
        const allContainers = document.querySelectorAll('.backdropContainer');
        allContainers.forEach(container => {
            container.classList.remove('active');
        });
    
        // Adiciona a classe 'active' ao contêiner clicado
        element.classList.add('active');
    }

    //Pesquisar filme
    document.getElementById('searchmovie').addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length > 0) {
            const allMoviesUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1&sort_by=popularity.desc`;
    
            fetch(allMoviesUrl)
            .then(response => response.json())
            .then(data => {
                const resultsContainer = document.getElementById('results');
                resultsContainer.innerHTML = ''; // Limpa resultados anteriores
    
                // Verifica se existem resultados
                if (data.results && data.results.length > 0) {
                    data.results.forEach(movie => {
                        if (movie.media_type === 'movie' || movie.media_type === 'tv') {
                            const title = movie.title || movie.name; // Para pegar o título do filme ou da série
                            const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl, detailsUrl} = defineMovieConstants(movie, movie.media_type, apiKey);
                            const overview = `“${movie.overview}”`; // Sinopse
                            const upperTitle = title.toUpperCase();
                            
                            const resultsDiv = document.createElement('div');
                            resultsDiv.innerHTML += `
                                <div class="resultsDiv">
                                    <img src="${imgUrl}" alt="${upperTitle}">
                                    <div class="movie-info">
                                        <h3>${upperTitle}</h3>
                                    </div>
                                </div>
                            `;
                            
                            // Evento de clique para abrir o modal
                            resultsDiv.addEventListener('click', function() {
                                // Nova requisição para obter detalhes do filme

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
    
                                                const rentProviders = providers.rent ? providers.rent.slice(0,1).map(p => p.provider_name).join(", ") : '';
                                                const flatrateProviders = providers.flatrate ? providers.flatrate.slice(0,3).map(p => p.provider_name).join(", "): '';
                                                const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");
                                                                                    
                                                if (allProviders) {
                                                    providerNames = allProviders;
                                                }
                                            }        

                                            // Evento de clique para abrir a pagina
                                                const params = new URLSearchParams({
                                                    title: movie.title || movie.name,
                                                    genres: genresNames,
                                                    release_date: movie.release_date || movie.first_air_date,
                                                    imgUrl: imgUrl,
                                                    backdropUrl: backdropUrl,
                                                    overview: `“${movie.overview}”`,
                                                    id: movie.id,
                                                    mediaTp: movie.media_type,
                                                    provider_name: providerNames  
                                                });

                                                window.location.href = `filme.php?${params.toString()}`;

                                        });
                                })
                                .catch(error => console.error('Erro ao buscar detalhes do filme:', error)); 
                            });
    
                            resultsContainer.appendChild(resultsDiv);
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

    function loadContent(){
        showLoading(); // Mostra o spinner ao começar

        const upcomingCaption = document.getElementById('cinemaContainer');
        
        const popularUrl = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${apiKey}&language=pt-BR&page=1`;
        const topRatedUrl = `https://api.themoviedb.org/3/${mediaType}/top_rated?api_key=${apiKey}&language=pt-BR&page=1&sort_by=popularity.desc`;
        const upcomingUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=pt-BR&page=1&sort_by=release_date.desc`;

        fetch(upcomingUrl)
            .then(response => response.json())
            .then(upcomingData => {
                const wrapMovies = upcomingData.results.slice(0, 10);
                const containerNew = document.getElementById('container-wrap');  

                wrapMovies.forEach(movie => {
                    const carouselDiv = document.createElement('div');
                    
                    carouselDiv.addEventListener('click', () => activateBackdropContainer(carouselDiv));

                    const { imgUrl, trailerUrl, detailsUrl, backdropUrl, creditsUrl } = defineMovieConstants(movie, 'movie', apiKey);
                    const mediaTypeTxt = movie.media_type === 'movie' ? 'Filme' : 'Série';
                    const mediaType = 'movie';

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
                                    
                    fetch(creditsUrl)
                    .then(response => response.json())
                    .then(creditsData =>{

                        const castArray = creditsData.cast.slice(0,10);
                        let castHtml = '';
                        if(castArray && castArray.length > 0){
                            castArray.forEach(cast => {
                                const castName = cast.name;
                                const castRole = cast.character;

                                const profileImg = cast.profile_path ? `https://image.tmdb.org/t/p/w500/${cast.profile_path}` : 'imagens/user.png'; // Avatar padrão se não houver imagem

                                // Criação de um elemento HTML para cada ator, incluindo nome e imagem
                                    castHtml += `
                                    <div class="actor-card">
                                        <img src="${profileImg}" alt="${castName}" class="actor-img">
                                        <div class="p-div">
                                            <a href="https://www.google.com/search?q=${castName}" class="actor-name" target="_blank">${castName}</a>
                                            <p class="actor-role">${castRole}</p>
                                        </div>
                                    </div>
                                    `
                                    ;
                            
                           const trailerYtUrl = `https://www.youtube.com/watch?v=${trailerKey}`;                         
                                carouselDiv.innerHTML = `
                                    <div class="backdropContainer active">
                                        <div class="upcomingItem">
                                            <img src="${backdropUrl}" class="backdropImg">
                                            <div class="itemInfo">
                                                <h2 class="movie-title">${movie.original_title}</h2>
                                                <p class="movie-pt-title">${movie.title}</p>
                                                <p class="genre-name">${genresNames}</p>
                                                <button class="trailer-link" onclick="showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                                    <img src="imagens/video-start.png" alt="" id="trailer">
                                                </button>
                                            </div>
                                        
                                            <img src="${imgUrl}" class="frontImage">
                                            
                                        </div>
                                    </div>
                                `

                                 // Evento de clique para abrir a pagina
                                 carouselDiv.addEventListener('click', () => {
                                    const params = new URLSearchParams({
                                        title: movie.title,
                                        original_title: movie.original_title,
                                        genres: genresNames,
                                        release_date: movie.release_date,
                                        imgUrl: imgUrl,
                                        backdropUrl: backdropUrl,
                                        trailerUrl: trailerYtUrl,
                                        overview: `“${movie.overview}”`,
                                        id: movie.id,
                                        mediaTp: mediaType,
                                        itemFetch: "upcoming"
                                    });
                                
                                    window.location.href = `filme.php?${params.toString()}`;

                                });
                            });
                        }

                                containerNew.appendChild(carouselDiv);
                                                        
                                setTimeout(() => {
                                    
                                let currentIndex = 0;
                                const items = document.querySelectorAll('.backdropContainer');
                                const containerWrap = document.querySelector('.container-wrap');
                                let autoScrollInterval; // Variável para o intervalo

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

                                /* Função para centralizar o item ativo
                                function scrollNextItem() {
                                    const wrap = document.querySelector('.container-wrap');
                                    const scrollAmount = wrap.clientWidth * 0.60; // Mova 25% da largura do contêiner
   
                                containerWrap.scrollBy({
                                    left: -scrollAmount, // Valor que vai para a esquerda.
                                    behavior: 'smooth'
                                });
                                }

                                containerWrap.addEventListener('scroll', () => {
                                    activateAllItems(); // Torna todos os itens ativos
                                    scrollNextItem();
                                });  */
                                                                

                                items.forEach(container => {
                                    container.classList.remove('active');
                                });

                            
                                if (items.length > 0) {
                                    const intervalTime = 2000; 
                        
                                     function deactivateAllItemsExceptCurrent() {
                                        items.forEach((item, index) => {
                                            if (index !== currentIndex) {
                                                item.classList.remove('active');
                                            }
                                        });
                                    }

                                    function activateAllItems() {
                                        items.forEach(item => item.classList.add('active'));
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
                                        activateAllItems(); // Torna todos os itens ativos
                                    });     

                                    containerWrap.addEventListener('mouseenter', () => {
                                        clearInterval(autoScrollInterval); // Cancela o setInterval ao passar o mouse
                                        activateAllItems(); // Torna todos os itens ativos
                                    });

                                    containerWrap.addEventListener('click', () => {
                                        clearInterval(autoScrollInterval); // Cancela o setInterval ao passar o mouse
                                        activateAllItems(); // Torna todos os itens ativos
                                    });

                                    // Retomar o comportamento original ao sair do mouse
                                    containerWrap.addEventListener('mouseleave', () => {
                                        deactivateAllItemsExceptCurrent(); // Volta a deixar apenas o item atual como 'active'
                                        autoScrollInterval = setInterval(showNextItem, intervalTime); // Retoma o setInterval
                                    });

                                    containerWrap.scrollTo({
                                        left: itemOffset - containerCenter,
                                        behavior: 'smooth'
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
        })

    

        fetch(popularUrl)
            .then(response => response.json())
            .then(popularData => {
                const movies = popularData.results;
                const container = document.getElementById('popular-movies-container');
                container.innerHTML = ""; // Limpa o container

                movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('col-md-3', 'movies');
                    const mediaTypeTxt = movie.media_type === 'movie' ? 'Filme' : 'Série';

                    const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl, detailsUrl} = defineMovieConstants(movie, mediaType, apiKey);

                    fetch(providerUrl)
                    .then(response => response.json())
                    .then(providerData => {
                        let providerNames = '';
                        const providers = providerData.results?.BR;
                        const rentProviders = providers.rent ? providers.rent.slice(0,1).map(p => p.provider_name).join(", ") : '';
                        const flatrateProviders = providers.flatrate ? providers.flatrate.slice(0,3).map(p => p.provider_name).join(", "): '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
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
                                            <img src="${imgUrl}" alt="${movie.title || movie.name}" class="img-fluid">
                                    </li>

                                    <div class="info" id="infoDiv">
                                    <img src="imagens/star-emoji.png" alt="" class="rating">
                                    <p class="rating-value">${rating}</p>
                                    <li class="movie-name">
                                        <a href="#">${movie.title || movie.name}</a>
                                        <p class="provider-name">${providerNames}</p>
                                    </li>
                                
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;
                            
                            // Evento de clique para abrir a pagina
                            movieDiv.addEventListener('click', () => {
                                const params = new URLSearchParams({
                                    title: movie.title || movie.name,
                                    original_title: movie.original_title,
                                    genres: genresNames,
                                    release_date: movie.release_date || movie.first_air_date,
                                    imgUrl: imgUrl,
                                    backdropUrl: backdropUrl,
                                    trailerUrl: trailerYtUrl,
                                    overview: `“${movie.overview}”`,
                                    id: movie.id,
                                    mediaTp: movie.media_type,
                                    provider_name: providerNames  
                                });
                            
                                window.location.href = `filme.php?${params.toString()}`;

                            });

                            container.appendChild(movieDiv); 
                            
                            // Evento de clique para abrir o modal

                        })
                    })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            })
        })

        fetch(topRatedUrl)
            .then(response => response.json())
            .then(topData => {
                const movies = topData.results;
                const container = document.getElementById('top-movies-container');
                container.innerHTML = ""; // Limpa o container

                movies.forEach(movie => {
                
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('col-md-3', 'movies');

                    const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl, detailsUrl} = defineMovieConstants(movie, mediaType, apiKey);

                    const carouselDiv = document.createElement('div');

                    fetch(detailsUrl)
                        .then(response => response.json())
                        .then(data => {
                            const genresArray = data.genres;
                            let genresNames = '';
                            if (genresArray && genresArray.length > 0) {
                                genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos gêneros
                        }

                    fetch(providerUrl)
                    .then(response => response.json())
                    .then(providerData => {
                        let providerNames = '';
                        const providers = providerData.results?.BR;
                        const rentProviders = providers.rent ? providers.rent.slice(0,1).map(p => p.provider_name).join(", ") : '';
                        const flatrateProviders = providers.flatrate ? providers.flatrate.slice(0,3).map(p => p.provider_name).join(", "): '';
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
                                            <img src="${imgUrl}" alt="${movie.title || movie.name}" class="img-fluid">
                                    </li>
                                    <div class="info">
                                    <img src="imagens/star-emoji.png" alt="" class="rating">
                                    <p class="rating-value">${rating}</p>
                                    <li class="movie-name">
                                        <a href="#">${movie.title || movie.name}</a>
                                        <p class="provider-name">${providerNames}</p>
                                    </li>
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;

                            container.appendChild(movieDiv);  

                            // Evento de clique para abrir a pagina
                            movieDiv.addEventListener('click', () => {
                                const params = new URLSearchParams({
                                    title: movie.title || movie.name,
                                    original_title: movie.original_title,
                                    genres: genresNames,
                                    release_date: movie.release_date || movie.first_air_date,
                                    imgUrl: imgUrl,
                                    backdropUrl: backdropUrl,
                                    trailerUrl: trailerYtUrl,
                                    overview: `“${movie.overview}”`,
                                    id: movie.id,
                                    mediaTp: mediaType,
                                    provider_name: providerNames  
                                });
                                                
                                window.location.href = `filme.php?${params.toString()}`;

                            });

                            /*const providerLogo = movieDiv.querySelector('.provider-name');

                            if (providerNames.toLowerCase().includes('netflix')) {  // Verifica se inclui "Netflix"
                                providerLogo.style.fontFamily = "Bebas Neue"; 
                                providerLogo.style.fontWeight = "bold";
                                //console.log(`Provider é ${providerNames}`);
                            } else if(providerNames.toLocaleLowerCase().includes('max')){
                                providerLogo.style.fontFamily = "HBO Max"; 
                            }*/
                                                                                
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            });
        })
        })
        .catch(error => console.error('Erro ao carregar conteúdo:', error))
        .finally(() => {
            hideLoading(); // Esconde o spinner quando tudo está carregado
        });
        }

     // Botões para alternar entre filmes e séries
    document.getElementById('showMovies').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('showSeries').classList.remove('active')
        mediaType = 'movie';  // Mudar para filmes
        loadContent();        // Carregar conteúdo de filmes
        
        // Mova o slider para o botão de filmes
        slider.style.transform = "translateX(0)";

    });

    document.getElementById('showSeries').addEventListener('click', function() {
        mediaType = 'tv';     // Mudar para séries
        loadContent();        // Carregar conteúdo de séries
        this.classList.add('active');
        document.getElementById('showMovies').classList.remove('active');

        // Mova o slider para o botão de séries
        const buttonWidth = this.offsetWidth; // Largura do botão
        slider.style.transform = `translateX(${buttonWidth}px)`; // Move para a direita
    });

    loadContent();        // Carregar conteúdo de filmes

});
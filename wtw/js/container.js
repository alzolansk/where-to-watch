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

        return { imgUrl, trailerUrl, rating, detailsUrl, providerUrl, backdropUrl };
    }

    function formatarData(data) {
        const [ano, mes, dia] = data.split('-'); // Divide a data em ano, mês e dia
        return `${dia}/${mes}/${ano}`; // Retorna a data no formato desejado
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


    function loadContent(){

        const popularUrl = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${apiKey}&language=pt-BR&page=1`;
        const topRatedUrl = `https://api.themoviedb.org/3/${mediaType}/top_rated?api_key=${apiKey}&language=pt-BR&page=1&sort_by=popularity.desc`;
        const upcomingUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=pt-BR&page=1&release_date.gte=2024-13-14&release_date.lte=2024-12-31`;

        fetch(upcomingUrl)
            .then(response => response.json())
            .then(upcomingData => {
                const wrapMovies = upcomingData.results.slice(0, 10);
                const containerNew = document.getElementById('container-wrap');  


                wrapMovies.forEach(movie => {
                    const carouselDiv = document.createElement('div');
                    
                    carouselDiv.addEventListener('click', () => activateBackdropContainer(carouselDiv));

                    const { imgUrl, trailerUrl, detailsUrl, backdropUrl } = defineMovieConstants(movie, 'movie', apiKey);
                    const mediaTypeTxt = movie.media_type === 'movie' ? 'Filme' : 'Série';

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
                                                <button class="trailer-link" onclick="showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                                    <img src="imagens/video-start.png" alt="" id="trailer">
                                                </button>
                                            </div>
                                        
                                            <img src="${imgUrl}" class="frontImage">
                                            
                                        </div>
                                    </div>
                                `
                                console.log(imgUrl);

                                 // Evento de clique para abrir o modal
                                 carouselDiv.addEventListener('click', () => {
                                    const params = new URLSearchParams({
                                        title: movie.title,
                                        original_title: movie.original_title,
                                        genres: genresNames,
                                        release_date: movie.release_date,
                                        imgUrl: imgUrl,
                                        backdropUrl: backdropUrl,
                                        trailerUrl: trailerYtUrl,
                                        overview: movie.overview
                                    });
                                
                                    window.location.href = `filme.php?${params.toString()}`;
                                });

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
                                    const intervalTime = 2500; 
                        
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

                                    // Desativar quando scroll
                                    containerWrap.addEventListener('scroll', () => {
                                        clearInterval(autoScrollInterval); // Volta a deixar apenas o item atual como 'active'
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
                            
                            movieDiv.addEventListener('click', () => {
                                document.getElementById('itemName').innerText = movie.title || movie.name; // Define o título no modal
                                document.getElementById('itemPoster').src = imgUrl;
                                document.getElementById('itemGenre').innerText = `Gênero: ${genresNames}`;
                                document.getElementById('mediaTypeParagraph').innerText = mediaTypeTxt;
                                document.getElementById('providerInfo').innerText = providerNames;

                                /*const dataApi = movie.release_date;
                                const dataFormatada = formatarData(dataApi);

                                document.getElementById('release-date').innerText = `Data de lançamento: ${dataFormatada}`;*/

                                const itemModal = document.getElementById('movieDialog');
                                itemModal.style.backgroundImage = `url(${backdropUrl})`;

                                    const overlayModal = document.querySelector('.overlay-modal');
                                    overlayModal.style.display = 'block'; // Torna a overlay visível 
                                
                                itemModal.showModal();
                                //checkProviders();
                            })

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

                    const { imgUrl, trailerUrl, rating, providerUrl, backdropUrl } = defineMovieConstants(movie, mediaType, apiKey);

                    const carouselDiv = document.createElement('div');

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
            })
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
    loadContent();
});

document.getElementById('closeItem').addEventListener('click', function() {
    const modal = document.getElementById('movieDialog');
    modal.close();
    
    // Ocultar a overlay
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
});

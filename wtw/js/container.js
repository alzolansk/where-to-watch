document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    let mediaType = 'movie'; // Inicialmente filmes
    
    let autoScrollInterval;
    let autoScrollSetupDone = false;
    // Cache para evitar duplicidade
    const fetchCache = {};
    const fetchJson = url => {
        if (!fetchCache[url]) {
            fetchCache[url] = fetch(url).then(r => r.json());
        }
        return fetchCache[url];
    };

    function waitForImages(container) {
        return new Promise(resolve => {
            const images = container ? container.querySelectorAll('img') : [];
            if (images.length === 0) {
                resolve();
                return;
            }
            let loaded = 0;
            const check = () => {
                loaded++;
                if (loaded === images.length) resolve();
            };
            images.forEach(img => {
                if (img.complete) {
                    check();
                } else {
                    img.addEventListener('load', check);
                    img.addEventListener('error', check);
                }
            });
        });
    }

    function defineMovieConstants(movie, mediaType, apiKey) {
        const imgUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        const trailerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`;
        const rating = movie.vote_average.toFixed(2);
        const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}?api_key=${apiKey}&language=pt-BR&page=1`;
        const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/watch/providers?api_key=${apiKey}&language=pt-BR&page=1&sort_by=display_priority.cresc`
        const backdropUrl = `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}`
        const movieLogoUrl = `https://api.themoviedb.org/3/movie/${movie.id}/images?api_key=${apiKey}&include_image_language=null,pt`
        const creditsUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/credits?api_key=${apiKey}&language=pt-BR&page=1`

        return { imgUrl, trailerUrl, rating, detailsUrl, providerUrl, backdropUrl, creditsUrl, movieLogoUrl };
    }

    function slugify(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function activateBackdropContainer(element) {
        const allContainers = document.querySelectorAll('.backdropContainer');
        const containerWrap = document.querySelector('.container-wrap');

        // Remove a classe 'active' de todos os contêineres
        allContainers.forEach(container => {
            container.classList.remove('active');
        });

        // Adiciona a classe 'active' ao contêiner clicado
        element.classList.add('active');

        // Centraliza o item no contêiner
        const itemOffset = element.offsetLeft;
        const containerCenter = (containerWrap.clientWidth / 2) - (element.clientWidth / 2);

        containerWrap.scrollTo({
            left: itemOffset - containerCenter,
            behavior: 'smooth'
        });
    }

    function initAutoScroll() {
        const items = document.querySelectorAll('.backdropContainer');
        const containerWrap = document.querySelector('.container-wrap');

        if (items.length === 0 || !containerWrap) return;

        let currentIndex = 0;
        let isUserInteracting = false;

        function centerItem(index) {
            const item = items[index];
            if (!item) return;

            items.forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            const itemOffset = item.offsetLeft;
            const itemWidth = item.offsetWidth;
            const containerWidth = containerWrap.clientWidth;
            const scrollLeft = itemOffset - (containerWidth / 2) + (itemWidth / 2);

            containerWrap.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }

        function showNextItem() {
            if (isUserInteracting) return;
            currentIndex = (currentIndex + 1) % items.length;
            centerItem(currentIndex);
        }

        function startAutoScroll() {
            stopAutoScroll();
            autoScrollInterval = setInterval(showNextItem, 2000);
        }

        function stopAutoScroll() {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
        }

        centerItem(currentIndex);
        startAutoScroll();

        if (!autoScrollSetupDone) {
            containerWrap.addEventListener('mouseenter', () => {
                isUserInteracting = true;
                stopAutoScroll();
            });

            containerWrap.addEventListener('mouseleave', () => {
                isUserInteracting = false;
                startAutoScroll();
            });

            document.getElementById('btnRight').addEventListener('click', () => {
                isUserInteracting = true;
                stopAutoScroll();
            });

            document.getElementById('btnLeft').addEventListener('click', () => {
                isUserInteracting = true;
                stopAutoScroll();
            });

            containerWrap.addEventListener('wheel', () => {
                isUserInteracting = true;
                stopAutoScroll();
            }, { passive: true });

            autoScrollSetupDone = true;
        }
    }

    function loadContent(){
        showLoading(); // Mostra o spinner ao começar

        const upcomingCaption = document.getElementById('cinemaContainer');
        
        const popularUrl = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${apiKey}&language=pt-BR&page=1`;
        const topRatedUrl = `https://api.themoviedb.org/3/${mediaType}/top_rated?api_key=${apiKey}&language=pt-BR&page=1&sort_by=popularity.desc`;
        const cinemaUrl = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=pt-BR&page=1&sort_by=release_date.desc`;
        const trendingUrl = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${apiKey}&language=pt-BR`;
        const discoverUrl = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${apiKey}&language=pt-BR`;
        const musicalUrl = `${discoverUrl}&sort_by=revenue.desc&with_genres=10402`;

        fetchJson(cinemaUrl)
            .then(cinemaData => {  
                const wrapMovies = cinemaData.results.slice(0, 50);
                const containerNew = document.getElementById('container-wrap');  

                wrapMovies.forEach(movie => {
                    const carouselDiv = document.createElement('div');
                    
                    carouselDiv.addEventListener('click', () => activateBackdropContainer(carouselDiv));

                    const { imgUrl, trailerUrl, detailsUrl, backdropUrl, creditsUrl, movieLogoUrl, providerUrl } = defineMovieConstants(movie, 'movie', apiKey);
                    const mediaTypeTxt = movie.media_type === 'movie' ? 'Filme' : 'Série';
                    const mediaType = 'movie';

                    fetchJson(detailsUrl)
                    .then(data => {
                        const hasHomepage = data.homepage && data.homepage.trim() !== "";
                        return fetchJson(providerUrl).then(providerData => ({ data, providerData, hasHomepage }));
                    })
                    .then(({ data, providerData, hasHomepage }) => {
                        const providers = providerData.results?.BR;
                        const hasProviders = providers && (
                            (providers.rent && providers.rent.length > 0) ||
                            (providers.flatrate && providers.flatrate.length > 0) ||
                            (providers.buy && providers.buy.length > 0)
                        );
                        if (hasProviders) return;

                        const slug = slugify(movie.title || movie.original_title);
                        const ticketUrl = hasHomepage ? data.homepage : `https://www.ingresso.com/filme/${slug}`;

                        const genresArray = data.genres;
                        const companies = data.production_companies;
                        let genresNames = '';
                        if (genresArray && genresArray.length > 0) {
                            genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos gêneros
                        }                            

                        let allLogosHTML = "";

                        companies.slice(0, 2).forEach(company => {
                            const releaseDate = new Date(data.release_date);
                            const today = new Date();
                            const threeMonthsAgo = new Date();
                            threeMonthsAgo.setMonth(today.getMonth() - 3);

                            const threeMonthsAhead = new Date();
                            threeMonthsAhead.setMonth(today.getMonth() + 3);

                            const isInRange = releaseDate >= threeMonthsAgo && releaseDate <= threeMonthsAhead;
                            if (company.logo_path) {
                                const companyLogoUrl = `https://image.tmdb.org/t/p/w92${company.logo_path}`;

                                let companyLogoFilter = '';
                                
                                if (company.name.includes("Avanti Pictures")
                                    || company.name.includes("DNA")
                                    || company.name.includes("Warner")
                                    || company.name.includes("Proximity")
                                    || company.name.includes("American Empirical")
                                    || company.name.includes("Encyclopedia")) {
                                    companyLogoFilter = 'filter: grayscale(60%) brightness(1.1) contrast(110%);';
                                } else {
                                    companyLogoFilter = 'filter: brightness(0) invert(1); mix-blend-mode: screen;';
                                }
                                
                                allLogosHTML += `<img src="${companyLogoUrl}" alt="${company.name}" class="company-logo" style="${companyLogoFilter}">`;
                            }

                            if (isInRange) {
                                
                    fetchJson(trailerUrl)
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (Array.isArray(trailerPath) && trailerPath.length > 0) {
                                trailerKey = trailerPath[0].key; 

                                if(!trailerKey){
                                    console.log("Trailer key vazia");
                                }
                            }
                                    
                    fetchJson(creditsUrl)
                    .then(creditsData =>{


                    fetchJson(movieLogoUrl)
                    .then(imageData => {

                        if (imageData.logos && imageData.logos.length > 0) {
                        const logoPath = imageData.logos[0].file_path;
                        const fullLogoUrl = `https://image.tmdb.org/t/p/w500${logoPath}`;

                            const castArray = creditsData.cast.slice(0,10);
                            let castHtml = '';
                            if(castArray && castArray.length > 0){
                                castArray.forEach(cast => {
                                    const castName = cast.name;
                                    const castRole = cast.character;

                                    const profileImg = cast.profile_path ? `https://image.tmdb.org/t/p/w300/${cast.profile_path}` : 'imagens/user.png'; // Avatar padrão se não houver imagem

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
                                                    <h2 class="movie-pt-title">${movie.title}</h2>
                                                    <p class="movie-title">${movie.original_title}</p>
                                                    <p class="genre-name">${genresNames}</p>
                                                    <button class="trailer-link" onclick="showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                                        <img src="imagens/video-start.png" alt="" id="trailer">
                                                    </button>
                                                </div>
                                                
                                                <div class="company-logo-container">${allLogosHTML}</div>


                                                <img src="${imgUrl}" class="frontImage">
                                                
                                            </div>
                                        </div>
                                    `

                                    // Evento de clique para abrir a pagina
                                    carouselDiv.addEventListener('click', () => {
                                        const params = new URLSearchParams({
                                            title: movie.title || movie.name,
                                            original_title: movie.original_title,
                                            genres: genresNames,
                                            release_date: movie.release_date || movie.first_air_date,
                                            imgUrl: imgUrl,
                                            backdropUrl: backdropUrl,
                                            trailerUrl: trailerYtUrl,
                                            overview: `${movie.overview}`,
                                            id: movie.id,
                                            mediaTp: mediaType,
                                            itemFetch: "upcoming",
                                            ticketUrl: ticketUrl,
                                            producerName: company.name
                                        });
                                                
                                        window.location.href = `filme.php?${params.toString()}`;

                                    });
                                });
                            }

                        containerNew.appendChild(carouselDiv);
                                                        
                        }
                        })   
                        }); 
                    })
                    .catch(error => console.error('Erro ao buscar o trailer:', error));
                    }
                });
            })
          });
        })
        setTimeout(initAutoScroll, 500);
    

            fetchJson(popularUrl)
            .then(popularData => {
                const movies = popularData.results;
                const container = document.getElementById('popular-movies-container');
                container.innerHTML = ""; // Limpa o container

                movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('col-md-3', 'movies');
                    const mediaTypeTxt = movie.media_type === 'movie' ? 'Filme' : 'Série';

                    const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl, detailsUrl} = defineMovieConstants(movie, mediaType, apiKey);
                    
                    fetchJson(providerUrl)
                    .then(providerData => {
                        let providerNames = '';
                        let providerLogos = '';
                        const providers = providerData.results?.BR;

                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("paramount plus apple tv channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );
                        const rentFiltered = providers.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (logoGroups.length) {
                            providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');
                        }

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
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
                                        <div class="provider-logo-container">${providerLogos}</div>
                                    </li>
                                
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                            ▶ Trailer
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
                                    overview: `${movie.overview}`,
                                    id: movie.id,
                                    mediaTp: mediaType,
                                    itemFetch: mediaType,
                                    ticketUrl: data.homepage,
                                    provider_name: providerNames,
                                    genresJson : data.genres
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

                    fetchJson(providerUrl)
                    .then(providerData => {
                        let providerNames = '';
                        let providerLogos = '';
                        const providers = providerData.results?.BR;
                    
                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("Paramount Plus Apple TV Channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );

                        const rentFiltered = providers.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (logoGroups.length) {
                            providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');
                        }

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                    fetchJson(trailerUrl)
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
                                        <div class="provider-logo-container">${providerLogos}</div>
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
                                    overview: `${movie.overview}`,
                                    id: movie.id,
                                    mediaTp: mediaType,
                                    itemFetch: mediaType,
                                    ticketUrl: data.homepage,
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

        fetch(trendingUrl)
            .then(response => response.json())
            .then(trendingData => {
                const movies = trendingData.results;
                const container = document.getElementById('trending-movies-container');
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

                    fetchJson(providerUrl)
                    .then(providerData => {
                        let providerNames = '';
                        let providerLogos = '';
                        const providers = providerData.results?.BR;
                    
                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("Paramount Plus Apple TV Channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );

                        const rentFiltered = providers.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (logoGroups.length) {
                            providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');
                        }

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                    fetchJson(trailerUrl)
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
                                        <div class="provider-logo-container">${providerLogos}</div>
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
                                    overview: `${movie.overview}`,
                                    id: movie.id,
                                    mediaTp: mediaType,
                                    itemFetch: mediaType,
                                    ticketUrl: data.homepage,
                                    provider_name: providerNames 
                                });
                                                
                                window.location.href = `filme.php?${params.toString()}`;

                            });                                            
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            });
        })
        })

        fetch(musicalUrl)
            .then(response => response.json())
            .then(musicalData => {
                const movies = musicalData.results;
                const musicalContainer = document.getElementById('musical-movies-container');
                musicalContainer.innerHTML = ""; // Limpa o container

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

                    fetchJson(providerUrl)
                    .then(providerData => {
                        let providerNames = '';
                        let providerLogos = '';
                        const providers = providerData.results?.BR;
                    
                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("Paramount Plus Apple TV Channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );

                        const rentFiltered = providers.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (logoGroups.length) {
                            providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');
                        }

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                    fetchJson(trailerUrl)
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
                                        <div class="provider-logo-container">${providerLogos}</div>
                                    </li>
                                    <li class="watch-trailer">
                                        <a href="#" onclick="event.preventDefault(); showTrailer('${trailerYtUrl}'); event.stopPropagation();">
                                            <img src="imagens/video-start.png" alt=""> Trailer
                                        </a>
                                    </li>
                                    </div>
                                </div>
                            `;

                            musicalContainer.appendChild(movieDiv);  

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
                                    overview: `${movie.overview}`,
                                    id: movie.id,
                                    mediaTp: mediaType,
                                    itemFetch: mediaType,
                                    ticketUrl: data.homepage,
                                    provider_name: providerNames 
                                });
                                                
                                window.location.href = `filme.php?${params.toString()}`;

                            });                                            
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            });
        })
        })

        .catch(error => console.error('Erro ao carregar conteúdo:', error))
        .finally(() => {
            const containers = [
                document.getElementById('container-wrap'),
                document.getElementById('popular-movies-container'),
                document.getElementById('top-movies-container')
            ];
            Promise.all(containers.map(c => waitForImages(c))).then(hideLoading);
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
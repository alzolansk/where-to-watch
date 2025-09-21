document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    let mediaType = 'movie'; // Inicialmente filmes
    const contentSection = document.querySelector(".media-section");
    const sliderIndicator = document.querySelector('.style-buttons .slider-indicator');

    let autoScrollInterval;
    let autoScrollSetupDone = false;
    // Cache para evitar duplicidade
    const fetchCache = {};
    const fetchJson = (url) => {
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('fetchJson called with invalid url'));
        }
        if (!fetchCache[url]) {
            fetchCache[url] = fetch(url).then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status} for ${url}`);
                }
                return r.json();
            });
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
        const imgUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'imagens/icon-cast.png';
        const trailerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`;
        const rating = (typeof movie.vote_average === 'number' && movie.vote_average > 0)
            ? movie.vote_average.toFixed(1)
            : 'N/A';
        const detailsUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}?api_key=${apiKey}&language=pt-BR&page=1`;
        const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/watch/providers?api_key=${apiKey}&language=pt-BR&page=1&sort_by=display_priority.cresc`
        const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}` : 'imagens/icon-cast.png'
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

    function switchMedia(newType) {
        const outClass = newType === "tv" ? "fade-out-left" : "fade-out-right";
        const inClass = newType === "tv" ? "fade-in-right" : "fade-in-left";
        contentSection.classList.add(outClass);
        setTimeout(() => {
            mediaType = newType;
            loadContent();
            contentSection.classList.remove(outClass);
            contentSection.classList.add(inClass);
            setTimeout(() => contentSection.classList.remove(inClass), 500);
        }, 500);
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
                if (!containerNew) {
                    return;
                }
                containerNew.innerHTML = '';

                wrapMovies.forEach(movie => {
                    const slideEl = document.createElement('article');
                    slideEl.classList.add('backdropContainer');
                    slideEl.addEventListener('click', () => activateBackdropContainer(slideEl));
                    const { imgUrl, trailerUrl, detailsUrl, backdropUrl, creditsUrl, movieLogoUrl, providerUrl } = defineMovieConstants(movie, 'movie', apiKey);
                    const mediaType = 'movie';
                    const mediaTypeTxt = 'Filme';
                    fetchJson(detailsUrl)
                        .then(data => {
                            if (!data) {
                                return null;
                            }
                            return fetchJson(providerUrl).then(providerData => ({ data, providerData }));
                        })
                        .then(result => {
                            if (!result) {
                                return null;
                            }
                            const { data, providerData } = result;
                            const providers = providerData?.results?.BR || {};
                            const hasProviders = providers && (
                                (providers.rent && providers.rent.length > 0) ||
                                (providers.flatrate && providers.flatrate.length > 0) ||
                                (providers.buy && providers.buy.length > 0)
                            );
                            if (hasProviders) {
                                return null;
                            }
                            const releaseDateRaw = data.release_date || movie.release_date;
                            if (!releaseDateRaw) {
                                return null;
                            }
                            const releaseDate = new Date(releaseDateRaw);
                            if (Number.isNaN(releaseDate.getTime())) {
                                return null;
                            }
                            const today = new Date();
                            const threeMonthsAgo = new Date(today);
                            threeMonthsAgo.setMonth(today.getMonth() - 3);
                            const threeMonthsAhead = new Date(today);
                            threeMonthsAhead.setMonth(today.getMonth() + 3);
                            if (releaseDate < threeMonthsAgo || releaseDate > threeMonthsAhead) {
                                return null;
                            }
                            const slug = slugify(movie.title || movie.original_title || '');
                            const hasHomepage = data.homepage && data.homepage.trim() !== '';
                            const ticketUrl = hasHomepage ? data.homepage : `https://www.ingresso.com/filme/${slug}`;
                            const genresNames = Array.isArray(data.genres) && data.genres.length
                                ? data.genres.map(genre => genre.name).join(', ')
                                : '';
                            const companies = Array.isArray(data.production_companies) ? data.production_companies : [];
                            const logoWhitelist = [
                                'Avanti Pictures',
                                'DNA',
                                'Warner',
                                'Proximity',
                                'American Empirical',
                                'Encyclopedia'
                            ];
                            const productionLogos = companies
                                .filter(company => company.logo_path)
                                .slice(0, 3)
                                .map(company => {
                                    const logoUrl = `https://image.tmdb.org/t/p/w154${company.logo_path}`;
                                    const shouldKeepColor = logoWhitelist.some(name => company.name && company.name.includes(name));
                                    const style = shouldKeepColor
                                        ? 'filter: grayscale(10%) brightness(1.05) contrast(110%);'
                                        : 'filter: brightness(0) invert(1) saturate(1.15); mix-blend-mode: screen;';
                                    return `<img src="${logoUrl}" alt="${company.name}" class="company-logo" style="${style}">`;
                                })
                                .join('');
                            const primaryCompanyName = companies[0]?.name || '';
                            return Promise.all([
                                fetchJson(trailerUrl).catch(() => null),
                                fetchJson(creditsUrl).catch(() => null),
                                fetchJson(movieLogoUrl).catch(() => null)
                            ]).then(([trailerData, creditsData, imageData]) => {
                                const trailerResults = Array.isArray(trailerData?.results) ? trailerData.results : [];
                                const preferredTrailer = trailerResults.find(video => video.type === 'Trailer' && video.site === 'YouTube') || trailerResults[0];
                                const trailerKey = preferredTrailer?.key || '';
                                const trailerYtUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : '';
                                const castArray = Array.isArray(creditsData?.cast) ? creditsData.cast.slice(0, 5) : [];
                                const castNames = castArray.map(cast => cast.name).join(', ');
                                const overviewSource = data.overview || movie.overview || '';
                                const truncatedOverview = overviewSource.length > 320 ? `${overviewSource.slice(0, 317)}...` : overviewSource;
                                const tagline = data.tagline && data.tagline.trim() !== '' ? data.tagline : '';
                                const runtime = data.runtime ? `${data.runtime} min` : '';
                                const releaseYear = releaseDate.getFullYear();
                                const releaseLabel = releaseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                                const voteAverage = (typeof data.vote_average === 'number' && data.vote_average > 0)
                                    ? data.vote_average.toFixed(1)
                                    : '';
                                const titleLogoPath = imageData?.logos?.find(logo => logo.file_path)?.file_path;
                                const titleLogoUrl = titleLogoPath ? `https://image.tmdb.org/t/p/w500${titleLogoPath}` : '';
                                const showTextTitle = !titleLogoUrl;
                                const showOriginalSubtitle = showTextTitle && movie.original_title && movie.original_title !== (movie.title || movie.name);
                                const params = new URLSearchParams({
                                    title: movie.title || movie.name || '',
                                    original_title: movie.original_title || '',
                                    genres: genresNames,
                                    release_date: movie.release_date || movie.first_air_date || '',
                                    imgUrl,
                                    backdropUrl,
                                    trailerUrl: trailerYtUrl,
                                    overview: `${movie.overview || ''}`,
                                    id: movie.id,
                                    mediaTp: mediaType,
                                    itemFetch: 'upcoming',
                                    ticketUrl,
                                    producerName: primaryCompanyName
                                });
                                const detailsHref = `filme.php?${params.toString()}`;
                                slideEl.innerHTML = `
                                                                    <img src="${backdropUrl}" alt="Backdrop de ${movie.title || movie.name}" class="hero-card__backdrop">
                                                                    ${productionLogos ? `<div class="hero-card__brand-row">${productionLogos}</div>` : ''}
                                                                    <div class="hero-card__layout">
                                                                        <div class="hero-card__content">
                                                                            <div class="hero-card__top">
                                                                                ${primaryCompanyName ? `<span class="hero-card__eyebrow">${primaryCompanyName}</span>` : `<span class="hero-card__eyebrow">Nos cinemas</span>`}
                                                                                <div class="hero-card__title-block">
                                                                                    ${titleLogoUrl ? `<img src="${titleLogoUrl}" alt="${movie.title || movie.name}" class="hero-card__title-logo">` : ''}
                                                                                    ${showTextTitle ? `<h2 class="hero-card__title">${movie.title || movie.name}</h2>` : ''}
                                                                                    ${showOriginalSubtitle ? `<p class="hero-card__subtitle">${movie.original_title}</p>` : ''}
                                                                                </div>
                                                                                <div class="hero-card__meta">
                                                                                    <span class="hero-card__badge">${mediaTypeTxt}</span>
                                                                                    ${releaseYear ? `<span class="hero-card__meta-item">${releaseYear}</span>` : ''}
                                                                                    ${runtime ? `<span class="hero-card__meta-item">${runtime}</span>` : ''}
                                                                                    ${voteAverage ? `<span class="hero-card__meta-item hero-card__meta-item--rating"><img src="imagens/star-emoji.png" alt="" aria-hidden="true">${voteAverage}</span>` : ''}
                                                                                </div>
                                                                                ${genresNames ? `<p class="hero-card__genres">${genresNames}</p>` : ''}
                                                                                ${tagline ? `<p class="hero-card__tagline">"${tagline}"</p>` : ''}
                                                                                ${truncatedOverview ? `<p class="hero-card__overview">${truncatedOverview}</p>` : ''}
                                                                            </div>
                                                                            <div class="hero-card__bottom">
                                                                                <div class="hero-card__actions">
                                                                                    <button type="button" class="hero-card__action hero-card__action--primary js-open-trailer">
                                                                                        <span class="hero-card__action-icon">&#9654;</span>
                                                                                        Assistir trailer
                                                                                    </button>
                                                                                    <button type="button" class="hero-card__action hero-card__action--ghost js-open-details">
                                                                                        <span class="hero-card__action-icon">+</span>
                                                                                        Ver detalhes
                                                                                    </button>
                                                                                </div>
                                                                                ${castNames ? `<div class="hero-card__cast">
                                                                                    <span class="hero-card__cast-label">Elenco</span>
                                                                                    <p class="hero-card__cast-names">${castNames}</p>
                                                                                </div>` : ''}
                                                                                ${releaseLabel ? `<p class="hero-card__release">Estreia ${releaseLabel}</p>` : ''}
                                                                            </div>
                                                                        </div>
                                                                        <aside class="hero-card__poster">
                                                                            <img src="${imgUrl}" alt="Poster de ${movie.title || movie.name}" class="hero-card__poster-img">
                                                                        </aside>
                                                                    </div>
                                                                `;
                                const trailerCta = slideEl.querySelector('.js-open-trailer');
                                if (trailerCta) {
                                    if (trailerYtUrl) {
                                        trailerCta.addEventListener('click', event => {
                                            event.stopPropagation();
                                            showTrailer(trailerYtUrl);
                                        });
                                    } else {
                                        trailerCta.classList.add('hero-card__action--disabled');
                                        trailerCta.disabled = true;
                                    }
                                }
                                const detailsCta = slideEl.querySelector('.js-open-details');
                                if (detailsCta) {
                                    detailsCta.addEventListener('click', event => {
                                        event.stopPropagation();
                                        window.location.href = detailsHref;
                                    });
                                }
                                slideEl.addEventListener('click', () => {
                                    window.location.href = detailsHref;
                                });
                                if (!containerNew.hasChildNodes()) {
                                    slideEl.classList.add('active');
                                }
                                if (!slideEl.isConnected) {
                                    containerNew.appendChild(slideEl);
                                }
                                return null;
                            });
                        })
                        .catch(error => console.error('Erro ao carregar destaque:', error));
                });
        setTimeout(initAutoScroll, 500);
    })
    

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
                        const providers = providerData?.results?.BR || {};

                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("paramount plus apple tv channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );
                        const rentFiltered = providers?.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers?.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (!logoGroups.length) {
                            return;
                        }

                        providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                        fetchJson(detailsUrl)
                        .then(data => {
                            const genresArray = data.genres;
                            let genresNames = '';
                            if (genresArray && genresArray.length > 0) {
                                genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos gêneros
                            }
    
                        fetchJson(trailerUrl || `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`)
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

                    fetchJson(detailsUrl)
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
                        const providers = providerData?.results?.BR || {};
                    
                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("Paramount Plus Apple TV Channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );

                        const rentFiltered = providers?.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers?.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (!logoGroups.length) {
                            return;
                        }

                        providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                    fetchJson(trailerUrl || `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`)
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (Array.isArray(trailerPath) && trailerPath.length > 0) {
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

                    fetchJson(detailsUrl)
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
                        const providers = providerData?.results?.BR || {};
                    
                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("Paramount Plus Apple TV Channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );

                        const rentFiltered = providers?.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers?.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (!logoGroups.length) {
                            return;
                        }

                        providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                    fetchJson(trailerUrl || `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`)
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (Array.isArray(trailerPath) && trailerPath.length > 0) {
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

                    fetchJson(detailsUrl)
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
                        const providers = providerData?.results?.BR || {};
                    
                        const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                        const filterProviders = (arr = []) => arr.filter(p =>
                            !p.provider_name.includes("Standard with Ads") &&
                            !p.provider_name.includes("Amazon Channel") &&
                            !p.provider_name.includes("Paramount Plus Apple TV Channel") &&
                            !p.provider_name.includes("paramount plus premium")
                        );

                        const rentFiltered = providers?.rent ? filterProviders(providers.rent) : [];
                        const flatrateFiltered = providers?.flatrate ? filterProviders(providers.flatrate) : [];
                        const rentLogoImgs = rentFiltered.slice(0,1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const flatrateLogoImgs = flatrateFiltered.slice(0,3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                        const logoGroups = [];
                        if (flatrateLogoImgs.length) {
                            logoGroups.push(flatrateLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                        }
                        if (rentLogoImgs.length) {
                            logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                        }
                        if (!logoGroups.length) {
                            return;
                        }

                        providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');

                        const rentProviders = rentFiltered.slice(0,1).map(p => p.provider_name).join(", ") || '';
                        const flatrateProviders = flatrateFiltered.slice(0,3).map(p => p.provider_name).join(", ") || '';
                        const allProviders = [rentProviders, flatrateProviders].filter(Boolean).join(", ");

                        if(allProviders){
                            providerNames = allProviders;
                        } else {
                            console.log('Nenhum provedor encontrado para BR.');
                        }
                        
                    fetchJson(trailerUrl || `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`)
                        .then(trailerData => {
                            const trailerPath = trailerData.results;

                            let trailerKey = '';
                            if (Array.isArray(trailerPath) && trailerPath.length > 0) {
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
        switchMedia("movie");

        
        // Mova o slider para o botão de filmes
        if (sliderIndicator) {
            sliderIndicator.style.transform = 'translateX(0)';
        }

    });

    document.getElementById('showSeries').addEventListener('click', function() {
        this.classList.add("active");
        document.getElementById("showMovies").classList.remove("active");
        switchMedia("tv");

        // Mova o slider para o botão de séries
        const buttonWidth = this.offsetWidth; // Largura do botão
        if (sliderIndicator) {
            sliderIndicator.style.transform = `translateX(${buttonWidth}px)`;
        } // Move para a direita
    });

    loadContent();        // Carregar conteúdo de filmes

});

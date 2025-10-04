document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    let mediaType = 'movie'; // Inicialmente filmes
    const contentSection = document.querySelector(".media-section");
    const sliderIndicator = document.querySelector('.style-buttons .slider-indicator');
    const BUTTON_RESUME_DELAY = 3000;

    let autoScrollInterval;
    let autoScrollRefreshTimeout = null;
    let autoScrollSetupDone = false;
    let carouselItems = [];
    let currentIndex = 0;
    let isUserInteracting = false;
    let isManualScroll = false;
    let manualScrollTimeout;
    let buttonInteractionTimeout;
    let isProgrammaticScroll = false;
    let programmaticScrollTarget = null;
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
            const node = container || document;
            const allImages = node ? node.querySelectorAll('img') : [];
            const images = Array.from(allImages).filter(img => !(img && img.loading === 'lazy' && !img.complete));
            if (!images.length) {
                resolve();
                return;
            }
            let loaded = 0;
            const settle = () => {
                loaded++;
                if (loaded >= images.length) {
                    resolve();
                }
            };
            images.forEach(img => {
                if (img.complete) {
                    settle();
                } else {
                    img.addEventListener('load', settle, { once: true });
                    img.addEventListener('error', settle, { once: true });
                }
            });
            setTimeout(resolve, 4000);
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
        const movieLogoUrl = `https://api.themoviedb.org/3/${mediaType}/${movie.id}/images?api_key=${apiKey}&include_image_language=null,pt,en`
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
        if (!element) {
            return;
        }

        if (typeof window.__wtwSetActiveBackdrop === 'function') {
            const items = carouselItems.length ? carouselItems : Array.from(document.querySelectorAll('.backdropContainer'));
            const targetIndex = items.indexOf(element);
            if (targetIndex !== -1) {
                if (typeof window.__wtwStopAutoScroll === 'function') {
                    window.__wtwStopAutoScroll();
                }
                window.__wtwSetActiveBackdrop(targetIndex);
                return;
            }
        }

        const allContainers = document.querySelectorAll('.backdropContainer');
        const localContainerWrap = document.getElementById('container-wrap');

        allContainers.forEach(container => {
            container.classList.remove('active');
        });

        element.classList.add('active');

        if (!localContainerWrap) {
            return;
        }

        const itemOffset = element.offsetLeft;
        const containerCenter = (localContainerWrap.clientWidth / 2) - (element.clientWidth / 2);

        localContainerWrap.scrollTo({
            left: itemOffset - containerCenter,
            behavior: 'smooth'
        });
    }


    function scheduleAutoScrollRefresh(delay = 180) {
        if (autoScrollRefreshTimeout) {
            clearTimeout(autoScrollRefreshTimeout);
        }
        autoScrollRefreshTimeout = setTimeout(() => {
            autoScrollRefreshTimeout = null;
            initAutoScroll();
        }, delay);
    }

    function initAutoScroll() {
        carouselItems = Array.from(document.querySelectorAll('.backdropContainer'));
        const containerWrap = document.getElementById('container-wrap');

        if (buttonInteractionTimeout) {
            clearTimeout(buttonInteractionTimeout);
            buttonInteractionTimeout = null;
        }

        function stopAutoScroll() {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
        }

        if (!containerWrap || carouselItems.length === 0) {
            stopAutoScroll();
            return;
        }

        const ensureIndexInBounds = index => {
            if (!carouselItems.length) {
                return 0;
            }
            return Math.max(0, Math.min(index, carouselItems.length - 1));
        }

        const updateActive = index => {
            const item = carouselItems[index];
            if (!item) {
                return;
            }
            carouselItems.forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            currentIndex = index;
            containerWrap.dataset.activeIndex = String(index);
        }

        const scrollToItem = (index, behavior = 'smooth') => {
            const item = carouselItems[index];
            if (!item) {
                return;
            }
            const containerWidth = containerWrap.clientWidth;
            const targetScroll = item.offsetLeft - (containerWidth / 2) + (item.offsetWidth / 2);
            programmaticScrollTarget = targetScroll;
            if (Math.abs(containerWrap.scrollLeft - targetScroll) <= 1) {
                isProgrammaticScroll = false;
                programmaticScrollTarget = null;
                return;
            }
            isProgrammaticScroll = true;
            containerWrap.scrollTo({
                left: targetScroll,
                behavior
            });
            const resetDelay = behavior === 'smooth' ? 600 : 0;
            setTimeout(() => {
                if (programmaticScrollTarget === targetScroll) {
                    isProgrammaticScroll = false;
                    programmaticScrollTarget = null;
                }
            }, resetDelay);
        };

        function centerItem(index, options = {}) {
            if (!carouselItems.length) {
                return;
            }
            const { syncScroll = true, behavior = 'smooth' } = options;
            const targetIndex = ensureIndexInBounds(index);
            const activeItem = carouselItems[targetIndex];
            if (!activeItem) {
                return;
            }
            if (targetIndex !== currentIndex || !activeItem.classList.contains('active')) {
                updateActive(targetIndex);
            }
            if (syncScroll) {
                scrollToItem(targetIndex, behavior);
            }
        }

        function showNextItem() {
            if (!carouselItems.length || isUserInteracting) {
                return;
            }
            const nextIndex = (currentIndex + 1) % carouselItems.length;
            centerItem(nextIndex);
        }

        function startAutoScroll() {
            stopAutoScroll();
            autoScrollInterval = setInterval(showNextItem, 2000);
        }

        const clearButtonInteractionTimeout = () => {
            if (buttonInteractionTimeout) {
                clearTimeout(buttonInteractionTimeout);
                buttonInteractionTimeout = null;
            }
        };

        const scheduleAutoScrollResume = (delay = BUTTON_RESUME_DELAY) => {
            clearButtonInteractionTimeout();
            buttonInteractionTimeout = setTimeout(() => {
                if (!isManualScroll) {
                    isUserInteracting = false;
                    startAutoScroll();
                }
                buttonInteractionTimeout = null;
            }, delay);
        };

        window.__wtwSetActiveBackdrop = (index, options = {}) => {
            stopAutoScroll();
            isUserInteracting = true;
            isManualScroll = false;
            programmaticScrollTarget = null;
            centerItem(index, options);
        };
        window.__wtwGetActiveBackdropIndex = () => currentIndex;
        window.__wtwGetBackdropCount = () => carouselItems.length;
        window.__wtwStopAutoScroll = stopAutoScroll;
        window.__wtwStartAutoScroll = startAutoScroll;

        currentIndex = ensureIndexInBounds(currentIndex);
        centerItem(currentIndex, { behavior: 'auto' });
        startAutoScroll();

        if (!autoScrollSetupDone) {
            const handleManualInteractionStart = () => {
                clearButtonInteractionTimeout();
                isUserInteracting = true;
                isManualScroll = true;
                isProgrammaticScroll = false;
                programmaticScrollTarget = null;
                stopAutoScroll();
            };

            containerWrap.addEventListener('mouseenter', () => {
                clearButtonInteractionTimeout();
                isUserInteracting = true;
                stopAutoScroll();
            });

            containerWrap.addEventListener('mouseleave', () => {
                isUserInteracting = false;
                if (!isManualScroll) {
                    startAutoScroll();
                }
            });

            containerWrap.addEventListener('pointerdown', handleManualInteractionStart, { passive: true });
            containerWrap.addEventListener('touchstart', handleManualInteractionStart, { passive: true });
            containerWrap.addEventListener('wheel', handleManualInteractionStart, { passive: true });

            const updateActiveFromScroll = () => {
                if (!carouselItems.length) {
                    return;
                }
                const containerCenter = containerWrap.scrollLeft + (containerWrap.clientWidth / 2);
                let closestIndex = currentIndex;
                let minDistance = Infinity;

                carouselItems.forEach((item, index) => {
                    const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
                    const distance = Math.abs(containerCenter - itemCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                });

                centerItem(closestIndex, { syncScroll: false });

                if (manualScrollTimeout) {
                    clearTimeout(manualScrollTimeout);
                }

                manualScrollTimeout = setTimeout(() => {
                    centerItem(closestIndex);
                    isManualScroll = false;
                    isUserInteracting = false;
                    startAutoScroll();
                }, 200);
            };

            containerWrap.addEventListener('scroll', () => {
                if (isProgrammaticScroll) {
                    if (programmaticScrollTarget !== null) {
                        const distanceToTarget = Math.abs(containerWrap.scrollLeft - programmaticScrollTarget);
                        if (distanceToTarget <= 1) {
                            isProgrammaticScroll = false;
                            programmaticScrollTarget = null;
                        }
                    }
                    if (isProgrammaticScroll) {
                        return;
                    }
                    return;
                }
                if (!isManualScroll) {
                    isManualScroll = true;
                    isUserInteracting = true;
                    stopAutoScroll();
                }
                updateActiveFromScroll();
            }, { passive: true });

            const handleButtonInteraction = () => {
                isUserInteracting = true;
                stopAutoScroll();
                scheduleAutoScrollResume();
            };

            document.getElementById('btnRight').addEventListener('click', handleButtonInteraction);

            document.getElementById('btnLeft').addEventListener('click', handleButtonInteraction);

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
        showLoading(); // Mostra o spinner ao comecar

        const heroUrl = `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}&language=pt-BR&page=1`;
        const popularUrl = `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${apiKey}&language=pt-BR&page=1`;
        const topRatedUrl = `https://api.themoviedb.org/3/${mediaType}/top_rated?api_key=${apiKey}&language=pt-BR&page=1&sort_by=popularity.desc`;
        const discoverUrl = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${apiKey}&language=pt-BR`;
        const streamingUrl = `${discoverUrl}&sort_by=popularity.desc&with_watch_monetization_types=flatrate`;
        const musicalUrl = `${discoverUrl}&sort_by=revenue.desc&with_genres=10402`;

        const filterProviderList = (arr = []) => arr.filter(provider => {
            if (!provider || !provider.provider_name) {
                return false;
            }
            const name = provider.provider_name.toLowerCase();
            return !name.includes('standard with ads')
                && !name.includes('amazon channel')
                && !name.includes('paramount plus apple tv channel')
                && !name.includes('paramount plus premium');
        });

        const extractStreamingProviders = providers => {
            const flatrate = filterProviderList(providers?.flatrate || []);
            return {
                flatrate,
                hasStreaming: flatrate.length > 0
            };
        };

        fetchJson(heroUrl)
            .then(heroData => {
                const heroItems = Array.isArray(heroData?.results)
                    ? heroData.results.filter(item => item && (item.media_type === "movie" || item.media_type === "tv"))
                    : [];
                const wrapItems = heroItems.slice(0, 50);
                const containerNew = document.getElementById("container-wrap");
                if (!containerNew) {
                    return;
                }
                containerNew.innerHTML = '';
                currentIndex = 0;
                scheduleAutoScrollRefresh();

                const highlightSlide = document.createElement('article');
                highlightSlide.classList.add('backdropContainer', 'backdropContainer--highlight');
                highlightSlide.innerHTML = `
                    <div class="highlight-card">
                        <span class="highlight-card__eyebrow">Agora em destaque</span>
                        <h2 class="highlight-card__title">Veja o que est\u00e1 <span class="highlight-card__title-accent">bombando</span> no momento</h2>
                        <div class="highlight-card__cta">
                            <span class="highlight-card__cta-text">Descubra</span>
                            <span class="highlight-card__cta-arrows" aria-hidden="true">
                                <span class="highlight-card__cta-arrow">&rsaquo;</span>
                                <span class="highlight-card__cta-arrow">&rsaquo;</span>
                                <span class="highlight-card__cta-arrow">&rsaquo;</span>
                            </span>
                        </div>
                    </div>
                `;
                highlightSlide.addEventListener('click', () => activateBackdropContainer(highlightSlide));
                containerNew.appendChild(highlightSlide);

                activateBackdropContainer(highlightSlide);

                wrapItems.forEach(item => {
                    const slideEl = document.createElement('article');
                    slideEl.classList.add('backdropContainer');
                    slideEl.addEventListener('click', () => activateBackdropContainer(slideEl));

                    const itemMediaType = item.media_type === 'tv' ? 'tv' : 'movie';
                    const { imgUrl, trailerUrl, detailsUrl, backdropUrl, creditsUrl, movieLogoUrl, providerUrl } = defineMovieConstants(item, itemMediaType, apiKey);
                    const mediaTypeTxt = itemMediaType === 'tv' ? 'S\u00e9rie' : 'Filme';

                    fetchJson(detailsUrl)
                        .then(data => {
                            if (!data) {
                                return null;
                            }
                            return Promise.all([
                                Promise.resolve(data),
                                fetchJson(trailerUrl).catch(() => null),
                                fetchJson(creditsUrl).catch(() => null),
                                fetchJson(movieLogoUrl).catch(() => null),
                                fetchJson(providerUrl).catch(() => null)
                            ]);
                        })
                        .then(result => {
                            if (!result) {
                                return null;
                            }
                            const [data, trailerData, creditsData, imageData, providerData] = result;

                            const titleSource = data.title || data.name || item.title || item.name || '';
                            const originalTitle = itemMediaType === 'tv'
                                ? (data.original_name || item.original_name || '')
                                : (data.original_title || item.original_title || '');

                            const releaseDateRaw = itemMediaType === 'tv'
                                ? (data.first_air_date || item.first_air_date || data.last_air_date || '')
                                : (data.release_date || item.release_date || '');
                            let releaseDate = null;
                            if (releaseDateRaw) {
                                const parsedDate = new Date(releaseDateRaw);
                                if (!Number.isNaN(parsedDate.getTime())) {
                                    releaseDate = parsedDate;
                                }
                            }
                            const today = new Date();
                            if (!releaseDate || releaseDate > today) {
                                return null;
                            }
                            const releaseYear = releaseDate.getFullYear();
                            const releasePrefix = 'Lan\u00e7ado em';
                            const releaseLabel = releaseDate.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            });

                            const providersData = providerData?.results?.BR || {};
                            const { flatrate, hasStreaming } = extractStreamingProviders(providersData);
                            const primaryProvider = Array.isArray(flatrate) && flatrate.length ? flatrate[0] : null;
                            const providerLogoBaseUrl = "https://image.tmdb.org/t/p/w92";
                            if (!hasStreaming) {
                                return null;
                            }
                            const providerNames = flatrate.slice(0, 3).map(provider => provider.provider_name).join(', ');

                            const slug = slugify(titleSource);
                            const hasHomepage = data.homepage && data.homepage.trim() !== '';
                            const fallbackUrl = '';
                            const ticketUrl = hasHomepage ? data.homepage : fallbackUrl;

                            const genresNames = Array.isArray(data.genres) && data.genres.length
                                ? data.genres.map(genre => genre.name).join(', ')
                                : '';

                            const companies = itemMediaType === 'tv'
                                ? (Array.isArray(data.networks) ? data.networks : [])
                                : (Array.isArray(data.production_companies) ? data.production_companies : []);

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

                            const overviewSource = data.overview || item.overview || '';
                            const truncatedOverview = overviewSource.length > 320 ? `${overviewSource.slice(0, 317)}...` : overviewSource;
                            const tagline = data.tagline && data.tagline.trim() !== '' ? data.tagline : '';

                            const trailerResults = Array.isArray(trailerData?.results) ? trailerData.results : [];
                            const preferredTrailer = trailerResults.find(video => video.type === 'Trailer' && video.site === 'YouTube') || trailerResults[0];
                            const trailerKey = preferredTrailer?.key || '';
                            const trailerYtUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : '';

                            const castArray = Array.isArray(creditsData?.cast) ? creditsData.cast.slice(0, 5) : [];
                            const castNames = castArray.map(cast => cast.name).join(', ');

                            const titleLogoPath = Array.isArray(imageData?.logos)
                                ? imageData.logos.find(logo => logo.file_path)?.file_path
                                : null;
                            const titleLogoUrl = titleLogoPath ? `https://image.tmdb.org/t/p/w500${titleLogoPath}` : '';
                            const showTextTitle = !titleLogoUrl;
                            const showOriginalSubtitle = showTextTitle && originalTitle && originalTitle !== titleSource;

                            let runtime = '';
                            if (itemMediaType === 'movie' && data.runtime) {
                                runtime = `${data.runtime} min`;
                            } else if (itemMediaType === 'tv') {
                                const episodeRuntime = Array.isArray(data.episode_run_time) && data.episode_run_time.find(Boolean);
                                if (episodeRuntime) {
                                    runtime = `${episodeRuntime} min/ep`;
                                } else if (data.last_episode_to_air?.runtime) {
                                    runtime = `${data.last_episode_to_air.runtime} min/ep`;
                                }
                            }

                            const voteAverage = (typeof data.vote_average === 'number' && data.vote_average > 0)
                                ? data.vote_average.toFixed(1)
                                : '';

                            const params = new URLSearchParams({
                                title: titleSource,
                                original_title: originalTitle,
                                genres: genresNames,
                                release_date: releaseDateRaw,
                                imgUrl,
                                backdropUrl,
                                trailerUrl: trailerYtUrl,
                                overview: `${overviewSource}`,
                                id: item.id,
                                mediaTp: itemMediaType,
                                itemFetch: 'trending_mix',
                                ticketUrl,
                                producerName: primaryCompanyName,
                                provider_name: providerNames
                            });
                            const detailsHref = `filme.php?${params.toString()}`;

                            slideEl.innerHTML = `
                                <img src="${backdropUrl}" alt="Backdrop de ${titleSource}" class="hero-card__backdrop">                                                                    <div class="hero-card__layout">
                                    <div class="hero-card__content">
                                        <div class="hero-card__top">
                                            ${primaryCompanyName ? `<span class="hero-card__eyebrow">${primaryCompanyName}</span>` : `<span class="hero-card__eyebrow">Bombando agora</span>`}
                                            <div class="hero-card__title-block">
                                                ${titleLogoUrl ? `<img src="${titleLogoUrl}" alt="${titleSource}" class="hero-card__title-logo">` : ''}
                                                ${showTextTitle ? `<h2 class="hero-card__title">${titleSource}</h2>` : ''}
                                                ${showOriginalSubtitle ? `<p class="hero-card__subtitle">${originalTitle}</p>` : ''}
                                            </div>
                                            <div class="hero-card__meta">
                                                <span class="hero-card__badge">${mediaTypeTxt}</span>
                                                ${releaseYear ? `<span class="hero-card__meta-item">${releaseYear}</span>` : ''}
                                                ${runtime ? `<span class="hero-card__meta-item">${runtime}</span>` : ''}
                                                ${voteAverage ? `<span class="hero-card__meta-item hero-card__meta-item--rating"><img src="imagens/star-emoji.png" alt="" aria-hidden="true">${voteAverage}</span>` : ''}
                                            </div>
                                            ${''}
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
                                            ${releaseLabel ? `<p class="hero-card__release">${releasePrefix} ${releaseLabel}</p>` : ''}
                                        </div>
                                    </div>
                                    <aside class="hero-card__poster">
                                        <img src="${imgUrl}" alt="Poster de ${titleSource}" class="hero-card__poster-img">
                                        ${primaryProvider ? `
                                            <div class="hero-card__streaming-badge" title="Disponível em">
                                                ${primaryProvider.logo_path ? `<img class="hero-card__streaming-logo" src="${providerLogoBaseUrl}${primaryProvider.logo_path}" alt="${primaryProvider.provider_name}">` : ''}
                                                <span class="hero-card__streaming-name">${primaryProvider.provider_name}</span>
                                            </div>
                                        ` : ''}
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
                                scheduleAutoScrollRefresh();
                            }
                            return null;
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
                    const mediaTypeTxt = movie.media_type === 'movie' ? 'Filme' : 'Serie';

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
                                genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos generos
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
                                genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos generos
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
                                //console.log(`Provider e ${providerNames}`);
                            } else if(providerNames.toLocaleLowerCase().includes('max')){
                                providerLogo.style.fontFamily = "HBO Max"; 
                            }*/
                                                                                
                        })
                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                });
            });
        })
        })

        fetchJson(streamingUrl)
            .then(streamingData => {
                const movies = Array.isArray(streamingData?.results) ? streamingData.results : [];
                const container = document.getElementById('trending-movies-container');
                if (!container) {
                    return;
                }
                container.innerHTML = ""; // Limpa o container

                movies.forEach(movie => {
                    const movieDiv = document.createElement('div');
                    movieDiv.classList.add('col-md-3', 'movies');

                    const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl, detailsUrl } = defineMovieConstants(movie, mediaType, apiKey);

                    fetchJson(detailsUrl)
                        .then(data => {
                            if (!data) {
                                return;
                            }
                            const genresArray = data?.genres;
                            let genresNames = '';
                            if (Array.isArray(genresArray) && genresArray.length > 0) {
                                genresNames = genresArray.map(genres => genres.name).join(", ");
                            }

                            const releaseDateRaw = data.release_date || data.first_air_date || movie.release_date || movie.first_air_date || '';
                            let releaseDate = null;
                            if (releaseDateRaw) {
                                const parsedReleaseDate = new Date(releaseDateRaw);
                                if (!Number.isNaN(parsedReleaseDate.getTime())) {
                                    releaseDate = parsedReleaseDate;
                                }
                            }
                            const today = new Date();
                            if (!releaseDate || releaseDate > today) {
                                return;
                            }

                            fetchJson(providerUrl)
                                .then(providerData => {
                                    let providerNames = '';
                                    let providerLogos = '';
                                    const providers = providerData?.results?.BR || {};

                                    const { flatrate: streamingProviders, hasStreaming } = extractStreamingProviders(providers);
                                    if (!hasStreaming) {
                                        return;
                                    }

                                    const rentProvidersList = filterProviderList(providers?.rent || []);
                                    const logoBaseUrl = "https://image.tmdb.org/t/p/w92";
                                    const streamingLogoImgs = streamingProviders.slice(0, 3).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                                    const rentLogoImgs = rentProvidersList.slice(0, 1).map(p => `<img src="${logoBaseUrl}${p.logo_path}" class="provider-logo" title="${p.provider_name}">`);
                                    const logoGroups = [];
                                    if (streamingLogoImgs.length) {
                                        logoGroups.push(streamingLogoImgs.join(' ') + `<p class="provider-tag">Streaming</p>`);
                                    }
                                    if (rentLogoImgs.length) {
                                        logoGroups.push(rentLogoImgs.join(' ') + `<p class="provider-tag">Aluguel</p>`);
                                    }

                                    if (logoGroups.length) {
                                        providerLogos = logoGroups.map(group => `<div class="provider-group">${group}</div>`).join(' ');
                                    }

                                    const streamingNames = streamingProviders.slice(0, 3).map(p => p.provider_name).join(", ") || '';
                                    const rentNames = rentProvidersList.slice(0, 1).map(p => p.provider_name).join(", ") || '';
                                    const allProviders = [streamingNames, rentNames].filter(Boolean).join(", ");

                                    if (allProviders) {
                                        providerNames = allProviders;
                                    } else {
                                        console.log('Nenhum provedor de streaming encontrado para BR.');
                                        return;
                                    }

                                    fetchJson(trailerUrl || `https://api.themoviedb.org/3/${mediaType}/${movie.id}/videos?api_key=${apiKey}&language=pt-BR&page=1`)
                                        .then(trailerData => {
                                            const trailerPath = trailerData?.results;

                                            let trailerKey = '';
                                            if (Array.isArray(trailerPath) && trailerPath.length > 0) {
                                                trailerKey = trailerPath[0].key;
                                            }

                                            const trailerYtUrl = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : '';

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
                                                        ${providerLogos ? `<div class="provider-logo-container">${providerLogos}</div>` : ''}
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

                                            movieDiv.addEventListener('click', () => {
                                                const params = new URLSearchParams({
                                                    title: movie.title || movie.name,
                                                    original_title: movie.original_title,
                                                    genres: genresNames,
                                                    release_date: releaseDateRaw,
                                                    imgUrl: imgUrl,
                                                    backdropUrl: backdropUrl,
                                                    trailerUrl: trailerYtUrl,
                                                    overview: `${movie.overview}`,
                                                    id: movie.id,
                                                    mediaTp: mediaType,
                                                    itemFetch: 'streaming',
                                                    ticketUrl: data.homepage,
                                                    provider_name: providerNames
                                                });

                                                window.location.href = `filme.php?${params.toString()}`;

                                            });
                                        })
                                        .catch(error => console.error('Erro ao buscar o trailer:', error));
                                })
                                .catch(error => console.error('Erro ao buscar provedores:', error));
                        })
                        .catch(error => console.error('Erro ao buscar detalhes:', error));
                });
            })
            .catch(error => console.error('Erro ao carregar destaques de streaming:', error));


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
                                genresNames = genresArray.map(genres => genres.name).join(", "); //String "join" separa os diversos generos
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
                                            <img src="imagens/video-start.png" alt="">Trailer
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

        .catch(error => console.error('Erro ao carregar conteudo:', error))
        .finally(() => {
            const containers = [
                document.getElementById('container-wrap'),
                document.getElementById('popular-movies-container'),
                document.getElementById('top-movies-container'),
                document.getElementById('trending-movies-container'),
                document.getElementById('musical-movies-container')
            ];
            Promise.all(containers.map(c => waitForImages(c))).then(() => {
                hideLoading();
                scheduleAutoScrollRefresh();
                if (typeof window.updateCarouselNav === 'function') {
                    ['popular-movies-container','top-movies-container','trending-movies-container','musical-movies-container'].forEach(id => window.updateCarouselNav(id));
                }
            });
        });
    }

     // Botoes para alternar entre filmes e series
    document.getElementById('showMovies').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('showSeries').classList.remove('active')
        switchMedia("movie");

        
        // Mova o slider para o botao de filmes
        if (sliderIndicator) {
            sliderIndicator.style.transform = 'translateX(0)';
        }

    });

    document.getElementById('showSeries').addEventListener('click', function() {
        this.classList.add("active");
        document.getElementById("showMovies").classList.remove("active");
        switchMedia("tv");

        // Mova o slider para o botao de series
        const buttonWidth = this.offsetWidth; // Largura do botao
        if (sliderIndicator) {
            sliderIndicator.style.transform = `translateX(${buttonWidth}px)`;
        } // Move para a direita
    });

    loadContent();        // Carregar conteudo de filmes

});

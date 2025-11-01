document.addEventListener('DOMContentLoaded', function() {
    const runtimeConfig = (typeof window !== 'undefined' && window.__WY_WATCH_CONFIG__) || {};
    const apiKey = runtimeConfig.tmdbApiKey || '';
    const tmdbBaseUrl = (runtimeConfig.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
    const tmdbEndpoint = (path) => `${tmdbBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const tmdbUrl = (path, params = {}) => {
        const url = new URL(tmdbEndpoint(path));
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }
            url.searchParams.set(key, value);
        });
        return url.toString();
    };

    if (!apiKey) {
        console.error('[WYWatch] TMDB API key não configurada – não é possível carregar a página inicial.');
        showConnectionErrorPage();
        return;
    }
    let mediaType = 'movie'; // Inicialmente filmes
    const personalizationConfig = window.wtwPersonalization || null;
    const contentSection = document.querySelector(".media-section");
    const sliderIndicator = document.querySelector('.style-buttons .slider-indicator');
    const heroProgressElement = document.querySelector('[data-hero-progress]');
    const heroProgressTrack = heroProgressElement ? heroProgressElement.querySelector('[data-hero-progress-track]') : null;
    const heroProgressLabel = heroProgressElement ? heroProgressElement.querySelector('[data-hero-progress-label]') : null;
    const BUTTON_RESUME_DELAY = 3000;
    let heroProgressSegments = [];
    let heroProgressCount = 0;

    if (contentSection) {
        contentSection.classList.add('is-loading-rows');
    }

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
    let hasHandledInitialHash = false;
    // Cache para evitar duplicidade
    const fetchCache = {};

    const CACHE_DB_NAME = 'wtw-cache';
    const CACHE_STORE_NAME = 'responses';
    const CACHE_DB_VERSION = 1;
    const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 1 dia
    const supportsIndexedDb = typeof window !== 'undefined' && 'indexedDB' in window;
    let cacheDbPromise = null;
    let hasCleanedExpiredEntries = false;

    const openCacheDb = () => {
        if (!supportsIndexedDb) {
            return Promise.resolve(null);
        }

        if (cacheDbPromise) {
            return cacheDbPromise;
        }

        cacheDbPromise = new Promise((resolve) => {
            const request = window.indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                    db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'url' });
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                };

                if (!hasCleanedExpiredEntries) {
                    hasCleanedExpiredEntries = true;
                    cleanupExpiredEntries(db);
                }

                resolve(db);
            };

            request.onerror = () => {
                console.warn('[WYWatch] Falha ao abrir IndexedDB. Prosseguindo sem cache persistente.', request.error);
                resolve(null);
            };

            request.onblocked = () => {
                resolve(null);
            };
        });

        return cacheDbPromise;
    };

    const cleanupExpiredEntries = (db) => {
        if (!db) {
            return;
        }

        try {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(CACHE_STORE_NAME);
            const request = store.openCursor();
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    return;
                }

                const entry = cursor.value;
                if (!entry || !entry.timestamp || (Date.now() - entry.timestamp) > CACHE_MAX_AGE) {
                    cursor.delete();
                }
                cursor.continue();
            };
        } catch (error) {
            console.warn('[WYWatch] Não foi possível limpar o cache IndexedDB.', error);
        }
    };

    const readCacheEntry = async (url) => {
        const db = await openCacheDb();
        if (!db) {
            return null;
        }

        return new Promise((resolve) => {
            try {
                const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = tx.objectStore(CACHE_STORE_NAME);
                const request = store.get(url);
                request.onsuccess = () => {
                    const result = request.result;
                    if (!result) {
                        resolve(null);
                        return;
                    }
                    resolve({ data: result.data, timestamp: result.timestamp });
                };
                request.onerror = () => resolve(null);
            } catch (error) {
                console.warn('[WYWatch] Erro ao ler cache IndexedDB.', error);
                resolve(null);
            }
        });
    };

    const writeCacheEntry = async (url, data) => {
        const db = await openCacheDb();
        if (!db) {
            return;
        }

        try {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(CACHE_STORE_NAME);
            store.put({ url, data, timestamp: Date.now() });
        } catch (error) {
            console.warn('[WYWatch] Erro ao gravar no cache IndexedDB.', error);
        }
    };

    const deleteCacheEntry = async (url) => {
        const db = await openCacheDb();
        if (!db) {
            return;
        }

        try {
            const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(CACHE_STORE_NAME);
            store.delete(url);
        } catch (error) {
            console.warn('[WYWatch] Erro ao remover item expirado do cache IndexedDB.', error);
        }
    };
    let hasShownConnectionError = false;

    function showConnectionErrorPage() {
        if (hasShownConnectionError) {
            return;
        }

        hasShownConnectionError = true;

        if (typeof hideLoading === 'function') {
            try {
                hideLoading();
            } catch (error) {
                console.error('Erro ao ocultar loading:', error);
            }
        }

        const { body } = document;
        if (!body) {
            return;
        }

        body.classList.add('connection-error-active');
        body.innerHTML = `
            <main class="connection-error" role="main">
                <section class="connection-error__card" aria-labelledby="connectionErrorTitle">
                    <div class="connection-error__content">
                        <span class="connection-error__eyebrow">Sem conexão</span>
                        <h1 class="connection-error__title" id="connectionErrorTitle">Não foi possível conectar</h1>
                        <p class="connection-error__description">Não conseguimos carregar os conteúdos do Where You Watch. Verifique sua conexão com a internet e tente novamente.</p>
                        <div class="connection-error__actions">
                            <button type="button" class="connection-error__button connection-error__button--primary" data-connection-retry>
                                Tentar novamente
                            </button>
                            <a class="connection-error__button connection-error__button--ghost" href="landing.html">
                                Conhecer o projeto
                            </a>
                        </div>
                    </div>
                    <div class="connection-error__visual" aria-hidden="true">
                        <div class="connection-error__orb">
                            <span class="connection-error__orb-glow"></span>
                            <img src="imagens/wywatch-favicon-iris-nobackground.png" alt="" class="connection-error__icon">
                        </div>
                        <div class="connection-error__sparkles">
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </section>
            </main>
        `;

        const retryButton = body.querySelector('[data-connection-retry]');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
    const fetchJson = (url) => {
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('fetchJson called with invalid url'));
        }

        if (!fetchCache[url]) {
            fetchCache[url] = (async () => {
                const cachedEntry = await readCacheEntry(url);
                const cacheIsFresh = cachedEntry && typeof cachedEntry.timestamp === 'number'
                    ? (Date.now() - cachedEntry.timestamp) <= CACHE_MAX_AGE
                    : false;

                if (cacheIsFresh && cachedEntry) {
                    return cachedEntry.data;
                }

                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} for ${url}`);
                    }
                    const data = await response.json();
                    writeCacheEntry(url, data).catch(() => {});
                    return data;
                } catch (error) {
                    if (cachedEntry) {
                        console.warn('[WYWatch] Falha ao buscar dados atualizados. Utilizando cache local.', error);
                        if (!cacheIsFresh) {
                            deleteCacheEntry(url).catch(() => {});
                        }
                        return cachedEntry.data;
                    }
                    throw error;
                }
            })();
        }

        return fetchCache[url].catch((error) => {
            delete fetchCache[url];
            throw error;
        });
    };

    const HERO_SKELETON_CARDS = 4;
    const ROW_SKELETON_CARDS = 6;

    function applyHeroSkeleton(container) {
        if (!container) {
            return () => {};
        }

        container.dataset.loadingSkeleton = 'hero';
        container.classList.add('is-loading');

        const fragment = document.createDocumentFragment();
        for (let index = 0; index < HERO_SKELETON_CARDS; index += 1) {
            const skeletonCard = document.createElement('article');
            skeletonCard.className = 'backdropContainer hero-skeleton';
            skeletonCard.innerHTML = `
                <div class="hero-skeleton__backdrop skeleton-block"></div>
                <div class="hero-skeleton__layout">
                    <div class="hero-skeleton__content">
                        <span class="skeleton-block skeleton-chip"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--md"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--sm"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
                        <div class="hero-skeleton__actions">
                            <span class="skeleton-block skeleton-button skeleton-button--primary"></span>
                            <span class="skeleton-block skeleton-button"></span>
                        </div>
                    </div>
                    <div class="hero-skeleton__poster skeleton-block"></div>
                </div>
            `;
            fragment.appendChild(skeletonCard);
        }

        container.replaceChildren(fragment);

        let cleared = false;
        return () => {
            if (cleared || container.dataset.loadingSkeleton !== 'hero') {
                return;
            }
            cleared = true;
            container.classList.remove('is-loading');
            container.removeAttribute('data-loading-skeleton');
            container.innerHTML = '';
        };
    }

    function applyRowSkeleton(container, cardCount = ROW_SKELETON_CARDS) {
        if (!container) {
            return () => {};
        }

        const cards = Math.max(4, Math.min(cardCount, 8));
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < cards; index += 1) {
            const skeletonCol = document.createElement('div');
            skeletonCol.className = 'col-md-3 movies media-skeleton-card';
            skeletonCol.innerHTML = `
                <div class="description description--skeleton">
                    <div class="skeleton-block media-skeleton__poster"></div>
                    <div class="media-skeleton__info">
                        <span class="skeleton-block skeleton-line skeleton-line--xs"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--lg"></span>
                        <span class="skeleton-block skeleton-line skeleton-line--md"></span>
                        <div class="media-skeleton__chips">
                            <span class="skeleton-block skeleton-chip skeleton-chip--lg"></span>
                            <span class="skeleton-block skeleton-chip"></span>
                        </div>
                        <span class="skeleton-block skeleton-pill"></span>
                    </div>
                </div>
            `;
            fragment.appendChild(skeletonCol);
        }

        container.dataset.loadingSkeleton = 'row';
        container.classList.add('is-loading');
        container.replaceChildren(fragment);

        let cleared = false;
        return () => {
            if (cleared || container.dataset.loadingSkeleton !== 'row') {
                return;
            }
            cleared = true;
            container.classList.remove('is-loading');
            container.removeAttribute('data-loading-skeleton');
            container.innerHTML = '';
        };
    }

    function handleHashNavigation(options = {}) {
        const { force = false, smooth = true } = options;
        const hash = (window.location.hash || '').replace('#', '').trim();
        if (!hash) {
            return;
        }
        if (!force && hasHandledInitialHash) {
            return;
        }
        const target = document.getElementById(hash);
        if (!target) {
            return;
        }
        hasHandledInitialHash = true;
        const behavior = smooth ? 'smooth' : 'auto';
        window.requestAnimationFrame(() => {
            target.scrollIntoView({
                behavior,
                block: 'start'
            });
        });
    }

    const resetHeroProgress = () => {
        if (!heroProgressElement || !heroProgressTrack) {
            return;
        }
        heroProgressElement.hidden = true;
        heroProgressTrack.innerHTML = '';
        heroProgressSegments = [];
        heroProgressCount = 0;
        if (heroProgressLabel) {
            heroProgressLabel.textContent = '';
        }
    };

    const ensureHeroProgress = (count) => {
        if (!heroProgressElement || !heroProgressTrack) {
            return;
        }
        if (count <= 0) {
            resetHeroProgress();
            return;
        }
        if (heroProgressCount !== count) {
            heroProgressTrack.innerHTML = '';
            const fragment = document.createDocumentFragment();
            for (let index = 0; index < count; index += 1) {
                const segment = document.createElement('span');
                segment.className = 'hero-progress__segment';
                segment.dataset.progressIndex = String(index);
                fragment.appendChild(segment);
            }
            heroProgressTrack.appendChild(fragment);
            heroProgressSegments = Array.from(heroProgressTrack.children);
            heroProgressCount = count;
        } else if (!heroProgressSegments.length) {
            heroProgressSegments = Array.from(heroProgressTrack.children);
        }
        heroProgressElement.hidden = false;
    };

    const setActiveHeroProgress = (index) => {
        if (!heroProgressSegments.length) {
            if (heroProgressLabel) {
                heroProgressLabel.textContent = '';
            }
            return;
        }
        const safeIndex = Math.max(0, Math.min(index, heroProgressSegments.length - 1));
        heroProgressSegments.forEach((segment, segmentIndex) => {
            if (!segment) {
                return;
            }
            segment.classList.toggle('is-active', segmentIndex === safeIndex);
        });
        if (heroProgressLabel) {
            heroProgressLabel.textContent = `Destaque ${safeIndex + 1} de ${heroProgressSegments.length}`;
        }
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
        const trailerUrl = tmdbUrl(`/${mediaType}/${movie.id}/videos`, { api_key: apiKey, language: 'pt-BR', page: 1 });
        const rating = (typeof movie.vote_average === 'number' && movie.vote_average > 0)
            ? movie.vote_average.toFixed(1)
            : 'N/A';
        const detailsUrl = tmdbUrl(`/${mediaType}/${movie.id}`, { api_key: apiKey, language: 'pt-BR', page: 1 });
        const providerUrl = tmdbUrl(`/${mediaType}/${movie.id}/watch/providers`, { api_key: apiKey, language: 'pt-BR', page: 1, sort_by: 'display_priority.cresc' })
        const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280/${movie.backdrop_path}` : 'imagens/icon-cast.png'
        const movieLogoUrl = tmdbUrl(`/${mediaType}/${movie.id}/images`, { api_key: apiKey, include_image_language: 'null,pt,en' })
        const creditsUrl = tmdbUrl(`/${mediaType}/${movie.id}/credits`, { api_key: apiKey, language: 'pt-BR', page: 1 })

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
            resetHeroProgress();
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
            ensureHeroProgress(carouselItems.length);
            setActiveHeroProgress(index);
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
''
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


    const MUSICAL_KEYWORDS = [
        4344,   // musical
        156028, // broadway
        165241, // broadway musical
        206597, // stage musical
        240462, // musical comedy
        334841, // musical proshot
        201353, // glee club
        220201, // musical theater
        235324  // drama club
    ].join('|');

    const SECTION_CONFIGS = [
        {
            id: 'popular',
            containerId: 'popular-movies-container',
            itemFetch: 'popular',
            heading: {
                prefix: 'Mais populares no',
                brand: true
            },
            endpoint(context) {
                return tmdbUrl(`/trending/${context.mediaType}/week`, { api_key: apiKey, language: 'pt-BR', page: 1 });
            }
        },
        {
            id: 'top-rated',
            containerId: 'top-movies-container',
            itemFetch: 'topRated',
            heading: {
                brand: true,
                tag: 'indica'
            },
            endpoint(context) {
                return tmdbUrl(`/${context.mediaType}/top_rated`, { api_key: apiKey, language: 'pt-BR', page: 1, sort_by: 'popularity.desc' });
            }
        },
        {
            id: 'streaming-trending',
            containerId: 'trending-movies-container',
            itemFetch: 'streaming',
            heading: {
                prefix: 'Queridinhos do',
                highlight: 'streaming'
            },
            endpoint(context) {
                return `${context.discoverBase}&sort_by=popularity.desc&with_watch_monetization_types=flatrate`;
            }
        },
        {
            id: 'musicals',
            containerId: 'musical-movies-container',
            itemFetch: 'musical',
            heading: {
                prefix: 'Para os amantes de',
                highlight: 'musicais'
            },
            endpoint(context) {
                const base = `${context.discoverBase}&include_adult=false&sort_by=popularity.desc&with_keywords=${MUSICAL_KEYWORDS}`;
                if (context.mediaType === 'movie') {
                    return `${base}&without_genres=99`;
                }
                return `${base}&without_genres=80|9648|10759|10763|10768|99`;
            }
        }
    ];

    if (personalizationConfig?.enabled) {
        const normalizeMediaTypes = (value) => {
            if (Array.isArray(value) && value.length) {
                return value;
            }
            if (typeof value === 'object' && value !== null) {
                return Object.keys(value).filter((key) => value[key]);
            }
            if (typeof value === 'string' && value.trim()) {
                return [value.trim()];
            }
            return ['movie'];
        };

        const supportedMediaTypes = normalizeMediaTypes(personalizationConfig.mediaTypes);
        const personalizationEndpoint = typeof personalizationConfig.endpoint === 'string'
            ? personalizationConfig.endpoint
            : 'api/home-personalized.php';
        const personalizationCacheToken = typeof personalizationConfig.cacheToken === 'string'
            && personalizationConfig.cacheToken.trim() !== ''
            ? personalizationConfig.cacheToken.trim()
            : null;

        SECTION_CONFIGS.unshift({
            id: 'personalized',
            containerId: 'personalized-movies-container',
            itemFetch: 'personalized',
            heading: {
                highlight: 'Pensado para você',
                theme: 'personalized'
            },
            mediaTypes: supportedMediaTypes,
            skeletonCount: 6,
            endpoint(context) {
                const params = new URLSearchParams({ media_type: context.mediaType });
                if (personalizationCacheToken) {
                    params.set('cache_token', personalizationCacheToken);
                } else if (typeof personalizationConfig.preferenceCount === 'number') {
                    params.set('preference_count', String(personalizationConfig.preferenceCount));
                }
                if (typeof personalizationConfig.limit === 'number') {
                    params.set('limit', String(personalizationConfig.limit));
                }
                return `${personalizationEndpoint}?${params.toString()}`;
            }
        });
    }

    function supportsMediaType(section, currentType) {
        if (!section) {
            return true;
        }

        const mediaConfig = section.mediaTypes;
        if (!mediaConfig) {
            return true;
        }

        if (typeof mediaConfig === 'string') {
            return mediaConfig === currentType;
        }

        if (Array.isArray(mediaConfig)) {
            return mediaConfig.includes(currentType);
        }

        if (typeof mediaConfig === 'object') {
            return Boolean(mediaConfig[currentType]);
        }

        if (typeof mediaConfig === 'function') {
            try {
                return Boolean(mediaConfig(currentType));
            } catch (error) {
                return true;
            }
        }

        return true;
    }

    let activeSectionConfigs = SECTION_CONFIGS.filter(section => supportsMediaType(section, mediaType));

    function createBrandElement() {
        const brand = document.createElement('span');
        brand.className = 'wyw-brand wyw-brand--compact section-heading__brand';
        brand.setAttribute('aria-label', 'Where You Watch');
        brand.innerHTML = `
            <span class="wyw-brand__where">where</span>
            <span class="wyw-brand__where wyw-brand__where--y">y</span>
            <img src="imagens/eye-icon2.svg" alt="o" class="wyw-brand__eye" />
            <span class="wyw-brand__where wyw-brand__where--u">u</span>
            <span class="wyw-brand__watch">WATCH</span>
        `;
        return brand;
    }

    function createHeadingElement(config) {
        const theme = config?.theme || (config?.highlight === 'Pensado para você' ? 'personalized' : null);

        const heading = document.createElement('h2');
        heading.className = 'section-heading';
        if (theme) {
            heading.classList.add(`section-heading--${theme}`);
        }

        const bar = document.createElement('span');
        bar.className = 'section-heading__bar';
        bar.setAttribute('aria-hidden', 'true');
        bar.textContent = '|';
        heading.appendChild(bar);

        if (config?.prefix) {
            const prefix = document.createElement('span');
            prefix.className = 'section-heading__text';
            prefix.textContent = config.prefix;
            heading.appendChild(prefix);
        }

        if (config?.brand) {
            heading.appendChild(createBrandElement());
        }

        if (config?.highlight) {
            const highlight = document.createElement('span');
            highlight.className = 'section-heading__highlight';
            if (theme) {
                highlight.classList.add(`section-heading__highlight--${theme}`);
            }
            highlight.textContent = config.highlight;
            heading.appendChild(highlight);
        }

        if (config?.tag) {
            const tag = document.createElement('span');
            tag.className = 'section-heading__tag';
            tag.textContent = config.tag;
            heading.appendChild(tag);
        }

        if (config?.suffix) {
            const suffix = document.createElement('span');
            suffix.className = 'section-heading__text';
            suffix.textContent = config.suffix;
            heading.appendChild(suffix);
        }

        return heading;
    }

    function ensureSectionsStructure(sectionsList = SECTION_CONFIGS) {
        const root = document.getElementById('media-sections-root');
        if (!root) {
            console.warn('Media sections root not found.');
            return new Map();
        }

        const sectionsMap = new Map();
        const allowedIds = new Set(sectionsList.map(section => section.id));

        root.querySelectorAll('[data-section]').forEach((wrapper) => {
            if (!allowedIds.has(wrapper.dataset.section)) {
                wrapper.setAttribute('hidden', 'hidden');
                wrapper.classList.add('media-section__group--hidden');
            }
        });

        sectionsList.forEach(section => {
            let wrapper = root.querySelector(`[data-section="${section.id}"]`);
            const theme = section.heading?.theme
                || (section.heading?.highlight === 'Pensado para você' ? 'personalized' : null);

            if (!wrapper) {
                wrapper = document.createElement('section');
                const wrapperClasses = ['media-section__group'];
                if (theme) {
                    wrapperClasses.push(`media-section__group--${theme}`);
                }
                wrapper.className = wrapperClasses.join(' ');
                wrapper.dataset.section = section.id;
                wrapper.id = section.id;
                wrapper.tabIndex = -1;

                const heading = createHeadingElement(section.heading || {});
                wrapper.appendChild(heading);

                const carousel = document.createElement('div');
                carousel.className = 'carousel-container';

                const prevBtn = document.createElement('button');
                prevBtn.className = 'nav-arrow slider-prev';
                prevBtn.dataset.target = section.containerId;
                prevBtn.innerHTML = '&#10094;';
                carousel.appendChild(prevBtn);

                const row = document.createElement('div');
                row.className = 'row';
                row.id = section.containerId;
                carousel.appendChild(row);

                const nextBtn = document.createElement('button');
                nextBtn.className = 'nav-arrow slider-next';
                nextBtn.dataset.target = section.containerId;
                nextBtn.innerHTML = '&#10095;';
                carousel.appendChild(nextBtn);

                wrapper.appendChild(carousel);
                root.appendChild(wrapper);
            } else {
                wrapper.classList.add('media-section__group');
                if (theme) {
                    wrapper.classList.add(`media-section__group--${theme}`);
                }
                if (!wrapper.id) {
                    wrapper.id = section.id;
                }
                if (!wrapper.hasAttribute('tabindex')) {
                    wrapper.tabIndex = -1;
                }

                if (theme) {
                    const existingHeading = wrapper.querySelector('.section-heading');
                    if (existingHeading) {
                        existingHeading.classList.add(`section-heading--${theme}`);
                        const highlightNode = existingHeading.querySelector('.section-heading__highlight');
                        if (highlightNode) {
                            highlightNode.classList.add(`section-heading__highlight--${theme}`);
                        }
                    }
                }
            }

            wrapper.removeAttribute('hidden');
            wrapper.classList.remove('media-section__group--hidden');

            const rowNode = wrapper.querySelector(`#${section.containerId}`);
            sectionsMap.set(section.id, {
                wrapper,
                row: rowNode
            });

            if (typeof window.registerCarouselContainer === 'function') {
                window.registerCarouselContainer(section.containerId);
            }
        });

        return sectionsMap;
    }

    function filterProviderEntries(list = []) {
        return list.filter(provider => {
            if (!provider || !provider.provider_name) {
                return false;
            }
            const name = provider.provider_name.toLowerCase();
            return !name.includes('standard with ads')
                && !name.includes('amazon channel')
                && !name.includes('paramount plus apple tv channel')
                && !name.includes('paramount plus premium');
        });
    }

    function extractStreamingProviders(providers) {
        const flatrate = filterProviderEntries(providers?.flatrate || []);
        return {
            flatrate,
            hasStreaming: flatrate.length > 0
        };
    }

    function buildProviderInfo(brProviders) {
        if (!brProviders) {
            return null;
        }

        const flatrate = filterProviderEntries(brProviders.flatrate || []);
        const rent = filterProviderEntries(brProviders.rent || []);

        if (!flatrate.length && !rent.length) {
            return null;
        }

        const logoBaseUrl = 'https://image.tmdb.org/t/p/w92';
        const groups = [];

        const flatrateMarkup = flatrate.slice(0, 3)
            .map(provider => `<img src="${logoBaseUrl}${provider.logo_path}" class="provider-logo" title="${provider.provider_name}">`)
            .join('');
        if (flatrateMarkup) {
            groups.push(`<div class="provider-group">${flatrateMarkup}<p class="provider-tag">Streaming</p></div>`);
        }

        const rentMarkup = rent.slice(0, 1)
            .map(provider => `<img src="${logoBaseUrl}${provider.logo_path}" class="provider-logo" title="${provider.provider_name}">`)
            .join('');
        if (rentMarkup) {
            groups.push(`<div class="provider-group">${rentMarkup}<p class="provider-tag">Aluguel</p></div>`);
        }

        if (!groups.length) {
            return null;
        }

        const allProviders = [...flatrate, ...rent];
        const primaryPreview = allProviders[0] || null;
        const additionalCount = Math.max(allProviders.length - 1, 0);
        let previewMarkup = '';
        let previewAssistiveText = '';

        if (primaryPreview) {
            const previewParts = [];
            if (primaryPreview.logo_path) {
                const previewAlt = primaryPreview.provider_name || 'Provedor de streaming';
                previewParts.push(`<img src="${logoBaseUrl}${primaryPreview.logo_path}" class="provider-logo provider-logo--preview" alt="${previewAlt}">`);
            }
            const previewLabel = primaryPreview.provider_name || 'Disponível';
            previewParts.push(`<span class="provider-preview__label">${previewLabel}</span>`);
            if (additionalCount > 0) {
                previewParts.push(`<span class="provider-preview__count">+${additionalCount}</span>`);
            }
            previewMarkup = previewParts.join('');
            const pluralSuffix = additionalCount === 1 ? '' : 'es';
            previewAssistiveText = additionalCount > 0
                ? `${previewLabel} e mais ${additionalCount} provedor${pluralSuffix}`
                : previewLabel;
        }

        const providerNames = [
            flatrate.slice(0, 3).map(provider => provider.provider_name).join(', '),
            rent.slice(0, 1).map(provider => provider.provider_name).join(', ')
        ].filter(Boolean).join(', ');

        return {
            logosMarkup: groups.join(''),
            providerNames,
            previewMarkup,
            previewAssistiveText
        };
    }

    function resolveTrailerUrl(trailerData) {
        const results = Array.isArray(trailerData?.results) ? trailerData.results : [];
        if (!results.length) {
            return '';
        }
        const trailer = results.find(video => {
            const type = (video?.type || '').toLowerCase();
            const site = (video?.site || '').toLowerCase();
            return site === 'youtube' && (type === 'trailer' || type === 'teaser');
        }) || results[0];
        if (!trailer) {
            return '';
        }

        const getYouTubeIdFn = typeof window !== 'undefined' && typeof window.getYouTubeId === 'function'
            ? window.getYouTubeId
            : null;
        const candidateUrl = trailer.key
            ? `https://www.youtube.com/watch?v=${trailer.key}`
            : (trailer.url || '');

        if (getYouTubeIdFn) {
            const videoId = getYouTubeIdFn(candidateUrl || trailer.key);
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }

        return candidateUrl;
    }

    async function createMediaCard(movie, section, mediaType) {
        if (!movie || !movie.id) {
            return null;
        }

        const card = document.createElement('div');
        card.className = 'col-md-3 movies';

        const { imgUrl, trailerUrl, rating, backdropUrl, providerUrl, detailsUrl } = defineMovieConstants(movie, mediaType, apiKey);

        const [details, providersData, trailerData] = await Promise.all([
            fetchJson(detailsUrl).catch(() => null),
            fetchJson(providerUrl).catch(() => null),
            fetchJson(trailerUrl).catch(() => null)
        ]);

        const providersBR = providersData?.results?.BR || providersData?.BR || null;
        const providerInfo = buildProviderInfo(providersBR);

        if (!providerInfo) {
            return null;
        }

        const genresArray = Array.isArray(details?.genres) ? details.genres : [];
        const genresNames = genresArray.length ? genresArray.map(genre => genre.name).join(', ') : '';
        const releaseDateRaw = details?.release_date || details?.first_air_date || movie.release_date || movie.first_air_date || '';
        const trailerYtUrl = resolveTrailerUrl(trailerData);

        const titleText = movie.title || movie.name || '';

        const providerPreviewMarkup = providerInfo.previewMarkup
            ? `<div class="provider-preview"${providerInfo.previewAssistiveText ? ` title="${providerInfo.previewAssistiveText.replace(/"/g, '&quot;')}"` : ''}>${providerInfo.previewMarkup}</div>`
            : '';

        card.innerHTML = `
            <div class="description">
                <li id="movie-li-link">
                    <img src="${imgUrl}" alt="${titleText}" class="img-fluid">
                </li>
                <div class="info">
                    <img src="imagens/star-emoji.png" alt="" class="rating">
                    <p class="rating-value">${rating}</p>
                    <li class="movie-name">
                        <a href="#">${titleText}</a>
                        ${providerPreviewMarkup}
                        <div class="provider-logo-container">${providerInfo.logosMarkup}</div>
                    </li>
                    <li class="watch-trailer">
                        <a href="#">
                            <img src="imagens/video-start.png" alt=""> Trailer
                        </a>
                    </li>
                </div>
            </div>
        `;

        const trailerLink = card.querySelector('.watch-trailer a');
        if (trailerLink) {
            if (trailerYtUrl) {
                trailerLink.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    showTrailer(trailerYtUrl);
                });
            } else {
                trailerLink.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                });
                trailerLink.classList.add('is-disabled');
            }
        }

        card.addEventListener('click', () => {
            const params = new URLSearchParams({
                title: titleText,
                original_title: movie.original_title || movie.original_name || '',
                genres: genresNames,
                release_date: releaseDateRaw,
                imgUrl,
                backdropUrl,
                trailerUrl: trailerYtUrl,
                overview: movie.overview || '',
                id: movie.id,
                mediaTp: mediaType,
                itemFetch: section.itemFetch || mediaType,
                ticketUrl: details?.homepage || '',
                provider_name: providerInfo.providerNames
            });
            window.location.href = `filme.php?${params.toString()}`;
        });

        return card;
    }

    async function populateSection(section, context, sectionsMap) {
        const entry = sectionsMap.get(section.id);
        if (!entry || !entry.row) {
            return;
        }

        if (hasShownConnectionError) {
            return;
        }

        const container = entry.row;
        const cleanupSkeleton = applyRowSkeleton(container, section.skeletonCount || ROW_SKELETON_CARDS);

        let items = [];
        let loadFailed = false;
        let loadError = null;


        try {
            const data = await fetchJson(section.endpoint(context));
            items = Array.isArray(data?.results) ? data.results : [];
        } catch (error) {
            console.error('Erro ao buscar a secao ' + section.id + ':', error);
            loadFailed = true;
            loadError = error;
        }

        if (loadFailed) {
            cleanupSkeleton();
            showConnectionErrorPage();
            if (loadError) {
                throw loadError;
            }
            container.innerHTML = '<p class="media-section__empty">Nao foi possivel carregar os titulos agora.</p>';
            return;
        }

        if (!items.length) {
            cleanupSkeleton();
            container.innerHTML = '<p class="media-section__empty">Nenhum titulo encontrado.</p>';
            return;
        }

        const limit = section.limit ?? 20;
        const fragment = document.createDocumentFragment();
        let added = 0;

        for (const movie of items.slice(0, limit)) {
            try {
                const card = await createMediaCard(movie, section, context.mediaType);
                if (card) {
                    fragment.appendChild(card);
                    added += 1;
                }
            } catch (error) {
                console.error('Erro ao montar card na secao ' + section.id + ':', error);
            }
        }

        cleanupSkeleton();

        if (!added) {
            container.innerHTML = '<p class="media-section__empty">Sem titulos com streaming disponivel no momento.</p>';
        } else {
            container.appendChild(fragment);
        }

        if (typeof window.updateCarouselNav === 'function') {
            requestAnimationFrame(() => window.updateCarouselNav(section.containerId));
        }
    }

    async function renderSections(mediaType) {
        const applicableSections = SECTION_CONFIGS.filter(section => supportsMediaType(section, mediaType));
        activeSectionConfigs = applicableSections.slice();

        const sectionsMap = ensureSectionsStructure(applicableSections);
        if (!sectionsMap.size) {
            return;
        }

        const context = {
            mediaType,
            discoverBase: tmdbUrl(`/discover/${mediaType}`, { api_key: apiKey, language: 'pt-BR' })
        };

        await Promise.all(
            applicableSections.map(section => populateSection(section, context, sectionsMap))
        );

        if (typeof window.initializeCarouselNav === 'function') {
            window.initializeCarouselNav();
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
        if (hasShownConnectionError) {
            return;
        }
        if (contentSection) {
            contentSection.classList.add('is-loading-rows');
        }
        const heroContainer = document.getElementById('container-wrap');
        const cleanupHeroSkeleton = applyHeroSkeleton(heroContainer);
        resetHeroProgress();

        const heroUrl = tmdbUrl('/trending/all/week', { api_key: apiKey, language: 'pt-BR', page: 1 });
        const heroPromise = fetchJson(heroUrl)
            .then(heroData => {
                cleanupHeroSkeleton();
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

                ensureHeroProgress(document.querySelectorAll('.backdropContainer').length);
                setActiveHeroProgress(0);

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
                            const primaryProviderName = primaryProvider?.provider_name || '';
                            const primaryProviderLogoUrl = primaryProvider?.logo_path ? `${providerLogoBaseUrl}${primaryProvider.logo_path}` : '';
                            const primaryProviderBadgeTitle = primaryProviderName
                                ? `Dispon\u00edvel em ${primaryProviderName}`
                                : 'Dispon\u00edvel para streaming';

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
                                            <span class="hero-card__streaming-badge${primaryProviderLogoUrl ? '' : ' hero-card__streaming-badge--text'}" title="${primaryProviderBadgeTitle}" aria-label="${primaryProviderBadgeTitle}">
                                                ${primaryProviderLogoUrl
                                                    ? `<img class="hero-card__streaming-logo" src="${primaryProviderLogoUrl}" alt="">`
                                                    : `<span class="hero-card__streaming-text">${primaryProviderName}</span>`}
                                            </span>
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
            .catch(error => {
                console.error('Erro ao carregar destaque:', error);
                cleanupHeroSkeleton();
                showConnectionErrorPage();
                throw error;
            })
            .finally(() => {
                cleanupHeroSkeleton();
            });
        const sectionsPromise = renderSections(mediaType).catch(error => {
            console.error('Erro ao renderizar secoes:', error);
            showConnectionErrorPage();
            throw error;
        });

        Promise.allSettled([heroPromise, sectionsPromise])
            .then(() => {
                const containerIds = ['container-wrap', ...activeSectionConfigs.map(section => section.containerId)];
                const containers = containerIds
                    .map(id => document.getElementById(id))
                    .filter(Boolean);
                if (!containers.length) {
                    return null;
                }
                return Promise.all(containers.map(container => waitForImages(container)));
            })
            .catch(error => {
                console.error('Erro ao aguardar carregamento das imagens', error);
            })
            .finally(() => {
                if (typeof hideLoading === 'function') {
                    hideLoading();
                }
                if (contentSection) {
                    contentSection.classList.remove('is-loading-rows');
                }
                handleHashNavigation();
                scheduleAutoScrollRefresh();
            });
    }    // Botoes para alternar entre filmes e series
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

    window.addEventListener('hashchange', () => handleHashNavigation({ force: true }));

    loadContent();        // Carregar conteudo de filmes

});

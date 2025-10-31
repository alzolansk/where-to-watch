const waitForImages = (container) => new Promise(resolve => {
    const root = container || document;
    const allImages = root ? root.querySelectorAll('img') : [];
    const images = Array.from(allImages).filter(img => !(img && img.loading === 'lazy' && !img.complete));

    if (!images.length) {
        resolve();
        return;
    }

    let loaded = 0;
    const settle = () => {
        loaded += 1;
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

let currentProviderQuery = '';
let availableStreamingProviders = [];

const refreshCarouselNav = (id) => {
    if (typeof window.updateCarouselNav === 'function') {
        window.updateCarouselNav(id);
    }
};

const setMovieLoadingState = (isLoading) => {
    const pageShell = document.querySelector('.page-shell');
    const skeleton = document.getElementById('movieSkeleton');
    const content = document.getElementById('movieContent');

    if (pageShell) {
        pageShell.classList.toggle('is-loading', Boolean(isLoading));
        pageShell.setAttribute('aria-busy', String(Boolean(isLoading)));
    }

    if (skeleton) {
        skeleton.setAttribute('aria-hidden', String(!isLoading));
    }

    if (content) {
        content.setAttribute('aria-hidden', String(isLoading));
    }
};

function normalizeProviderName(value) {
    return value
        ? value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : '';
}

const HOMEPAGE_DOMAIN_MAP = [
    { domain: 'netflix.com', providers: ['netflix'] },
    { domain: 'netflix.app.link', providers: ['netflix'] },
    { domain: 'primevideo.com', providers: ['prime video', 'amazon prime video', 'amazon video'] },
    { domain: 'amazon.com', providers: ['prime video', 'amazon prime video', 'amazon video'] },
    { domain: 'disneyplus.com', providers: ['disney+', 'disney plus'] },
    { domain: 'starplus.com', providers: ['star+', 'star plus'] },
    { domain: 'hbomax.com', providers: ['hbo max', 'max'] },
    { domain: 'play.hbomax.com', providers: ['hbo max', 'max'] },
    { domain: 'max.com', providers: ['max'] },
    { domain: 'paramountplus.com', providers: ['paramount+', 'paramount plus'] },
    { domain: 'paramountplus.com.br', providers: ['paramount+', 'paramount plus'] },
    { domain: 'globoplay.globo.com', providers: ['globoplay'] },
    { domain: 'clarotvmais.com.br', providers: ['claro tv', 'claro video'] },
    { domain: 'clarovideo.com', providers: ['claro video'] },
    { domain: 'oldflix.com.br', providers: ['oldflix'] },
    { domain: 'tv.apple.com', providers: ['apple tv', 'apple tv+'] },
    { domain: 'play.google.com', providers: ['google play', 'google play movies'] },
    { domain: 'youtube.com', providers: ['youtube', 'youtube premium'] },
    { domain: 'looke.com.br', providers: ['looke'] },
    { domain: 'nowonline.com.br', providers: ['now'] },
    { domain: 'crunchyroll.com', providers: ['crunchyroll'] }
];

const HOMEPAGE_PROVIDER_FALLBACK = {
    netflix: {
        provider_id: 8,
        provider_name: 'Netflix',
        logo_path: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg',
        display_priority: 1
    },
    'prime video': { provider_name: 'Prime Video' },
    'amazon prime video': { provider_name: 'Amazon Prime Video' },
    'amazon video': { provider_name: 'Amazon Prime Video' },
    'disney+': { provider_name: 'Disney+' },
    'disney plus': { provider_name: 'Disney+' },
    'star+': { provider_name: 'Star+' },
    'star plus': { provider_name: 'Star+' },
    'hbo max': { provider_name: 'HBO Max' },
    max: { provider_name: 'Max' },
    'paramount+': { provider_name: 'Paramount+' },
    'paramount plus': { provider_name: 'Paramount+' },
    globoplay: { provider_name: 'Globoplay' },
    'claro tv': { provider_name: 'Claro tv+' },
    'claro video': { provider_name: 'Claro Video' },
    oldflix: { provider_name: 'Oldflix' },
    'apple tv': { provider_name: 'Apple TV' },
    'apple tv+': { provider_name: 'Apple TV+' },
    'google play movies': { provider_name: 'Google Play Movies' },
    'google play': { provider_name: 'Google Play' },
    youtube: { provider_name: 'YouTube' },
    'youtube premium': { provider_name: 'YouTube Premium' },
    looke: { provider_name: 'Looke' },
    now: { provider_name: 'NOW' },
    crunchyroll: { provider_name: 'Crunchyroll' }
};

const PROVIDER_LIST_KEYS = ['flatrate', 'rent', 'buy', 'ads', 'free'];

function resolveHomepageProvider(homepage, providersData) {
    if (!homepage || typeof homepage !== 'string') {
        return null;
    }

    const trimmed = homepage.trim();
    if (!trimmed) {
        return null;
    }

    let hostname = '';
    try {
        hostname = new URL(trimmed).hostname.toLowerCase();
    } catch (error) {
        const match = trimmed.match(/^https?:\/\/([^/]+)/i);
        hostname = match ? match[1].toLowerCase() : '';
    }

    if (!hostname) {
        return null;
    }

    const domainEntry = HOMEPAGE_DOMAIN_MAP.find(entry => hostname.includes(entry.domain));
    if (!domainEntry) {
        return null;
    }

    const candidates = domainEntry.providers
        .map(name => normalizeProviderName(name))
        .filter(Boolean);

    if (!candidates.length) {
        return null;
    }

    const providerList = [];
    if (providersData && typeof providersData === 'object') {
        PROVIDER_LIST_KEYS.forEach(key => {
            if (Array.isArray(providersData[key])) {
                providersData[key].forEach(provider => {
                    providerList.push(provider);
                });
            }
        });
    }

    const matchedProvider = providerList.find(provider => {
        const normalizedName = normalizeProviderName(provider?.provider_name);
        return normalizedName && candidates.includes(normalizedName);
    });

    if (matchedProvider) {
        return {
            ...matchedProvider,
            direct_url: trimmed
        };
    }

    for (const candidate of candidates) {
        const fallback = HOMEPAGE_PROVIDER_FALLBACK[candidate];
        if (fallback) {
            return {
                ...fallback,
                direct_url: trimmed,
                display_priority: fallback.display_priority ?? 1
            };
        }
    }

    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    setMovieLoadingState(true);

    const params = new URLSearchParams(window.location.search);
    currentProviderQuery = (params.get('title') || params.get('original_title') || params.get('original_name') || '').trim();
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
        console.error('[WYWatch] TMDB API key não configurada – página de filme não pode ser carregada.');
        setMovieLoadingState(false);
        return;
    }

    let mediaType = params.get('mediaTp') || params.get('type') || (params.has('tv') ? 'tv' : 'movie');
    if (mediaType !== 'tv' && mediaType !== 'movie') {
        mediaType = 'movie';
    }

    const movieId = params.get('id');
    if (!movieId) {
        console.error('Missing media identifier in filme.js');
        setMovieLoadingState(false);
        return;
    }

    const dom = {
        titleTag: document.getElementById('title-movie'),
        poster: document.getElementById('itemPoster'),
        backdrop: document.getElementById('backdropImage'),
        movieLogo: document.getElementById('movieLogo'),
        itemName: document.getElementById('itemName'),
        releaseDate: document.getElementById('release-date'),
        runtime: document.getElementById('runtime'),
        certification: document.getElementById('certificationBadge'),
        mediaTypeBadge: document.getElementById('mediaTypeBadge'),
        overview: document.getElementById('movieOverview'),
        tagList: document.getElementById('tagList'),
        trailerFrame: document.getElementById('trailerFrame'),
        trailerLink: document.getElementById('trailerLink'),
        providersCta: document.getElementById('providersCta'),
        highlightScore: document.getElementById('highlightScore'),
        highlightPopularity: document.getElementById('highlightPopularity'),
        highlightVotes: document.getElementById('highlightVotes'),
        crewList: document.getElementById('crewList'),
        providerBadges: document.getElementById('providerBadges'),
        streamingProviders: document.getElementById('streamingProviders'),
        rentalProviders: document.getElementById('rentalProviders'),
        buyProviders: document.getElementById('buyProviders'),
        streamingColumn: document.getElementById('streamingColumn'),
        rentalColumn: document.getElementById('rentalColumn'),
        buyColumn: document.getElementById('buyColumn'),
        providersSection: document.getElementById('providersSection'),
        seasonSection: document.getElementById('seasonSection'),
        seasonsContainer: document.getElementById('seasons-container'),
        seasonDialog: document.getElementById('seasonDialog'),
        seasonDialogBadge: document.getElementById('seasonDialogBadge'),
        seasonDialogMeta: document.getElementById('seasonDialogMeta'),
        seasonDialogOverview: document.getElementById('seasonDialogOverview'),
        seasonStreamingList: document.getElementById('seasonStreamingList'),
        seasonStreamingEmpty: document.getElementById('seasonStreamingEmpty'),
        seasonDialogClose: document.getElementById('closeSeasonDialog'),
        castList: document.getElementById('cast-list'),
        gallerySection: document.getElementById('gallerySection'),
        galleryTrack: document.getElementById('gallery-track')
    };

    try {
        const details = await fetchDetailsById(movieId, mediaType, apiKey, tmdbUrl);
        if (!details || details.success === false) {
            throw new Error('ID ou tipo invalido.');
        }

        if (details.media_type === 'movie' || details.media_type === 'tv') {
            mediaType = details.media_type;
        }

        const heroMeta = hydrateHero(details, params, dom, mediaType);
        renderTags(details, dom, mediaType);
        renderHighlights(details, dom);
        renderCrew(details, dom, mediaType);

        const providersBR = details['watch/providers']?.results?.BR || {};
        const { homepageProvider } = heroMeta || {};
        renderProviderBadges(providersBR, dom, homepageProvider);
        renderProviders(providersBR, dom, homepageProvider);

        renderSeasons(details, dom, mediaType);
        renderCast(details.credits?.cast || [], dom.castList);
        renderGallery(details.images || {}, dom);
    } catch (error) {
        console.error('Erro ao carregar detalhes do titulo:', error);
    } finally {
        await waitForImages(document);
        setMovieLoadingState(false);
        window.history.replaceState({}, '', `filme.php?id=${movieId}&type=${mediaType}`);
    }
});

function createImageUrl(path, size = 'w500') {
    if (!path) {
        return 'imagens/icon-cast.png';
    }
    return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function fetchDetailsById(id, type, apiKey, urlBuilder) {
    if (typeof urlBuilder !== 'function') {
        throw new Error('TMDB URL builder indisponivel.');
    }    const append = type === 'tv'
        ? 'videos,images,keywords,watch/providers,content_ratings,credits'
        : 'videos,images,keywords,watch/providers,release_dates,credits';
    const url = urlBuilder(`/${type}/${id}`, { api_key: apiKey, language: 'pt-BR', append_to_response: append });
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao buscar detalhes`);
    }
    return response.json();
}

function hydrateHero(details, params, dom, mediaType) {
    if (!dom) {
        return;
    }

    const fallbackTitle = params.get('title') || '';
    const title = details.title || details.name || fallbackTitle;
    currentProviderQuery = (title || params.get('original_title') || params.get('original_name') || fallbackTitle || currentProviderQuery || '').trim();
    const poster = details.poster_path ? createImageUrl(details.poster_path, 'w500') : (params.get('imgUrl') || '');
    const backdrop = details.backdrop_path ? createImageUrl(details.backdrop_path, 'w1280') : (params.get('backdropUrl') || '');
    const overview = details.overview || params.get('overview') || 'Sinopse indisponivel no momento.';
    const homepage = details.homepage || params.get('ticketUrl') || '';
    const providersForRegion = details['watch/providers']?.results?.BR;
    const homepageProvider = resolveHomepageProvider(homepage, providersForRegion);
    const trailerUrl = resolveTrailerUrl(details, params);

    const releaseDate = details.release_date || details.first_air_date || params.get('release_date') || '';
    const runtimeText = formatRuntime(details, mediaType);
    const certificationText = extractCertification(details, mediaType);

    const titleSuffix = mediaType === 'tv' ? ' | Serie' : ' | Filme';
    if (dom.titleTag) {
        dom.titleTag.textContent = title ? `${title}${titleSuffix}` : 'Where To Watch';
    }
    document.title = title ? `${title} - Where To Watch` : 'Where To Watch';

    if (dom.itemName) {
        dom.itemName.textContent = title;
    }

    if (dom.poster) {
        dom.poster.src = poster || 'imagens/icon-cast.png';
        dom.poster.alt = title ? `Poster de ${title}` : 'Poster do titulo';
    }

    if (dom.backdrop) {
        dom.backdrop.src = backdrop || 'imagens/icon-cast.png';
        dom.backdrop.alt = title ? `Backdrop de ${title}` : 'Imagem de fundo';
    }
    if (dom.movieLogo) {
        const logoImage = selectBestLogo(details.images?.logos);
        if (logoImage) {
            dom.movieLogo.src = createImageUrl(logoImage.file_path, 'w500');
            dom.movieLogo.alt = title ? `Logo de ${title}` : `Logo do titulo`;
            dom.movieLogo.classList.add('is-visible');
        } else {
            dom.movieLogo.classList.remove('is-visible');
            dom.movieLogo.removeAttribute('src');
        }
    }


    if (dom.overview) {
        dom.overview.textContent = overview;
    }

    if (dom.releaseDate) {
        const formatted = releaseDate ? `Estreia - ${formatDate(releaseDate)}` : '';
        toggleText(dom.releaseDate, formatted);
    }

    if (dom.runtime) {
        toggleText(dom.runtime, runtimeText ? `Duracao - ${runtimeText}` : '');
    }

    if (dom.certification) {
        toggleText(dom.certification, certificationText ? `Classificacao - ${certificationText}` : '');
    }

    if (dom.mediaTypeBadge) {
        toggleText(dom.mediaTypeBadge, mediaType === 'tv' ? 'Serie' : 'Filme');
    }

    if (dom.trailerLink) {
        const hasTrailer = Boolean(trailerUrl && trailerUrl !== '#');
        if (hasTrailer) {
            dom.trailerLink.classList.remove('is-hidden');
            dom.trailerLink.href = trailerUrl;
            dom.trailerLink.dataset.trailerUrl = trailerUrl;
            dom.trailerLink.classList.remove('is-disabled');
            dom.trailerLink.removeAttribute('aria-disabled');
            dom.trailerLink.removeAttribute('target');
            if (!dom.trailerLink.dataset.boundModal) {
                dom.trailerLink.addEventListener('click', event => {
                    const targetUrl = dom.trailerLink.dataset.trailerUrl;
                    if (!targetUrl) {
                        return;
                    }
                    event.preventDefault();
                    showTrailer(targetUrl);
                });
                dom.trailerLink.dataset.boundModal = 'true';
            }
        } else {
            dom.trailerLink.classList.add('is-hidden');
            dom.trailerLink.removeAttribute('href');
            dom.trailerLink.dataset.trailerUrl = '';
            dom.trailerLink.classList.remove('is-disabled');
            dom.trailerLink.removeAttribute('aria-disabled');
        }
    }

    if (dom.trailerFrame) {
        const safeUrl = trailerUrl && trailerUrl !== '#' ? trailerUrl : '';
        dom.trailerFrame.dataset.trailerUrl = safeUrl;
        dom.trailerFrame.removeAttribute('src');
    }

    return { homepage, homepageProvider };
}

function resolveTrailerUrl(details, params) {
    const trailerFromParams = params.get('trailerUrl');
    if (trailerFromParams && trailerFromParams !== '#') {
        return trailerFromParams;
    }

    const videos = details.videos?.results || [];
    const trailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube')
        || videos.find(video => video.site === 'YouTube');
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '#';
}

function toggleText(element, text) {
    if (!element) {
        return;
    }
    const hasText = Boolean(text);
    element.textContent = hasText ? text : '';
    element.classList.toggle('is-hidden', !hasText);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace('.', '');
    } catch (err) {
        return '';
    }
}

function formatRuntime(details, mediaType) {
    if (!details) {
        return '';
    }
    if (mediaType === 'movie') {
        const runtime = details.runtime || 0;
        if (!runtime) {
            return '';
        }
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        if (hours && minutes) {
            return `${hours}h ${minutes}min`;
        }
        if (hours) {
            return `${hours}h`;
        }
        return `${minutes}min`;
    }

    const totalSeasons = details.number_of_seasons;
    const episodes = details.number_of_episodes;
    const runtimeList = Array.isArray(details.episode_run_time) ? details.episode_run_time : [];
    const runtimeEpisode = runtimeList.length ? runtimeList[0] : null;

    const parts = [];
    if (totalSeasons) {
        parts.push(`${totalSeasons} ${totalSeasons === 1 ? 'temporada' : 'temporadas'}`);
    }
    if (episodes) {
        parts.push(`${episodes} episodios`);
    }
    if (runtimeEpisode) {
        parts.push(`episodios de ${runtimeEpisode} min`);
    }
    return parts.join(' - ');
}

function extractCertification(details, mediaType) {
    if (!details) {
        return '';
    }

    if (mediaType === 'movie') {
        const releases = details.release_dates?.results || [];
        const region = releases.find(r => r.iso_3166_1 === 'BR') || releases.find(r => r.iso_3166_1 === 'US');
        const certification = region?.release_dates?.find(item => item.certification)?.certification;
        return certification || '';
    }

    const ratings = details.content_ratings?.results || [];
    const brRating = ratings.find(r => r.iso_3166_1 === 'BR')?.rating;
    const usRating = ratings.find(r => r.iso_3166_1 === 'US')?.rating;
    return brRating || usRating || '';
}

function renderTags(details, dom, mediaType) {
    if (!dom?.tagList) {
        return;
    }
    const genres = Array.isArray(details.genres) ? details.genres : [];
    const keywordsSource = details.keywords || {};
    const keywordList = Array.isArray(keywordsSource.keywords)
        ? keywordsSource.keywords
        : Array.isArray(keywordsSource.results)
            ? keywordsSource.results
            : [];
    const keywords = keywordList
        .map(keyword => ({ id: keyword?.id, name: keyword?.name }))
        .filter(keyword => Boolean(keyword?.name));

    const combined = [];
    const seen = new Set();

    genres.forEach((genre) => {
        if (genre && genre.name && !seen.has(genre.name)) {
            combined.push({
                name: genre.name,
                id: genre.id,
                type: 'genre'
            });
            seen.add(genre.name);
        }
    });

    keywords.forEach(keyword => {
        if (keyword?.name && !seen.has(keyword.name)) {
            combined.push({
                name: keyword.name,
                id: keyword.id ?? null,
                type: 'keyword'
            });
            seen.add(keyword.name);
        }
    });

    const limited = combined.slice(0, 8);

    dom.tagList.innerHTML = '';
    if (!limited.length) {
        dom.tagList.classList.add('is-hidden');
        return;
    }
    dom.tagList.classList.remove('is-hidden');

    limited.forEach(tag => {
        if ((tag.type === 'genre' || tag.type === 'keyword') && tag.id) {
            const link = document.createElement('a');
            link.className = 'tag-pill tag-pill--link';
            const targetUrl = new URL('genres.php', window.location.href);
            if (tag.type === 'genre') {
                targetUrl.searchParams.set('genres', tag.id);
                targetUrl.searchParams.set('labels', tag.name);
                link.dataset.genreId = String(tag.id);
            } else {
                targetUrl.searchParams.set('keywords', tag.id);
                targetUrl.searchParams.set('keywordLabels', tag.name);
                link.dataset.keywordId = String(tag.id);
            }
            if (mediaType === 'movie' || mediaType === 'tv') {
                targetUrl.searchParams.set('mediaType', mediaType);
            }
            link.href = `${targetUrl.pathname}${targetUrl.search}`;
            link.textContent = tag.name;
            link.dataset.categoryType = tag.type;
            link.setAttribute('aria-label', `Ver títulos em ${tag.name}`);
            dom.tagList.appendChild(link);
        } else {
            const chip = document.createElement('span');
            chip.className = 'tag-pill';
            chip.textContent = tag.name;
            dom.tagList.appendChild(chip);
        }
    });
    refreshCarouselNav('gallery-track');
}

function renderHighlights(details, dom) {
    if (!dom) {
        return;
    }
    const score = typeof details.vote_average === 'number' && details.vote_average > 0 ? details.vote_average.toFixed(1) : '-';
    const popularity = typeof details.popularity === 'number' ? Math.round(details.popularity).toLocaleString('pt-BR') : '-';
    const votes = typeof details.vote_count === 'number' && details.vote_count > 0 ? details.vote_count.toLocaleString('pt-BR') : '-';

    if (dom.highlightScore) {
        dom.highlightScore.textContent = score;
    }
    if (dom.highlightPopularity) {
        dom.highlightPopularity.textContent = popularity;
    }
    if (dom.highlightVotes) {
        dom.highlightVotes.textContent = votes;
    }
}

function renderCrew(details, dom, mediaType) {
    if (!dom?.crewList) {
        return;
    }

    const crewList = details.credits?.crew || [];
    const chips = [];

    const findCrew = (jobs) => crewList.find(member => jobs.includes(member.job));

    if (mediaType === 'tv' && Array.isArray(details.created_by) && details.created_by.length) {
        const names = details.created_by.map(person => person.name).filter(Boolean).join(', ');
        if (names) {
            chips.push({ label: 'Criacao', value: names });
        }
    }

    const director = findCrew(['Director', 'Series Director']);
    if (director) {
        chips.push({ label: 'Direcao', value: director.name });
    }

    const writer = findCrew(['Screenplay', 'Writer', 'Story', 'Teleplay']);
    if (writer) {
        chips.push({ label: 'Roteiro', value: writer.name });
    }

    const producer = findCrew(['Executive Producer', 'Producer', 'Co-Producer']);
    if (producer) {
        chips.push({ label: 'Producao', value: producer.name });
    }

    const photography = findCrew(['Director of Photography']);
    if (photography) {
        chips.push({ label: 'Fotografia', value: photography.name });
    }

    dom.crewList.innerHTML = '';
    if (!chips.length) {
        dom.crewList.classList.add('is-hidden');
        return;
    }
    dom.crewList.classList.remove('is-hidden');

    chips.forEach(({ label, value }) => {
        const chip = document.createElement('span');
        chip.className = 'crew-chip';
        chip.textContent = `${label}: ${value}`;
        dom.crewList.appendChild(chip);
    });
}


function selectBestLogo(logos) {
    if (!Array.isArray(logos) || !logos.length) {
        return null;
    }
    const preferredLanguages = ['pt', 'pt-br', 'pt_br', 'en', 'es', ''];
    const scoreFor = (logo) => {
        const lang = (logo?.iso_639_1 || '').toLowerCase();
        const index = preferredLanguages.findIndex(item => {
            if (!item) {
                return !lang;
            }
            return item.toLowerCase() === lang;
        });
        return index === -1 ? preferredLanguages.length : index;
    };
    const sorted = [...logos].sort((a, b) => {
        const langDiff = scoreFor(a) - scoreFor(b);
        if (langDiff !== 0) {
            return langDiff;
        }
        const voteDiff = (b.vote_average || 0) - (a.vote_average || 0);
        if (voteDiff !== 0) {
            return voteDiff;
        }
        return (b.vote_count || 0) - (a.vote_count || 0);
    });
    return sorted[0] || null;
}

const providerSearchMap = {
    'netflix': 'https://www.netflix.com/search?q=${query}',
    'prime video': 'https://www.primevideo.com/search?phrase=${query}',
    'amazon prime video': 'https://www.primevideo.com/search?phrase=${query}',
    'amazon video': 'https://www.primevideo.com/-/pt/search/ref=atv_nb_sug?ie=UTF8&phrase=${query}',
    'hbo max': 'https://play.hbomax.com/search/result?q=${query}',
    'max': 'https://play.hbomax.com/search?q=${query}',
    'paramount+': 'https://www.paramountplus.com/br/search/?keyword=${query}',
    'paramount plus': 'https://www.paramountplus.com/br/search/?keyword=${query}',
    'disney+': 'https://www.disneyplus.com/pt-br/browse/search?q=${query}',
    'disney plus': 'https://www.disneyplus.com/pt-br/browse/search?q=${query}',
    'star+': 'https://www.starplus.com/pt-br/search?q=${query}',
    'star plus': 'https://www.starplus.com/pt-br/search?q=${query}',
    'globoplay': 'https://globoplay.globo.com/busca/?q=${query}',
    'telecine': 'https://globoplay.globo.com/busca/tudo/${query}/',
    'claro tv': 'https://www.clarotvmais.com.br/busca?q=${query}',
    'claro video': 'https://www.clarovideo.com/brasil/busca?keyword=${query}',
    'oldflix': 'https://oldflix.com.br/home/catalogo?search=${query}',
    'apple tv+': 'https://tv.apple.com/search?term=${query}',
    'apple tv': 'https://tv.apple.com/search?term=${query}',
    'google play movies': 'https://play.google.com/store/search?q=${query}&c=movies',
    'google play': 'https://play.google.com/store/search?q=${query}&c=movies',
    'now': 'https://www.nowonline.com.br/busca?q=${query}',
    'looke': 'https://www.looke.com.br/busca?q=${query}',
    'crunchyroll': 'https://www.crunchyroll.com/pt-br/search?q=${query}',
    'youtube premium': 'https://www.youtube.com/results?search_query=${query}&sp=EgIQAg%253D%253D',
    'youtube': 'https://www.youtube.com/results?search_query=${query}',
    'google': 'https://www.youtube.com/results?search_query=${query}&sp=EgIQBA%253D%253D'
};

const ignoredProviders = [
    'amazon channel',
    'amazon prime video channel',
    'paramount channel',
    'paramount plus apple tv channel',
    'paramount+ apple tv channel',
    'paramount plus premium',
    'paramount+ premium',
    'amazon plus premium',
    'amazon prime premium',
    'belas artes',
    'standard with ads',
    'with ads',
    'ads plan',
    'itunes',
    'skystore'
];

function buildProviderSearchUrl(name) {
    if (!name) {
        return '#';
    }

    const normalized = normalizeProviderName(name);
    const titleCandidate = (currentProviderQuery || '').trim();
    const rawQuery = titleCandidate || name;
    const encodedQuery = encodeURIComponent(rawQuery);

    for (const [key, template] of Object.entries(providerSearchMap)) {
        const normalizedKey = normalizeProviderName(key);
        if (normalizedKey && normalized.includes(normalizedKey)) {
            if (typeof template === 'string' && template.includes('${query}')) {
                return template.replace(/\$\{query}/g, encodedQuery);
            }
            return template;
        }
    }

    const fallback = `${rawQuery} streaming`;
    return `https://www.google.com/search?q=${encodeURIComponent(fallback)}`;
}


function resolveProviderUrl(provider) {
    if (!provider) {
        return '#';
    }

    if (provider.direct_url) {
        return provider.direct_url;
    }

    return buildProviderSearchUrl(provider.provider_name);
}


function prepareStreamingProviders(originalList, homepageProvider) {
    const list = Array.isArray(originalList) ? originalList.map(item => ({ ...item })) : [];

    if (!homepageProvider) {
        return list;
    }

    const targetId = homepageProvider.provider_id;
    const targetName = normalizeProviderName(homepageProvider.provider_name);

    const matchIndex = list.findIndex(provider => {
        const providerId = provider?.provider_id ?? provider?.providerId;
        const providerName = normalizeProviderName(provider?.provider_name);
        const idMatches = providerId !== undefined && providerId === targetId;
        const nameMatches = providerName && targetName && providerName === targetName;
        return idMatches || nameMatches;
    });

    if (matchIndex >= 0) {
        const existing = list[matchIndex];
        if (!existing.direct_url) {
            list[matchIndex] = { ...existing, direct_url: homepageProvider.direct_url };
        }
        return list;
    }

    list.push(homepageProvider);
    return list;
}


function dedupeProviders(list) {
    const result = [];
    const seen = new Set();
    (list || []).forEach(provider => {
        const id = provider.provider_id || provider.providerId || provider.provider_name;
        if (!id || seen.has(id)) {
            return;
        }
        const normalizedName = normalizeProviderName(provider.provider_name);
        if (!normalizedName || ignoredProviders.some(term => normalizedName.includes(term))) {
            return;
        }
        seen.add(id);
        result.push(provider);
    });
    return result.sort((a, b) => (a.display_priority || 1000) - (b.display_priority || 1000));
}


function renderProviderBadges(providers, dom, homepageProvider) {
    if (!dom?.providerBadges) {
        return;
    }

    const streamingSource = prepareStreamingProviders(providers?.flatrate, homepageProvider);
    const streaming = dedupeProviders(streamingSource).slice(0, 4);
    dom.providerBadges.innerHTML = '';

    if (!streaming.length) {
        dom.providerBadges.classList.add('is-hidden');
        return;
    }

    dom.providerBadges.classList.remove('is-hidden');

    streaming.forEach(provider => {
        const badge = document.createElement('a');
        badge.className = 'provider-badge';
        badge.href = resolveProviderUrl(provider);
        badge.target = '_blank';
        badge.rel = 'noopener';

        if (provider.logo_path) {
            const img = document.createElement('img');
            img.src = createImageUrl(provider.logo_path, 'w92');
            img.alt = provider.provider_name;
            badge.appendChild(img);
        }

        const span = document.createElement('span');
        span.textContent = provider.provider_name;
        badge.appendChild(span);

        dom.providerBadges.appendChild(badge);
    });
}

function renderProviders(providers, dom, homepageProvider) {
    if (!dom?.providersSection) {
        return;
    }

    const streamingList = prepareStreamingProviders(providers?.flatrate, homepageProvider);
    const streaming = dedupeProviders(streamingList);
    availableStreamingProviders = streaming;
    const rental = dedupeProviders(providers?.rent);
    const buy = dedupeProviders(providers?.buy);

    const total = streaming.length + rental.length + buy.length;

    if (!total) {
        dom.providersSection.classList.add('is-hidden');
        if (dom.providersCta) {
            dom.providersCta.classList.add('is-hidden');
        }
        return;
    }

    dom.providersSection.classList.remove('is-hidden');
    if (dom.providersCta) {
        dom.providersCta.classList.remove('is-hidden');
    }

    populateProviderColumn(dom.streamingColumn, dom.streamingProviders, streaming);
    populateProviderColumn(dom.rentalColumn, dom.rentalProviders, rental);
    populateProviderColumn(dom.buyColumn, dom.buyProviders, buy);
}

function populateProviderColumn(column, container, providers) {
    if (!column || !container) {
        return;
    }
    container.innerHTML = '';

    if (!providers.length) {
        column.classList.add('is-hidden');
        return;
    }

    column.classList.remove('is-hidden');

    providers.forEach(provider => {
        const pill = document.createElement('a');
        pill.className = 'provider-pill';
        pill.href = resolveProviderUrl(provider);
        pill.target = '_blank';
        pill.rel = 'noopener';

        if (provider.logo_path) {
            const img = document.createElement('img');
            img.src = createImageUrl(provider.logo_path, 'w92');
            img.alt = provider.provider_name;
            pill.appendChild(img);
        }

        const span = document.createElement('span');
        span.textContent = provider.provider_name;
        pill.appendChild(span);

        container.appendChild(pill);
    });
}

function renderSeasons(details, dom, mediaType) {
    if (mediaType !== 'tv' || !dom?.seasonSection || !dom.seasonsContainer) {
        dom?.seasonSection?.classList.add('is-hidden');
        refreshCarouselNav('seasons-container');
        return;
    }

    const seasons = Array.isArray(details.seasons) ? details.seasons.filter(Boolean) : [];
    if (!seasons.length) {
        dom.seasonSection.classList.add('is-hidden');
        refreshCarouselNav('seasons-container');
        return;
    }

    dom.seasonSection.classList.remove('is-hidden');
    dom.seasonsContainer.innerHTML = '';

    seasons.forEach(season => {
        const poster = season.poster_path ? createImageUrl(season.poster_path, 'w300') : 'imagens/icon-cast.png';
        const year = season.air_date ? new Date(season.air_date).getFullYear() : '';
        const card = document.createElement('article');
        card.className = 'season-item';

        card.innerHTML = `
            <img src="${poster}" alt="${season.name || 'Temporada'}" loading="lazy">
            <div class="season-details">
                <p class="season-name">${season.name || 'Temporada'}</p>
                <span class="year-season">${[year, `${season.episode_count || 0} episodios`].filter(Boolean).join(' - ')}</span>
            </div>
        `;

        card.addEventListener('click', () => openSeasonDialog(season, dom));

        dom.seasonsContainer.appendChild(card);
    });
    refreshCarouselNav('seasons-container');
}

function openSeasonDialog(season, dom) {
    if (!dom?.seasonDialog) {
        return;
    }

    const dialog = dom.seasonDialog;
    const badge = dom.seasonDialogBadge;
    const meta = dom.seasonDialogMeta;
    const overview = dom.seasonDialogOverview;
    const providerList = dom.seasonStreamingList;
    const emptyState = dom.seasonStreamingEmpty;

    const seasonLabel = season?.name || (typeof season?.season_number === 'number' ? `Temporada ${season.season_number}` : 'Temporada');
    const year = season?.air_date ? new Date(season.air_date).getFullYear() : '';
    const episodesText = season?.episode_count ? `${season.episode_count} ${season.episode_count === 1 ? 'episódio' : 'episódios'}` : '';

    if (badge) {
        badge.textContent = seasonLabel;
    }

    if (meta) {
        const fragments = [year, episodesText].filter(Boolean);
        meta.textContent = fragments.length ? fragments.join(' • ') : '';
        meta.classList.toggle('is-hidden', !fragments.length);
    }

    if (overview) {
        const text = season?.overview?.trim();
        overview.textContent = text || 'Ainda não temos uma sinopse detalhada para esta temporada.';
        overview.classList.toggle('is-muted', !text);
    }

    if (providerList) {
        providerList.innerHTML = '';
    }

    const hasProviders = Array.isArray(availableStreamingProviders) && availableStreamingProviders.length > 0;

    if (emptyState) {
        emptyState.classList.toggle('is-hidden', hasProviders);
    }

    if (hasProviders && providerList) {
        availableStreamingProviders.forEach(provider => {
            const link = document.createElement('a');
            link.className = 'season-provider';
            link.href = resolveProviderUrl(provider);
            link.target = '_blank';
            link.rel = 'noopener';

            if (provider.logo_path) {
                const img = document.createElement('img');
                img.src = createImageUrl(provider.logo_path, 'w92');
                img.alt = provider.provider_name;
                link.appendChild(img);
            }

            const info = document.createElement('span');
            info.textContent = provider.provider_name;
            link.appendChild(info);

            providerList.appendChild(link);
        });
    }

    if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        dialog.classList.add('is-open');
    }

    if (dom.seasonDialogClose && !dom.seasonDialogClose.__hasListener) {
        dom.seasonDialogClose.addEventListener('click', () => closeSeasonDialog(dialog));
        dom.seasonDialogClose.__hasListener = true;
    }

    if (!dialog.__outsideClickListener) {
        dialog.addEventListener('click', event => {
            if (event.target === dialog) {
                closeSeasonDialog(dialog);
            }
        });
        dialog.__outsideClickListener = true;
    }
}

function closeSeasonDialog(dialog) {
    if (!dialog) {
        return;
    }
    dialog.classList.remove('is-open');
    if (dialog.open) {
        dialog.close();
    }
}

function renderCast(castArray, castContainer) {
    if (!castContainer) {
        return;
    }

    const cast = Array.isArray(castArray) ? castArray.slice(0, 20) : [];
    castContainer.innerHTML = '';

    if (!cast.length) {
        const message = document.createElement('p');
        message.className = 'section-subtitle';
        message.textContent = 'Nao encontramos o elenco principal.';
        castContainer.appendChild(message);
        refreshCarouselNav('cast-list');
        return;
    }

    cast.forEach(member => {
        const profile = member.profile_path ? createImageUrl(member.profile_path, 'w300') : 'imagens/icon-cast.png';
        const card = document.createElement('article');
        card.className = 'actor-card';
        card.dataset.castId = member.id;

        card.innerHTML = `
            <img src="${profile}" alt="${member.name}" class="actor-img" loading="lazy">
            <div class="p-div">
                <span class="actor-name">${member.name}</span>
                <p class="actor-role">${member.character || ''}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            if (!member.id) {
                return;
            }
            const params = new URLSearchParams({ personId: member.id });
            window.location.href = `person.php?${params.toString()}`;
        });

        castContainer.appendChild(card);
    });
    refreshCarouselNav('cast-list');
}

function renderGallery(images, dom) {
    if (!dom?.gallerySection || !dom.galleryTrack) {
        refreshCarouselNav('gallery-track');
        return;
    }

    const backdrops = Array.isArray(images.backdrops) ? images.backdrops.slice(0, 8) : [];
    const posters = Array.isArray(images.posters) ? images.posters.slice(0, 4) : [];
    const galleryItems = [...backdrops, ...posters];

    dom.galleryTrack.innerHTML = '';

    if (!galleryItems.length) {
        dom.gallerySection.classList.add('is-hidden');
        refreshCarouselNav('gallery-track');
        return;
    }

    dom.gallerySection.classList.remove('is-hidden');

    galleryItems.forEach((item, index) => {
        const isBackdrop = !item.iso_639_1 || item.aspect_ratio > 1;
        const size = isBackdrop ? 'w780' : 'w500';
        const card = document.createElement('figure');
        card.className = 'gallery-card';

        const img = document.createElement('img');
        img.src = createImageUrl(item.file_path, size);
        img.alt = isBackdrop ? `Backdrop ${index + 1}` : `Poster ${index + 1}`;
        img.loading = 'lazy';
        card.appendChild(img);

        const caption = document.createElement('span');
        caption.textContent = isBackdrop ? 'Backdrop oficial' : 'Poster oficial';
        card.appendChild(caption);

        dom.galleryTrack.appendChild(card);
    });
    refreshCarouselNav('gallery-track');
}

document.getElementById('closeItem')?.addEventListener('click', () => {
    const modal = document.getElementById('actorDialog');
    modal?.close?.();
});








const waitForImages = (container) => new Promise(resolve => {
    const root = container || document;
    const images = root ? root.querySelectorAll('img') : [];
    if (!images || images.length === 0) {
        resolve();
        return;
    }

    let loaded = 0;
    const check = () => {
        loaded += 1;
        if (loaded >= images.length) {
            resolve();
        }
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

document.addEventListener('DOMContentLoaded', async () => {
    showLoading();

    const params = new URLSearchParams(window.location.search);
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';

    let mediaType = params.get('mediaTp') || params.get('type') || (params.has('tv') ? 'tv' : 'movie');
    if (mediaType !== 'tv' && mediaType !== 'movie') {
        mediaType = 'movie';
    }

    const movieId = params.get('id');
    if (!movieId) {
        console.error('Missing media identifier in filme.js');
        hideLoading();
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
        homepageCta: document.getElementById('homepageCta'),
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
        castList: document.getElementById('cast-list'),
        gallerySection: document.getElementById('gallerySection'),
        galleryTrack: document.getElementById('gallery-track')
    };

    try {
        const details = await fetchDetailsById(movieId, mediaType, apiKey);
        if (!details || details.success === false) {
            throw new Error('ID ou tipo inválido.');
        }

        if (details.media_type === 'movie' || details.media_type === 'tv') {
            mediaType = details.media_type;
        }

        hydrateHero(details, params, dom, mediaType);
        renderTags(details, dom);
        renderHighlights(details, dom);
        renderCrew(details, dom, mediaType);

        const providersBR = details['watch/providers']?.results?.BR || {};
        renderProviderBadges(providersBR, dom);
        renderProviders(providersBR, dom);

        renderSeasons(details, dom, mediaType);
        renderCast(details.credits?.cast || [], dom.castList);
        renderGallery(details.images || {}, dom);
    } catch (error) {
        console.error('Erro ao carregar detalhes do título:', error);
    } finally {
        await waitForImages(document);
        hideLoading();
        window.history.replaceState({}, '', `filme.php?id=${movieId}&type=${mediaType}`);
    }
});

function createImageUrl(path, size = 'w500') {
    if (!path) {
        return 'imagens/icon-cast.png';
    }
    return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function fetchDetailsById(id, type, apiKey) {
    const append = type === 'tv'
        ? 'videos,images,keywords,watch/providers,content_ratings,credits'
        : 'videos,images,keywords,watch/providers,release_dates,credits';
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=${append}`;
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
    const poster = details.poster_path ? createImageUrl(details.poster_path, 'w500') : (params.get('imgUrl') || '');
    const backdrop = details.backdrop_path ? createImageUrl(details.backdrop_path, 'w1280') : (params.get('backdropUrl') || '');
    const overview = details.overview || params.get('overview') || 'Sinopse indisponível no momento.';
    const homepage = details.homepage || params.get('ticketUrl') || '';
    const trailerUrl = resolveTrailerUrl(details, params);

    const releaseDate = details.release_date || details.first_air_date || params.get('release_date') || '';
    const runtimeText = formatRuntime(details, mediaType);
    const certificationText = extractCertification(details, mediaType);

    const titleSuffix = mediaType === 'tv' ? ' | Série' : ' | Filme';
    if (dom.titleTag) {
        dom.titleTag.textContent = title ? `${title}${titleSuffix}` : 'Where To Watch';
    }
    document.title = title ? `${title} · Where To Watch` : 'Where To Watch';

    if (dom.itemName) {
        dom.itemName.textContent = title;
    }

    if (dom.poster) {
        dom.poster.src = poster || 'imagens/icon-cast.png';
        dom.poster.alt = title ? `Poster de ${title}` : 'Poster do título';
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
        const formatted = releaseDate ? `Estreia • ${formatDate(releaseDate)}` : '';
        toggleText(dom.releaseDate, formatted);
    }

    if (dom.runtime) {
        toggleText(dom.runtime, runtimeText ? `Duração • ${runtimeText}` : '');
    }

    if (dom.certification) {
        toggleText(dom.certification, certificationText ? `Classificação • ${certificationText}` : '');
    }

    if (dom.mediaTypeBadge) {
        toggleText(dom.mediaTypeBadge, mediaType === 'tv' ? 'Série' : 'Filme');
    }

    if (dom.trailerLink) {
        const hasTrailer = Boolean(trailerUrl && trailerUrl !== '#');
        if (hasTrailer) {
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
            dom.trailerLink.href = '#';
            dom.trailerLink.dataset.trailerUrl = '';
            dom.trailerLink.classList.add('is-disabled');
            dom.trailerLink.setAttribute('aria-disabled', 'true');
        }
    }

    if (dom.trailerFrame) {
        const safeUrl = trailerUrl && trailerUrl !== '#' ? trailerUrl : '';
        dom.trailerFrame.dataset.trailerUrl = safeUrl;
        dom.trailerFrame.removeAttribute('src');
    }

    if (dom.homepageCta) {
        if (homepage) {
            dom.homepageCta.href = homepage;
            dom.homepageCta.classList.remove('is-hidden');
        } else {
            dom.homepageCta.classList.add('is-hidden');
        }
    }
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
        parts.push(`${episodes} episódios`);
    }
    if (runtimeEpisode) {
        parts.push(`episódios de ${runtimeEpisode} min`);
    }
    return parts.join(' • ');
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

function renderTags(details, dom) {
    if (!dom?.tagList) {
        return;
    }
    const genres = Array.isArray(details.genres) ? details.genres.map(g => g.name) : [];
    const keywordsSource = details.keywords || {};
    const keywordList = Array.isArray(keywordsSource.keywords)
        ? keywordsSource.keywords
        : Array.isArray(keywordsSource.results)
            ? keywordsSource.results
            : [];
    const keywords = keywordList.map(k => k.name).filter(Boolean);

    const combined = [...genres];
    keywords.forEach(keyword => {
        if (!combined.includes(keyword)) {
            combined.push(keyword);
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
        const chip = document.createElement('span');
        chip.className = 'tag-pill';
        chip.textContent = tag;
        dom.tagList.appendChild(chip);
    });
}

function renderHighlights(details, dom) {
    if (!dom) {
        return;
    }
    const score = typeof details.vote_average === 'number' && details.vote_average > 0 ? details.vote_average.toFixed(1) : '—';
    const popularity = typeof details.popularity === 'number' ? Math.round(details.popularity).toLocaleString('pt-BR') : '—';
    const votes = typeof details.vote_count === 'number' && details.vote_count > 0 ? details.vote_count.toLocaleString('pt-BR') : '—';

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
            chips.push({ label: 'Criação', value: names });
        }
    }

    const director = findCrew(['Director', 'Series Director']);
    if (director) {
        chips.push({ label: 'Direção', value: director.name });
    }

    const writer = findCrew(['Screenplay', 'Writer', 'Story', 'Teleplay']);
    if (writer) {
        chips.push({ label: 'Roteiro', value: writer.name });
    }

    const producer = findCrew(['Executive Producer', 'Producer', 'Co-Producer']);
    if (producer) {
        chips.push({ label: 'Produção', value: producer.name });
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
    netflix: 'https://www.netflix.com/br',
    'prime video': 'https://www.primevideo.com/',
    'amazon prime video': 'https://www.primevideo.com/',
    'amazon video': 'https://www.primevideo.com/',
    'hbo max': 'https://www.max.com/',
    'max': 'https://www.max.com/',
    'paramount+': 'https://www.paramountplus.com/br/',
    'paramount plus': 'https://www.paramountplus.com/br/',
    'disney+': 'https://www.disneyplus.com/pt-br',
    'star+': 'https://www.starplus.com/pt-br',
    globoplay: 'https://globoplay.globo.com/',
    'apple tv+': 'https://tv.apple.com/',
    'apple tv': 'https://tv.apple.com/',
    'google play movies': 'https://play.google.com/store/movies',
    now: 'https://www.nowonline.com.br/',
    looke: 'https://www.looke.com.br/',
    telecine: 'https://www.telecineplay.com.br/',
    crunchyroll: 'https://www.crunchyroll.com/pt-br',
    'youtube premium': 'https://www.youtube.com/premium',
    youtube: 'https://www.youtube.com/'
};

const ignoredProviders = ['itunes', 'skystore'];

function buildProviderSearchUrl(name) {
    if (!name) {
        return '#';
    }
    const normalized = name.toLowerCase();
    for (const key in providerSearchMap) {
        if (normalized.includes(key)) {
            return providerSearchMap[key];
        }
    }
    return `https://www.google.com/search?q=${encodeURIComponent(name + ' streaming')}`;
}

function dedupeProviders(list) {
    const result = [];
    const seen = new Set();
    (list || []).forEach(provider => {
        const id = provider.provider_id || provider.providerId || provider.provider_name;
        if (!id || seen.has(id)) {
            return;
        }
        if (ignoredProviders.some(term => provider.provider_name?.toLowerCase().includes(term))) {
            return;
        }
        seen.add(id);
        result.push(provider);
    });
    return result.sort((a, b) => (a.display_priority || 1000) - (b.display_priority || 1000));
}

function renderProviderBadges(providers, dom) {
    if (!dom?.providerBadges) {
        return;
    }

    const streaming = dedupeProviders(providers.flatrate).slice(0, 4);
    dom.providerBadges.innerHTML = '';

    if (!streaming.length) {
        dom.providerBadges.classList.add('is-hidden');
        return;
    }

    dom.providerBadges.classList.remove('is-hidden');

    streaming.forEach(provider => {
        const badge = document.createElement('a');
        badge.className = 'provider-badge';
        badge.href = buildProviderSearchUrl(provider.provider_name);
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

function renderProviders(providers, dom) {
    if (!dom?.providersSection) {
        return;
    }

    const streaming = dedupeProviders(providers.flatrate);
    const rental = dedupeProviders(providers.rent);
    const buy = dedupeProviders(providers.buy);

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
        pill.href = buildProviderSearchUrl(provider.provider_name);
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
        return;
    }

    const seasons = Array.isArray(details.seasons) ? details.seasons.filter(Boolean) : [];
    if (!seasons.length) {
        dom.seasonSection.classList.add('is-hidden');
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
                <span class="year-season">${[year, `${season.episode_count || 0} episódios`].filter(Boolean).join(' • ')}</span>
            </div>
        `;

        dom.seasonsContainer.appendChild(card);
    });
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
        message.textContent = 'Não encontramos o elenco principal.';
        castContainer.appendChild(message);
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
}

function renderGallery(images, dom) {
    if (!dom?.gallerySection || !dom.galleryTrack) {
        return;
    }

    const backdrops = Array.isArray(images.backdrops) ? images.backdrops.slice(0, 8) : [];
    const posters = Array.isArray(images.posters) ? images.posters.slice(0, 4) : [];
    const galleryItems = [...backdrops, ...posters];

    dom.galleryTrack.innerHTML = '';

    if (!galleryItems.length) {
        dom.gallerySection.classList.add('is-hidden');
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
}

document.getElementById('closeItem')?.addEventListener('click', () => {
    const modal = document.getElementById('actorDialog');
    modal?.close?.();
});



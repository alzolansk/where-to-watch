document.addEventListener('DOMContentLoaded', async function() {

    showLoading();

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
    // Obtém os parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    let mediaType = params.get('mediaTp') || params.get('type') || (params.has('tv') ? 'tv' : 'movie');
    const movieId = params.get('id');
    
    // Recupera os dados
    let title = params.get('title');
    let originalTitle = params.get('original_title');
    let genres = params.get('genres');
    let releaseDate = params.get('release_date');
    let imgUrl = params.get('imgUrl');
    let backdropUrl = params.get('backdropUrl');
    let trailerUrl = params.get('trailerUrl');
    let overview = params.get('overview');
    const upcoming = params.get('itemFetch');
    const ticketSite = params.get('ticketUrl');

    const fetchDetailsById = async (id, type) => {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=videos`;
        const response = await fetch(url);
        const data = await response.json();
        return { type, data, status: response.status };
    };

    if (!title || !mediaType) {
        try {
            const { type, data, status } = await fetchDetailsById(movieId, mediaType);

            if (status !== 200 || data.success === false) {
                throw new Error('ID ou tipo inválido.');
            }

            title = data.title || data.name || '';
            originalTitle = data.original_title || data.original_name || '';
            releaseDate = data.release_date || data.first_air_date || '';
            genres = data.genres ? data.genres.map(g => g.name).join(', ') : '';
            imgUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
            backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '';
            overview = data.overview || '';
            const trailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '#';


        } catch (error) {
            console.error('Erro ao buscar detalhes do título:', error);
        }
    }

    const creditsUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/credits?api_key=${apiKey}&language=pt-BR&page=1`;
    const providerUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/watch/providers?api_key=${apiKey}&language=pt-BR&page=1`;

    let mediaTypeTranslated = '';

    if (mediaType === 'movie') {
        mediaTypeTranslated = 'filme';
    } else if (mediaType === 'tv') {
        mediaTypeTranslated = 'série';
    }
    
    // Define cores de fundo para cada provedor
    const providerBgColors = {
    'Netflix': '#000000',
    'Amazon Prime Video': '#FFFFFF',
    'Amazon Video': '#FFFFFF',
    'HBO Max': '#0A0A0A',
    'Max': '#0A0A0A',
    'Paramount Plus': '#2766FB',
    'Paramount+': '#2766FB',
    'Claro video': '#ffffff',
    'Claro tv+' : '#0F0F0F',
    'YouTube': '#FF0000',
    'Microsoft Store': '#0078D9',
    'Google Play Movies': '#ffffff',
    'Star Plus': '#141927',
    'Star+': '#141927',
    'Rakuten TV': '#E50914',
    'MGM': '#D4AF37',
    'Now': '#002776',
    'Looke': '#333333',
    'VIX': '#F28E1C',
    'Telecine Play': '#FF1E1E',
    'Pluto TV': '#662D91',
    'Crunchyroll': '#FF5D01',
    'Oldflix': '#ffffff',
    'Apple TV+': '#000000'
    };

    const providersWithGradient = {
        'Apple TV': 'linear-gradient(180deg, #323232, #141414)',
        'Globoplay': 'linear-gradient(140deg, #FF0033 30%, #FF5D0D 90%, #FF7C00 100%)',
        'Univer Video': 'linear-gradient(130deg, #40577A 10%, #101824 70%, #161E29)',
        'Disney Plus': 'linear-gradient(180deg, #03202E 20%,#185563,  #4AD2DF);'
    };

    const providerLogoFb = {
        'apple tv': 'https://play-lh.googleusercontent.com/1XBAZjSOWaVM7UDFKvzuMR-WRoR5gCnsYrw17_ihHLcJKT9Qc7hXptHwWQ3Bf83mry4=w240-h480-rw'
    };

    // Limpa a URL exibida após capturar todos os parâmetros
    window.history.replaceState({}, '', `http://localhost/WhereToWatch/wtw/filme.php?id=${movieId}&${mediaType}`);

    //Verificação de upcoming
    if(upcoming == "upcoming"){
        document.getElementById('providers').innerHTML = `
        <p> Cinemas mais próximos de você!
        <a href="${ticketSite}" target="_blank" class="buy-tickets"> Compre aqui </a>
        </p>
        `;
    } else {
        try {
            const response = await fetch(providerUrl);
            const providerData = await response.json();
            const providers = providerData.results?.BR;

            const query = encodeURIComponent(title);
            const streamingProviders = [];
            const rentalProviders = [];

            const providerSearchMap = {
                "netflix": `https://www.netflix.com/search?q=${query}`,
                "apple tv": `https://tv.apple.com/search?term=${query}`,
                "amazon video": `https://www.primevideo.com/-/pt/search/ref=atv_nb_sug?ie=UTF8&phrase=${query}`,
                "prime video": `https://www.primevideo.com/search?phrase=${query}`, 
                "disney": `https://www.disneyplus.com/pt-br/browse/search?q=${query}`,
                "max": `https://play.hbomax.com/search?q=${query}`,
                "globoplay": `https://globoplay.globo.com/busca/?q=${query}`,
                "paramount": `https://www.paramountplus.com/br/search/?keyword=${query}`,
                "telecine": `https://globoplay.globo.com/busca/tudo/${query}/`,
                "claro tv": `https://www.clarotvmais.com.br/busca?q=${query}`,
                "oldflix": `https://oldflix.com.br/home/catalog?search=${query}`,
                "crunchyroll": `https://www.crunchyroll.com/pt-br/search?q=${query}`,
                "google":`https://www.youtube.com/results?search_query=${query}&sp=EgIQBA%253D%253D`
            };

            const ignoredProviders = [
                'Amazon Channel',
                'Paramount Channel',
                'Standard with Ads',
                'paramount plus apple tv channel',
                'paramount plus premium',
                'Belas Artes'
            ];

            const processProviders = (providerArray, targetArray) => {
                if (!providerArray) return;

                providerArray.forEach(provider => {
                    const name = provider.provider_name;
                    if (ignoredProviders.some(p => name.toLowerCase().includes(p.toLowerCase()))) {
                        return;
                    }

                    const providerName = name.toLowerCase();

                    let searchUrl = '';

                    if (providerName.includes("netflix") || providerName.includes("apple")) {
                        if (ticketSite && (ticketSite.includes("tv.apple") || ticketSite.includes(providerName))) {
                            searchUrl = ticketSite;
                        } else {
                            searchUrl = providerSearchMap[providerName.includes("netflix") ? "netflix" : "apple tv"];
                        }
                    } else {
                        for (const key in providerSearchMap) {
                            if (providerName.includes(key)) {
                                searchUrl = providerSearchMap[key];
                                break;
                            }
                        }

                        if (!searchUrl) {
                            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' ' + title)}`;
                        }
                    }

                    targetArray.push({
                        name,
                        logo: `https://image.tmdb.org/t/p/w300${provider.logo_path}`,
                        url: searchUrl
                    });

                });
            };

            // Processa flatrate (streaming) e rent (aluguel)
            processProviders(providers?.flatrate, streamingProviders);
            processProviders(providers?.rent, rentalProviders);

            // Exibe no HTML
            const providersContainer = document.getElementById("providers");

            let html = '';

            if (streamingProviders.length > 0) {
                html += `
                    <div class="provider-row">
                        ${streamingProviders.map(p =>{                        
                            const backgroundColor = providerBgColors[p.name] || '#1a1a1a';
                            const gradient = providersWithGradient[p.name];
                            const providerKey = p.name.trim().toLowerCase();
                            const customLogo = providerLogoFb[providerKey]? providerKey:p.logo;
                            const src = customLogo || p.logo;
                            const style = gradient ? `background-image: ${gradient};` : `background-color: ${backgroundColor};`;

                            return `
                            <a href="${p.url}" target="_blank" class="provider-tag">
                                <img src="${src}" alt="${p.name}" class="logo-provider" style="${style};" />
                            </a>
                        `;
                        }).join('')}
                        <span class="provider-type">Streaming</span>
                    </div>
                `;
            }

            if (rentalProviders.length > 0) {
                html += `
                    <div class="provider-row">
                        ${rentalProviders.map(p =>{                        
                            const backgroundColor = providerBgColors[p.name] || '#1a1a1a';
                            const gradient = providersWithGradient[p.name];
                            const providerKey = p.name.trim().toLowerCase();
                            const customLogo = providerLogoFb[providerKey];
                            const style = gradient ? `background-image: ${gradient};` : `background-color: ${backgroundColor};`;
                            const src = customLogo || p.logo;

                            return `
                            <a href="${p.url}" target="_blank" class="provider-tag">
                                <img src="${src}" alt="${p.name}" class="logo-provider" style="${style};" />
                            </a>
                        `;
                        }).join('')}
                        <span class="provider-type">Aluguel</span>
                    </div>
                `;
            }

            const allProviders = rentalProviders.length + streamingProviders.length;

            if (html) {
                providersContainer.innerHTML = html;
                console.log(allProviders);
            } else {
                providersContainer.innerText = "Nenhum provedor encontrado.";
            }
        } catch (err) {
            document.getElementById('providers').innerText = 'Não encontrado em nenhum provedor';
        }
    }
    //Formatação de data
    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split("-"); // Divide a data pelo separador '-'
        return `${day}/${month}/${year}`; // Retorna no formato 'dd/mm/aaaa'
    };
    
    // Formata a data de lançamento
    const formattedReleaseDate = formatDate(releaseDate);
    document.getElementById('release-date').innerText = `Lançamento: ${formattedReleaseDate}`;
    // Atualiza o conteúdo da página
    document.getElementById('title-movie').innerText = `${title} - Where you Watch`;
    document.getElementById('itemName').innerText = title;
    document.getElementById('genreMovie').innerText = `Gêneros: ${genres}`;
    document.getElementById('itemPoster').src = imgUrl;
    document.getElementById('backdropImage').src = backdropUrl;
    document.getElementById('trailer-link').href = trailerUrl;
    document.getElementById('movieOverview').innerText = overview;
    // Atualiza a palavra no span
    document.getElementById('media-type').innerText = mediaTypeTranslated;

    const backdropOverlay = document.getElementById('backdropOverlay');  

    fetch(creditsUrl)
    .then(response => response.json())
    .then(creditsData => {

        const castArray = creditsData.cast.slice(0,20);
        const castList = document.getElementById('cast-list');
        let castHtml = '';

        if(castArray && castArray.length > 0){
            let castHtml = '';
            
            castArray.forEach(cast => {
                const castName = cast.name;
                const castRole = cast.character;
                const castId = cast.id;
                
                const profileImg = cast.profile_path ? `https://image.tmdb.org/t/p/w500/${cast.profile_path}` : 'imagens/icon-cast.png'; // Avatar padrão se não houver imagem

                // Criação de um elemento HTML para cada ator, incluindo nome e imagem
                    castHtml += `
                    <div id="actorCard" class="actor-card" data-cast-name="${castName}" data-profile-img="${profileImg}" data-cast-id="${castId}">
                        <img src="${profileImg}" alt="${castName}" class="actor-img">
                        <div class="p-div">
                            <a href="https://www.google.com/search?q=${castName}" class="actor-name" target="_blank">${castName}</a>
                            <p class="actor-role">${castRole}</p>
                        </div>
                    </div>
                    `
                    ;
            })
            castList.innerHTML = castHtml;

            const actorCards = document.querySelectorAll('.actor-card');

            actorCards.forEach(card => {

                card.addEventListener('click', () => {
                    const castId = card.getAttribute('data-cast-id');
                    const params = new URLSearchParams({
                        personId: castId
                    })
                    window.location.href = `person.php?${params.toString()}`;
                })
            })
        } 
    })
    
    .finally(() => {
        waitForImages(document).then(() => {
            hideLoading(); // Esconde o spinner após tudo estar carregado
            window.history.replaceState({}, '', `filme.php?id=${movieId}&${mediaType}`);
        });
    });
})

const castList = document.getElementById('cast-list');
const castFade = document.getElementById('castFade');

function updateFadeVisibility() {
    const atEnd = castList.scrollLeft;

  if (atEnd) {
    castFade.classList.add('hidden');
  } else {
    castFade.classList.remove('hidden');
  }
}

// Verifica ao rolar
castList.addEventListener('scroll', updateFadeVisibility);

// Verifica ao carregar
window.addEventListener('load', updateFadeVisibility);

function gerarSlug(title) {
  if (!title || typeof title !== "string") return "";

  return title
    .replace(/&/g, "e")                     // troca & por e
    .normalize("NFD")                       // remove acentos
    .replace(/[\u0300-\u036f]/g, "")        // remove diacríticos
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")               // remove símbolos restantes
    .trim()
    .replace(/\s+/g, "-");                  // espaços viram hífens
}

document.getElementById('closeItem').addEventListener('click', function() {
    const modal = document.getElementById('actorDialog');
    modal.close();
});

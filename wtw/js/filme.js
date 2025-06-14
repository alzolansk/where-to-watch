document.addEventListener('DOMContentLoaded', async function() {
    showLoading();
    // Obtém os parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    let mediaType = params.get('mediaTp');
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

    const fetchDetailsById = async (id) => {
        const fetchData = async (type) => {
            const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=videos`;
            const response = await fetch(url);
            return { type, data: await response.json(), status: response.status };
        };

        let { type, data, status } = await fetchData('movie');
        if (status === 404 || data.success === false) {
            ({ type, data } = await fetchData('tv'));
        }
        return { type, data };
    };

    if (!title || !mediaType) {
        try {
            const { type, data } = await fetchDetailsById(movieId);
            mediaType = type;
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
      
    // Limpa a URL exibida após capturar todos os parâmetros
    window.history.replaceState({}, '', `http://localhost/WhereToWatch/wtw/filme.php?id=${movieId}`);

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
                    "amazon video": `https://www.amazon.com/s?k=${query}`,
                    "prime video": `https://www.primevideo.com/search?phrase=${query}`, 
                    "disney": `https://www.disneyplus.com/search?q=${query}`,
                    "max": `https://play.hbomax.com/search?q=${query}`,
                    "globoplay": `https://globoplay.globo.com/busca/?q=${query}`,
                    "paramount": `https://www.paramountplus.com/br/search/?keyword=${query}`,
                    "telecine": `https://globoplay.globo.com/busca/tudo/${query}/`,
                    "claro tv": `https://www.clarotvmais.com.br/busca?q=${query}`
                };

                const processProviders = (providerArray, targetArray) => {
                    if (!providerArray) return;

                    providerArray.forEach(provider => {
                        const name = provider.provider_name;
                        const providerName = name.toLowerCase();
                        let searchUrl = '';

                        if (providerName.includes("netflix") || providerName.includes("apple")) {
                            if (ticketSite && ticketSite.includes(providerName)) {
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
                            logo: `https://image.tmdb.org/t/p/w45${provider.logo_path}`,
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
                    html += streamingProviders.map(p => `
                        <a href="${p.url}" target="_blank" class="provider-tag">
                            <img src="${p.logo}" alt="${p.name}" class="logo-provider" />
                        </a>
                    `).join('');
                    html += '<span class="provider-type">Streaming</span>';
                }

                if (rentalProviders.length > 0) {
                    html += rentalProviders.map(p => `
                        <a href="${p.url}" target="_blank" class="provider-tag">
                            <img src="${p.logo}" alt="${p.name}" class="logo-provider" />
                        </a>
                    `).join('');
                    html += '<span class="provider-type">Aluguel</span>';
                }

                if (html) {
                    providersContainer.innerHTML = html;
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
            castArray.forEach(cast => {
                const castName = cast.name;
                const castRole = cast.character;

                const profileImg = cast.profile_path ? `https://image.tmdb.org/t/p/w500/${cast.profile_path}` : 'imagens/icon-cast.png'; // Avatar padrão se não houver imagem

                // Criação de um elemento HTML para cada ator, incluindo nome e imagem
                    castHtml += `
                    <div id="actorCard" class="actor-card" data-cast-name="${castName}" data-profile-img="${profileImg}">
                        <img src="${profileImg}" alt="${castName}" class="actor-img">
                        <div class="p-div">
                            <a href="https://www.google.com/search?q=${castName}" class="actor-name" target="_blank">${castName}</a>
                            <p class="actor-role">${castRole}</p>
                        </div>
                    </div>
                    `
                    ;
                
                castList.innerHTML = castHtml;

                
                const actorCards = document.querySelectorAll('.actor-card');
                actorCards.forEach(card => {

                    card.addEventListener('click', () => {
                        const castName = card.getAttribute('data-cast-name');
                        const profileImg = card.getAttribute('data-profile-img');
            
                        // Atualiza o modal com as informações do ator
                        document.getElementById('actorName').innerText = castName;
                        document.getElementById('actorPoster').src = profileImg;
            
                        const itemModal = document.getElementById('actorDialog');
                        itemModal.showModal();
                       
                    })

                })
            })
        } 
    })
    
    .finally(() => {
        hideLoading(); // Esconde o spinner após tudo estar carregado
        window.history.replaceState({}, '', `filme.php?id=${movieId}`);
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



document.getElementById('closeItem').addEventListener('click', function() {
    const modal = document.getElementById('actorDialog');
    modal.close();
});

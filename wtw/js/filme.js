document.addEventListener('DOMContentLoaded', function() {
    showLoading();
    // Obtém os parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const mediaType = params.get('mediaTp');

    const movieId = params.get('id');
    const creditsUrl = `https://api.themoviedb.org/3/${mediaType}/${movieId}/credits?api_key=${apiKey}&language=pt-BR&page=1`

    // Recupera os dados
    const title = params.get('title');
    const originalTitle = params.get('original_title');
    const genres = params.get('genres');
    const releaseDate = params.get('release_date');
    const imgUrl = params.get('imgUrl');
    const backdropUrl = params.get('backdropUrl');
    const trailerUrl = params.get('trailerUrl');
    const overview = params.get('overview');
    const providers = params.get('provider_name');
    const upcoming = params.get('itemFetch');

        //Verificação de upcoming
        if(upcoming){
            document.getElementById('providers').innerText = "Cinemas mais próximos de você!";
        } else{
            document.getElementById('providers').innerText = providers;
        }

        if(providers == null || providers.length < 1){
            const providerDiv = document.getElementById('providers');

            providerDiv.innerText = `Cinemas mais próximos de você!`;

            console.log('Provider oculto');
        } else{
            console.log(providers);
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
    document.getElementById('title-movie').innerText = `${title} - Where to Watch?`;
    document.getElementById('itemName').innerText = title;
    document.getElementById('genreMovie').innerText = `Gêneros: ${genres}`;
    document.getElementById('itemPoster').src = imgUrl;
    document.getElementById('backdropImage').src = backdropUrl;
    document.getElementById('trailer-link').href = trailerUrl;
    document.getElementById('movieOverview').innerText = overview;

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
                        console.log(profileImg);
            
                        // Atualiza o modal com as informações do ator
                        document.getElementById('actorName').innerText = castName;
                        document.getElementById('actorPoster').src = profileImg;
            
                        const itemModal = document.getElementById('actorDialog');
                        itemModal.showModal();
                       
                    })

                    console.log(providers);

                })
            })
        } 
    })
    .finally(() => {
        hideLoading(); // Esconde o spinner após tudo estar carregado
    });
})


document.getElementById('closeItem').addEventListener('click', function() {
    const modal = document.getElementById('actorDialog');
    modal.close();

});

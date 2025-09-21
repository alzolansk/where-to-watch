document.addEventListener('DOMContentLoaded', function() {
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

    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const params = new URLSearchParams(window.location.search);
    const person_id = params.get('personId');
    const personUrl = `https://api.themoviedb.org/3/person/${person_id}?api_key=${apiKey}&language=pt-BR&append_to_response=movie_credits`
    const mediasUrl = `https://api.themoviedb.org/3/person/${person_id}/movie_credits?api_key=${apiKey}&language=pt-BR`
    const taggedImages = `https://api.themoviedb.org/3/person/${person_id}/tagged_images?api_key${apiKey}`
    
    function definePersonConstants(personData, item) {
        const profileUrl = `https://image.tmdb.org/t/p/w500${personData.profile_path}`;
        return { profileUrl };
    }

    fetch(personUrl)
    .then(response => response.json())
    .then(personData => { 

        const personName = personData.name;
        const personProfession = personData.known_for_department;
        const personBio = personData.biography;
        const bioFirstParagraph = personBio.split('\n')[0];

        /*condicional*/
        const bioH3 = document.getElementById("bio-h3");
        const professionL1 = document.getElementById("profession-label-1");
        const professionL2 = document.getElementById("profession-label-2");
        const professionH1 = document.getElementById("person-profession-1");
        const professionH2 = document.getElementById("person-profession-2");

        if(!personBio | personBio.trim() == ""){
            bioH3.style.display = 'none';
            professionL1.style.display = 'block';
            professionH1.style.display = 'block';
            professionH2.style.display = 'none';
            professionL2.style.display = 'none';
        } else {
            bioH3.style.display = 'block';
        }

        const { profileUrl } = definePersonConstants(personData);

        document.getElementById("person-name").innerText = personName;
        document.getElementById("profession-label-1").innerText = personProfession;
        document.getElementById("profession-label-2").innerText = personProfession;
        document.getElementById("person-bio").innerText = bioFirstParagraph;
        document.getElementById("person-img").src = profileUrl;

        return fetch(mediasUrl)
        .then(response => response.json())
        .then(mediasData => {
            const credits = mediasData.cast;
            const showMovieBtn = document.getElementById('show-all-movies');
            const filteredCredits = credits.filter(item => item.release_date || item.first_air_date);

            const sortedByPopularity = [...filteredCredits].sort((a, b) => b.popularity - a.popularity);
            const topCredits = sortedByPopularity.slice(0, 5);
            if(topCredits.length < 5){
                showMovieBtn.style.display = 'none';
            }
            const topIds = new Set(topCredits.map(c => c.id));

            const sortedTopCredits = [...topCredits].sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });

            const sortedCredits = filteredCredits.sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });

            const remainingCredits = sortedCredits.filter(item => !topIds.has(item.id));

            const renderCard = async (item, containerId) => {
                const title = item.title || item.name;
                const year = (item.release_date || item.first_air_date || '').slice(0, 4);
                const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
                const imageUrl = `https://api.themoviedb.org/3/movie/${item.id}/images?api_key=${apiKey}`;

                const response = await fetch(imageUrl);
                const imageData = await response.json();
                const logos = (imageData.logos || []).filter(logo => logo && logo.iso_639_1 === "pt" && logo.file_path);
                const logoPath = logos[0] && logos[0].file_path;
                const logo = logoPath
                    ? `https://image.tmdb.org/t/p/w500${logoPath}`
                    : '';
                const type = 'movie';

                const card = document.createElement('div');
                card.classList.add('timeline-item');
                card.innerHTML = `
                    <div class="timeline-circle">
                        <img src="${poster}" alt="${title}" class="movie-poster" />
                        <img src="${logo}" class="movie-logo" />
                    </div>
                    <div class="p-timeline">
                        <p class="movie-name">${title}</p>
                        <span class="year-movie">${year}</span>
                    </div>
                `;
                document.getElementById(containerId).appendChild(card);
                card.addEventListener('click', () => {
                    const params = new URLSearchParams({
                        id: item.id,
                        mediaType: type
                    });
            
                    window.location.href = `filme.php?${params.toString()}`;
                });
            };

            const renderSequential = (creditsArray, containerId) => {
                return creditsArray.reduce((promise, credit) => {
                    return promise.then(() => renderCard(credit, containerId));
                }, Promise.resolve());
            };

            return renderSequential(sortedTopCredits, 'timeline-container')
                .then(() => renderSequential(remainingCredits, 'all-movies-list'));
        });
    })
    .finally(() => {
        waitForImages(document).then(() => {
            hideLoading();
            const interval = setInterval(() => {
            const items = document.querySelectorAll('.timeline-item');
            }, 200);
        });
    });
});

function renderTimelineCard(title, year, poster) {
    const card = document.createElement('div');
    card.classList.add('timeline-item');
    card.innerHTML = `
        <div class="timeline-circle">
            <img src="${poster}" alt="${title}" class="movie-poster" />
        </div>
        <p>${title}</p>
        <span>${year}</span>
    `;
    document.getElementById('timeline-container').appendChild(card);
}

document.getElementById('show-all-movies').addEventListener('click', () => {
    const modal = document.getElementById('moviesModal');
    const overlay = modal.querySelector('.overlay-modal');
    overlay.style.display = 'block';
    modal.showModal();
});

document.getElementById('closeMoviesModal').addEventListener('click', () => {
    const modal = document.getElementById('moviesModal');
    const overlay = modal.querySelector('.overlay-modal');
    modal.close();
    overlay.style.display = 'none';
});
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
        document.getElementById("person-profession-1").innerText = personProfession;
        document.getElementById("person-profession-2").innerText = personProfession;
        document.getElementById("person-bio").innerText = bioFirstParagraph;
        document.getElementById("person-img").src = profileUrl;

        return fetch(mediasUrl)
        .then(response => response.json())
        .then(mediasData => {
            const credits = mediasData.cast;
            const sortedCredits = credits
            .filter(item => item.release_date || item.first_air_date)
            //.filter(item => item.popularity > 3)
            .sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });

            // ✅ Use sortedCredits aqui
            const fetchPromises = sortedCredits.map(item => {
                const title = item.title || item.name;
                const year = (item.release_date || item.first_air_date || '').slice(0, 4);
                let poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
                const imageUrl = `https://api.themoviedb.org/3/movie/${item.id}/images?api_key=${apiKey}`;

                return fetch(imageUrl)
                    .then(response => response.json())
                    .then(imageData => {
                        const logos = (imageData.logos || []).filter(logo => logo && logo.iso_639_1 === "pt" && logo.file_path);
                        const logoPath = logos[0].file_path;
                        const logo = logoPath
                            ? `https://image.tmdb.org/t/p/w500${logoPath}`
                            : 'assets/img/logo-placeholder.png';
                        let type = 'movie';

                        const card = document.createElement('div');
                        card.classList.add('timeline-item');
                        card.innerHTML = `
                            <div class="timeline-circle">
                                <img src="${poster}" alt="${title}" class="movie-poster" />
                                <img src="${logo}" alt="${title} logo" class="movie-logo" />
                            </div>
                            <div class="p-timeline">
                                <p class="movie-name">${title}</p>
                                <span class="year-movie">${year}</span>
                            </div>
                        `;
                        document.getElementById('timeline-container').appendChild(card);
                        card.addEventListener('click', () => {
                            const params = new URLSearchParams({
                                id: item.id,
                                mediaType: type
                            });
                            window.location.href = `filme.php?${params.toString()}`;
                        });
                    });
            });
            return Promise.all(fetchPromises);
        });
    })
    .finally(() => {
        waitForImages(document).then(() => {
            hideLoading();
            const interval = setInterval(() => {
            const items = document.querySelectorAll('.timeline-item');
            if (items.length > 1) {
                clearInterval(interval);
                drawTimelineCurve();
            }
            }, 1000);
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


function drawTimelineCurve() {
    const container = document.getElementById('timeline-container');
    const items = container.querySelectorAll('.timeline-item');
    console.log("🎯 Quantidade de .timeline-item:", items.length);
    if (items.length < 2) {
        console.warn("⚠️ Poucos itens para desenhar a linha.");
        return;
    }
    console.log("🚨 drawTimelineCurve foi chamada!");

    let svg = document.getElementById('timeline-curve');

    if (!svg) return;

    const firstCircle = items[0].querySelector('.timeline-circle');
    const baseline = firstCircle.offsetTop + firstCircle.offsetHeight / 2;
    const totalWidth = container.scrollWidth;
    const amplitude = 40;

    svg.setAttribute('width', totalWidth);
    svg.setAttribute('height', baseline + amplitude + 10);

    let pathData = `M ${items[0].offsetLeft + items[0].offsetWidth / 2} ${baseline}`;
    let direction = 1;

    for (let i = 1; i < items.length; i++) {
        const prevCenter = items[i - 1].offsetLeft + items[i - 1].offsetWidth / 2;
        const currCenter = items[i].offsetLeft + items[i].offsetWidth / 2;
        const midX = (prevCenter + currCenter) / 2;
        const cpY = baseline + amplitude * direction;
        pathData += ` C ${midX} ${cpY}, ${midX} ${cpY}, ${currCenter} ${baseline}`;
        direction *= -1;
    }

    let path = svg.querySelector('path');
    if (!path) {
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.appendChild(path);
    }
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#ff0f0f');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
}
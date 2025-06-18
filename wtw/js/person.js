document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const params = new URLSearchParams(window.location.search);
    const person_id = params.get('personId');
    const personUrl = `https://api.themoviedb.org/3/person/${person_id}?api_key=${apiKey}&language=pt-BR&append_to_response=movie_credits`
    const mediasUrl = `https://api.themoviedb.org/3/person/${person_id}/movie_credits?api_key=${apiKey}&language=pt-BR`

    function definePersonConstants(personData) {
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
        if(!personBio | personBio.trim() == ""){
            bioH3.style.display = 'none';
        } else {
            bioH3.style.display = 'block';
        }

        const { profileUrl } = definePersonConstants(personData);

        document.getElementById("person-name").innerText = personName;
        document.getElementById("person-profession").innerText = personProfession;
        document.getElementById("person-bio").innerText = bioFirstParagraph;
        document.getElementById("person-img").src = profileUrl;

        fetch(mediasUrl)
        .then(response => response.json())
        .then(mediasData => {
            const credits = mediasData.cast;
            const sortedCredits = credits
            .filter(item => item.release_date || item.first_air_date)
            .filter(item => item.popularity > 3)
            .sort((a, b) => {
                const dateA = new Date(a.release_date || a.first_air_date);
                const dateB = new Date(b.release_date || b.first_air_date);
                return dateA - dateB;
            });

            // ✅ Use sortedCredits aqui
            sortedCredits.forEach(item => {
                const title = item.title || item.name;
                const year = (item.release_date || item.first_air_date || '').slice(0, 4);
                const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
                const type = item.media_type;
                console.log(item.popularity);
                // Exemplo: renderizar na timeline
                const card = document.createElement('div');
                card.classList.add('timeline-item');
                card.innerHTML = `
                    <img src="${poster}" alt="${title}" />
                    <p>${title}</p>
                    <span>${year}</span>
                `;
                document.getElementById('timeline-container').appendChild(card);
            });
        });
    });
})
document.addEventListener('DOMContentLoaded', () => {
    const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c';
    const searchInput = document.getElementById('searchmovie');
    const resultsContainer = document.getElementById('results');
    if (!searchInput || !resultsContainer) return;

    const fetchJson = url => fetch(url).then(r => r.json());

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1&sort_by=popularity.desc`;
            fetchJson(url)
                .then(data => {
                    resultsContainer.innerHTML = '';
                    if (data.results && data.results.length > 0) {
                        data.results.forEach(item => {
                            if (item.media_type === 'movie' || item.media_type === 'tv') {
                                const title = item.title || item.name;
                                const imgUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
                                const div = document.createElement('div');
                                div.innerHTML = `
                                    <div class="resultsDiv">
                                        <img src="${imgUrl}" alt="${title}">
                                        <div class="movie-info"><h3>${title}</h3></div>
                                    </div>`;
                                div.addEventListener('click', () => {
                                    const params = new URLSearchParams({ id: item.id, mediaTp: item.media_type });
                                    window.location.href = `filme.php?${params.toString()}`;
                                });
                                resultsContainer.appendChild(div);
                            }
                        });
                        resultsContainer.style.display = 'block';
                    } else {
                        resultsContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>';
                        resultsContainer.style.display = 'block';
                    }
                })
                .catch(err => console.error('Erro:', err));
        } else {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
        }
    });
});
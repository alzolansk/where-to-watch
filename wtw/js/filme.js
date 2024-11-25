// Obtém os parâmetros da URL
const params = new URLSearchParams(window.location.search);

// Recupera os dados
const title = params.get('title');
const originalTitle = params.get('original_title');
const genres = params.get('genres');
const releaseDate = params.get('release_date');
const imgUrl = params.get('imgUrl');
const backdropUrl = params.get('backdropUrl');
const trailerUrl = params.get('trailerUrl');
const overview = params.get('overview');

// Atualiza o conteúdo da página
document.getElementById('itemName').innerText = title;
document.getElementById('genreMovie').innerText = `Gêneros: ${genres}`;
document.getElementById('release-date').innerText = `Lançamento: ${releaseDate}`;
document.getElementById('itemPoster').src = imgUrl;
document.getElementById('backdropImage').src = backdropUrl;
document.getElementById('trailer-link').href = trailerUrl;
document.getElementById('movieOverview').innerText = overview;


const overlay = document.querySelector('.overlay');
//overlayModal.style.display = 'block'; // Torna a overlay visível 



const buttonClose = document.getElementById("close-trailer");
const trailerDialog = document.getElementById('dialog');
const trailerFrame = document.getElementById('trailerFrame');

function mudaFoto (foto){
   document.getElementById('trailer').src = foto
}

function senhaError (senha){
   document.getElementById('senha')
   document.getElementById('confirma_senha')

   senha = 'senha'
   confirmasenha = 'confirma_senha'

   if(senha !== confirmasenha){
      print('Senhas incorretas')
   }
}

//Funções dos Trailers
function showTrailer(trailerUrl) {
    if (!trailerDialog || !trailerFrame) {
        return;
    }

    const url = (trailerUrl || trailerFrame.dataset.trailerUrl || '').trim();
    if (!url) {
        return;
    }

    trailerFrame.dataset.trailerUrl = url;
    trailerFrame.src = url.replace('watch?v=', 'embed/');
    trailerDialog.showModal();
    trailerDialog.classList.add('show');
}

function closeTrailer() {
    if (!trailerDialog || !trailerFrame) {
        return;
    }

    trailerDialog.close();
    trailerFrame.src = '';
    trailerDialog.classList.remove('show');
}

if (buttonClose) {
    buttonClose.addEventListener('click', closeTrailer);
}

//Função setinhas de navegação
function scrollToNextItem(direction = 'right') {
    const items = document.querySelectorAll('.backdropContainer');
    const wrap = document.querySelector('.container-wrap');
    const activeIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

    let nextIndex = direction === 'right' ? activeIndex + 1 : activeIndex - 1;

    // Garante que o índice fique no intervalo permitido
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= items.length) nextIndex = items.length - 1;

    // Remove classe 'active' de todos e adiciona no novo item
    items.forEach(item => item.classList.remove('active'));
    const targetItem = items[nextIndex];
    targetItem.classList.add('active');

    // Centraliza o novo item no contêiner
    const itemOffset = targetItem.offsetLeft;
    const containerCenter = (wrap.clientWidth / 2) - (targetItem.clientWidth / 2);
    wrap.scrollTo({
        left: itemOffset - containerCenter,
        behavior: 'smooth'
    });
}

// Atalhos para usar nos botões de seta
function scrollLeftCustom() {
    scrollToNextItem('left');
}

function scrollRight() {
    scrollToNextItem('right');
}


/* Menu */
document.getElementById('menuIcon').addEventListener('click', function(){
   const menu = document.getElementById('menu-buttons');

   if(menu.classList.contains('hidden-menu')) {
      menu.classList.remove('hidden-menu');
      menu.classList.add('active-menu');
   } else {
      menu.classList.remove('active-menu');
      menu.classList.add('hidden-menu')
   }
})

let isMenuOpen = false;

function toggleMenu() {
    const menuIcon = document.getElementById('menuIcon');
    
    if (isMenuOpen) {
        menuIcon.src = 'imagens/menu-icon.png';
    } else {
        menuIcon.src = 'imagens/close-menu.png';
    }

    // Alterna o estado do menu
    isMenuOpen = !isMenuOpen;
}

//Carregando...
function showLoading() {
   document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
   document.getElementById('loading').style.display = 'none';
}

function scrollRow(containerId, direction = 'right') {
    const row = document.getElementById(containerId);
    if (!row) return;
    const distance = row.clientWidth;
    const offset = direction === 'right' ? distance : -distance;
    row.scrollBy({ left: offset, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.slider-prev').forEach(btn => {
        btn.addEventListener('click', () => {
            scrollRow(btn.dataset.target, 'left');
        });
    });
    document.querySelectorAll('.slider-next').forEach(btn => {
        btn.addEventListener('click', () => {
            scrollRow(btn.dataset.target, 'right');
        });
    });
});


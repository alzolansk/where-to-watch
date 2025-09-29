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

//Funcoes dos Trailers
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

//Funcao setinhas de navegacao
function scrollToNextItem(direction = 'right') {
    const items = document.querySelectorAll('.backdropContainer');
    if (!items.length) {
        return;
    }

    const getState = typeof window.__wtwGetBackdropCount === 'function' && typeof window.__wtwGetActiveBackdropIndex === 'function'
        ? { count: window.__wtwGetBackdropCount(), active: window.__wtwGetActiveBackdropIndex() }
        : null;

    let activeIndex = getState ? getState.active : Array.from(items).findIndex(item => item.classList.contains('active'));
    if (activeIndex < 0) {
        activeIndex = 0;
    }

    let nextIndex = direction === 'right' ? activeIndex + 1 : activeIndex - 1;

    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= items.length) nextIndex = items.length - 1;

    if (typeof window.__wtwSetActiveBackdrop === 'function') {
        window.__wtwSetActiveBackdrop(nextIndex);
        return;
    }

    const wrap = document.querySelector('.container-wrap');
    items.forEach(item => item.classList.remove('active'));
    const targetItem = items[nextIndex];
    targetItem.classList.add('active');

    if (!wrap) {
        return;
    }

    const itemOffset = targetItem.offsetLeft;
    const containerCenter = (wrap.clientWidth / 2) - (targetItem.clientWidth / 2);
    wrap.scrollTo({
        left: itemOffset - containerCenter,
        behavior: 'smooth'
    });
}

// Atalhos para usar nos botoes de seta
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
function getLoadingOverlay() {
    return document.getElementById('loadingOverlay') || document.getElementById('loading');
}

function toggleLoadingOverlay(isVisible) {
    const overlay = getLoadingOverlay();
    if (!overlay) {
        return;
    }
    overlay.classList.toggle('is-hidden', !isVisible);
    overlay.setAttribute('aria-hidden', String(!isVisible));
}

function showLoading() {
    toggleLoadingOverlay(true);
}

function hideLoading() {
    toggleLoadingOverlay(false);
}

function updateCarouselNav(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    const prevBtn = document.querySelector('.slider-prev[data-target="' + containerId + '"]');
    const nextBtn = document.querySelector('.slider-next[data-target="' + containerId + '"]');
    if (!prevBtn && !nextBtn) {
        return;
    }
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth - 1);
    if (maxScroll <= 0) {
        if (prevBtn) prevBtn.classList.add('is-hidden');
        if (nextBtn) nextBtn.classList.add('is-hidden');
        return;
    }
    const atStart = container.scrollLeft <= 0;
    const atEnd = container.scrollLeft >= maxScroll;
    if (prevBtn) prevBtn.classList.toggle('is-hidden', atStart);
    if (nextBtn) nextBtn.classList.toggle('is-hidden', atEnd);
}

window.updateCarouselNav = updateCarouselNav;

function scrollRow(containerId, direction = 'right') {
    const row = document.getElementById(containerId);
    if (!row) return;
    const distance = row.clientWidth;
    const offset = direction === 'right' ? distance : -distance;
    row.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(() => updateCarouselNav(containerId), 320);
}

document.addEventListener('DOMContentLoaded', () => {
    const trackedContainers = new Set();

    document.querySelectorAll('.slider-prev').forEach(btn => {
        const target = btn.dataset.target;
        btn.addEventListener('click', () => {
            scrollRow(target, 'left');
        });
        if (target) {
            trackedContainers.add(target);
        }
    });

    document.querySelectorAll('.slider-next').forEach(btn => {
        const target = btn.dataset.target;
        btn.addEventListener('click', () => {
            scrollRow(target, 'right');
        });
        if (target) {
            trackedContainers.add(target);
        }
    });

    trackedContainers.forEach(id => {
        const container = document.getElementById(id);
        if (!container) {
            return;
        }
        const update = () => updateCarouselNav(id);
        container.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        requestAnimationFrame(update);
    });
});



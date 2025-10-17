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
let closeMenuDropdowns = () => {};
const menuTrigger = document.querySelector('.menu-trigger');
const menuPanel = document.getElementById('menu-buttons');
const menuIcon = document.getElementById('menuIcon');
const menuViewportQuery = window.matchMedia('(max-width: 760px)');
let isMenuOpen = false;

function syncMenuState() {
    if (!menuPanel || !menuTrigger || !menuIcon) {
        return;
    }

    if (!menuViewportQuery.matches) {
        closeMenuDropdowns();
        menuPanel.classList.remove('hidden-menu');
        menuPanel.classList.remove('active-menu');
        menuPanel.removeAttribute('aria-hidden');
        menuTrigger.setAttribute('aria-expanded', 'false');
        menuIcon.src = 'imagens/menu-icon.png';
        isMenuOpen = false;
        return;
    }

    menuPanel.classList.toggle('active-menu', isMenuOpen);
    menuPanel.classList.toggle('hidden-menu', !isMenuOpen);
    menuPanel.setAttribute('aria-hidden', isMenuOpen ? 'false' : 'true');
    menuTrigger.setAttribute('aria-expanded', isMenuOpen ? 'true' : 'false');
    menuIcon.src = isMenuOpen ? 'imagens/close-menu.png' : 'imagens/menu-icon.png';
}

function toggleMenu(forceState) {
    if (!menuPanel || !menuTrigger || !menuIcon) {
        return;
    }

    if (!menuViewportQuery.matches) {
        return;
    }

    if (typeof forceState === 'boolean') {
        isMenuOpen = forceState;
    } else {
        isMenuOpen = !isMenuOpen;
    }

    syncMenuState();

    if (!isMenuOpen) {
        closeMenuDropdowns();
    }
}

if (menuTrigger && menuPanel && menuIcon) {
    syncMenuState();

    const handleViewportChange = () => {
        syncMenuState();
    };

    if (typeof menuViewportQuery.addEventListener === 'function') {
        menuViewportQuery.addEventListener('change', handleViewportChange);
    } else if (typeof menuViewportQuery.addListener === 'function') {
        menuViewportQuery.addListener(handleViewportChange);
    }

    menuTrigger.addEventListener('click', (event) => {
        event.preventDefault();
        toggleMenu();
    });

    menuTrigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleMenu();
        }
    });

    document.addEventListener('click', (event) => {
        if (!menuViewportQuery.matches) {
            return;
        }

        if (!menuPanel.contains(event.target) && !menuTrigger.contains(event.target) && isMenuOpen) {
            closeMenuDropdowns();
            toggleMenu(false);
        }
    });
}

const menuDropdownNodes = Array.from(document.querySelectorAll('[data-menu-dropdown]'));
if (menuDropdownNodes.length) {
    const hoverMediaQuery = window.matchMedia('(hover: hover)');

    const controllers = menuDropdownNodes
        .map((node) => {
            if (!node) {
                return null;
            }

            const trigger = node.querySelector('[data-dropdown-trigger]');
            const menu = node.querySelector('[data-dropdown-menu]');
            if (!trigger || !menu) {
                return null;
            }

            return {
                node,
                trigger,
                menu,
                isOpen: false,
                hoverTimer: null
            };
        })
        .filter(Boolean);

    const setDropdownState = (controller, state) => {
        if (!controller) {
            return;
        }

        const nextState = Boolean(state);
        if (controller.isOpen === nextState && controller.node.classList.contains('is-open') === nextState) {
            controller.trigger.setAttribute('aria-expanded', nextState ? 'true' : 'false');
            controller.menu.setAttribute('aria-hidden', nextState ? 'false' : 'true');
            return;
        }

        controller.isOpen = nextState;
        controller.node.classList.toggle('is-open', nextState);
        controller.trigger.setAttribute('aria-expanded', nextState ? 'true' : 'false');
        controller.menu.setAttribute('aria-hidden', nextState ? 'false' : 'true');
    };

    const openDropdown = (controller) => {
        if (controller.hoverTimer) {
            clearTimeout(controller.hoverTimer);
            controller.hoverTimer = null;
        }
        controllers.forEach((other) => {
            if (other !== controller) {
                setDropdownState(other, false);
            }
        });
        setDropdownState(controller, true);
    };

    const closeDropdown = (controller) => {
        if (controller.hoverTimer) {
            clearTimeout(controller.hoverTimer);
            controller.hoverTimer = null;
        }
        setDropdownState(controller, false);
    };

    closeMenuDropdowns = () => {
        controllers.forEach((controller) => {
            closeDropdown(controller);
        });
    };

    controllers.forEach((controller) => {
        const { node, trigger, menu } = controller;

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            if (controller.isOpen) {
                closeDropdown(controller);
            } else {
                openDropdown(controller);
            }
        });

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (controller.isOpen) {
                    closeDropdown(controller);
                } else {
                    openDropdown(controller);
                }
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!controller.isOpen) {
                    openDropdown(controller);
                }
                const firstFocusable = menu.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown(controller);
                trigger.focus();
            }
        });

        menu.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDropdown(controller);
                trigger.focus();
            }
        });

        if (typeof hoverMediaQuery.addEventListener === 'function') {
            hoverMediaQuery.addEventListener('change', () => {
                if (!hoverMediaQuery.matches) {
                    closeDropdown(controller);
                }
            });
        }

        const handlePointerEnter = () => {
            if (!hoverMediaQuery.matches) {
                return;
            }
            if (controller.hoverTimer) {
                clearTimeout(controller.hoverTimer);
                controller.hoverTimer = null;
            }
            openDropdown(controller);
        };

        const handlePointerLeave = () => {
            if (!hoverMediaQuery.matches) {
                return;
            }
            if (controller.hoverTimer) {
                clearTimeout(controller.hoverTimer);
            }
            controller.hoverTimer = setTimeout(() => {
                closeDropdown(controller);
            }, 80);
        };

        node.addEventListener('pointerenter', handlePointerEnter);
        node.addEventListener('pointerleave', handlePointerLeave);
    });

    document.addEventListener('click', (event) => {
        controllers.forEach((controller) => {
            if (controller.isOpen && !controller.node.contains(event.target)) {
                closeDropdown(controller);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') {
            return;
        }

        let handled = false;
        controllers.forEach((controller) => {
            if (controller.isOpen) {
                closeDropdown(controller);
                if (!handled) {
                    controller.trigger.focus();
                    handled = true;
                }
            }
        });
    });
}

/* User account menu */
const userAccountMenu = document.querySelector('[data-user-menu]');
if (userAccountMenu) {
    const userAccountTrigger = userAccountMenu.querySelector('.user-account__trigger');
    const userAccountDropdown = userAccountMenu.querySelector('.user-account__dropdown');
    let isUserAccountOpen = false;

    const setAccountMenuState = (state) => {
        isUserAccountOpen = state;
        userAccountMenu.classList.toggle('user-account--open', isUserAccountOpen);

        if (userAccountTrigger) {
            userAccountTrigger.setAttribute('aria-expanded', isUserAccountOpen ? 'true' : 'false');
        }

        if (userAccountDropdown) {
            userAccountDropdown.setAttribute('aria-hidden', isUserAccountOpen ? 'false' : 'true');
        }
    };

    const toggleAccountMenu = (forceState) => {
        const nextState = typeof forceState === 'boolean' ? forceState : !isUserAccountOpen;
        setAccountMenuState(nextState);
    };

    if (userAccountTrigger) {
        userAccountTrigger.addEventListener('click', (event) => {
            event.preventDefault();
            toggleAccountMenu();
        });

        userAccountTrigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleAccountMenu();
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (!userAccountMenu.contains(event.target) && isUserAccountOpen) {
            toggleAccountMenu(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isUserAccountOpen) {
            toggleAccountMenu(false);
            if (userAccountTrigger) {
                userAccountTrigger.focus();
            }
        }
    });
}
//Carregando...
const loadingOverlayPlacement = {
    originalParent: null,
    originalNextSibling: null,
    isMountedInSection: false
};

function getLoadingOverlay() {
    return document.getElementById('loadingOverlay') || document.getElementById('loading');
}

function getMediaSectionHost() {
    return document.querySelector('.media-section .container') || document.querySelector('.media-section');
}

function mountOverlayInMediaSection(overlay) {
    if (!overlay) {
        return;
    }

    const host = getMediaSectionHost();
    if (!host) {
        return;
    }

    if (!loadingOverlayPlacement.originalParent) {
        loadingOverlayPlacement.originalParent = overlay.parentNode;
        loadingOverlayPlacement.originalNextSibling = overlay.nextSibling;
    }

    if (overlay.parentNode !== host) {
        host.appendChild(overlay);
    }

    overlay.classList.add('loading-overlay--section');
    loadingOverlayPlacement.isMountedInSection = true;
}

function restoreOverlayPlacement(overlay) {
    if (!overlay || !loadingOverlayPlacement.isMountedInSection) {
        return;
    }

    overlay.classList.remove('loading-overlay--section');

    const { originalParent, originalNextSibling } = loadingOverlayPlacement;
    const targetParent = (originalParent && originalParent.isConnected) ? originalParent : document.body;
    if (targetParent) {
        const referenceNode = targetParent === originalParent ? (originalNextSibling || null) : null;
        targetParent.insertBefore(overlay, referenceNode);
    }

    loadingOverlayPlacement.isMountedInSection = false;
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
    const overlay = getLoadingOverlay();
    if (overlay) {
        mountOverlayInMediaSection(overlay);
    }
    toggleLoadingOverlay(true);
}

function hideLoading() {
    const overlay = getLoadingOverlay();
    toggleLoadingOverlay(false);
    if (overlay) {
        restoreOverlayPlacement(overlay);
    }
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

const carouselRegistry = new Map();

function registerCarouselContainer(containerId) {
    if (!containerId) {
        return;
    }
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    if (!carouselRegistry.has(containerId)) {
        const handler = () => updateCarouselNav(containerId);
        container.addEventListener('scroll', handler, { passive: true });
        window.addEventListener('resize', handler);
        carouselRegistry.set(containerId, handler);
    }

    requestAnimationFrame(() => updateCarouselNav(containerId));
}

function initializeCarouselNav() {
    const targets = new Set();
    document.querySelectorAll('.slider-prev, .slider-next').forEach(btn => {
        if (btn.dataset && btn.dataset.target) {
            targets.add(btn.dataset.target);
        }
    });
    targets.forEach(registerCarouselContainer);
}

window.registerCarouselContainer = registerCarouselContainer;
window.initializeCarouselNav = initializeCarouselNav;

function scrollRow(containerId, direction = 'right') {
    const row = document.getElementById(containerId);
    if (!row) return;
    registerCarouselContainer(containerId);
    const distance = row.clientWidth;
    const offset = direction === 'right' ? distance : -distance;
    row.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(() => updateCarouselNav(containerId), 320);
}

document.addEventListener('click', event => {
    const button = event.target.closest('.slider-prev, .slider-next');
    if (!button) {
        return;
    }
    const target = button.dataset ? button.dataset.target : null;
    if (!target) {
        return;
    }
    event.preventDefault();
    const direction = button.classList.contains('slider-prev') ? 'left' : 'right';
    scrollRow(target, direction === 'left' ? 'left' : 'right');
});

function initProviderShortcut() {
    const picker = document.querySelector('[data-provider-picker]');
    if (!picker) {
        return;
    }

    const catalogPath = picker.dataset.catalogUrl || 'providers.php';

    picker.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-provider-id]');
        if (!button) {
            return;
        }

        event.preventDefault();

        const providerId = button.dataset.providerId;
        if (!providerId) {
            return;
        }
        const providerName = (button.dataset.providerName || '').trim();

        const pathname = window.location.pathname || '/';
        const baseDir = pathname.replace(/[^/]*$/, '');
        const normalizedPath = catalogPath.startsWith('/')
            ? catalogPath
            : `${baseDir}${catalogPath.replace(/^\//, '')}`;
        const url = new URL(normalizedPath, window.location.origin);
        url.searchParams.set('providers', providerId);
        if (providerName) {
            url.searchParams.set('label', providerName);
        }
        window.location.assign(url.toString());
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeCarouselNav();
    initProviderShortcut();
});

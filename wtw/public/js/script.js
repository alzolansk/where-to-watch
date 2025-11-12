// ========== SCRIPT PRINCIPAL DO WHERETOWATCH ==========
// Gerencia trailers, navegação, menus e funcionalidades principais da aplicação

// ========== CONFIGURAÇÃO DO MODAL DE TRAILER ==========

const buttonClose = document.getElementById("close-trailer");
const trailerDialog = document.getElementById('dialog');
const trailerFrame = document.getElementById('trailerFrame');

const TRAILER_FOCUSABLE_SELECTORS = [
    'a[href]','area[href]','button:not([disabled])','input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])','textarea:not([disabled])','iframe','[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
].join(', ');

let trailerLastFocusedElement = null;
let isTrailerFocusTrapBound = false;
let bodyScrollRestoreState = null;
const requestTrailerAnimationFrame = (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function')
    ? window.requestAnimationFrame.bind(window)
    : (callback) => setTimeout(callback, 0);
let trailerCloseFallbackTimeout = null;

// ========== FUNÇÕES DE MANIPULAÇÃO DO YOUTUBE ==========

// Remove caracteres não válidos do ID do YouTube
function sanitizeYouTubeId(rawId) {
    if (!rawId) {
        return '';
    }
    const cleaned = String(rawId)
        .trim()
        .replace(/^embed\//i, '')
        .replace(/^v\//i, '')
        .replace(/[^0-9A-Za-z_-]/g, '');
    if (!cleaned) {
        return '';
    }
    return cleaned.length > 11 ? cleaned.slice(0, 11) : cleaned;
}

// Extrai ID do YouTube de diversos formatos de URL
function getYouTubeId(inputUrl) {
    if (!inputUrl) {
        return '';
    }

    let candidate = String(inputUrl).trim();
    if (!candidate) {
        return '';
    }

    if (/^[0-9A-Za-z_-]{11}$/.test(candidate)) {
        return sanitizeYouTubeId(candidate);
    }

    try {
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
            const trimmedCandidate = candidate.replace(/^\/+/, '');
            const lowerCandidate = trimmedCandidate.toLowerCase();
            if (lowerCandidate.startsWith('watch?') || lowerCandidate.startsWith('watch/')) {
                candidate = `https://www.youtube.com/${trimmedCandidate}`;
            } else if (lowerCandidate.startsWith('embed/')) {
                candidate = `https://www.youtube.com/${trimmedCandidate}`;
            } else if (lowerCandidate.startsWith('shorts/')) {
                candidate = `https://www.youtube.com/${trimmedCandidate}`;
            } else if (lowerCandidate.startsWith('youtu.be/')) {
                candidate = `https://${trimmedCandidate}`;
            } else {
                candidate = `https://${trimmedCandidate}`;
            }
        }
        const parsedUrl = new URL(candidate);
        const hostname = (parsedUrl.hostname || '').toLowerCase();
        const normalizedHost = hostname.startsWith('www.') ? hostname.slice(4) : hostname;

        if (normalizedHost === 'youtu.be') {
            const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
            return sanitizeYouTubeId(pathSegments[0] || '');
        }

        if (!normalizedHost.endsWith('youtube.com')) {
            return '';
        }

        const searchId = sanitizeYouTubeId(parsedUrl.searchParams.get('v'));
        if (searchId) {
            return searchId;
        }

        const path = parsedUrl.pathname || '';
        const embedMatch = path.match(/\/embed\/([^/?]+)/i);
        if (embedMatch) {
            return sanitizeYouTubeId(embedMatch[1]);
        }

        const shortsMatch = path.match(/\/shorts\/([^/?]+)/i);
        if (shortsMatch) {
            return sanitizeYouTubeId(shortsMatch[1]);
        }

        return '';
    } catch (error) {
        return '';
    }
}

// ========== GESTÃO DE FOCO NO MODAL ==========

// Obtém elementos focáveis dentro do modal de trailer
function getFocusableElements(container) {
    if (!container) {
        return [];
    }
    return Array.from(container.querySelectorAll(TRAILER_FOCUSABLE_SELECTORS)).filter(element => {
        if (!element || typeof element.focus !== 'function') {
            return false;
        }
        if (element.hasAttribute('disabled')) {
            return false;
        }
        const ariaHidden = element.getAttribute('aria-hidden');
        if (ariaHidden === 'true') {
            return false;
        }
        return true;
    });
}

function handleTrailerKeydown(event) {
    if (!trailerDialog || event.key !== 'Tab') {
        return;
    }

    const focusable = getFocusableElements(trailerDialog);
    if (!focusable.length) {
        event.preventDefault();
        if (typeof trailerDialog.focus === 'function') {
            trailerDialog.focus();
        }
        return;
    }

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
        if (activeElement === firstElement || !trailerDialog.contains(activeElement)) {
            event.preventDefault();
            lastElement.focus();
        }
        return;
    }

    if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
}

function bindTrailerFocusTrap() {
    if (!trailerDialog || isTrailerFocusTrapBound) {
        return;
    }
    trailerDialog.addEventListener('keydown', handleTrailerKeydown);
    isTrailerFocusTrapBound = true;
}

function unbindTrailerFocusTrap() {
    if (!trailerDialog || !isTrailerFocusTrapBound) {
        return;
    }
    trailerDialog.removeEventListener('keydown', handleTrailerKeydown);
    isTrailerFocusTrapBound = false;
}

function focusTrailerDialog() {
    if (!trailerDialog) {
        return;
    }
    const autofocusElement = trailerDialog.querySelector('[data-dialog-initial-focus]');
    const focusable = getFocusableElements(trailerDialog);
    const fallbackElement = buttonClose && trailerDialog.contains(buttonClose) ? buttonClose : focusable[0];
    const target = autofocusElement || fallbackElement || trailerDialog;

    requestTrailerAnimationFrame(() => {
        if (typeof target.focus === 'function') {
            target.focus();
        }
    });
}

function lockBodyScroll() {
    if (bodyScrollRestoreState || !document || !document.body) {
        return;
    }
    const { body } = document;
    bodyScrollRestoreState = {
        overflow: body.style.overflow,
        hadClass: body.classList.contains('trailer-modal-open')
    };
    body.style.overflow = 'hidden';
    body.classList.add('trailer-modal-open');
}

function unlockBodyScroll() {
    if (!document || !document.body) {
        bodyScrollRestoreState = null;
        return;
    }

    const { body } = document;

    if (bodyScrollRestoreState) {
        body.style.overflow = bodyScrollRestoreState.overflow || '';
        if (!bodyScrollRestoreState.hadClass) {
            body.classList.remove('trailer-modal-open');
        }
    } else {
        body.style.overflow = '';
        body.classList.remove('trailer-modal-open');
    }

    bodyScrollRestoreState = null;
}

function clearTrailerCloseFallback() {
    if (trailerCloseFallbackTimeout) {
        clearTimeout(trailerCloseFallbackTimeout);
        trailerCloseFallbackTimeout = null;
    }
}

function handleTrailerDialogClose() {
    if (!trailerDialog) {
        return;
    }
    unbindTrailerFocusTrap();
    clearTrailerCloseFallback();
    trailerDialog.classList.remove('is-closing');
    trailerDialog.classList.remove('show');
    if (trailerFrame) {
        trailerFrame.removeAttribute('src');
    }
    unlockBodyScroll();
    if (trailerLastFocusedElement && typeof trailerLastFocusedElement.focus === 'function') {
        trailerLastFocusedElement.focus();
    }
    trailerLastFocusedElement = null;
}

// ========== VALIDAÇÃO DE SENHAS ==========

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LETTER_REGEX = /[A-Za-z]/;
const PASSWORD_DIGIT_REGEX = /\d/;

// Altera foto de fundo ou thumb do trailer
function mudaFoto(foto) {
    document.getElementById('trailer').src = foto;
}

// Obtém elementos relacionados à validação de senha
function getPasswordElements() {
    const passwordInput = document.querySelector('#password') || document.querySelector('#senha');
    const confirmInput = document.querySelector('#confirmPassword') || document.querySelector('#confirma_senha');
    const errorElement = document.getElementById('passwordError');

    return {
        passwordInput,
        confirmInput,
        errorElement
    };
}

// Valida senha com critérios de segurança
function validatePassword() {
    const { passwordInput, confirmInput, errorElement } = getPasswordElements();

    if (!passwordInput) {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.hidden = true;
        }
        return true;
    }

    const passwordValue = (passwordInput.value || '').trim();
    const confirmValue = confirmInput ? (confirmInput.value || '').trim() : '';

    const errors = [];
    let focusTarget = null;

    if (passwordValue.length < PASSWORD_MIN_LENGTH) {
        errors.push('A senha deve ter pelo menos 8 caracteres.');
        focusTarget = focusTarget || passwordInput;
    }

    if (!PASSWORD_LETTER_REGEX.test(passwordValue) || !PASSWORD_DIGIT_REGEX.test(passwordValue)) {
        errors.push('A senha deve conter letras e números.');
        focusTarget = focusTarget || passwordInput;
    }

    if (confirmInput && passwordValue !== confirmValue) {
        errors.push('A confirmação não confere.');
        focusTarget = focusTarget || confirmInput;
    }

    if (errors.length) {
        if (errorElement) {
            errorElement.textContent = errors[0];
            errorElement.hidden = false;
        }
        (focusTarget || passwordInput).focus();
        return false;
    }

    if (errorElement) {
        errorElement.textContent = '';
        errorElement.hidden = true;
    }

    return true;
}

function setupPasswordValidation() {
    const { passwordInput, confirmInput, errorElement } = getPasswordElements();

    if (!passwordInput || !confirmInput) {
        return;
    }

    const forms = new Set();
    if (passwordInput.form) {
        forms.add(passwordInput.form);
    }
    if (confirmInput.form) {
        forms.add(confirmInput.form);
    }

    const handleSubmit = (event) => {
        if (!validatePassword()) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    forms.forEach((form) => {
        form.addEventListener('submit', handleSubmit);
    });

    const clearErrorMessage = () => {
        if (!errorElement || errorElement.hidden) {
            return;
        }
        errorElement.textContent = '';
        errorElement.hidden = true;
    };

    [passwordInput, confirmInput].forEach((input) => {
        if (!input) {
            return;
        }
        input.addEventListener('input', clearErrorMessage);
    });
}

function runWhenDocumentIsReady(callback) {
    if (typeof callback !== 'function') {
        return;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

runWhenDocumentIsReady(setupPasswordValidation);
window.validatePassword = validatePassword;

// ========== FUNÇÕES DOS TRAILERS ==========

//Abre modal de trailer do YouTube
function showTrailer(trailerUrl) {
    if (!trailerDialog || !trailerFrame || typeof trailerDialog.showModal !== 'function') {
        return;
    }

    const fallbackUrl = (trailerUrl || trailerFrame.dataset.trailerUrl || '').trim();
    const datasetId = trailerFrame.dataset.trailerId || '';
    let videoId = getYouTubeId(fallbackUrl);

    if (!videoId && datasetId) {
        videoId = datasetId;
    }

    if (!videoId) {
        return;
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;

    trailerFrame.dataset.trailerUrl = fallbackUrl || `https://www.youtube.com/watch?v=${videoId}`;
    trailerFrame.dataset.trailerId = videoId;
    trailerFrame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    trailerFrame.setAttribute('allowfullscreen', '');
    trailerFrame.src = embedUrl;

    trailerLastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!trailerDialog.hasAttribute('role')) {
        trailerDialog.setAttribute('role', 'dialog');
    }
    trailerDialog.setAttribute('aria-modal', 'true');
    if (!trailerDialog.hasAttribute('tabindex')) {
        trailerDialog.setAttribute('tabindex', '-1');
    }

    if (!trailerDialog.open) {
        trailerDialog.showModal();
    }
    trailerDialog.classList.remove('is-closing');
    trailerDialog.classList.add('show');
    lockBodyScroll();
    bindTrailerFocusTrap();
    focusTrailerDialog();
}

// Fecha modal de trailer com animação
function closeTrailer() {
    if (!trailerDialog) {
        return;
    }

    if (!trailerDialog.open) {
        handleTrailerDialogClose();
        return;
    }

    if (trailerDialog.classList.contains('is-closing')) {
        return;
    }

    const finishClose = () => {
        trailerDialog.removeEventListener('animationend', finishClose);
        trailerDialog.removeEventListener('animationcancel', finishClose);
        clearTrailerCloseFallback();
        trailerDialog.classList.remove('is-closing');
        if (trailerDialog.open) {
            trailerDialog.close();
        }
    };

    trailerDialog.addEventListener('animationend', finishClose);
    trailerDialog.addEventListener('animationcancel', finishClose);

    clearTrailerCloseFallback();
    trailerCloseFallbackTimeout = setTimeout(finishClose, 420);
    trailerDialog.classList.add('is-closing');
}

if (buttonClose) {
    buttonClose.addEventListener('click', closeTrailer);
}

if (trailerDialog) {
    trailerDialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeTrailer();
    });
    trailerDialog.addEventListener('close', handleTrailerDialogClose);
    trailerDialog.addEventListener('click', event => {
        if (event.target === trailerDialog) {
            closeTrailer();
        }
    });
}

if (trailerFrame) {
    trailerFrame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    trailerFrame.setAttribute('allowfullscreen', '');
}

window.getYouTubeId = getYouTubeId;
window.showTrailer = showTrailer;
window.closeTrailer = closeTrailer;

// ========== NAVEGAÇÃO DOS CARROSSÉIS ==========

// Navega para próximo item do carrossel principal
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

// ========== CONTROLE DE VISIBILIDADE DAS SETAS ==========

// Atualiza a visibilidade das setas baseado na posição do scroll
function updateHeroArrowsVisibility() {
    const container = document.getElementById('container-wrap');
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    
    if (!container || !btnLeft || !btnRight) {
        return;
    }
    
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const maxScroll = scrollWidth - clientWidth;
    
    // Se não há conteúdo para scroll (apenas 1 item ou menos), ocultar ambas as setas
    if (maxScroll <= 10) {
        btnLeft.classList.add('hidden');
        btnRight.classList.add('hidden');
        return;
    }
    
    // Ocultar seta esquerda se estiver no início
    if (scrollLeft <= 5) {
        btnLeft.classList.add('hidden');
    } else {
        btnLeft.classList.remove('hidden');
    }
    
    // Ocultar seta direita se estiver no fim
    if (scrollLeft >= maxScroll - 5) {
        btnRight.classList.add('hidden');
    } else {
        btnRight.classList.remove('hidden');
    }
}

// Inicializa o controle das setas do hero carousel
function initHeroArrowsControl() {
    const container = document.getElementById('container-wrap');
    
    if (!container) {
        return;
    }
    
    // Atualizar ao carregar (com delay para garantir que o conteúdo foi carregado)
    setTimeout(updateHeroArrowsVisibility, 200);
    setTimeout(updateHeroArrowsVisibility, 500);
    
    // Atualizar durante o scroll
    container.addEventListener('scroll', updateHeroArrowsVisibility, { passive: true });
    
    // Atualizar ao redimensionar a janela
    window.addEventListener('resize', () => {
        setTimeout(updateHeroArrowsVisibility, 100);
    });
    
    // Observar mudanças no conteúdo do container
    const observer = new MutationObserver(() => {
        setTimeout(updateHeroArrowsVisibility, 150);
    });
    
    observer.observe(container, {
        childList: true,
        subtree: false
    });
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroArrowsControl);
} else {
    initHeroArrowsControl();
}

// Exportar função globalmente para ser usada por outros módulos
window.updateHeroArrowsVisibility = updateHeroArrowsVisibility;

// ========== MENU DE NAVEGAÇÃO ==========

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

// ========== MENU DROPDOWN ==========

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

// ========== MENU DE CONTA DO USUÁRIO ==========

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

// ========== GESTÃO DE SEÇÕES DE MÍDIA ==========

function getMediaSectionHost() {
    return document.querySelector('.media-section .container') || document.querySelector('.media-section');
}

// Atualiza visibilidade dos botões de navegação do carrossel
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

// Registra container de carrossel para navegação automática
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

// Rola linha horizontal de conteúdo
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

// ========== ATALHOS DE PROVEDOR ==========

// Inicializa atalhos de provedor para navegação rápida
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

// ========== INICIALIZAÇÃO ==========

document.addEventListener('DOMContentLoaded', () => {
    initializeCarouselNav();
    initProviderShortcut();
});

// ========== SERVICE WORKER ==========

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.warn('[WYWatch] Falha ao registrar o Service Worker:', error);
        });
    });
}

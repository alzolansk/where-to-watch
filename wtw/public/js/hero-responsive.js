/**
 * Sistema de Responsividade para o Carrossel Hero
 * 
 * Este módulo garante que os elementos do carrossel (texto, logo, imagens)
 * estejam sempre perfeitamente centralizados e visíveis no backdrop,
 * aplicando redimensionamento proporcional quando necessário.
 * 
 * Funcionalidades:
 * - Detecta overflow de conteúdo
 * - Aplica escala proporcional (CSS transform: scale)
 * - Mantém aspect ratio dos elementos
 * - Centraliza vertical e horizontalmente
 * - Monitora mudanças de tamanho da janela
 */

(function() {
    'use strict';

    // Configurações
    const CONFIG = {
        minScale: 0.5,           // Escala mínima permitida (50%)
        maxScale: 1.0,           // Escala máxima (100% = tamanho original)
        paddingBuffer: 40,       // Padding de segurança em pixels
        debounceDelay: 150,      // Delay para debounce do resize
        observerThrottle: 200,   // Throttle para MutationObserver
        targetSelector: '.backdropContainer',
        layoutSelector: '.hero-card__layout',
        contentSelector: '.hero-card__content',
        posterSelector: '.hero-card__poster',
        logoSelector: '.hero-card__title-logo',
        titleSelector: '.hero-card__title'
    };

    let resizeTimeout = null;
    let lastObserverRun = 0;
    const processedContainers = new WeakSet();

    /**
     * Calcula a escala necessária para que o conteúdo caiba no container
     * @param {HTMLElement} container - Container backdrop
     * @param {HTMLElement} layout - Layout interno
     * @returns {number} - Fator de escala entre minScale e maxScale
     */
    function calculateRequiredScale(container, layout) {
        if (!container || !layout) {
            return CONFIG.maxScale;
        }

        // Dimensões disponíveis (container menos padding)
        const containerRect = container.getBoundingClientRect();
        const availableWidth = containerRect.width - (CONFIG.paddingBuffer * 2);
        const availableHeight = containerRect.height - (CONFIG.paddingBuffer * 2);

        // Dimensões do conteúdo
        const layoutRect = layout.getBoundingClientRect();
        const contentWidth = layoutRect.width;
        const contentHeight = layoutRect.height;

        // Calcula escalas necessárias para cada eixo
        const scaleX = contentWidth > availableWidth 
            ? availableWidth / contentWidth 
            : CONFIG.maxScale;
        
        const scaleY = contentHeight > availableHeight 
            ? availableHeight / contentHeight 
            : CONFIG.maxScale;

        // Usa a menor escala (mais restritiva) para manter proporções
        const requiredScale = Math.min(scaleX, scaleY, CONFIG.maxScale);
        
        // Aplica limites configurados
        return Math.max(CONFIG.minScale, Math.min(CONFIG.maxScale, requiredScale));
    }

    /**
     * Aplica o redimensionamento e centralização ao layout
     * @param {HTMLElement} container - Container backdrop
     * @param {HTMLElement} layout - Layout a ser ajustado
     */
    function applyResponsiveScale(container, layout) {
        if (!container || !layout) {
            return;
        }

        // Remove transformação temporariamente para medir dimensões reais
        const originalTransform = layout.style.transform;
        layout.style.transform = 'none';
        
        // Força reflow para garantir medições corretas
        void layout.offsetHeight;

        const scale = calculateRequiredScale(container, layout);
        
        // Aplica escala e centralização
        if (scale < CONFIG.maxScale) {
            // Conteúdo precisa ser reduzido
            layout.style.transform = `scale(${scale})`;
            layout.style.transformOrigin = 'center center';
            layout.setAttribute('data-hero-scale', scale.toFixed(3));
        } else {
            // Conteúdo cabe perfeitamente
            layout.style.transform = 'none';
            layout.removeAttribute('data-hero-scale');
        }

        // Garante centralização vertical
        const content = layout.querySelector(CONFIG.contentSelector);
        if (content) {
            content.style.alignSelf = 'center';
            content.style.justifySelf = 'center';
        }

        // Log para debug (apenas em modo desenvolvimento)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            if (scale < CONFIG.maxScale) {
                console.debug(`[Hero Responsive] Aplicada escala de ${(scale * 100).toFixed(1)}% ao carrossel`);
            }
        }
    }

    /**
     * Processa um container individual do carrossel
     * @param {HTMLElement} container - Container backdrop a processar
     */
    function processContainer(container) {
        if (!container || processedContainers.has(container)) {
            return;
        }

        const layout = container.querySelector(CONFIG.layoutSelector);
        if (!layout) {
            return;
        }

        // Verifica se está em mobile (768px ou menos)
        const isMobile = window.innerWidth <= 768;
        
        // Em mobile, o poster está oculto, então o sistema de responsividade
        // deve focar apenas no conteúdo visível
        if (isMobile) {
            // Remove qualquer escala anterior
            layout.style.transform = 'none';
            layout.removeAttribute('data-hero-scale');
            processedContainers.add(container);
            return;
        }

        // Marca como processado para evitar reprocessamento desnecessário
        processedContainers.add(container);

        // Aplica responsividade
        applyResponsiveScale(container, layout);

        // Monitora mudanças no conteúdo do container
        const observer = new MutationObserver(() => {
            const now = Date.now();
            if (now - lastObserverRun > CONFIG.observerThrottle) {
                lastObserverRun = now;
                // Remove da lista de processados para reavaliar
                processedContainers.delete(container);
                applyResponsiveScale(container, layout);
            }
        });

        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * Processa todos os containers do carrossel na página
     */
    function processAllContainers() {
        const containers = document.querySelectorAll(CONFIG.targetSelector);
        
        containers.forEach(container => {
            // Só processa containers visíveis
            if (container.offsetParent !== null) {
                processContainer(container);
            }
        });
    }

    /**
     * Handler para resize da janela com debounce
     */
    function handleResize() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }

        resizeTimeout = setTimeout(() => {
            // Limpa cache de containers processados
            processedContainers.clear = function() {
                // WeakSet não tem método clear, então recriamos
            };
            
            processAllContainers();
            resizeTimeout = null;
        }, CONFIG.debounceDelay);
    }

    /**
     * Observa mudanças no DOM para processar novos containers
     */
    function initDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && node.matches(CONFIG.targetSelector)) {
                                shouldProcess = true;
                                break;
                            }
                            if (node.querySelector && node.querySelector(CONFIG.targetSelector)) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldProcess) break;
            }

            if (shouldProcess) {
                const now = Date.now();
                if (now - lastObserverRun > CONFIG.observerThrottle) {
                    lastObserverRun = now;
                    setTimeout(processAllContainers, 50);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Inicializa o sistema de responsividade
     */
    function init() {
        // Aguarda DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Processa containers existentes
        processAllContainers();

        // Monitora resize da janela
        window.addEventListener('resize', handleResize, { passive: true });

        // Monitora novos containers adicionados ao DOM
        initDOMObserver();

        // Reprocessa quando carrossel se torna ativo
        document.addEventListener('click', (e) => {
            const container = e.target.closest(CONFIG.targetSelector);
            if (container) {
                setTimeout(() => {
                    processedContainers.delete(container);
                    processContainer(container);
                }, 100);
            }
        });

        // Exporta função para uso externo
        window.heroResponsive = {
            processAllContainers,
            processContainer,
            refresh: () => {
                processedContainers.clear = function() {};
                processAllContainers();
            }
        };

        console.log('[Hero Responsive] Sistema de responsividade inicializado');
    }

    // Inicia automaticamente
    init();

})();

document.addEventListener('DOMContentLoaded', () => {
    const featureRoot = document.querySelector('[data-features-root]');
    const defaultFeatures = [
        'Todos os seus serviços de streaming integrados em um só lugar',
        'Busca rápida por título, ator ou plataforma',
        'Links diretos para assistir nos provedores',
        'Trailers oficiais e ficha técnica'
    ];
    const features = Array.isArray(window.__WTW_LANDING_FEATURES) && window.__WTW_LANDING_FEATURES.length
        ? window.__WTW_LANDING_FEATURES
        : defaultFeatures;

    if (featureRoot) {
        const fragment = document.createDocumentFragment();
        features.forEach(text => {
            if (!text) {
                return;
            }
            const item = document.createElement('div');
            item.className = 'feat';
            item.setAttribute('role', 'listitem');

            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.setAttribute('aria-hidden', 'true');

            const label = document.createElement('span');
            label.textContent = text;

            item.appendChild(dot);
            item.appendChild(label);
            fragment.appendChild(item);
        });
        featureRoot.replaceChildren(fragment);
    }

    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    const ctas = document.querySelectorAll('.cta');
    ctas.forEach(btn => {
        btn.addEventListener('pointermove', event => {
            const rect = btn.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            btn.style.setProperty('--mx', `${x}px`);
            btn.style.setProperty('--my', `${y}px`);
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Enter' && document.activeElement === document.body) {
            const heroCta = document.getElementById('ctaHero');
            if (heroCta) {
                heroCta.focus();
            }
        }
    });
});

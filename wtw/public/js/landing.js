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

    const metricsRoot = document.querySelector('[data-metrics-root]');
    const defaultMetrics = [
        { value: '50+', label: 'Plataformas integradas' },
        { value: '2M+', label: 'Títulos catalogados' },
        { value: '30s', label: 'Para encontrar onde assistir' }
    ];
    const metrics = Array.isArray(window.__WTW_LANDING_METRICS) && window.__WTW_LANDING_METRICS.length
        ? window.__WTW_LANDING_METRICS
        : defaultMetrics;

    if (metricsRoot) {
        const fragment = document.createDocumentFragment();
        metrics.forEach(metric => {
            if (!metric || (!metric.value && !metric.label)) {
                return;
            }
            const card = document.createElement('article');
            card.className = 'metric-card';

            if (metric.value) {
                const strong = document.createElement('strong');
                strong.textContent = metric.value;
                card.appendChild(strong);
            }

            if (metric.label) {
                const span = document.createElement('span');
                span.textContent = metric.label;
                card.appendChild(span);
            }

            fragment.appendChild(card);
        });
        metricsRoot.replaceChildren(fragment);
    }

    const trendingRoot = document.querySelector('[data-trending-root]');
    const defaultTrending = [
        {
            title: 'Duna: Parte Dois',
            meta: ['Filme · Ficção científica', 'Max'],
            chips: ['Disponível em 4K'],
            href: '/movie.php?id=1'
        },
        {
            title: 'Fallout',
            meta: ['Série · Ação e aventura', 'Prime Video'],
            chips: ['Nova temporada'],
            href: '/series.php?id=2'
        },
        {
            title: 'Divertidamente 2',
            meta: ['Filme · Animação', 'Disney+'],
            chips: ['Perfeito para maratonar'],
            href: '/movie.php?id=3'
        }
    ];
    const trending = Array.isArray(window.__WTW_LANDING_TRENDING) && window.__WTW_LANDING_TRENDING.length
        ? window.__WTW_LANDING_TRENDING
        : defaultTrending;

    if (trendingRoot) {
        const fragment = document.createDocumentFragment();
        trending.forEach(item => {
            if (!item || !item.title) {
                return;
            }
            const wrapper = document.createElement(item.href ? 'a' : 'div');
            wrapper.className = 'trend-item';
            if (item.href) {
                wrapper.href = item.href;
                wrapper.setAttribute('aria-label', `${item.title} — ver detalhes`);
            }

            const thumb = document.createElement('div');
            thumb.className = 'trend-item__thumb';

            if (item.thumb) {
                const img = document.createElement('img');
                img.src = item.thumb;
                img.alt = item.thumbAlt || item.title;
                img.loading = 'lazy';
                thumb.appendChild(img);
            } else {
                thumb.classList.add('trend-item__thumb--placeholder');
                thumb.textContent = item.title.charAt(0).toUpperCase();
            }

            const content = document.createElement('div');

            const title = document.createElement('p');
            title.className = 'trend-item__title';
            title.textContent = item.title;

            content.appendChild(title);

            const metaList = Array.isArray(item.meta) ? item.meta.filter(Boolean) : [];
            if (metaList.length) {
                const meta = document.createElement('div');
                meta.className = 'trend-item__meta';
                metaList.forEach(metaText => {
                    const span = document.createElement('span');
                    span.textContent = metaText;
                    meta.appendChild(span);
                });
                content.appendChild(meta);
            }

            const chipList = Array.isArray(item.chips) ? item.chips.filter(Boolean) : [];
            if (chipList.length) {
                const chipsContainer = document.createElement('div');
                chipsContainer.className = 'trend-item__meta';
                chipList.forEach(chipText => {
                    const chip = document.createElement('span');
                    chip.className = 'chip';
                    chip.textContent = chipText;
                    chipsContainer.appendChild(chip);
                });
                content.appendChild(chipsContainer);
            }

            wrapper.appendChild(thumb);
            wrapper.appendChild(content);
            fragment.appendChild(wrapper);
        });
        trendingRoot.replaceChildren(fragment);
    }

    const discoverRoot = document.querySelector('[data-discover-root]');
    const defaultDiscover = [
        {
            title: 'Coleções cinematográficas exclusivas',
            description: 'Explore listas curadas pela equipe WYWatch com indicações semanais, maratonas temáticas e lançamentos imperdíveis.',
            cta: { label: 'Ver coleções', href: '/collections.php' }
        },
        {
            title: 'Alertas personalizados',
            description: 'Receba avisos quando seus filmes e séries favoritos chegarem às suas plataformas favoritas.',
            cta: { label: 'Criar alerta', href: '/login.php' }
        },
        {
            title: 'Sincronize sua watchlist',
            description: 'Importe listas de outros apps e mantenha tudo organizado em um só painel com atualizações em tempo real.',
            cta: { label: 'Sincronizar agora', href: '/profile.php' }
        }
    ];
    const discoverItems = Array.isArray(window.__WTW_LANDING_DISCOVER) && window.__WTW_LANDING_DISCOVER.length
        ? window.__WTW_LANDING_DISCOVER
        : defaultDiscover;

    if (discoverRoot) {
        const fragment = document.createDocumentFragment();
        discoverItems.forEach(item => {
            if (!item || !item.title) {
                return;
            }
            const container = document.createElement('article');
            container.className = 'discover-item';

            const strong = document.createElement('strong');
            strong.textContent = item.title;
            container.appendChild(strong);

            if (item.description) {
                const paragraph = document.createElement('p');
                paragraph.textContent = item.description;
                container.appendChild(paragraph);
            }

            if (item.cta && item.cta.href && item.cta.label) {
                const link = document.createElement('a');
                link.className = 'discover-item__cta';
                link.href = item.cta.href;
                link.textContent = item.cta.label;
                link.setAttribute('aria-label', `${item.cta.label} — ${item.title}`);
                container.appendChild(link);
            }

            fragment.appendChild(container);
        });
        discoverRoot.replaceChildren(fragment);
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

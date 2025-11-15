document.addEventListener('DOMContentLoaded', () => {
    // Features Section
    const featureRoot = document.querySelector('[data-features-root]');
    const defaultFeatures = [
        {
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>`,
            title: 'Busca Inteligente',
            text: 'Encontre qualquer filme ou série em segundos com nossa busca avançada e filtros precisos'
        },
        {
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
            </svg>`,
            title: 'Todas as Plataformas',
            text: 'Mais de 50 serviços de streaming integrados: Netflix, Prime Video, Disney+ e muito mais'
        },
        {
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>`,
            title: 'Trailers & Detalhes',
            text: 'Assista trailers oficiais, veja elenco completo e todas as informações do título'
        },
        {
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>`,
            title: 'Acesso Direto',
            text: 'Links diretos para assistir imediatamente na plataforma de sua escolha'
        },
        {
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>`,
            title: 'Organize Favoritos',
            text: 'Crie sua lista pessoal de filmes e séries que deseja assistir'
        },
        {
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"></path>
                <path d="m15 9-6 6"></path>
                <path d="m9 9 6 6"></path>
            </svg>`,
            title: '100% Gratuito',
            text: 'Sem assinatura, sem taxas escondidas. Use todos os recursos gratuitamente'
        }
    ];
    const features = Array.isArray(window.__WTW_LANDING_FEATURES) && window.__WTW_LANDING_FEATURES.length
        ? window.__WTW_LANDING_FEATURES
        : defaultFeatures;

    if (featureRoot) {
        const fragment = document.createDocumentFragment();
        features.forEach(feature => {
            if (!feature || !feature.title) {
                return;
            }
            const card = document.createElement('article');
            card.className = 'feature-card';

            if (feature.icon) {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'feature-icon';
                iconDiv.innerHTML = feature.icon;
                card.appendChild(iconDiv);
            }

            const title = document.createElement('h3');
            title.textContent = feature.title;
            card.appendChild(title);

            if (feature.text) {
                const p = document.createElement('p');
                p.textContent = feature.text;
                card.appendChild(p);
            }

            fragment.appendChild(card);
        });
        featureRoot.replaceChildren(fragment);
    }

    const metricsRoot = document.querySelector('[data-metrics-root]');
    const defaultMetrics = [
        { value: '50+', label: 'Plataformas integradas' },
        { value: '2M+', label: 'Títulos catalogados' },
        { value: '30s', label: 'Para encontrar onde assistir' },
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

    // Mobile nav toggle
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        const closeMenu = () => {
            navMenu.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
        };

        navToggle.addEventListener('click', () => {
            const opened = navMenu.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
        });

        document.addEventListener('click', (e) => {
            if (!navMenu.classList.contains('is-open')) return;
            const path = e.composedPath ? e.composedPath() : [];
            if (!path.includes(navMenu) && !path.includes(navToggle)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    }
});

/**
 * Profile 2.0 - Sistema de Tabs e Painéis
 */

(function () {
  'use strict';

  const root = document.querySelector('[data-profile-root]');
  if (!root) return;

  // ================================
  // CONFIGURAÇÕES
  // ================================

  const runtimeConfig = (typeof window !== 'undefined' && window.__WY_WATCH_CONFIG__) || {};
  const TMDB_API_KEY = runtimeConfig.tmdbApiKey || '';
  const TMDB_BASE_URL = (runtimeConfig.tmdbBaseUrl || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
  const isAuthenticated = root.dataset.authenticated === 'true';
  const apiUrl = root.dataset.apiUrl || 'api/onboarding.php';

  // ================================
  // ESTADO GLOBAL
  // ================================

  let initialPayload = null;
  const initialStateRaw = root.dataset.profileInitial;
  if (initialStateRaw) {
    try {
      initialPayload = JSON.parse(initialStateRaw);
    } catch (error) {
      console.error('Erro ao parsear estado inicial:', error);
    }
  }

  const state = {
    genres: new Set(),
    providers: new Set(),
    favorites: [],
    recommendations: [],
    currentTab: 'overview'
  };

  // ================================
  // ELEMENTOS DO DOM
  // ================================

  const elements = {
    tabs: root.querySelectorAll('[data-profile-tab]'),
    tabContents: root.querySelectorAll('.profile-tab-content'),
    genresContainer: root.querySelector('[data-profile-genres]'),
    providersContainer: root.querySelector('[data-profile-providers]'),
    favoritesList: root.querySelector('[data-profile-favorites-list]'),
    favoritesCount: root.querySelectorAll('[data-profile-favorites-count]'),
    preferencesCount: root.querySelectorAll('[data-profile-preferences-count]'),
    genresSummary: root.querySelector('[data-profile-genres-summary]'),
    providersSummary: root.querySelector('[data-profile-providers-summary]'),
    favoriteSearchForm: root.querySelector('[data-profile-favorite-search]'),
    favoriteSearchInput: root.querySelector('[data-profile-favorite-search-input]'),
    favoriteSearchResults: root.querySelector('[data-profile-favorite-search-results]'),
    saveButton: root.querySelector('[data-profile-save]'),
    cancelButton: root.querySelector('[data-profile-cancel]'),
    feedback: root.querySelector('[data-profile-feedback]'),
    footer: root.querySelector('[data-profile-footer]'),
    providersPanel: root.querySelector('[data-side-panel="providers"]'),
    providersCatalog: root.querySelector('[data-profile-providers-catalog]'),
    providersSearch: root.querySelector('[data-profile-providers-search]'),
    favoritesEmpty: root.querySelector('[data-profile-favorites-empty]'),
    toggleProvidersPanel: root.querySelector('[data-toggle-providers-panel]'),
    closePanelButtons: root.querySelectorAll('[data-close-panel]')
  };

  // ================================
  // NAVEGAÇÃO POR TABS
  // ================================

  function switchTab(tabName) {
    // Atualizar botões de tabs
    elements.tabs.forEach(tab => {
      const isActive = tab.dataset.profileTab === tabName;
      tab.classList.toggle('profile-tab--active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Atualizar conteúdo das tabs
    elements.tabContents.forEach(content => {
      const shouldShow = content.id === `tab-${tabName}`;
      content.hidden = !shouldShow;
    });

    // Mostrar footer apenas nas tabs de edição
    const showFooter = ['curadoria', 'filmes'].includes(tabName);
    if (elements.footer) {
      elements.footer.hidden = !showFooter;
    }

    state.currentTab = tabName;
  }

  // Event listeners para tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.profileTab;
      switchTab(tabName);
    });
  });

  // ================================
  // PAINÉIS LATERAIS
  // ================================

  function openPanel(panelName) {
    const panel = root.querySelector(`[data-side-panel="${panelName}"]`);
    if (panel) {
      panel.hidden = false;
      requestAnimationFrame(() => {
        panel.classList.add('is-open');
      });
      document.body.style.overflow = 'hidden';
    }
  }

  function closePanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    setTimeout(() => {
      panel.hidden = true;
      document.body.style.overflow = '';
    }, 320);
  }

  // Toggle providers panel
  if (elements.toggleProvidersPanel) {
    elements.toggleProvidersPanel.addEventListener('click', () => {
      openPanel('providers');
    });
  }

  // Close panel buttons
  elements.closePanelButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('[data-side-panel]');
      closePanel(panel);
    });
  });

  // Fechar painel ao clicar fora (overlay)
  root.addEventListener('click', (e) => {
    if (e.target.matches('[data-side-panel].is-open')) {
      closePanel(e.target);
    }
  });

  // Fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openPanel = root.querySelector('[data-side-panel].is-open');
      if (openPanel) {
        closePanel(openPanel);
      }
    }
  });

  // ================================
  // GERENCIAMENTO DE PREFERÊNCIAS
  // ================================

  const genreLabels = new Map();
  const providerLabels = new Map();

  function initializeLabels() {
    if (elements.genresContainer) {
      elements.genresContainer.querySelectorAll('[data-genre-id]').forEach(btn => {
        const id = parseInt(btn.dataset.genreId, 10);
        const label = btn.textContent.trim();
        if (id && label) {
          genreLabels.set(id, label);
        }
      });
    }

    [elements.providersContainer, elements.providersCatalog].forEach(container => {
      if (!container) return;
      container.querySelectorAll('[data-provider-id]').forEach(btn => {
        const id = parseInt(btn.dataset.providerId, 10);
        const label = btn.dataset.providerLabel || btn.textContent.trim();
        if (id && label) {
          providerLabels.set(id, label);
        }
      });
    });
  }

  function toggleGenre(id) {
    if (state.genres.has(id)) {
      state.genres.delete(id);
    } else {
      state.genres.add(id);
    }
    renderGenres();
    updateStats();
    showFeedback('Preferências atualizadas localmente', 'success');
  }

  function toggleProvider(id) {
    if (state.providers.has(id)) {
      state.providers.delete(id);
    } else {
      state.providers.add(id);
    }
    renderProviders();
    updateStats();
    showFeedback('Preferências atualizadas localmente', 'success');
  }

  function renderGenres() {
    if (!elements.genresContainer) return;
    
    elements.genresContainer.querySelectorAll('[data-genre-id]').forEach(btn => {
      const id = parseInt(btn.dataset.genreId, 10);
      const isSelected = state.genres.has(id);
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    renderSummary();
  }

  function renderProviders() {
    [elements.providersContainer, elements.providersCatalog].forEach(container => {
      if (!container) return;
      container.querySelectorAll('[data-provider-id]').forEach(btn => {
        const id = parseInt(btn.dataset.providerId, 10);
        const isSelected = state.providers.has(id);
        btn.classList.toggle('is-selected', isSelected);
        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      });
    });

    renderSummary();
  }

  function renderSummary() {
    // Genres summary
    if (elements.genresSummary) {
      const selectedGenres = Array.from(state.genres)
        .map(id => genreLabels.get(id))
        .filter(Boolean);
      renderSummaryChips(elements.genresSummary, selectedGenres, 'Nenhum gênero selecionado');
    }

    // Providers summary
    if (elements.providersSummary) {
      const selectedProviders = Array.from(state.providers)
        .map(id => providerLabels.get(id))
        .filter(Boolean);
      renderSummaryChips(elements.providersSummary, selectedProviders, 'Nenhum provedor selecionado');
    }
  }

  function renderSummaryChips(container, items, emptyText) {
    container.innerHTML = '';
    
    if (items.length === 0) {
      const chip = document.createElement('span');
      chip.className = 'profile-summary-chip profile-summary-chip--empty';
      chip.textContent = emptyText;
      container.appendChild(chip);
      return;
    }

    const visible = items.slice(0, 3);
    visible.forEach(label => {
      const chip = document.createElement('span');
      chip.className = 'profile-summary-chip';
      chip.textContent = label;
      container.appendChild(chip);
    });

    if (items.length > 3) {
      const more = document.createElement('span');
      more.className = 'profile-summary-chip profile-summary-chip--more';
      more.textContent = `+${items.length - 3}`;
      container.appendChild(more);
    }
  }

  // Event listeners para gêneros e provedores
  if (elements.genresContainer) {
    elements.genresContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-genre-id]');
      if (btn && isAuthenticated) {
        const id = parseInt(btn.dataset.genreId, 10);
        if (id) toggleGenre(id);
      }
    });
  }

  [elements.providersContainer, elements.providersCatalog].forEach(container => {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-provider-id]');
      if (btn && isAuthenticated) {
        const id = parseInt(btn.dataset.providerId, 10);
        if (id) toggleProvider(id);
      }
    });
  });

  // ================================
  // FAVORITOS
  // ================================

  function favoriteKey(id, mediaType) {
    return `${id}:${mediaType}`;
  }

  function renderFavorites() {
    if (!elements.favoritesList) return;

    // Limpar todos os cards selecionados existentes
    elements.favoritesList.innerHTML = '';

    // Renderizar todos os favoritos do state
    state.favorites.forEach(favorite => {
      const card = createFavoriteCard(favorite);
      elements.favoritesList.appendChild(card);
    });

    // Atualizar estado vazio
    if (elements.favoritesEmpty) {
      elements.favoritesEmpty.hidden = state.favorites.length > 0;
    }

    updateStats();
  }

  function createFavoriteCard(favorite) {
    const key = favoriteKey(favorite.tmdb_id, favorite.media_type);
    const card = document.createElement('article');
    card.className = 'favorite-poster-card favorite-poster-card--selected';
    card.dataset.key = key;
    card.dataset.tmdbId = favorite.tmdb_id;
    card.dataset.mediaType = favorite.media_type;
    card.setAttribute('role', 'listitem');

    const posterUrl = favorite.poster_url || buildTmdbImage(favorite.poster_path);
    
    card.innerHTML = `
      <figure class="favorite-poster-card__media" aria-hidden="true">
        ${posterUrl 
          ? `<img src="${posterUrl}" alt="${favorite.title}" loading="lazy">`
          : `<span class="favorite-poster-card__fallback">${favorite.title.charAt(0).toUpperCase()}</span>`
        }
      </figure>
      <button type="button" 
              class="favorite-poster-card__remove" 
              data-remove-favorite 
              aria-label="Remover ${favorite.title} dos favoritos">
        ×
      </button>
    `;

    // Anexar event listener ao botão de remover
    const removeBtn = card.querySelector('[data-remove-favorite]');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Removendo favorito:', favorite.title);
        removeFavorite(favorite.tmdb_id, favorite.media_type);
      });
    }

    return card;
  }

  function addFavorite(item) {
    const key = favoriteKey(item.tmdb_id || item.id, item.media_type || 'movie');
    const exists = state.favorites.some(f => favoriteKey(f.tmdb_id, f.media_type) === key);
    
    if (exists) {
      showFeedback('Este título já está nos seus favoritos', 'error');
      return;
    }

    const favorite = {
      tmdb_id: item.tmdb_id || item.id,
      media_type: (item.media_type || 'movie') === 'tv' ? 'tv' : 'movie',
      title: item.title || item.name,
      poster_path: item.poster_path,
      poster_url: item.poster_url || buildTmdbImage(item.poster_path),
      backdrop_path: item.backdrop_path
    };

    state.favorites.push(favorite);
    renderFavorites();
    showFeedback(`"${favorite.title}" adicionado aos favoritos`, 'success');
  }

  function removeFavorite(id, mediaType) {
    const key = favoriteKey(id, mediaType);
    const favorite = state.favorites.find(f => favoriteKey(f.tmdb_id, f.media_type) === key);
    
    if (!favorite) {
      console.warn('Favorito não encontrado:', id, mediaType);
      return;
    }
    
    console.log('Removendo favorito:', favorite.title);
    state.favorites = state.favorites.filter(f => favoriteKey(f.tmdb_id, f.media_type) !== key);
    renderFavorites();
    showFeedback(`"${favorite.title}" removido dos favoritos`, 'success');
  }

  // ================================
  // BUSCA DE FAVORITOS
  // ================================

  let searchController = null;

  async function searchFavorites(query) {
    if (!TMDB_API_KEY || !query.trim()) return;

    if (searchController) searchController.abort();
    searchController = new AbortController();

    try {
      const url = new URL(`${TMDB_BASE_URL}/search/multi`);
      url.searchParams.set('api_key', TMDB_API_KEY);
      url.searchParams.set('language', 'pt-BR');
      url.searchParams.set('query', query);
      url.searchParams.set('page', '1');

      const response = await fetch(url.toString(), { signal: searchController.signal });
      const data = await response.json();
      
      const results = (data.results || [])
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 12);
      
      renderSearchResults(results);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erro na busca:', error);
        showSearchMessage('Erro ao buscar. Tente novamente.');
      }
    }
  }

  function renderSearchResults(results) {
    if (!elements.favoriteSearchResults) return;

    elements.favoriteSearchResults.innerHTML = '';

    if (results.length === 0) {
      showSearchMessage('Nenhum resultado encontrado');
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'favorite-search-grid';

    results.forEach(item => {
      const card = createSearchResultCard(item);
      grid.appendChild(card);
    });

    elements.favoriteSearchResults.appendChild(grid);
  }

  function createSearchResultCard(item) {
    const key = favoriteKey(item.id, item.media_type);
    const isInFavorites = state.favorites.some(f => favoriteKey(f.tmdb_id, f.media_type) === key);
    
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'favorite-poster-card';
    if (isInFavorites) card.classList.add('favorite-poster-card--selected');
    
    const posterUrl = buildTmdbImage(item.poster_path);
    const title = item.title || item.name;

    card.innerHTML = `
      <figure class="favorite-poster-card__media" aria-hidden="true">
        ${posterUrl 
          ? `<img src="${posterUrl}" alt="${title}" loading="lazy">`
          : `<span class="favorite-poster-card__fallback">${title.charAt(0).toUpperCase()}</span>`
        }
      </figure>
    `;

    if (!isInFavorites) {
      card.addEventListener('click', () => addFavorite(item));
    }

    return card;
  }

  function showSearchMessage(message) {
    if (!elements.favoriteSearchResults) return;
    elements.favoriteSearchResults.innerHTML = `
      <div class="favorite-search-message">${message}</div>
    `;
  }

  // Event listener para busca
  if (elements.favoriteSearchForm) {
    elements.favoriteSearchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isAuthenticated || !elements.favoriteSearchInput) return;
      
      const query = elements.favoriteSearchInput.value.trim();
      if (query.length >= 2) {
        searchFavorites(query);
      } else {
        showSearchMessage('Digite pelo menos 2 caracteres');
      }
    });
  }

  // ================================
  // SALVAR E CANCELAR
  // ================================

  async function savePreferences() {
    if (!isAuthenticated) return;

    const payload = {
      genres: Array.from(state.genres),
      providers: Array.from(state.providers),
      favorites: state.favorites.map(f => ({
        tmdb_id: f.tmdb_id,
        media_type: f.media_type,
        title: f.title,
        poster_path: f.poster_path,
        poster_url: f.poster_url,
        backdrop_path: f.backdrop_path
      }))
    };

    try {
      showFeedback('Salvando preferências...', null);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao salvar');

      showFeedback('Preferências salvas com sucesso! ✨', 'success');
      
      // Recarregar dados
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showFeedback('Erro ao salvar. Tente novamente.', 'error');
    }
  }

  function cancelChanges() {
    if (confirm('Descartar alterações não salvas?')) {
      location.reload();
    }
  }

  if (elements.saveButton) {
    elements.saveButton.addEventListener('click', savePreferences);
  }

  if (elements.cancelButton) {
    elements.cancelButton.addEventListener('click', cancelChanges);
  }

  // ================================
  // FEEDBACK E STATS
  // ================================

  function showFeedback(message, type = null) {
    if (!elements.feedback) return;

    elements.feedback.textContent = message;
    elements.feedback.classList.remove('is-success', 'is-error');
    
    if (type === 'success') elements.feedback.classList.add('is-success');
    if (type === 'error') elements.feedback.classList.add('is-error');
  }

  function updateStats() {
    const favCount = state.favorites.length;
    const prefCount = state.genres.size + state.providers.size;

    elements.favoritesCount.forEach(el => {
      el.textContent = `${favCount} ${favCount === 1 ? 'título' : 'títulos'}`;
    });

    elements.preferencesCount.forEach(el => {
      el.textContent = `${prefCount} ${prefCount === 1 ? 'item' : 'itens'}`;
    });
  }

  // ================================
  // UTILS
  // ================================

  function buildTmdbImage(path, size = 'w342') {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/${size}${path.startsWith('/') ? path : '/' + path}`;
  }

  function applyInitialState(payload) {
    if (!payload) return;

    if (payload.genres) {
      state.genres = new Set(payload.genres);
    }

    if (payload.providers) {
      state.providers = new Set(payload.providers);
    }

    if (payload.favorites) {
      state.favorites = payload.favorites.map(f => ({
        tmdb_id: f.tmdb_id || f.id,
        media_type: (f.media_type || 'movie') === 'tv' ? 'tv' : 'movie',
        title: f.title || f.name,
        poster_path: f.poster_path,
        poster_url: f.poster_url || buildTmdbImage(f.poster_path),
        backdrop_path: f.backdrop_path
      }));
    }

    renderGenres();
    renderProviders();
    renderFavorites();
    updateStats();
  }

  // ================================
  // BUSCA DE PROVEDORES NO PAINEL
  // ================================

  if (elements.providersSearch) {
    elements.providersSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const groups = elements.providersCatalog?.querySelectorAll('[data-provider-group]');
      
      groups?.forEach(group => {
        let visibleCount = 0;
        group.querySelectorAll('[data-provider-id]').forEach(item => {
          const label = item.dataset.providerLabel?.toLowerCase() || '';
          const matches = query === '' || label.includes(query);
          item.hidden = !matches;
          if (matches) visibleCount++;
        });
        group.hidden = visibleCount === 0;
      });
    });
  }

  // ================================
  // INICIALIZAÇÃO
  // ================================

  function init() {
    initializeLabels();
    applyInitialState(initialPayload);
    
    // Tab inicial
    switchTab('overview');
    
    // Inicializar subsections (Favoritos / Assistir Mais Tarde)
    initializeSubsections();
    
    // Carregar lista de assistir mais tarde
    loadWatchLaterMovies();
    
    console.log('✨ Profile 2.0 inicializado');
  }

  // ================================
  // SUBSECTIONS (FAVORITOS / ASSISTIR MAIS TARDE)
  // ================================

  function initializeSubsections() {
    const subsectionTabs = document.querySelectorAll('.subsection-tab');
    const subsections = document.querySelectorAll('.profile-subsection');

    subsectionTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetSubsection = tab.dataset.subsection;

        // Atualizar tabs
        subsectionTabs.forEach(t => t.classList.remove('subsection-tab--active'));
        tab.classList.add('subsection-tab--active');

        // Atualizar conteúdo
        subsections.forEach(section => {
          if (section.dataset.subsectionContent === targetSubsection) {
            section.classList.add('profile-subsection--active');
          } else {
            section.classList.remove('profile-subsection--active');
          }
        });

        // Carregar dados específicos
        if (targetSubsection === 'watch-later') {
          loadWatchLaterMovies();
        }
      });
    });
  }

  // ================================
  // ASSISTIR MAIS TARDE
  // ================================

  async function loadWatchLaterMovies() {
    const listContainer = document.querySelector('[data-watch-later-list]');
    const emptyState = document.querySelector('[data-watch-later-empty]');

    if (!listContainer) return;

    try {
      const response = await fetch('api/watch-later.php');
      if (!response.ok) throw new Error('Erro ao carregar lista');

      const data = await response.json();
      
      if (data.success && Array.isArray(data.movies)) {
        if (data.movies.length === 0) {
          listContainer.innerHTML = '';
          if (emptyState) emptyState.style.display = 'flex';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          renderWatchLaterMovies(data.movies, listContainer);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar assistir mais tarde:', error);
    }
  }

  function renderWatchLaterMovies(movies, container) {
    container.innerHTML = '';

    movies.forEach(movie => {
      const posterUrl = movie.movie_poster || movie.movie_backdrop || '';
      const title = movie.movie_title || '';
      const movieId = movie.movie_id;

      const card = document.createElement('article');
      card.className = 'favorite-poster-card favorite-poster-card--selected';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-watch-later-id', movieId);

      const figure = document.createElement('figure');
      figure.className = 'favorite-poster-card__media';
      figure.setAttribute('aria-hidden', 'true');

      if (posterUrl) {
        const img = document.createElement('img');
        img.src = posterUrl;
        img.alt = title;
        img.loading = 'lazy';
        figure.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.className = 'favorite-poster-card__fallback';
        fallback.textContent = title.charAt(0).toUpperCase();
        figure.appendChild(fallback);
      }

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'favorite-poster-card__remove';
      removeBtn.textContent = '−';
      removeBtn.setAttribute('aria-label', `Remover ${title} da lista de assistir mais tarde`);
      
      removeBtn.addEventListener('click', async () => {
        await removeFromWatchLater(movieId, card);
      });

      card.appendChild(figure);
      card.appendChild(removeBtn);
      container.appendChild(card);
    });
  }

  async function removeFromWatchLater(movieId, cardElement) {
    try {
      const response = await fetch('api/watch-later.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: parseInt(movieId) })
      });

      const data = await response.json();
      
      if (data.success) {
        // Remover elemento da UI com animação
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
          cardElement.remove();
          
          // Verificar se ainda há itens
          const listContainer = document.querySelector('[data-watch-later-list]');
          const emptyState = document.querySelector('[data-watch-later-empty]');
          
          if (listContainer && listContainer.children.length === 0 && emptyState) {
            emptyState.style.display = 'flex';
          }
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao remover filme:', error);
    }
  }


  init();
})();

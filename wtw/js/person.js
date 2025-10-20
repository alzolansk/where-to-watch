// person.js - mantem funcionalidades existentes e adiciona coworkers + infos + externos


document.addEventListener('DOMContentLoaded', () => {
  const pageShell = document.querySelector('.page-shell');
  const skeleton = document.getElementById('personSkeleton');

  const setLoadingState = (isLoading) => {
    if (pageShell) {
      pageShell.classList.toggle('is-loading', isLoading);
    }
    if (skeleton) {
      skeleton.setAttribute('aria-hidden', 'true');
    }
  };

  setLoadingState(true);

  function waitForImages(container){
    return new Promise(resolve => {
      const scope = container || document;
      const allImages = scope ? scope.querySelectorAll('img') : [];
      const images = Array.from(allImages).filter(img => !(img && img.loading === 'lazy' && !img.complete));
      if (!images.length) {
        resolve();
        return;
      }
      let loaded = 0;
      const check = () => {
        loaded += 1;
        if (loaded >= images.length) {
          resolve();
        }
      };
      images.forEach(img => {
        if (img.complete) {
          check();
        } else {
          img.addEventListener('load', check, { once: true });
          img.addEventListener('error', check, { once: true });
        }
      });
      setTimeout(resolve, 4000);
    });
  }


  const apiKey = 'dc3b4144ae24ddabacaeda024ff0585c'; // use sua key
  const params = new URLSearchParams(location.search);
  const personId = params.get('personId');

  if(!personId){
    setLoadingState(false);
    console.error('personId ausente');
    return;
  }

  // endpoints principais
  const personUrl = `https://api.themoviedb.org/3/person/${personId}?api_key=${apiKey}&language=pt-BR&append_to_response=movie_credits,external_ids,images`;
  const creditsUrl = `https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${apiKey}&language=pt-BR`;

  // helpers
  const img = (path, size='w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : '';

  // DOM references (mantAm ids antigos)
  const dom = {
    name: document.getElementById('person-name'),
    prof1: document.getElementById('profession-label-1'),
    prof2: document.getElementById('profession-label-2'),
    bioH3: document.getElementById('bio-h3'),
    bio: document.getElementById('person-bio'),
    photo: document.getElementById('person-img'),
    timeline: document.getElementById('timeline-container'),
    allBtn: document.getElementById('show-all-movies'),
    allGrid: document.getElementById('all-movies-list'),
    allModal: document.getElementById('moviesModal'),
    closeAll: document.getElementById('closeMoviesModal'),
    metaChips: document.getElementById('personMetaChips'),
    external: document.getElementById('externalLinks'),
    infoGrid: document.getElementById('infoGrid'),
    coworkersGrid: document.getElementById('coworkersGrid'),
    coworkersSection: document.getElementById('coworkersSection'),
    modalTitle: document.getElementById('moviesModalTitle'),
    modalSearch: document.getElementById('modalFilmographySearch'),
    modalClear: document.getElementById('modalFilmographyClear'),
    modalResultCount: document.getElementById('modalResultCount'),
    modalActorPhoto: document.getElementById('modalActorPhoto'),
    modalEmptyState: document.getElementById('modalEmptyState')
  };

  dom.timelineSection = dom.timeline ? dom.timeline.closest('.card-section') : null;
  dom.showAllWrapper = dom.allBtn ? dom.allBtn.closest('.show-movies') : null;

  const filmographyState = {
    highlights: [],
    all: []
  };

  // ========= fluxo principal =========
  (async () => {
    try{

      const personRes = await fetch(personUrl);

      if(!personRes.ok) throw new Error('Falha ao obter pessoa');



      let creditsData = null;

      try {

        const creditsRes = await fetch(creditsUrl);

        if (creditsRes.ok) {

          creditsData = await creditsRes.json();

        }

      } catch (creditsError) {

        console.warn('Nao foi possivel carregar movie_credits dedicados:', creditsError);

      }



      const person = await personRes.json();

      const credits = (creditsData && Array.isArray(creditsData.cast))

        ? creditsData

        : (person.movie_credits || { cast: [], crew: [] });



      renderHero(person);
      const { highlights, allSorted } = await renderTimeline(person, credits);
      renderInfo(person);
      renderExternal(person.external_ids, person.homepage);

      // colegas com base nos destaques
      const coworkDetails = await fetchCoworkersFromHighlights(highlights.slice(0,6));
      renderCoworkers(coworkDetails);

    }catch(err){
      console.error('Falha ao carregar pagina da pessoa:', err);
      const heroTitle = dom.name;
      if (heroTitle) {
        heroTitle.textContent = 'Conteudo indisponivel no momento';
      }
      if (dom.timelineSection) dom.timelineSection.classList.add('is-hidden');
      if (dom.showAllWrapper) dom.showAllWrapper.classList.add('is-hidden');
      if (dom.coworkersSection) dom.coworkersSection.classList.add('is-hidden');
      if (dom.allGrid) dom.allGrid.innerHTML = '';
      if (dom.modalEmptyState) {
        dom.modalEmptyState.textContent = 'Filmografia indisponível no momento.';
        dom.modalEmptyState.classList.remove('is-hidden');
      }
    }finally{
      await waitForImages(document);
      setLoadingState(false);
    }
  })();

  // ========= render hero =========
  function renderHero(p){
    dom.name.textContent = p.name || '-';
    if (dom.modalTitle) {
      dom.modalTitle.textContent = p.name ? `Filmografia de ${p.name}` : 'Todos os trabalhos';
    }
    const prof = p.known_for_department || 'Profissional';
    dom.prof1.textContent = prof;
    dom.prof2.textContent = prof;
    dom.photo.src = img(p.profile_path,'w500') || 'imagens/icon-cast.png';
    if (dom.modalActorPhoto) {
      dom.modalActorPhoto.src = img(p.profile_path,'w185') || 'imagens/icon-cast.png';
      dom.modalActorPhoto.alt = p.name ? `Foto de ${p.name}` : 'Foto do(a) artista';
    }

    const biography = (p.biography || '').trim();
    if(!biography){
      dom.bioH3.style.display='none';
      dom.prof2.classList.add('is-hidden');
    }else{
      dom.bioH3.style.display='block';
      dom.bio.textContent = biography.split('\n')[0];
    }

    // chips metas (nascimento, local, etc.)
    const chips = [];
    if(p.birthday){
      try{
        const dt = new Date(p.birthday);
        chips.push(`Nascimento - ${dt.toLocaleDateString('pt-BR')}`);
      }catch(_){}
    }
    if(p.deathday){
      try{
        const dt = new Date(p.deathday);
        chips.push(`Falecimento - ${dt.toLocaleDateString('pt-BR')}`);
      }catch(_){}
    }
    if(p.place_of_birth) chips.push(p.place_of_birth);

    dom.metaChips.innerHTML = '';
    chips.forEach(t=>{
      const span = document.createElement('span');
      span.className = 'meta-chip';
      span.textContent = t;
      dom.metaChips.appendChild(span);
    });
  }

  // ========= timeline =========
  async function renderTimeline(person, mediasData){
    const credits = (mediasData && mediasData.cast) || [];
    const filtered = credits.filter(item => item.release_date || item.first_air_date);
    const top = [...filtered]
      .sort((a,b)=> (b.popularity||0)-(a.popularity||0))
      .slice(0,12)
      .sort((a,b)=> new Date(a.release_date||a.first_air_date) - new Date(b.release_date||b.first_air_date));

    const allSorted = [...filtered].sort((a,b)=> (b.popularity||0)-(a.popularity||0));
    filmographyState.highlights = top;
    filmographyState.all = allSorted;
    const timelineSection = dom.timelineSection || (dom.timeline ? dom.timeline.closest('.card-section') : null);
    const showAllWrapper = dom.showAllWrapper || (dom.allBtn ? dom.allBtn.closest('.show-movies') : null);

    if (dom.timeline) {
      dom.timeline.innerHTML = '';
      if (top.length) {
        if (timelineSection) timelineSection.classList.remove('is-hidden');
        for (const item of top){
          await renderTimelineCard(item, dom.timeline);
        }
      } else {
        if (timelineSection) timelineSection.classList.add('is-hidden');
      }
    }

    if (showAllWrapper) {
      showAllWrapper.classList.toggle('is-hidden', !allSorted.length);
    }

    if (dom.allBtn) {
      if (allSorted.length) {
        dom.allBtn.removeAttribute('disabled');
        dom.allBtn.setAttribute('aria-hidden', 'false');
        dom.allBtn.onclick = () => {
          if (!dom.allModal) return;
          dom.allModal.showModal();
          document.body.classList.add('modal-is-open');
          if (dom.modalSearch && typeof dom.modalSearch._runFilter === 'function') {
            dom.modalSearch._runFilter();
          } else {
            renderModalGrid(filmographyState.all);
          }
          setTimeout(() => {
            if (dom.modalSearch) {
              dom.modalSearch.focus();
            }
          }, 120);
        };
      } else {
        dom.allBtn.setAttribute('disabled', 'disabled');
        dom.allBtn.setAttribute('aria-hidden', 'true');
        dom.allBtn.onclick = null;
      }
    }

    if (dom.closeAll) {
      dom.closeAll.onclick = () => {
        if (!dom.allModal) return;
        dom.allModal.close();
      };
    }

    if (dom.allModal) {
      dom.allModal.addEventListener('close', () => {
        document.body.classList.remove('modal-is-open');
      });
      dom.allModal.addEventListener('cancel', () => {
        document.body.classList.remove('modal-is-open');
      });
    }

    setupModalFilmographySearch();

    return { highlights: top, allSorted };
  }

  async function renderTimelineCard(item, container){
    const title = item.title || item.name || 'a';
    const year = (item.release_date || item.first_air_date || '').slice(0,4);
    const poster = img(item.poster_path,'w500');
    // tenta logo em pt/en
    let logoUrl = '';
    try{
      const r = await fetch(`https://api.themoviedb.org/3/movie/${item.id}/images?api_key=${apiKey}`);
      if (r.ok){
        const data = await r.json();
        const logos = (data.logos||[]);
        const pick = pickBestLogo(logos);
        if (pick) logoUrl = img(pick.file_path,'w500');
      }
    }catch(_){}

    const card = document.createElement('div');
    card.className = 'timeline-item';
    card.innerHTML = `
      <div class="timeline-circle">
        <img src="${poster}" class="movie-poster" alt="">
        <img src="${logoUrl}" class="movie-logo" alt="">
      </div>
      <div class="p-timeline">
        <span class="movie-name">${title}</span>
        <span class="year-movie">${year||'a'}</span>
      </div>
    `;
    card.addEventListener('click', ()=>{
      location.href = `filme.php?${new URLSearchParams({ id:item.id, mediaType:'movie' }).toString()}`;
    });
    container.appendChild(card);
  }

  function pickBestLogo(logos){
    if(!Array.isArray(logos)||!logos.length) return null;
    const pref = ['pt','pt-br','pt_br','en',''];
    const score = l=>{
      const lang = (l.iso_639_1||'').toLowerCase();
      const idx = pref.findIndex(x=> x? x===lang : !lang );
      return idx<0 ? pref.length : idx;
    };
    return [...logos].sort((a,b)=>{
      const d = score(a)-score(b); if (d!==0) return d;
      const v = (b.vote_average||0)-(a.vote_average||0); if (v!==0) return v;
      return (b.vote_count||0)-(a.vote_count||0);
    })[0];
  }

  // ========= coworkers =========
  // 1) Limite de colegas (de 12 -> 6)
async function fetchCoworkersFromHighlights(highlights){
  const map = new Map();
  for (const it of highlights){
    try{
      const r = await fetch(`https://api.themoviedb.org/3/movie/${it.id}/credits?api_key=${apiKey}&language=pt-BR`);
      if(!r.ok) continue;
      const data = await r.json();
      const pool = [...(data.cast||[]).slice(0,10), ...(data.crew||[]).slice(0,6)];
      for (const p of pool){
        if(!p.id || String(p.id)===String(personId)) continue;
        if(!map.has(p.id)){
          map.set(p.id,{ id:p.id, name:p.name, profile:p.profile_path, role:p.job||p.character||'', count:0 });
        }
        map.get(p.id).count++;
      }
    }catch(_){}
  }
  // >>> aqui muda a janela: 6 itens
  return [...map.values()].sort((a,b)=> b.count - a.count).slice(0,6);
}

function renderCoworkers(list){
  if(!list.length){ dom.coworkersSection.classList.add('is-hidden'); return; }

  // adiciona layout de destaque (sem tocar no HTML)
  dom.coworkersGrid.classList.add('people-grid--featured');

  dom.coworkersGrid.innerHTML = '';
  list.forEach(p=>{
    const a = document.createElement('a');
    a.href = `person.php?personId=${encodeURIComponent(p.id)}`;
    a.className = 'person-chip person-chip--featured';
    a.innerHTML = `
      <img src="${img(p.profile,'w185') || 'imagens/icon-cast.png'}" alt="">
      <div class="chip-text">
        <div class="pname">${p.name}</div>
        <div class="prole">${p.role || 'Colaborador(a)'}</div>
      </div>
      <span class="count-badge" title="Projetos em comum">${p.count}x</span>
    `;
    dom.coworkersGrid.appendChild(a);
  });
}
  function renderModalGrid(list = []){
    if (!dom.allGrid) return;

    const total = filmographyState.all.length;
    dom.allGrid.innerHTML = '';

    if (!list.length) {
      dom.allGrid.classList.add('is-hidden');
      if (dom.modalEmptyState) {
        const hasQuery = dom.modalSearch && dom.modalSearch.value.trim();
        dom.modalEmptyState.textContent = hasQuery ? 'Nenhum título corresponde à sua busca.' : 'Nenhum trabalho encontrado.';
        dom.modalEmptyState.classList.remove('is-hidden');
      }
    } else {
      dom.allGrid.classList.remove('is-hidden');
      if (dom.modalEmptyState) {
        dom.modalEmptyState.classList.add('is-hidden');
      }

      list.forEach(item => {
        const link = document.createElement('a');
        link.href = `filme.php?${new URLSearchParams({ id:item.id, mediaType:'movie' }).toString()}`;

        const poster = document.createElement('img');
        poster.src = img(item.poster_path, 'w342') || 'imagens/icon-cast.png';
        poster.alt = item.title || item.name || '';
        poster.loading = 'lazy';
        link.appendChild(poster);

        dom.allGrid.appendChild(link);
      });
    }

    if (dom.modalResultCount) {
      const totalLabel = total === 1 ? 'trabalho' : 'trabalhos';
      if (!total) {
        dom.modalResultCount.textContent = 'Nenhum trabalho cadastrado';
      } else if (!list.length) {
        dom.modalResultCount.textContent = `Nenhum trabalho encontrado para sua busca (0 de ${total} ${totalLabel})`;
      } else if (list.length === total) {
        dom.modalResultCount.textContent = `${total} ${totalLabel} no total`;
      } else {
        const filteredLabel = list.length === 1 ? 'trabalho' : 'trabalhos';
        dom.modalResultCount.textContent = `Mostrando ${list.length} ${filteredLabel} de ${total} ${totalLabel}`;
      }
    }
  }

  function setupModalFilmographySearch(){
    const input = dom.modalSearch;
    const clearButton = dom.modalClear;

    const normalize = (value = '') => value
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const runFilter = () => {
      const normalizedQuery = input ? normalize(input.value.trim()) : '';
      const matches = normalizedQuery
        ? filmographyState.all.filter(item => normalize(item.title || item.name || '').includes(normalizedQuery))
        : filmographyState.all;
      renderModalGrid(matches);
    };

    if (!input) {
      renderModalGrid(filmographyState.all);
      return;
    }

    if (input.dataset.bound === 'true') {
      if (typeof input._runFilter === 'function') {
        input._runFilter();
      } else {
        runFilter();
      }
      return;
    }

    input.addEventListener('input', runFilter);
    input.addEventListener('search', runFilter);

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (!input.value) {
          runFilter();
          input.focus();
          return;
        }
        input.value = '';
        runFilter();
        input.focus();
      });
    }

    input.dataset.bound = 'true';
    input._runFilter = runFilter;
    runFilter();
  }

  // ========= info / externos =========
  function renderInfo(p){
    const rows = [
      {label:'Popularidade', value: (p.popularity||0).toFixed(0)},
      {label:'Departamento', value: p.known_for_department || '-'},
      {label:'Tambem conhecido(a) como', value: (p.also_known_as||[]).slice(0,3).join(', ') || '-'}
    ];
    const born = p.birthday ? new Date(p.birthday).toLocaleDateString('pt-BR') : null;
    const death = p.deathday ? new Date(p.deathday).toLocaleDateString('pt-BR') : null;
    const place = p.place_of_birth || null;
    if (born) rows.unshift({label:'Nascimento', value: born});
    if (death) rows.push({label:'Falecimento', value: death});
    if (place) rows.push({label:'Local de nascimento', value: place});

    dom.infoGrid.innerHTML = '';
    rows.forEach(r=>{
      const card = document.createElement('div');
      card.className = 'info-card';
      card.innerHTML = `<div class="label">${r.label}</div><div class="value">${r.value}</div>`;
      dom.infoGrid.appendChild(card);
    });
  }

  function renderExternal(ext={}, homepage){
    const links = [
      ext.instagram_id && { href:`https://instagram.com/${ext.instagram_id}`, label:'Instagram' },
      ext.twitter_id && { href:`https://x.com/${ext.twitter_id}`, label:'Twitter/X' },
      ext.facebook_id && { href:`https://facebook.com/${ext.facebook_id}`, label:'Facebook' },
      homepage && { href: homepage, label:'Site oficial' }
    ].filter(Boolean);

    dom.external.innerHTML = '';
    links.forEach(l=>{
      const a = document.createElement('a');
      a.href = l.href; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = l.label;
      dom.external.appendChild(a);
    });
  }
})
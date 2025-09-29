// person.js - mantem funcionalidades existentes e adiciona coworkers + infos + externos


document.addEventListener('DOMContentLoaded', () => {
  showLoading();

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
    hideLoading();
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
    filmographySearch: document.getElementById('filmographySearch'),
    filmographyClear: document.getElementById('filmographyClear'),
    filmographyResults: document.getElementById('filmographyResults')
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
      dom.modalTitle.textContent = `Todos os trabalhos (${allSorted.length})`;

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
      if (dom.filmographyResults) {
        dom.filmographyResults.innerHTML = '';
        dom.filmographyResults.classList.add('is-hidden');
      }
    }finally{
      await waitForImages(document);
      hideLoading();
    }
  })();

  // ========= render hero =========
  function renderHero(p){
    dom.name.textContent = p.name || '-';
    const prof = p.known_for_department || 'Profissional';
    dom.prof1.textContent = prof;
    dom.prof2.textContent = prof;
    dom.photo.src = img(p.profile_path,'w500') || 'imagens/icon-cast.png';

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
    if(p.place_of_birth) chips.push(`Local a ${p.place_of_birth}`);
    const gender = p.gender===1?'Feminino':p.gender===2?'Masculino':null;
    if(gender) chips.push(`GAanero a ${gender}`);

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

    dom.allGrid.innerHTML = '';
    if (allSorted.length) {
      allSorted.forEach(item=>{
        const a = document.createElement('a');
        a.href = `filme.php?${new URLSearchParams({ id:item.id, mediaType:'movie' }).toString()}`;
        const im = document.createElement('img');
        im.src = img(item.poster_path,'w342') || 'imagens/icon-cast.png';
        im.alt = item.title || item.name || '';
        a.appendChild(im);
        dom.allGrid.appendChild(a);
      });
    }

    if (showAllWrapper) {
      showAllWrapper.classList.toggle('is-hidden', !allSorted.length);
    }

    if (dom.allBtn) {
      if (allSorted.length) {
        dom.allBtn.removeAttribute('disabled');
        dom.allBtn.setAttribute('aria-hidden', 'false');
        dom.allBtn.onclick = () => dom.allModal && dom.allModal.showModal();
      } else {
        dom.allBtn.setAttribute('disabled', 'disabled');
        dom.allBtn.setAttribute('aria-hidden', 'true');
        dom.allBtn.onclick = null;
      }
    }

    if (dom.closeAll) {
      dom.closeAll.onclick = () => dom.allModal && dom.allModal.close();
    }

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



  function bindFilmographySearch(){
    const input = dom.filmographySearch;
    const results = dom.filmographyResults;
    if (!input || !results) {
      return;
    }
    if (input.dataset.bound === 'true') {
      return;
    }

    const clearButton = dom.filmographyClear;
    const normalize = (value = '') => value
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const renderMatches = (matches) => {
      results.innerHTML = '';
      if (!matches.length) {
        const empty = document.createElement('p');
        empty.className = 'filmography-results__empty';
        empty.textContent = 'Nenhum titulo encontrado.';
        results.appendChild(empty);
        results.classList.remove('is-hidden');
        return;
      }

      matches.slice(0, 12).forEach(item => {
        const link = document.createElement('a');
        link.className = 'filmography-results__item';
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const params = new URLSearchParams({ id: item.id, mediaTp: mediaType });
        link.href = `filme.php?${params.toString()}`;

        const poster = document.createElement('img');
        poster.src = img(item.poster_path, 'w185') || 'imagens/icon-cast.png';
        poster.alt = item.title || item.name || 'Titulo';
        poster.loading = 'lazy';
        link.appendChild(poster);

        const meta = document.createElement('div');
        meta.className = 'filmography-results__meta';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'filmography-results__title';
        titleSpan.textContent = item.title || item.name || 'Titulo';
        meta.appendChild(titleSpan);

        const year = (item.release_date || item.first_air_date || '').slice(0,4);
        if (year) {
          const yearSpan = document.createElement('span');
          yearSpan.className = 'filmography-results__year';
          yearSpan.textContent = year;
          meta.appendChild(yearSpan);
        }

        const chevron = document.createElement('span');
        chevron.className = 'filmography-results__chevron';
        chevron.textContent = '>';

        meta.appendChild(chevron);

        link.appendChild(meta);
        results.appendChild(link);
      });
      results.classList.remove('is-hidden');
    };

    const handleInput = () => {
      const query = input.value.trim();
      const normalizedQuery = normalize(query);
      if (!normalizedQuery) {
        results.innerHTML = '';
        results.classList.add('is-hidden');
        return;
      }

      const matches = filmographyState.all.filter(item => {
        const title = normalize(item.title || item.name || '');
        return title.includes(normalizedQuery);
      });

      renderMatches(matches);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleInput);
    if (clearButton) clearButton.addEventListener('click', () => {
      if (!input.value) {
        results.innerHTML = '';
        results.classList.add('is-hidden');
        return;
      }
      input.value = '';
      results.innerHTML = '';
      results.classList.add('is-hidden');
      input.focus();
    });

    input.dataset.bound = 'true';
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
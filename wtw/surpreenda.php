<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/includes/env.php';

wyw_load_env(__DIR__);

require_once __DIR__ . '/includes/db.php';

$dbConnected = true;

try {
    $pdo = get_pdo();
} catch (Throwable $exception) {
    $dbConnected = false;
    $pdo = null;
}

$clientConfig = [
    'apiBaseUrl' => rtrim((string) wyw_env('APP_API_BASE_URL', '/api'), '/'),
    'tmdbImageBase' => rtrim((string) wyw_env('TMDB_IMAGE_BASE_URL', 'https://image.tmdb.org/t/p'), '/'),
    'isAuthenticated' => isset($_SESSION['id']) && (int) $_SESSION['id'] > 0,
    'databaseConnected' => $dbConnected,
];
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WYWatch • Surpreenda‑me — Protótipo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <!-- GSAP (defer garante ordem de execução antes do nosso script inline) -->
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollToPlugin.min.js" defer></script>
  <!-- Three.js primário (defer) -->
  <script src="https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.min.js" defer></script>
  <!-- Observação: também carregamos fallback programático no JS abaixo caso o CDN falhe -->
  <script>
    window.__WY_WATCH_CONFIG__ = Object.freeze(Object.assign({}, window.__WY_WATCH_CONFIG__ || {}, <?php echo json_encode($clientConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>));
  </script>
  <style>
    :root {
      --bg-a: #060913;
      --bg-b: #0b1430;
      --cyan: #00e5ff;
      --blue: #2b6fff;
      --violet: #7a4dff;
      --white: #f6fbff;
      --glass: rgba(255, 255, 255, 0.06);
      --border: rgba(255, 255, 255, 0.18);
      --glow: 0 0 24px rgba(0, 229, 255, .55), 0 0 64px rgba(43, 111, 255, .35);
      --ok: #2ecc71; --warn: #f1c40f; --err: #e74c3c;
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      background: radial-gradient(120% 120% at 20% 0%, #0b1430 0%, var(--bg-a) 45%),
                  radial-gradient(140% 120% at 80% 15%, #081126 0%, var(--bg-b) 55%);
      color: var(--white);
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
      overflow: hidden;
    }

    /* Fundo vivo com "raios" em camadas */
    .energy-bursts { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
    .burst {
      position: absolute; width: 180vmax; height: 180vmax; left: 50%; top: 50%; transform: translate(-50%, -50%);
      background: conic-gradient(from 90deg,
        rgba(0, 229, 255, .0) 0deg,
        rgba(0, 229, 255, .25) 30deg,
        rgba(43, 111, 255, .35) 60deg,
        rgba(0, 229, 255, .0) 120deg,
        rgba(43, 111, 255, .0) 360deg);
      filter: blur(40px) saturate(140%);
      mix-blend-mode: screen; animation: spin 24s linear infinite; opacity: .35;
    }
    .burst.b2 { animation-duration: 36s; opacity: .25; }
    .burst.b3 { animation-duration: 48s; opacity: .18; }
    @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

    /* Canvas do espaço/warp */
    #warpCanvas { position: fixed; inset: 0; z-index: 0; display: block; }

    /* Camada principal */
    .wrap { position: relative; z-index: 2; height: 100dvh; display: grid; place-items: center; padding: clamp(16px, 3vw, 40px); }

    .hud { position: absolute; inset: 0; z-index: 3; display: grid; grid-template-rows: auto 1fr auto; pointer-events: none; padding: 24px; font-family: Orbitron, Inter, sans-serif; }
    .brand { opacity: .85; letter-spacing: .2ch; font-weight: 800; color: #bcd7ff; text-shadow: 0 0 18px rgba(123, 164, 255, .35); }
    .brand small { font-weight: 600; opacity: .65; }
    .footer-hud { justify-self: center; align-self: end; opacity: .65; font-size: 12px; }

    /* Portal temporal */
    .portal { position: relative; width: min(72vmin, 560px); aspect-ratio: 1/1; border-radius: 50%; display: grid; place-items: center; filter: drop-shadow(0 0 40px rgba(0,229,255,.35)); }
    .portal::before, .portal::after {
      content: ""; position: absolute; inset: -10%; border-radius: 50%;
      background: radial-gradient(closest-side, rgba(0,229,255,.35), rgba(43,111,255,.15) 60%, rgba(0,0,0,0) 70%),
                  conic-gradient(from 0deg, rgba(0,229,255,.6), rgba(43,111,255,.3), rgba(122,77,255,.25), rgba(0,229,255,.6));
      mask: radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 62%);
      filter: blur(10px) saturate(120%); animation: swirl 10s linear infinite; mix-blend-mode: screen; opacity: .9;
    }
    .portal::after { inset: -18%; filter: blur(14px); opacity: .45; animation-duration: 18s; }
    @keyframes swirl { to { transform: rotate(360deg); } }

    /* Anéis internos pulsantes */
    .rings { position: absolute; inset: 12%; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,255,255,.55), rgba(0,229,255,.25) 35%, rgba(0,0,0,0) 65%); mask: radial-gradient(circle, transparent 40%, black 41%); filter: blur(6px); animation: pulse 2.2s ease-in-out infinite; mix-blend-mode: screen; }
    @keyframes pulse { 0%, 100% { transform: scale(.98); opacity: .85;} 50% { transform: scale(1.03); opacity: 1; } }

    /* Botão central */
    .cta {
      --pad: clamp(14px, 2.2vmin, 22px);
      position: relative; z-index: 2; border: 1px solid var(--border);
      padding: var(--pad) calc(var(--pad) * 1.6);
      border-radius: 999px; text-transform: uppercase; letter-spacing: .2ch; font-weight: 800;
      color: var(--white); font-family: Orbitron, Inter, sans-serif;
      background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.04));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), var(--glow);
      cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; backdrop-filter: blur(6px) saturate(140%);
    }
    .cta:hover { transform: translateY(-1px) scale(1.02); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), 0 0 0 3px rgba(0,229,255,.15), var(--glow); }
    .cta:active { transform: translateY(0) scale(.98); }
    .cta .spark { position: absolute; inset: -3px; border-radius: 999px; pointer-events: none; background: conic-gradient(from 0deg, rgba(0,229,255,.0), rgba(0,229,255,.85), rgba(43,111,255,.0) 40%, rgba(122,77,255,.0)); filter: blur(10px); mix-blend-mode: screen; opacity: .0; transition: opacity .2s ease; animation: spin 3.4s linear infinite; }
    .cta:hover .spark { opacity: .55; }

    /* Card de resultado */
    .result { position: absolute; inset: 0; display: grid; place-items: center; z-index: 4; pointer-events: none; opacity: 0; }
    .result-card { pointer-events: auto; display: grid; grid-template-columns: 180px 1fr; gap: 20px; align-items: center; background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04)); border: 1px solid var(--border); border-radius: 24px; padding: 18px; box-shadow: 0 10px 40px rgba(0, 20, 60, .4), var(--glow); backdrop-filter: blur(8px) saturate(160%); width: min(860px, 92vw); }
    .poster { width: 100%; aspect-ratio: 2/3; border-radius: 16px; object-fit: cover; box-shadow: 0 8px 30px rgba(0,0,0,.4); }
    .meta h2 { margin: 0 0 6px; font-family: Orbitron, Inter, sans-serif; letter-spacing: .06ch; }
    .meta .sub { opacity: .8; margin-bottom: 12px; }
    .meta .providers { opacity: .85; margin-bottom: 16px; font-size: 0.95rem; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .btn { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.04)); color: var(--white); font-weight: 600; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease; box-shadow: var(--glow); }
    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }

    @media (max-width: 720px) { .result-card { grid-template-columns: 1fr; } }

    /* Diagnóstico ("testes") */
    .diag { position: fixed; right: 10px; bottom: 10px; z-index: 10; font-size: 12px; background: rgba(0,0,0,.35); border: 1px solid var(--border); padding: 8px 10px; border-radius: 10px; backdrop-filter: blur(6px); }
    .diag b { font-family: Orbitron, Inter, sans-serif; letter-spacing: .04ch; }
    .ok { color: var(--ok); } .warn { color: var(--warn); } .err { color: var(--err); }
  </style>
</head>
<body>
  <!-- Camada de energia/elétricos no fundo -->
  <div class="energy-bursts" aria-hidden="true">
    <div class="burst b1"></div>
    <div class="burst b2"></div>
    <div class="burst b3"></div>
  </div>

  <!-- Canvas de espaço/warp (Three.js) -->
  <canvas id="warpCanvas"></canvas>

  <!-- HUD / Branding leve -->
  <div class="hud">
    <div class="brand">WYWATCH <small>• SURPRENDA‑ME</small></div>
    <div></div>
    <div class="footer-hud">Protótipo imersivo — “Time Machine Experience”</div>
  </div>

  <!-- Núcleo da experiência -->
  <div class="wrap">
    <div class="portal" id="portal">
      <div class="rings" aria-hidden="true"></div>
      <button class="cta" id="cta">
        <span>Surpreenda‑me</span>
        <span class="spark"></span>
      </button>
    </div>

    <!-- Resultado -->
    <div class="result" id="result">
      <div class="result-card" id="resultCard">
        <img class="poster" id="poster" alt="Poster do título" src="https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" />
        <div class="meta">
          <h2 id="title">Interstellar</h2>
          <div class="sub" id="subtitle">Ficção científica • 2014 • 2h49</div>
          <p class="providers" id="providers" hidden>Disponível em: —</p>
          <p id="overview">Num futuro sombrio na Terra, um grupo de astronautas atravessa um buraco de minhoca em busca de um novo lar para a humanidade.</p>
          <div class="actions">
            <button class="btn" id="again">🔁 Outro salto</button>
            <button class="btn" id="details">📜 Ver detalhes</button>
            <button class="btn" id="fav">❤️ Favoritar</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Diagnóstico simples (serve como "testes" de runtime) -->
  <div class="diag" id="diag">
    <b>Diagnostics</b><br>
    GSAP: <span id="t_gsap" class="warn">checking…</span> • THREE: <span id="t_three" class="warn">checking…</span><br>
    Render: <span id="t_render" class="warn">idle</span> • API: <span id="t_api" class="warn">idle</span><br>
    Sessão: <span id="t_auth" class="warn">checking…</span> • DB: <span id="t_db" class="warn">checking…</span>
  </div>

  <script>
    // Utilitários de carregamento seguro + diagnósticos
    function setDiag(id, status, text){
      const el = document.getElementById(id); if(!el) return;
      el.classList.remove('ok','warn','err'); el.classList.add(status); el.textContent = text;
    }

    function loadScript(src){
      return new Promise((resolve, reject) => {
        const s = document.createElement('script'); s.src = src; s.async = true; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
      });
    }

    async function ensureLibs(){
      const status = { gsapReady: !!window.gsap, threeReady: !!window.THREE };

      // Verifica GSAP
      setDiag('t_gsap', status.gsapReady ? 'ok' : 'err', status.gsapReady ? 'ok' : 'missing');

      // Verifica THREE primário; se ausente, tenta fallbacks
      if (!status.threeReady){
        setDiag('t_three','warn','loading…');
        try {
          await loadScript('https://unpkg.com/three@0.161.0/build/three.min.js');
        } catch(e){ /* tenta outro fallback */ }
      }
      if (!window.THREE){
        try {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.161.0/three.min.js');
        } catch(e){ /* último recurso */ }
      }

      status.threeReady = !!window.THREE;
      setDiag('t_three', status.threeReady ? 'ok' : 'err', status.threeReady ? 'ok' : 'missing');

      return status;
    }

    function initThreeStarfield(THREE_NS, canvas, warpState){
      const renderer = new THREE_NS.WebGLRenderer({ canvas, antialias: true });
      const scene = new THREE_NS.Scene();
      const camera = new THREE_NS.PerspectiveCamera(70, 1, 0.1, 2000);
      camera.position.z = 5;

      const resize = () => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', resize); resize();

      const starCount = 2200;
      const geometry = new THREE_NS.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const speeds = new Float32Array(starCount);

      for (let i = 0; i < starCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = -Math.random() * 80;
        speeds[i] = 0.02 + Math.random() * 0.06;
      }
      geometry.setAttribute('position', new THREE_NS.BufferAttribute(positions, 3));

      const material = new THREE_NS.PointsMaterial({ color: 0x80d8ff, size: 0.015, transparent: true, opacity: 0.85 });
      const stars = new THREE_NS.Points(geometry, material);
      scene.add(stars);

      let rafId = null;
      function animate() {
        rafId = requestAnimationFrame(animate);
        const pos = stars.geometry.attributes.position.array;
        for (let i = 0; i < starCount; i++) {
          pos[i * 3 + 2] += speeds[i] * warpState.value;
          if (pos[i * 3 + 2] > 5) {
            pos[i * 3 + 0] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 2] = -80 - Math.random() * 40;
          }
        }
        stars.geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
      }
      animate();

      return {
        renderer,
        scene,
        cleanup(){ cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); }
      };
    }

    function initCanvasStarfield(canvas, warpState){
      const ctx = canvas.getContext('2d');
      let width = 0, height = 0;
      const starCount = 900;
      const stars = Array.from({ length: starCount }, () => ({ x: 0, y: 0, z: 0, speed: 0 }));
      const maxDepth = 140;

      function resize(){
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      function resetStar(star){
        star.x = (Math.random() - 0.5) * width * 0.6;
        star.y = (Math.random() - 0.5) * height * 0.6;
        star.z = Math.random() * maxDepth + 10;
        star.speed = 0.02 + Math.random() * 0.05;
      }

      stars.forEach(resetStar);
      window.addEventListener('resize', resize); resize();

      let rafId = null;
      function animate(){
        rafId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, width, height);
        const bgGradient = ctx.createRadialGradient(width * 0.3, height * 0.1, 0, width * 0.3, height * 0.1, Math.max(width, height));
        bgGradient.addColorStop(0, 'rgba(11, 20, 48, 0.45)');
        bgGradient.addColorStop(1, 'rgba(6, 9, 19, 0)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = 'rgba(128, 216, 255, 0.85)';
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
        for (const star of stars){
          star.z -= star.speed * Math.max(0.5, warpState.value * 1.2);
          if (star.z <= 1) resetStar(star);

          const k = 180 / star.z;
          const x = width / 2 + star.x * k;
          const y = height / 2 + star.y * k;

          if (x < 0 || x > width || y < 0 || y > height){
            resetStar(star);
            continue;
          }

          const size = Math.max(0.6, (1 - star.z / maxDepth) * 3 + warpState.value * 0.4);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      animate();

      return {
        cleanup(){ cancelAnimationFrame(rafId); window.removeEventListener('resize', resize); },
        renderer: null,
        scene: null
      };
    }

    // Bootstrap após DOM pronto e libs garantidas
    (async function bootstrap(){
      if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, {once:true}));
      await ensureLibs();

      const canvas = document.getElementById('warpCanvas');
      const warpState = { value: 1 };
      let renderer = null;
      let scene = null;
      let renderMode = 'three';

      const THREE_NS = window.THREE || null;
      if (THREE_NS){
        const starfield = initThreeStarfield(THREE_NS, canvas, warpState);
        renderer = starfield.renderer;
        scene = starfield.scene;
        setDiag('t_render','ok','running (three)');
      } else {
        renderMode = 'canvas';
        initCanvasStarfield(canvas, warpState);
        console.warn('THREE não disponível — ativando fallback em canvas.');
        setDiag('t_three','warn','fallback');
        setDiag('t_render','warn','running (canvas)');
      }

      // ============================
      // UX / Interações de portal
      // ============================
      const portal = document.getElementById('portal');
      const cta = document.getElementById('cta');
      const resultWrap = document.getElementById('result');
      const poster = document.getElementById('poster');
      const titleEl = document.getElementById('title');
      const subtitleEl = document.getElementById('subtitle');
      const overviewEl = document.getElementById('overview');

      const providersEl = document.getElementById('providers');
      const detailsBtn = document.getElementById('details');
      const favBtn = document.getElementById('fav');
      const againBtn = document.getElementById('again');

      const config = window.__WY_WATCH_CONFIG__ || {};
      const API_BASE = (config.apiBaseUrl || '/api').replace(/\/$/, '');
      const IMAGE_BASE = (config.tmdbImageBase || 'https://image.tmdb.org/t/p').replace(/\/$/, '');
      const PLACEHOLDER_POSTER = 'imagens/icon-cast.png';

      if (config.isAuthenticated) {
        setDiag('t_auth', 'ok', 'ok');
      } else {
        setDiag('t_auth', 'warn', 'anon');
      }
      setDiag('t_db', config.databaseConnected ? 'ok' : 'err', config.databaseConnected ? 'ok' : 'offline');

      let currentItem = null;
      let isAnimating = false;

      function resolvePoster(item){
        if (item && item.poster_url) return item.poster_url;
        if (item && item.poster_path) return `${IMAGE_BASE}/w500${item.poster_path}`;
        return PLACEHOLDER_POSTER;
      }

      function formatProviders(item){
        if (!item || !Array.isArray(item.providers) || item.providers.length === 0) {
          return item && item.providers_note ? item.providers_note : null;
        }
        const names = item.providers.map(provider => provider && provider.name ? provider.name : null).filter(Boolean);
        if (names.length === 0) {
          return item.providers_note || null;
        }
        return `Disponível em: ${names.join(', ')}`;
      }

      function setResult(item){
        currentItem = item;
        poster.src = resolvePoster(item);
        poster.alt = item && item.title ? 'Poster — ' + item.title : 'Poster do título';
        titleEl.textContent = item && item.title ? item.title : 'Sugestão misteriosa';
        subtitleEl.textContent = item && item.subtitle ? item.subtitle : (item && item.meta_summary ? item.meta_summary : 'Atualizando metadados…');
        overviewEl.textContent = item && item.overview ? item.overview : 'Sem sinopse disponível no momento. Tente outro salto!';
        const providersText = formatProviders(item);
        if (providersText) {
          providersEl.textContent = providersText;
          providersEl.hidden = false;
        } else {
          providersEl.hidden = true;
        }
        favBtn.textContent = '❤️ Favoritar';
        favBtn.dataset.state = 'idle';
      }

      async function fetchSurprise(params = {}){
        const url = new URL(`${API_BASE}/surprise.php`, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
          }
        });

        setDiag('t_api', 'warn', 'carregando…');

        let response;
        try {
          response = await fetch(url.toString(), {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
        } catch (error) {
          setDiag('t_api', 'err', 'offline');
          throw error;
        }

        if (response.status === 401) {
          setDiag('t_api', 'err', '401');
          setDiag('t_auth', 'err', 'login');
          throw new Error('unauthorized');
        }

        if (!response.ok) {
          const text = await response.text();
          setDiag('t_api', 'err', response.statusText || 'erro');
          throw new Error(text || `HTTP ${response.status}`);
        }

        const payload = await response.json().catch(() => null);
        if (!payload || (payload.status ?? 'ok') !== 'ok' || !payload.item) {
          setDiag('t_api', 'err', 'inválido');
          throw new Error('Resposta inesperada da API de surpresa');
        }

        setDiag('t_api', 'ok', 'ok');
        return payload.item;
      }

      async function surprise(){
        if (isAnimating) {
          return;
        }
        if (!config.isAuthenticated) {
          alert('Faça login para usar a experiência Surpreenda-me.');
          window.location.href = 'login.php';
          return;
        }
        isAnimating = true;
        cta.disabled = true;

        try {
          const item = await fetchSurprise({ media_type: 'movie' });
          setResult(item);
          showResultTL.restart();
          setTimeout(() => {
            cta.disabled = false;
            isAnimating = false;
          }, 900);
        } catch (error) {
          console.error('Erro ao buscar recomendação surpresa', error);
          if (error.message === 'unauthorized') {
            alert('Sua sessão expirou. Faça login novamente para continuar.');
          } else {
            alert('Não foi possível encontrar um título agora. Tente novamente em instantes.');
          }
          cta.disabled = false;
          isAnimating = false;
        }
      }

      // Timelines
      const showResultTL = gsap.timeline({ paused: true });
      showResultTL
        .to('.energy-bursts .burst', { duration: .6, opacity: .55, ease: 'power2.out' }, 0)
        .to(portal, { duration: .6, scale: 1.08, filter: 'drop-shadow(0 0 70px rgba(0,229,255,.6))', ease: 'power2.out' }, 0)
        .to(portal, { duration: .7, scale: 12, ease: 'power3.in' }, 0.6)
        .to('body', { duration: .5, filter: 'blur(3px) contrast(105%)', ease: 'power3.inOut' }, 0.6)
        .add(() => { warp(5); flash(); }, 0.6)
        .to(resultWrap, { duration: .001, opacity: 1 }, '>-0.05')
        .from('#resultCard', { duration: .6, y: 40, opacity: 0, scale: .96, ease: 'power3.out' }, '>-0.02')
        .to('body', { duration: .6, filter: 'blur(0px) contrast(100%)', ease: 'power3.out' }, '>-0.2');

      const hideResultTL = gsap.timeline({ paused: true });
      hideResultTL
        .to('#resultCard', { duration: .35, y: 20, opacity: 0, ease: 'power2.in' })
        .to(resultWrap, { duration: .001, opacity: 0 })
        .to(portal, { duration: .001, scale: 0.001 })
        .set(portal, { clearProps: 'all' })
        .to('.energy-bursts .burst', { duration: .4, opacity: .35, ease: 'power2.out' })
        .add(() => warp(1), 0);

      function flash(){
        const div = document.createElement('div');
        Object.assign(div.style, { position: 'fixed', inset: '0', background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.9), rgba(255,255,255,0) 60%)', mixBlendMode: 'screen', filter: 'blur(12px)', opacity: '0', zIndex: 9, pointerEvents: 'none' });
        document.body.appendChild(div);
        gsap.to(div, { duration: .12, opacity: 1, ease: 'power3.out', onComplete: () => { gsap.to(div, { duration: .35, opacity: 0, ease: 'power3.in', onComplete: () => div.remove() }); }});
      }

      function warp(to = 1){
        gsap.to(warpState, { duration: .9, value: to, ease: 'power2.out' });
      }

      cta.addEventListener('click', (event) => {
        event.preventDefault();
        surprise();
      });

      againBtn.addEventListener('click', (event) => {
        event.preventDefault();
        hideResultTL.restart();
        setTimeout(() => {
          surprise();
        }, 450);
      });

      detailsBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (!currentItem) {
          alert('Peça uma sugestão antes de abrir os detalhes.');
          return;
        }
        const params = new URLSearchParams({
          id: currentItem.tmdb_id,
          mediaTp: currentItem.media_type || 'movie',
        });
        window.location.href = `filme.php?${params.toString()}`;
      });

      favBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!config.isAuthenticated) {
          alert('Faça login para salvar títulos nos seus favoritos.');
          window.location.href = 'login.php';
          return;
        }
        if (!currentItem) {
          alert('Busque um título antes de favoritar.');
          return;
        }
        if (favBtn.dataset.state === 'saving') {
          return;
        }

        favBtn.dataset.state = 'saving';
        favBtn.textContent = '❤️ Salvando…';

        try {
          const response = await fetch(`${API_BASE}/interactions.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tmdb_id: currentItem.tmdb_id,
              media_type: currentItem.media_type || 'movie',
              type: 'watchlist',
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}`);
          }

          favBtn.textContent = '❤️ Salvo';
          favBtn.dataset.state = 'saved';
          setDiag('t_api', 'ok', 'ok');
        } catch (error) {
          console.error('Erro ao favoritar título', error);
          favBtn.textContent = '❤️ Tentar novamente';
          favBtn.dataset.state = 'idle';
          setDiag('t_api', 'err', 'fav erro');
          alert('Não foi possível salvar este título agora. Tente novamente em instantes.');
        }
      });

      // ============================
      // "Testes" rápidos (auto-checagens)
      // ============================
      try {
        const okHasGSAP = !!window.gsap;
        const okRenderer = !THREE_NS || (renderer instanceof THREE_NS.WebGLRenderer);
        const okScene = !THREE_NS || (scene instanceof THREE_NS.Scene);
        if (renderMode === 'three'){
          console.assert(okRenderer, 'Renderer não é THREE.WebGLRenderer');
          console.assert(okScene, 'Scene não é THREE.Scene');
        }
        console.assert(okHasGSAP, 'GSAP não carregou');
      } catch (e) {
        console.error('Self-tests falharam', e);
      }
    })();
  </script>
</body>
</html>

<?php
// ========== DASHBOARD DE NAVEGAÇÃO ==========
// Barra de navegação principal do site
// Inclui menu, busca, autenticação de usuário e configurações

// Sessão já foi iniciada pelo bootstrap, mas verifica por segurança
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Bootstrap já carregou env.php, mas mantém para compatibilidade se chamado diretamente
if (!function_exists('wyw_env')) {
    require_once __DIR__ . '/../includes/env.php';
    wyw_load_env(__DIR__ . '/..');
}

// ========== CONFIGURAÇÕES DO CLIENTE ==========
// Configurações que serão enviadas para o frontend

$clientConfig = [
    'tmdbApiKey' => (string) wyw_env('TMDB_API_KEY', ''),
    'tmdbBaseUrl' => rtrim((string) wyw_env('TMDB_API_BASE', 'https://api.themoviedb.org/3'), '/'),
    'apiBaseUrl' => (string) wyw_env('APP_API_BASE_URL', '/api'),
];

// ========== ESTADOS DE NAVEGAÇÃO ==========
// Determina qual página está ativa para destacar no menu

$currentScript = basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');
$navStates = [
    'home' => $currentScript === 'index.php',
    'providers' => $currentScript === 'providers.php',
];
?>
<script>
  window.__WY_WATCH_CONFIG__ = Object.freeze(
    Object.assign(
      {},
      window.__WY_WATCH_CONFIG__ || {},
      <?php echo json_encode($clientConfig, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>
    )
  );
</script>

<!-- ========== MENU PRINCIPAL DE NAVEGAÇÃO ========== -->
<!-- Barra de navegação fixa com logo, menu e busca -->

<nav id="menu">
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
    <div class="faixa">
        <!-- ========== BOTÃO DE MENU MOBILE ========== -->
        
        <button class="menu-trigger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-buttons">
            <img src="imagens/menu-icon.png" alt="Menu" id="menuIcon" width="30px">
        </button>

        <!-- ========== LOGO/MARCA PRINCIPAL ========== -->

        <a href="index.php" class="wyw-brand wyw-brand--menu dashboard-logo home-header" aria-label="Ir para a pagina inicial">
            <span class="wyw-brand__where">where</span>
            <span class="wyw-brand__where wyw-brand__where--y">y</span>
            <img src="imagens/wywatch-favicon-iris-png.png" alt="o" class="wyw-brand__eye" />
            <span class="wyw-brand__where wyw-brand__where--u">u</span>
            <span class="wyw-brand__watch">WATCH</span>
        </a>

        <!-- ========== PAINEL DE NAVEGAÇÃO ========== -->
        <!-- Menu principal com links e busca -->

        <nav id="menu-buttons" class="menu-panel hidden-menu" aria-hidden="true">
            <ul id="ulBotoes">
                <li class="menu-panel__item menu-panel__item--dropdown" data-menu-dropdown>
                    <button
                        type="button"
                        class="menu-panel__trigger"
                        data-dropdown-trigger
                        aria-haspopup="true"
                        aria-expanded="false"
                        aria-controls="exploreDropdown"
                    >
                        <span class="menu-panel__trigger-label">Explorar</span>
                        <span class="menu-panel__trigger-icon" aria-hidden="true">▾</span>
                    </button>
                    <div class="menu-dropdown" id="exploreDropdown" data-dropdown-menu role="menu" aria-hidden="true">
                        <div class="menu-dropdown__content">
                            <a
                                href="index.php"
                                class="menu-dropdown__link<?php echo $navStates['home'] ? ' is-active' : ''; ?>"
                                role="menuitem"
                                <?php echo $navStates['home'] ? 'aria-current="page"' : ''; ?>
                                <?php echo $navStates['home'] ? 'data-current-label="Voce aqui"' : ''; ?>
                            >
                                <span class="menu-dropdown__label">Pagina Inicial</span>
                                <?php if ($navStates['home']): ?>
                                    <span class="menu-dropdown__badge" aria-hidden="true">agora</span>
                                <?php endif; ?>
                            </a>
                            <a
                            href="surpreenda.php"
                            class="menu-dropdown__link menu-dropdown__link--surprise"
                            role="menuitem"
                            >
                            <span class="menu-dropdown__label surprise">Surpreenda-me</span>
                            </a>
                            <a
                                href="providers.php"
                                class="menu-dropdown__link<?php echo $navStates['providers'] ? ' is-active' : ''; ?>"
                                role="menuitem"
                                <?php echo $navStates['providers'] ? 'aria-current="page"' : ''; ?>
                                <?php echo $navStates['providers'] ? 'data-current-label="Voce aqui"' : ''; ?>
                            >
                                <span class="menu-dropdown__label">Filmes e s&eacute;ries por provedor</span>
                                <?php if ($navStates['providers']): ?>
                                    <span class="menu-dropdown__badge" aria-hidden="true">agora</span>
                                <?php endif; ?>
                            </a>
                            <a
                                href="index.php#streaming-trending"
                                class="menu-dropdown__link"
                                role="menuitem"
                            >
                                <span class="menu-dropdown__label">Tend&ecirc;ncias</span>
                            </a>
                        </div>
                    </div>
                </li>
            </ul>
            <div id="search-div" class="menu-panel__search">
                <!-- ========== PAINEL DE BUSCA ========== -->
                <!-- Campo de busca para filmes e séries -->
                
                <div class="search-panel">
                    <div class="search-input-wrapper" id="searchInputWrapper">
                        <span class="search-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="7"></circle>
                                <line x1="20" y1="20" x2="16.65" y2="16.65"></line>
                            </svg>
                        </span>
                        <input type="text" class="search-bar" id="searchmovie" placeholder="Pesquisar filme ou s&eacute;rie" autocomplete="off">
                        <button type="button" id="clearSearch" class="clear-search" aria-label="Limpar busca">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="results" class="search-results" style="display: none;"></div>
            </div>
            </filter>
        </nav>

        <?php
        // ========== MENU DE USUÁRIO ==========
        // Exibe diferentes opções baseado no status de login do usuário
        
        if (!isset($_SESSION['nome']) || !isset($_SESSION['id'])) {
            echo '<div class="user-menu">';
            echo '<a href="login.php" class="user-menu__link" aria-label="Fazer login">';
            echo '<svg class="user-menu__icon" viewBox="0 0 24 24" aria-hidden="true">';
            echo '<path d="M12 12.75c2.071 0 3.75-1.679 3.75-3.75S14.071 5.25 12 5.25 8.25 6.929 8.25 9s1.679 3.75 3.75 3.75Zm0" fill="currentColor"/>';
            echo '<path d="M12 14.25c-2.824 0-8.25 1.418-8.25 4.242V21h16.5v-2.508c0-2.824-5.426-4.242-8.25-4.242Z" fill="currentColor" />';
            echo '</svg>';
            echo '</a>';
            echo '</div>';
        } else if (isset($_SESSION['nome'])) {
            // ========== DROPDOWN DE USUÁRIO LOGADO ==========
            // Menu dropdown para usuários autenticados
            
            $userName = htmlspecialchars($_SESSION['nome'], ENT_QUOTES, 'UTF-8');
            // Extrai apenas a primeira palavra do nome
            $firstName = preg_split('/\s+/', $userName)[0] ?? $userName;
            // Limita a 12 caracteres para evitar nomes longos (ex: "Supercalifragilistic")
            $displayName = mb_substr($firstName, 0, 12, 'UTF-8');
            echo '<div class="user-account" data-user-menu>';
            echo '    <button type="button" class="user-account__trigger" aria-haspopup="true" aria-expanded="false">';
            echo '        <span class="user-account__avatar" aria-hidden="true">';
            echo '            <svg viewBox="0 0 24 24" aria-hidden="true">';
            echo '                <path d="M12 12.75c2.071 0 3.75-1.679 3.75-3.75S14.071 5.25 12 5.25 8.25 6.929 8.25 9s1.679 3.75 3.75 3.75Zm0" fill="currentColor"/>';
            echo '                <path d="M12 14.25c-2.824 0-8.25 1.418-8.25 4.242V21h16.5v-2.508c0-2.824-5.426-4.242-8.25-4.242Z" fill="currentColor" />';
            echo '            </svg>';
            echo '        </span>';
            echo '        <span class="user-account__label">' . $displayName . '</span>';
            echo '        <span class="user-account__chevron" aria-hidden="true">';
            echo '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
            echo '                <polyline points="6 9 12 15 18 9" />';
            echo '            </svg>';
            echo '        </span>';
            echo '    </button>';
            echo '    <div class="user-account__dropdown" role="menu" aria-hidden="true">';
            echo '        <a href="profile.php" class="user-account__profile" role="menuitem">';
            echo '            <span>Meu perfil</span>';
            echo '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
            echo '                <polyline points="9 6 15 12 9 18" />';
            echo '            </svg>';
            echo '        </a>';
            echo '        <span class="user-account__divider" aria-hidden="true"></span>';
            echo '        <a href="logout.php" class="user-account__logout" role="menuitem">Sair</a>';
            echo '    </div>';
            echo '</div>';
        }
        ?>
    </div>
</nav>

<!-- ========== CONTAINER DE RESULTADOS DE BUSCA ========== -->

<div id="searchResults" style="display: none;"></div>

<!-- ========== ESTILOS CSS DO DASHBOARD ========== -->
<!-- Estilos principais para navegação, menu e busca -->

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
   
*{
    margin: 0;
    padding: 0;
    border:none;
    text-decoration: none;
    list-style: none;
}

:root{
  --glass-bg-1: rgba(255,255,255,.14);
  --glass-bg-2: rgba(255,255,255,.08);
  --glass-stroke: rgba(255,255,255,.22);
  --glass-inner: rgba(255,255,255,.25);
  --glass-divider: rgba(255,255,255,.12);
  --text-strong: #fff;
  --text-soft: rgba(255,255,255,.85);
}

/* Main Menu */
#menu{
    width: 100%;
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 1000;
    min-height: 0;
    background: linear-gradient(135deg, rgba(138, 138, 138, 0.15), rgba(255,255,255,0.05)); /*Glass transparency*/
    backdrop-filter: blur(5px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.034);
    isolation: isolate;
}

.faixa {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: clamp(8px, 1.2vw, 14px) clamp(18px, 3vw, 36px);
    gap: 16px;
    row-gap: 8px;
    font-family: Nunito;
}

.faixa ul{
    display: flex;
    text-decoration: none;
    list-style: none;
    margin: 0;
    font-size: 15px;
    margin-left: 20px;
}

.faixa ul li{
    padding: 8px;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-menu {
    display: flex;
    align-items: center;
    margin-left: auto;
    gap: 12px;
}

.user-menu__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    text-decoration: none;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04));
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.88);
    transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease, border 0.2s ease;
}

.user-menu__link:hover,
.user-menu__link:focus {
    background: linear-gradient(135deg, rgba(255, 83, 112, 0.25), rgba(255, 255, 255, 0.1));
    border-color: rgba(255, 83, 112, 0.45);
    color: #fff;
    transform: translateY(-1px);
}

.user-menu__icon {
    width: 22px;
    height: 22px;
}

.user-menu__label {
    display: inline-flex;
    align-items: center;
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: color 0.2s ease;
}

.user-menu__label:hover,
.user-menu__label:focus {
    color: #fff;
    text-decoration: none;
}



.user-account {
    margin-left: auto;
    position: relative;
    display: inline-flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.92);
}

.user-account--open {
    z-index: 10;
}

.user-account__trigger {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 18px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05));
    border: 0.3px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    backdrop-filter: blur(18px) saturate(180%);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    color: inherit;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    isolation: isolate;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
}

.user-account__trigger::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: 999px;
    box-shadow:
        inset 0 0 10px -8px rgba(255, 255, 255, 0.47);
}

.glassDiv::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: 999px;
    backdrop-filter: blur(2px);
    filter: url(#glass-distortion);
    isolation: isolate;
    -webkit-backdrop-filter: blur(var(--frost-blur));
    -webkit-filter: url("#glass-distortion");
}

.user-account__trigger:focus-visible {
    outline: none
}

.user-account__trigger:focus {
    outline: none
}


.user-account__trigger:hover,
.user-account__trigger:focus {
    border-color: rgba(255, 255, 255, 0.28);
    box-shadow: 0 12px 28px rgba(7, 12, 32, 0.32);
    transform: translateY(-1px);
}

.user-account__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: #fff;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.user-account__avatar svg {
    width: 20px;
    height: 20px;
}

.user-account__label {
    white-space: nowrap;
    font-size: 0.95rem;
    max-width: 100px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    vertical-align: middle;
    font-weight: 700;
    letter-spacing: 0.01em;
    text-align: left;
}

.user-account__chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    color: rgba(255, 255, 255, 0.7);
    transition: transform 0.25s ease;
}

.user-account__chevron svg {
    width: 18px;
    height: 18px;
}

.user-account--open .user-account__chevron {
    transform: rotate(180deg);
}



.user-account__dropdown {
    position: absolute;
    top: calc(100% + 16px);
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: clamp(260px, 32vw, 320px);
    min-width: 240px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-16px) scale(0.98);
    z-index: 30;
    background: rgba(255,255,255,0.10);
    border-radius: 32px;
    padding: 22px 18px 18px 18px;
    color: #fff;
    box-shadow:
        0 8px 32px 0 rgba(31, 38, 135, 0.37),
        0 1.5px 0 rgba(255,255,255,0.18),
        0 0.5px 0 rgba(0,0,0,0.10),
        0 0 0 1.5px rgba(255,255,255,0.10) inset;
    border: 1.5px solid rgba(255,255,255,0.22);
    backdrop-filter: blur(32px) saturate(180%) contrast(110%);
    -webkit-backdrop-filter: blur(32px) saturate(180%) contrast(110%);
    overflow: visible;
    transition: all 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
    isolation: isolate;
}

.user-account__dropdown::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 32px;
    background: radial-gradient(120% 120% at 10% -10%, rgba(255,255,255,0.22), transparent 60%),
                linear-gradient(135deg, rgba(255, 93, 124, 0.10), rgba(84, 118, 255, 0.10));
    mix-blend-mode: screen;
    pointer-events: none;
    z-index: 0;
}

.user-account__dropdown::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 32px;
    background: linear-gradient(120deg, rgba(255,255,255,0.08) 0%, transparent 80%);
    pointer-events: none;
    z-index: 1;
}

.user-account--open .user-account__dropdown {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1);
    transition-delay: 0s;
}

.user-account__profile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    color: rgba(12, 16, 36, 0.8);
    font-weight: 600;
    cursor: pointer;
    border-radius: 18px;
    background: linear-gradient(120deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08));
    border: 1.5px solid rgba(255,255,255,0.18);
    color: rgba(255,255,255,0.92);
    box-shadow:
        0 1.5px 0 rgba(255,255,255,0.18) inset,
        0 .5px 0 rgba(0,0,0,0.18);
    text-decoration:none;
    transition: transform .18s cubic-bezier(0.34, 1.56, 0.64, 1), background .18s, border-color .18s;
    position: relative;
    z-index: 2;
    font-size: 1.05rem;
}
.user-account__profile:hover,
.user-account__profile:focus-visible {
    background: linear-gradient(120deg, rgba(255,255,255,0.32), rgba(255,255,255,0.12));
    border-color: rgba(255,255,255,0.35);
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 8px 24px rgba(8, 12, 32, 0.18);
}

.user-account__divider {
    height: 1.5px;
    background: linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04));
    margin: 6px 0 0;
    border-radius: 2px;
    z-index: 2;
}

.user-account__logout {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 0;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(215, 23, 30, 0.98), rgba(120, 12, 18, 0.92));
    color: #fff;
    font-weight: 700;
    text-decoration: none;
    font-size: 1.08rem;
    letter-spacing: 0.01em;
    box-shadow: 0 4px 18px rgba(215, 23, 30, 0.18);
    border: 1.5px solid rgba(255,255,255,0.12);
    transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
    margin-top: 8px;
    z-index: 2;
}
.user-account__logout:hover,
.user-account__logout:focus-visible {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 8px 24px rgba(215, 23, 30, 0.28);
    background: linear-gradient(135deg, rgba(255, 23, 30, 1), rgba(120, 12, 18, 1));
}

@media (max-width: 600px) {
    .user-account__dropdown {
        min-width: 0;
        width: 98vw;
        left: 1vw;
        right: auto;
        padding: 14px 6px 10px 6px;
        border-radius: 18px;
    }
}

#user-dropdown::after{
  content:"";
  position:absolute; inset:0;
  border-radius: inherit;
  background:
    radial-gradient(120% 90% at 12% -10%, rgba(255,255,255,.22), transparent 58%),
    rgba(255,255,255,.06);         
  pointer-events:none;
  mix-blend-mode: screen;
}

.user-account__dropdown:before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(120% 120% at 10% -10%, rgba(255,255,255,.25), transparent 60%);
  mix-blend-mode: screen;
  pointer-events: none;
}

.user-account--open .user-account__dropdown {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0);
}


.user-account__name {
    font-weight: 700;
    font-size: 0.98rem;
    color: rgba(22, 24, 38, 0.85);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.user-account__profile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 14px;
    color: rgba(12, 16, 36, 0.8);
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border 0.2s ease;
    border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.08));
    border: 1px solid rgba(255,255,255,.18);
    color: rgba(255,255,255,.92);
    box-shadow:
    inset 0 1px 0 rgba(255,255,255,.18),
    0 .5px 0 rgba(0,0,0,.35);
    text-decoration:none;
    transition: transform .15s ease, background .15s ease, border-color .15s ease;
}

.user-account__profile svg {
    width: 18px;
    height: 18px;
}

.user-account__profile:hover,
.user-account__profile:focus-visible {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.12));
    border-color: rgba(255, 255, 255, 0.35);
    transform: translateY(-1px);
    box-shadow: 0 16px 30px rgba(8, 12, 32, 0.25);
}

.user-account__divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.35);
    margin: 2px 0 0;
}

.user-account__logout {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 12px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(215, 23, 30, 0.95), rgba(120, 12, 18, 0.9));
    color: #fff;
    font-weight: 700;
    text-decoration: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.user-account__logout:hover,
.user-account__logout:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(215, 23, 30, 0.35);
}




#menu a{
    color: rgb(247, 247, 247);
}

#menu ul li :hover{
    transition:60s;
}

#menu ul :hover{
    transition: 0.4s;
    background-color: rgba(77, 77, 77, 0.329);
    border-radius: 10px;
    text-decoration: none;
}

.menu-trigger {
    display: none;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease;
}

.menu-trigger img {
    width: 22px;
    height: 22px;
    display: block;
}

.menu-trigger:hover,
.menu-trigger:focus {
    background-color: rgba(77, 77, 77, 0.32);
    border-color: rgba(255, 255, 255, 0.08);
    transform: translateY(-1px);
}

.menu-trigger:focus-visible {
    outline: 2px solid rgba(255, 83, 112, 0.6);
    outline-offset: 3px;
}

.menu-panel {
    display: flex;
    align-items: center;
    gap: clamp(18px, 2vw, 26px);
    flex: 1 1 auto;
}

.menu-panel.hidden-menu,
.menu-panel.active-menu {
    opacity: 1;
    max-height: none;
    overflow: visible;
    pointer-events: auto;
    transform: none;
}

.menu-panel ul {
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
    gap: clamp(10px, 1.6vw, 18px);
}

.menu-panel ul li {
    padding: 0;
    overflow: visible;
}

.menu-panel__item {
    position: relative;
    overflow: visible;
}

.menu-panel__trigger {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
    color: rgba(255, 255, 255, 0.92);
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: 
        background 0.3s ease, 
        border-color 0.3s ease, 
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease;
}

.menu-panel__trigger::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.2), rgba(84, 118, 255, 0.2));
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
}

.menu-panel__trigger:hover::before,
.menu-panel__item--dropdown.is-open .menu-panel__trigger::before {
    opacity: 1;
}

.menu-panel__trigger:hover,
.menu-panel__trigger:focus {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
    border-color: rgba(255, 255, 255, 0.2);
    text-decoration: none;
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.menu-panel__item--dropdown.is-open .menu-panel__trigger {
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.15), rgba(84, 118, 255, 0.12));
    border-color: rgba(255, 255, 255, 0.22);
    color: #fff;
    box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.menu-panel__trigger:focus-visible {
    outline: 2px solid rgba(255, 83, 112, 0.4);
    outline-offset: 3px;
}

.menu-panel__trigger-icon {
    font-size: 0.85rem;
    transform: translateY(1px);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-panel__item--dropdown.is-open .menu-panel__trigger-icon {
    transform: rotate(180deg) translateY(-1px);
}

.menu-dropdown {
    position: absolute;
    top: calc(100% + 14px);
    left: 0;
    min-width: clamp(260px, 28vw, 320px);
    padding: 10px;
    border-radius: 24px;
    background: linear-gradient(155deg, rgba(18, 20, 38, 0.96), rgba(10, 12, 26, 0.94));
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 
        0 32px 64px rgba(0, 0, 0, 0.6),
        0 8px 16px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(28px) saturate(180%) contrast(110%);
    -webkit-backdrop-filter: blur(28px) saturate(180%) contrast(110%);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-12px) scale(0.96);
    pointer-events: none;
    transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
                transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
                visibility 0s linear 0.3s;
    z-index: 22;
    overflow: hidden;
}

.menu-dropdown::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: 
        radial-gradient(circle at 20% 15%, rgba(255, 100, 130, 0.22), transparent 45%),
        radial-gradient(circle at 80% 85%, rgba(100, 130, 255, 0.18), transparent 50%);
    mix-blend-mode: screen;
    pointer-events: none;
    opacity: 0.8;
}

.menu-dropdown::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
    pointer-events: none;
}

.menu-panel__item--dropdown.is-open .menu-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    transition-delay: 0s;
}

.menu-dropdown__content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 1;
}

.menu-dropdown__link {
    opacity: 0;
    transform: translateX(-10px);
    animation: none;
}

.menu-panel__item--dropdown.is-open .menu-dropdown__link {
    animation: slideInMenu 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.menu-panel__item--dropdown.is-open .menu-dropdown__link:nth-child(1) {
    animation-delay: 0.05s;
}

.menu-panel__item--dropdown.is-open .menu-dropdown__link:nth-child(2) {
    animation-delay: 0.1s;
}

.menu-panel__item--dropdown.is-open .menu-dropdown__link:nth-child(3) {
    animation-delay: 0.15s;
}

.menu-panel__item--dropdown.is-open .menu-dropdown__link:nth-child(4) {
    animation-delay: 0.2s;
}

@keyframes slideInMenu {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.menu-dropdown__link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(244, 245, 255, 0.92);
    text-decoration: none;
    font-size: 0.94rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: 
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease,
        border-color 0.3s ease,
        color 0.3s ease,
        box-shadow 0.3s ease;
}

.menu-dropdown__link::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.28), rgba(84, 118, 255, 0.24));
    opacity: 0;
    transform: translateY(100%);
    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: -1;
}

.menu-dropdown__link::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                                rgba(255, 255, 255, 0.15), 
                                transparent 60%);
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;
}

.menu-dropdown__link:not(.menu-dropdown__link--surprise)::after {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
                                transparent, 
                                rgba(255, 255, 255, 0.15) 50%, 
                                transparent);
    opacity: 0;
    transition: left 0.6s ease, opacity 0.3s ease;
    pointer-events: none;
}

.menu-dropdown__link:not(.menu-dropdown__link--surprise):hover::after {
    left: 100%;
    opacity: 1;
}

.menu-dropdown__link:hover::before,
.menu-dropdown__link:focus::before {
    opacity: 1;
    transform: translateY(0);
}

.menu-dropdown__link:hover::after,
.menu-dropdown__link:focus::after {
    opacity: 1;
}

.menu-dropdown__link:hover,
.menu-dropdown__link:focus {
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.18), rgba(84, 118, 255, 0.16));
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
    text-decoration: none;
    transform: translateX(4px) translateY(-1px);
    box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(255, 93, 124, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.menu-dropdown__link.is-active {
    background: linear-gradient(135deg, rgba(255, 96, 96, 0.42), rgba(104, 126, 255, 0.38));
    border-color: rgba(255, 255, 255, 0.28);
    color: #fff;
    box-shadow: 
        0 12px 32px rgba(9, 9, 28, 0.5),
        0 4px 12px rgba(255, 96, 96, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.15),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    font-weight: 600;
}

.menu-dropdown__link.is-active::before {
    opacity: 0.6;
    transform: translateY(0);
}

.menu-dropdown__label {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: center;
    position: relative;
}

.menu-dropdown__link:not(.menu-dropdown__link--surprise) .menu-dropdown__label::before {
    content: "";
    position: absolute;
    left: -12px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.8), rgba(84, 118, 255, 0.8));
    opacity: 0;
    transform: scale(0);
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-dropdown__link:not(.menu-dropdown__link--surprise):hover .menu-dropdown__label::before,
.menu-dropdown__link:not(.menu-dropdown__link--surprise).is-active .menu-dropdown__label::before {
    opacity: 1;
    transform: scale(1);
}

  .menu-dropdown__label.surprise {
      font-family: 'JetBrains Mono', sans-serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
  }

  .menu-dropdown__link--surprise {
      position: relative;
      overflow: hidden;
      background: #050509;
      border: 1px solid rgba(148, 140, 255, 0.22);
      color: #fff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
      isolation: isolate;
  }

  .menu-dropdown__link--surprise .menu-dropdown__label {
      position: relative;
      z-index: 2;
      color: inherit;
      text-shadow: none;
      transition: text-shadow 0.4s ease;
  }

  @media (hover: hover) {
      .menu-dropdown__link--surprise {
          transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
      }

      .menu-dropdown__link--surprise::before {
          content: "";
          position: absolute;
          inset: -40% -28%;
          background:
              radial-gradient(circle at 18% 22%, rgba(54, 240, 255, 0.55) 0%, rgba(54, 240, 255, 0) 60%),
              radial-gradient(circle at 82% 30%, rgba(162, 61, 255, 0.5) 0%, rgba(162, 61, 255, 0) 62%),
              radial-gradient(circle at 48% 86%, rgba(38, 104, 255, 0.45) 0%, rgba(38, 104, 255, 0) 58%);
          opacity: 0;
          transform: scale(0.92);
          transition: opacity 0.45s ease, transform 0.45s ease;
          z-index: 0;
      }

      .menu-dropdown__link--surprise::after {
          content: "";
          position: absolute;
          inset: -18%;
          background-image:
              radial-gradient(1.6px 1.6px at 18% 28%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0)),
              radial-gradient(1.2px 1.2px at 36% 74%, rgba(177, 220, 255, 0.9), rgba(177, 220, 255, 0)),
              radial-gradient(2px 2px at 68% 32%, rgba(255, 132, 227, 0.85), rgba(255, 132, 227, 0)),
              radial-gradient(1.3px 1.3px at 84% 78%, rgba(147, 236, 255, 0.82), rgba(147, 236, 255, 0)),
              radial-gradient(1px 1px at 56% 46%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0)),
              radial-gradient(1.4px 1.4px at 28% 56%, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0));
          opacity: 0;
          mix-blend-mode: screen;
          animation: surprise-stars 3.8s ease-in-out infinite alternate;
          animation-play-state: paused;
          z-index: 1;
      }

      .menu-dropdown__link--surprise:hover,
      .menu-dropdown__link--surprise:focus-visible {
          background: #050509;
          transform: translateX(4px);
          border-color: rgba(170, 160, 255, 0.65);
          box-shadow: 0 22px 44px rgba(26, 20, 62, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      }

      .menu-dropdown__link--surprise:hover::before,
      .menu-dropdown__link--surprise:focus-visible::before {
          opacity: 1;
          transform: scale(1.02);
      }

      .menu-dropdown__link--surprise:hover::after,
      .menu-dropdown__link--surprise:focus-visible::after {
          opacity: 1;
          animation-play-state: running;
      }

      .menu-dropdown__link--surprise:hover .menu-dropdown__label,
      .menu-dropdown__link--surprise:focus-visible .menu-dropdown__label {
          text-shadow: 0 0 12px rgba(164, 190, 255, 0.65), 0 0 22px rgba(255, 135, 222, 0.55);
      }
  }

  @media (hover: hover) and (prefers-reduced-motion: reduce) {
      .menu-dropdown__link--surprise,
      .menu-dropdown__link--surprise::before,
      .menu-dropdown__link--surprise::after {
          transition-duration: 0s !important;
      }

      .menu-dropdown__link--surprise::after {
          animation: none;
      }
  }

  @keyframes surprise-stars {
      0% {
          transform: translate3d(-4px, -3px, 0) scale(0.96);
          opacity: 0.8;
      }

      50% {
          transform: translate3d(4px, 3px, 0) scale(1.04);
          opacity: 1;
      }

      100% {
          transform: translate3d(-3px, 4px, 0) scale(0.98);
          opacity: 0.85;
      }
  }

.menu-dropdown__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: linear-gradient(135deg, rgba(250, 74, 100, 0.75), rgba(110, 134, 255, 0.68));
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: #fff;
    box-shadow: 
        0 6px 16px rgba(250, 74, 100, 0.4),
        0 2px 6px rgba(8, 7, 18, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
    0%, 100% {
        box-shadow: 
            0 6px 16px rgba(250, 74, 100, 0.4),
            0 2px 6px rgba(8, 7, 18, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
    50% {
        box-shadow: 
            0 8px 20px rgba(250, 74, 100, 0.55),
            0 3px 8px rgba(8, 7, 18, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
}

@media (hover: hover) {
    .menu-panel__item--dropdown:hover .menu-panel__trigger,
    .menu-panel__item--dropdown:focus-within .menu-panel__trigger {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.12);
    }
}

@media (prefers-reduced-motion: reduce) {
    .menu-dropdown,
    .menu-dropdown__link,
    .menu-panel__trigger,
    .menu-panel__trigger-icon,
    .menu-dropdown__link::before,
    .menu-dropdown__link::after,
    .menu-panel__trigger::before {
        transition-duration: 0.01s !important;
        animation: none !important;
    }
    
    .menu-dropdown__badge {
        animation: none !important;
    }
}

@media (max-width: 760px) {
    .faixa {
        position: relative;
        flex-wrap: nowrap;
        gap: 12px;
        justify-content: space-between;
        align-items: center;
    }

    .menu-trigger {
        display: inline-flex;
        order: 1;
        margin-right: auto;
    }

    .dashboard-logo {
        order: 2;
        padding: 0;
        --wyw-brand-size: clamp(1.2rem, 6vw, 1.6rem);
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    .dashboard-logo .wyw-brand__where,
    .dashboard-logo .wyw-brand__watch {
        display: none;
    }

    .dashboard-logo .wyw-brand__eye {
        width: 32px;
        height: auto;
        transform: scale(1.05);
    }

    .user-menu {
        order: 3;
        margin-left: 0;
        margin-left: auto;
    }

    .user-menu__link {
        width: 36px;
        height: 36px;
    }

    .user-menu__label {
        display: none;
    }

    .user-account {
        order: 3;
        margin-left: auto;
    }

    .user-account__label {
        display: none;
    }

    .user-account__chevron {
        display: none;
    }

    .user-account__trigger {
        gap: 0;
        padding: 6px 10px;
    }

    .user-account__dropdown {
        left: auto;
        right: 0;
        width: clamp(220px, 72vw, 280px);
    }

    .menu-panel {
        order: 4;
        position: absolute;
        top: calc(100% + 10px);
        left: clamp(12px, 5vw, 24px);
        right: clamp(12px, 5vw, 24px);
        flex-direction: column;
        align-items: stretch;
        gap: 18px;
        padding: 18px clamp(16px, 6vw, 22px);
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(26, 28, 48, 0.96), rgba(18, 18, 32, 0.94));
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
        transition: opacity 0.3s ease, max-height 0.3s ease, transform 0.3s ease;
        z-index: 20;
    }

    .menu-panel.hidden-menu {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        pointer-events: none;
        transform: translateY(-6px);
    }

    .menu-panel.active-menu {
        opacity: 1;
        max-height: 600px;
        pointer-events: auto;
        transform: translateY(0);
    }

    .menu-panel ul {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }

    .menu-panel__item {
        width: 100%;
    }

    .menu-panel__trigger {
        width: 100%;
        justify-content: space-between;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.06);
    }

    .menu-dropdown {
        position: static;
        width: 100%;
        margin-top: 10px;
        transform: none;
        box-shadow: none;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        max-height: 0;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.08);
        overflow: hidden;
        transition: opacity 0.25s ease, max-height 0.35s ease, padding 0.35s ease;
    }

    .menu-panel__item--dropdown.is-open .menu-dropdown {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        max-height: 500px;
        padding: 14px;
    }

    .menu-dropdown__link {
        padding: 14px;
    }

    #search-div {
        flex: 1 1 auto;
        margin: 0;
        max-width: none;
    }

    #search-div .search-results {
        top: calc(100% + 12px);
        left: 0;
        right: 0;
        width: 100%;
        max-width: none;
    }
}
@media screen and (max-width: 500px) {
  .dashboard-logo {
    --wyw-brand-size: clamp(1.1rem, 5vw, 1.4rem);
    gap: 8px;
  }

}

/* Search Bar*/
#search-div {
    flex: 1 1 320px;
    min-width: 220px;
    max-width: 560px;
    margin: 0 clamp(12px, 3vw, 32px);
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.search-panel {
    position: relative;
    width: 100%;
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: clamp(12px, 1.2vw, 16px);
    padding: clamp(5px, 0.3vw, 8px) clamp(5px, 0.5vw, 10px);
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05)); /*Glass transparency*/
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.034);
    border-radius: 10px;
    color: #f5f6ff;
    transition: box-shadow 0.25s ease, transform 0.25s ease;
    overflow: hidden;
}

.search-input-wrapper::after {
    content: "";
    position: absolute;
    inset: auto 18px -26px 18px;
    height: 60px;
    border-radius: 50%;
    opacity: 0.6;
    pointer-events: none;
}

.search-input-wrapper:focus-within {
    box-shadow: 0 20px 40px rgba(140, 26, 38, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.18);
    transform: translateY(-1px);
}

.search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.82);
}

.search-icon svg {
    width: clamp(18px, 2vw, 22px);
    height: clamp(18px, 2vw, 22px);
}

.search-bar {
    flex: 1;
    background: transparent;
    border: none;
    color: #f5f6ff;
    font-size: clamp(0.95rem, 1.4vw, 1.05rem);
    font-weight: 500;
    padding: 0;
    caret-color: #ff647c;
}

.search-bar:focus {
    outline: none;
}

.search-bar::placeholder {
    color: rgba(255, 255, 255, 0.55);
    font-weight: 400;
}

.clear-search {
    width: clamp(34px, 3vw, 40px);
    height: clamp(34px, 3vw, 40px);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.92);
}

.clear-search svg {
    width: 14px;
    height: 14px;
}

.clear-search:focus-visible {
    outline: 2px solid rgba(255, 100, 124, 0.8);
    outline-offset: 3px;
}

.search-input-wrapper.has-text .clear-search {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
}

#search-div .search-results {
    position: absolute;
    top: calc(100% + 14px);
    left: 0;
    right: 0;
    width: 100%;
    max-height: min(calc(100vh - 160px), 480px);
    overflow-y: auto;
    padding: 8px;
    border-radius: 20px;
    background: linear-gradient(155deg, rgba(14, 16, 30, 0.98), rgba(8, 10, 22, 0.96));
    box-shadow: 
        0 28px 64px rgba(0, 0, 0, 0.7),
        0 8px 24px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(32px) saturate(180%) contrast(110%);
    -webkit-backdrop-filter: blur(32px) saturate(180%) contrast(110%);
    overscroll-behavior: contain;
    z-index: 999;
    animation: searchDropdownIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes searchDropdownIn {
    from {
        opacity: 0;
        transform: translateY(-12px) scale(0.96);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

#search-div .search-results::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: 
        radial-gradient(circle at 15% 20%, rgba(255, 80, 110, 0.18), transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(186, 85, 211, 0.12), transparent 45%);
    mix-blend-mode: screen;
    pointer-events: none;
    opacity: 0.9;
}

#search-div .search-results::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, transparent 60%);
    pointer-events: none;
}

#search-div .search-results::-webkit-scrollbar {
    width: 8px;
}

#search-div .search-results::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 999px;
    margin: 8px 0;
}

#search-div .search-results::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(255, 93, 124, 0.45), rgba(186, 85, 211, 0.4));
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
    transition: background 0.3s ease;
}

#search-div .search-results::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(255, 93, 124, 0.65), rgba(186, 85, 211, 0.6));
    background-clip: padding-box;
}

.search-result-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    isolation: isolate;
}

/* Borda gradiente animada */
.search-result-card::after {
    content: "";
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(135deg, 
                                rgba(255, 93, 124, 0.6), 
                                rgba(186, 85, 211, 0.5),
                                rgba(255, 93, 124, 0.6));
    background-size: 200% 200%;
    -webkit-mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s ease;
    animation: borderGradient 3s ease infinite;
    pointer-events: none;
    z-index: 1;
}

@keyframes borderGradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

.search-result-card:hover::after {
    opacity: 1;
}

.search-result-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.15), rgba(186, 85, 211, 0.1));
    opacity: 0;
    transform: translateY(100%);
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: -1;
    border-radius: inherit;
}

.search-result-card + .search-result-card {
    margin-top: 6px;
}

.search-result-card:hover::before {
    opacity: 1;
    transform: translateY(0);
}

.search-result-card:hover::after {
    opacity: 1;
}

.search-result-card:hover {
    transform: translateX(4px);
    border-color: rgba(255, 255, 255, 0);
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.1), rgba(186, 85, 211, 0.08));
    box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.4),
        0 2px 8px rgba(255, 93, 124, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.search-result-card:active {
    transform: translateX(2px) scale(0.98);
}

.search-result-card img {
    width: 70px;
    height: 100px;
    min-width: 70px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 
        0 8px 20px rgba(0, 0, 0, 0.5),
        0 2px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
    z-index: 1;
}

.search-result-card:hover img {
    transform: scale(1.05) translateY(-2px);
    box-shadow: 
        0 12px 28px rgba(0, 0, 0, 0.6),
        0 4px 12px rgba(255, 93, 124, 0.2);
}

.search-result-card figure {
    margin: 0;
    position: relative;
}

.search-result-card figure::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.15), rgba(186, 85, 211, 0.1));
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

.search-result-card:hover figure::after {
    opacity: 1;
}

/* Ícone de play sutil no hover */
.result-info::after {
    content: "▶";
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%) translateX(10px);
    color: rgba(255, 93, 124, 0.8);
    font-size: 1.2rem;
    opacity: 0;
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
}

.search-result-card:hover .result-info::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
}

.search-view-all {
    margin-top: clamp(12px, 1.2vw, 16px);
    width: 100%;
    padding: 12px 18px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(216, 8, 20, 0.92), rgba(255, 92, 141, 0.85));
    border: none;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
    box-shadow: 0 18px 36px rgba(210, 49, 92, 0.35);
}

.search-view-all:hover,
.search-view-all:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 22px 40px rgba(210, 49, 92, 0.4);
    filter: brightness(1.05);
}

.search-view-all:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.4);
    outline-offset: 3px;
}




.result-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: #f4f4f7;
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
}

.result-title {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.95);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.3s ease;
}

.search-result-card:hover .result-title {
    color: #fff;
    text-shadow: 0 0 8px rgba(255, 93, 124, 0.3);
}

.result-tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}

.result-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
}

.chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
    white-space: nowrap;
    transition: all 0.25s ease;
}

.chip--type {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.85), rgba(185, 28, 28, 0.75));
    border-color: rgba(255, 100, 100, 0.3);
    color: #fff;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.search-result-card:hover .chip--type {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.85));
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45);
    transform: translateY(-1px);
}

.chip--year {
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.65), rgba(220, 38, 38, 0.55));
    border-color: rgba(255, 120, 140, 0.25);
    color: #fff;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(255, 93, 124, 0.25);
}

.search-result-card:hover .chip--year {
    background: linear-gradient(135deg, rgba(255, 120, 150, 0.75), rgba(239, 68, 68, 0.65));
    box-shadow: 0 4px 12px rgba(255, 93, 124, 0.4);
    transform: translateY(-1px);
}

.chip--genre {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
}

.search-result-card:hover .chip--genre {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.95);
}

.search-empty {
    margin: 0;
    padding: 50px 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.95rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    position: relative;
}

.search-empty::before {
    content: "";
    width: 80px;
    height: 80px;
    display: block;
    background: 
        radial-gradient(circle at 30% 30%, rgba(255, 93, 124, 0.15), transparent 60%),
        radial-gradient(circle at 70% 70%, rgba(186, 85, 211, 0.12), transparent 60%);
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.08);
    position: relative;
    opacity: 0.6;
}

.search-empty::after {
    content: "🔍";
    position: absolute;
    top: 50px;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2.5rem;
    opacity: 0.4;
}

.search-empty p {
    margin: 0;
    line-height: 1.6;
}

.search-view-all {
    margin-top: 8px;
    width: 100%;
    padding: 13px 18px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.85));
    border: 1px solid rgba(255, 100, 100, 0.3);
    color: #fff;
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 
        0 8px 20px rgba(220, 38, 38, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: hidden;
    isolation: isolate;
}

.search-view-all::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
                                transparent, 
                                rgba(255, 255, 255, 0.25) 50%, 
                                transparent);
    transition: left 0.6s ease;
}

.search-view-all::after {
    content: "→";
    position: absolute;
    right: 18px;
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    font-size: 1.2rem;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.search-view-all:hover::before {
    left: 100%;
}

.search-view-all:hover::after {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
}

.search-view-all:hover,
.search-view-all:focus-visible {
    transform: translateY(-2px);
    padding-right: 40px;
    box-shadow: 
        0 12px 28px rgba(220, 38, 38, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    background: linear-gradient(135deg, rgba(248, 113, 113, 0.95), rgba(239, 68, 68, 0.9));
    border-color: rgba(255, 120, 120, 0.4);
}

.search-view-all:active {
    transform: translateY(0) scale(0.98);
}

.search-view-all:focus-visible {
    outline: 2px solid rgba(255, 100, 100, 0.6);
    outline-offset: 3px;
}

/* Responsividade para busca */
@media (max-width: 1000px) {
    #search-div {
        flex: 1 1 100%;
        margin: 0;
        max-width: none;
    }

    #search-div .search-results {
        top: calc(100% + 12px);
        left: 0;
        right: 0;
        width: 100%;
        max-width: none;
    }
}

@media (max-width: 600px) {
    .search-result-card img {
        width: 60px;
        height: 85px;
        min-width: 60px;
    }
    
    .result-title {
        font-size: 0.95rem;
        -webkit-line-clamp: 1;
    }
    
    .chip {
        padding: 3px 8px;
        font-size: 0.7rem;
    }
    
    .chip--type,
    .chip--year {
        font-size: 0.65rem;
    }
}

/* Acessibilidade - movimento reduzido */
@media (prefers-reduced-motion: reduce) {
    #search-div .search-results,
    .search-result-card,
    .search-result-card::before,
    .search-result-card::after,
    .search-result-card img,
    .chip,
    .search-view-all,
    .search-view-all::before {
        transition-duration: 0.01s !important;
        animation: none !important;
    }
}

/* Estado de foco para acessibilidade */
.search-result-card:focus-visible {
    outline: 2px solid rgba(255, 93, 124, 0.8);
    outline-offset: 3px;
    border-color: rgba(255, 93, 124, 0.4);
}

/* Animação de entrada para os cards */
@keyframes cardSlideIn {
    from {
        opacity: 0;
        transform: translateX(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.search-result-card {
    animation: cardSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.search-result-card:nth-child(1) { animation-delay: 0.05s; }
.search-result-card:nth-child(2) { animation-delay: 0.1s; }
.search-result-card:nth-child(3) { animation-delay: 0.15s; }
.search-result-card:nth-child(4) { animation-delay: 0.2s; }
.search-result-card:nth-child(5) { animation-delay: 0.25s; }
.search-result-card:nth-child(n+6) { animation-delay: 0.3s; }

/* Estado vazio melhorado */
.search-empty strong {
    color: rgba(255, 255, 255, 0.75);
    font-weight: 600;
}

/* Loading state - skeleton cards animados */
.search-results--loading {
    padding: 8px;
}

.search-loading-skeleton {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 6px;
    position: relative;
    overflow: hidden;
}

.search-loading-skeleton::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 93, 124, 0.08) 25%,
        rgba(186, 85, 211, 0.08) 50%,
        rgba(255, 93, 124, 0.08) 75%,
        transparent 100%
    );
    animation: skeletonShimmer 2s ease-in-out infinite;
    transform: translateX(-100%);
}

@keyframes skeletonShimmer {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(200%);
    }
}

.skeleton-image {
    width: 70px;
    height: 100px;
    min-width: 70px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
    position: relative;
    overflow: hidden;
}

.skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.skeleton-title {
    height: 20px;
    width: 70%;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
}

.skeleton-tags {
    display: flex;
    gap: 6px;
}

.skeleton-tag {
    height: 24px;
    width: 60px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
}

.skeleton-tag:nth-child(2) {
    width: 45px;
}

.skeleton-tag:nth-child(3) {
    width: 80px;
}

/* Indicador de busca ativa no input */
.search-input-wrapper.is-searching::after {
    content: "";
    position: absolute;
    right: 54px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: rgba(255, 93, 124, 0.9);
    border-right-color: rgba(186, 85, 211, 0.8);
    border-radius: 50%;
    animation: searchInputSpinner 0.8s linear infinite;
}

@keyframes searchInputSpinner {
    to { transform: translateY(-50%) rotate(360deg); }
}

/* Tooltip hover - melhor feedback visual */
.search-result-card[data-title]::before {
    content: attr(data-title);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.92);
    color: #fff;
    font-size: 0.8rem;
    border-radius: 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 1000;
}

.search-result-card[data-title]:hover::before {
    opacity: 0;
    transform: translateX(-50%) translateY(0);
}

/* Header do dropdown com contador de resultados (opcional) */
.search-results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 10px 8px;
    margin-bottom: 4px;
    position: sticky;
    top: 0;
    background: linear-gradient(180deg, rgba(14, 16, 30, 0.98), rgba(14, 16, 30, 0.85));
    backdrop-filter: blur(12px);
    z-index: 10;
    border-radius: 16px 16px 0 0;
}

.search-results-count {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
}

.search-results-count strong {
    color: rgba(255, 93, 124, 0.95);
    font-weight: 700;
}




.dashboard-logo {
  --wyw-brand-size: clamp(1.35rem, 2.2vw, 1.8rem);
  --wyw-brand-eye-scale: 0.5;
  gap: 10px;
  align-items: center;
}

.dashboard-logo .wyw-brand__watch {
  text-shadow: none;
}
.home-header,
.home-header:hover,
.home-header:focus,
.home-header:visited {
    text-decoration: none;
}

</style>

<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$currentScript = basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');
$navStates = [
    'home' => $currentScript === 'index.php',
    'providers' => $currentScript === 'providers.php',
];
?>
<nav id="menu">
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
    <div class="faixa">
        <button class="menu-trigger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-buttons">
            <img src="imagens/menu-icon.png" alt="Menu" id="menuIcon" width="30px">
        </button>

        <a href="index.php" class="wyw-brand wyw-brand--menu dashboard-logo home-header" aria-label="Ir para a pagina inicial">
            <span class="wyw-brand__where">where</span>
            <span class="wyw-brand__where wyw-brand__where--y">y</span>
            <img src="imagens/eye-icon2.svg" alt="o" class="wyw-brand__eye" />
            <span class="wyw-brand__where wyw-brand__where--u">u</span>
            <span class="wyw-brand__watch">WATCH</span>
        </a>

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
                                href="index.php#surprise-me"
                                class="menu-dropdown__link"
                                role="menuitem"
                            >
                                <span class="menu-dropdown__label">Surpreenda-me</span>
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
            $userName = htmlspecialchars($_SESSION['nome'], ENT_QUOTES, 'UTF-8');
            echo '<div class="user-account" data-user-menu>';
            echo '    <button type="button" class="user-account__trigger" aria-haspopup="true" aria-expanded="false">';
            echo '        <span class="user-account__avatar" aria-hidden="true">';
            echo '            <svg viewBox="0 0 24 24" aria-hidden="true">';
            echo '                <path d="M12 12.75c2.071 0 3.75-1.679 3.75-3.75S14.071 5.25 12 5.25 8.25 6.929 8.25 9s1.679 3.75 3.75 3.75Zm0" fill="currentColor"/>';
            echo '                <path d="M12 14.25c-2.824 0-8.25 1.418-8.25 4.242V21h16.5v-2.508c0-2.824-5.426-4.242-8.25-4.242Z" fill="currentColor" />';
            echo '            </svg>';
            echo '        </span>';
            echo '        <span class="user-account__label">Olá, ' . $userName . '</span>';
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

<div id="searchResults" style="display: none;"></div>

<div id="loadingOverlay" class="loading-overlay is-hidden" role="status" aria-live="polite" aria-hidden="true">
    <div class="loading-content">
        <div class="iris">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1036.96 1068.64">
                <defs>
                    <style>
                        .fil1 {fill:#FEFEFE;}
                        .fil0 {fill:#D80814;}
                        .eyelid { transform-origin: center; animation: blink 1s infinite; }
                        @keyframes blink {
                            0%, 90%, 100% { transform: scaleY(1); }
                            95% { transform: scaleY(0.1); }
                        }
                    </style>
                </defs>
                <g id="Camada_1">
                    <g class="eyelid">
                        <path class="fil0" d="M532.42 0.03c-322.51,-0.12 -481.5,242.15 -531.95,492.2 347.34,-325.33 697.1,-320.9 1036.48,2.01 -30.69,-257.9 -229.35,-497.39 -504.53,-494.21z"/>
                    </g>
                    <path class="fil1" d="M531.95 1068.61c-322.51,0.12 -481.5,-242.15 -531.95,-492.2 347.34,325.33 697.1,320.9 1036.49,-2.01 -30.69,257.9 -229.36,497.39 -504.53,494.21z"/>
                    <ellipse class="fil0" cx="512.12" cy="527.36" rx="191.4" ry="191.94"/>
                </g>
            </svg>
        </div>
        <p>Carregando...</p>
    </div>
</div>


<style>
    
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
    top: calc(100% + 12px);
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: clamp(240px, 28vw, 280px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-10px);
    z-index: 20;
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.24), rgba(84, 118, 255, 0.24));
    backdrop-filter: blur(26px) saturate(160%) contrast(108%);
    -webkit-backdrop-filter: blur(26px) saturate(160%) contrast(108%);
    box-shadow:
    0 18px 40px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.18);
    border-radius: 20px;
    padding: 10px;
    color: #fff;
    transition: all 0.25s ease;

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
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.04);
    color: inherit;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
}

.menu-panel__trigger:hover,
.menu-panel__trigger:focus {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
    text-decoration: none;
    color: #fff;
    transform: translateY(-1px);
}

.menu-panel__trigger:focus-visible {
    outline: 2px solid rgba(255, 83, 112, 0.4);
    outline-offset: 3px;
}

.menu-panel__trigger-icon {
    font-size: 0.85rem;
    transform: translateY(1px);
    transition: transform 0.25s ease;
}

.menu-panel__item--dropdown.is-open .menu-panel__trigger-icon {
    transform: rotate(180deg);
}

.menu-dropdown {
    position: absolute;
    top: calc(100% + 14px);
    left: 0;
    min-width: clamp(240px, 26vw, 300px);
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(155deg, rgba(24, 26, 44, 0.92), rgba(14, 16, 30, 0.88));
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 28px 60px rgba(6, 5, 20, 0.55);
    backdrop-filter: blur(20px) saturate(170%);
    -webkit-backdrop-filter: blur(20px) saturate(170%);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    pointer-events: none;
    transition: opacity 0.25s ease, transform 0.25s ease, visibility 0s linear 0.25s;
    z-index: 22;
    overflow: hidden;
}

.menu-dropdown::before {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: inherit;
    background: radial-gradient(circle at top right, rgba(255, 90, 120, 0.18), transparent 55%);
    mix-blend-mode: screen;
    pointer-events: none;
}

.menu-panel__item--dropdown.is-open .menu-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
    transition-delay: 0s;
}

.menu-dropdown__content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.menu-dropdown__link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid transparent;
    color: rgba(244, 245, 255, 0.88);
    text-decoration: none;
    font-size: 0.92rem;
    letter-spacing: 0.01em;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.menu-dropdown__link:hover,
.menu-dropdown__link:focus {
    background: linear-gradient(135deg, rgba(255, 93, 124, 0.24), rgba(84, 118, 255, 0.24));
    border-color: rgba(255, 255, 255, 0.16);
    color: #fff;
    text-decoration: none;
    transform: translateX(2px);
}

.menu-dropdown__link.is-active {
    background: linear-gradient(135deg, rgba(255, 96, 128, 0.32), rgba(104, 126, 255, 0.3));
    border-color: rgba(255, 255, 255, 0.22);
    color: #fff;
    box-shadow: 0 18px 42px rgba(9, 9, 28, 0.42);
}

.menu-dropdown__label {
    flex: 1 1 auto;
    display: inline-flex;
    align-items: center;
}

.menu-dropdown__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: linear-gradient(135deg, rgba(255, 120, 140, 0.65), rgba(110, 134, 255, 0.58));
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: #fff;
    box-shadow: 0 8px 20px rgba(8, 7, 18, 0.45);
}

@media (hover: hover) {
    .menu-panel__item--dropdown:hover .menu-panel__trigger,
    .menu-panel__item--dropdown:focus-within .menu-panel__trigger {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.12);
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
    top: calc(100% + 16px);
    left: 0;
    right: 0;
    width: 100%;
    max-height: clamp(280px, 36vh, 400px);
    max-height: min(calc(100vh - 140px), 420px);
    overflow-y: auto;
    padding: clamp(10px, 1.5vw, 18px);
    border-radius: 15px;
    background: linear-gradient(135deg, rgba(16, 18, 32, 0.95), rgba(12, 12, 20, 0.88));
    box-shadow: 0 24px 48px rgba(5, 4, 14, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    overscroll-behavior: contain;
    z-index: 999;
}

#search-div .search-results::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at top right, rgba(255, 64, 87, 0.16), transparent 45%);
    pointer-events: none;
}

#search-div .search-results::-webkit-scrollbar {
    width: 6px;
}

#search-div .search-results::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
}

.search-result-card {
    display: grid;
    grid-template-columns: clamp(64px, 6vw, 80px) 1fr;
    gap: clamp(12px, 1.4vw, 18px);
    padding: clamp(12px, 1.3vw, 18px);
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(36, 38, 56, 0.75), rgba(18, 20, 34, 0.85));
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

.search-result-card + .search-result-card {
    margin-top: clamp(8px, 1vw, 12px);
}

.search-result-card::after {
    content: "";
    position: absolute;
    inset: auto -30px -50px;
    height: 120px;
    background: radial-gradient(circle, rgba(0, 0, 0, 0.28) 0%, rgba(255, 83, 112, 0) 60%);
    opacity: 0;
    transition: opacity 0.25s ease;
}

.search-result-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.12);
    background: linear-gradient(135deg, rgba(48, 50, 72, 0.86), rgba(24, 26, 42, 0.9));
}

.search-result-card:hover::after {
    opacity: 1;
}

.search-result-card img {
    width: 100%;
    height: clamp(88px, 10vh, 104px);
    object-fit: cover;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
}
.search-result-card figure {
    margin: 0;
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
    gap: clamp(6px, 0.9vw, 9px);
    color: #f4f4f7;
}

.result-title {
    font-size: clamp(1rem, 1.6vw, 1.1rem);
    font-weight: 600;
    margin: 0;
    line-height: 1.4;
}

.result-tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.result-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 0.78rem;
    letter-spacing: 0.01em;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.82);
}

.chip--type {
    background: linear-gradient(135deg, rgba(140, 35, 45, 0.92), rgba(210, 55, 66, 0.8));
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
}

.chip--year {
    background: linear-gradient(135deg, rgba(58, 58, 140, 0.92), rgba(94, 94, 180, 0.78));
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
}

.chip--genre {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.76);
}

.search-empty {
    margin: 0;
    padding: clamp(16px, 2vw, 20px);
    text-align: center;
    color: rgba(255, 255, 255, 0.68);
    font-size: clamp(0.9rem, 1.4vw, 1rem);
}


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

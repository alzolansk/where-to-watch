# 🎬 Where You Watch • [whereuwatch.com](http://www.whereuwatch.com)

O **Where You Watch (WYWatch)** é um projeto pessoal desenvolvido para ajudar os usuários a **descobrirem onde assistir filmes e séries** em diferentes serviços de streaming.  
A ideia nasceu de uma dor minha: perder tempo procurando qual titulo assistir e em qual plataforma este título está disponível.

Com **design responsivo**, **interface amigável** e **integração avançada com a API do TMDB**, o WYWatch oferece uma experiência prática, rápida e visualmente envolvente, com recursos de personalização e descoberta inteligente de conteúdo.

---

## 🔍 Funcionalidades atuais

### 🧭 Núcleo do sistema
- **Busca instantânea** via TMDB (`/search/multi`) com resultados em tempo real;
- **Página de resultados detalhada** com filtros por gênero, tipo de mídia e ano;
- **Página de detalhes do título** (filme ou série) com:
  - Trailer integrado (YouTube Embed);
  - Elenco principal e ficha técnica;
  - Gêneros, sinopse e nota de avaliação;
  - Provedores oficiais de streaming e aluguel;
  - Links diretos para a plataforma do título (Netflix, Prime Video etc.);
- **Página de atores/diretores** com biografia, filmografia e linha do tempo de carreira;
- **Listas dinâmicas** (tendências, populares, melhor avaliados);
- **Navegação fluida e cache de sessões** com `localStorage` e `Service Worker`.

---

### 🤖 Personalização e recomendações
- Sistema de **onboarding**: coleta preferências de gênero, palavras-chave, provedores e favoritos;
- **Recomendações personalizadas** via `/api/recommendations.php`;
- Salvamento e edição de preferências em `/api/preferences.php`;
- **Histórico leve local** de interações e filtros recentes.

---

### 🌠 Modo “Surpreenda-me”
- Módulo de descoberta aleatória com efeito de **roleta animada**;
- Gera uma sugestão exclusiva por meio da API interna `/api/surprise.php`;
- Exibe painel interativo com:
  - Descrição breve;
  - Gêneros e “insight” do motivo da recomendação;
  - Provedores disponíveis e pontuação heurística;
- Suporte a **dois modos de mídia** (filmes e séries);
- Pool de pôsteres gerado por `/api/roulette-posters.php` para transições suaves.

---

### 💾 Performance e otimização
- **Service Worker** para cache de imagens e scripts;
- **Lazy Load** em pôsteres e cards para ganho de performance;
- **AbortController** em buscas, cancelando requisições antigas;
- **Armazenamento local e sessão** para preferências, cache de roleta e estado de login.

---

### 🎨 Experiência e identidade
- Interface em **modo claro e escuro** com troca automática;
- **Identidade visual exclusiva** com ícone animado “olho” (marca WYWatch);
- Layout responsivo e moderno, com animações e microinterações;
- Componentes otimizados para acessibilidade (A11y: foco, aria-labels, skip links).

---

## 🚧 Funcionalidades futuras

- Lista personalizada **“Assistir mais tarde”**;
- Sistema de **avaliação de filmes e séries**;
- Histórico de títulos assistidos;
- IA para **recomendações inteligentes baseadas em comportamento**;
- Painel de estatísticas pessoais (tempo assistido, gêneros preferidos);
- Integração com **notícias de entretenimento** e **ranking semanal por streaming**.

---

## 🛠 Tecnologias e arquitetura

### 🖥️ Front-end
- **HTML, CSS, JavaScript (vanilla)**  
- **Acessibilidade e responsividade total**
- Cache leve via **localStorage + Service Worker**

### ⚙️ Back-end (PHP)
- Integração com TMDB API via proxy
- Endpoints principais:
  - `/api/recommendations.php`
  - `/api/preferences.php`
  - `/api/surprise.php`
  - `/api/roulette-posters.php`
- Retorno em **JSON padronizado** para o front-end

### 🎞️ TMDB API
- Fonte oficial de dados de filmes, séries e pessoas
- Autenticação por **API Key oculta no servidor**

### 💾 Banco de dados e cache
- **MySQL** para persistência de preferências e histórico
- **Redis / caching interno** para requisições de provedores e roleta
- Lazy-load + debounce em buscas e roletas

---

## 📸 Demonstrações

### 🏠 Página inicial
![Homepage](./Website%20Images/wyw-index-wrap.png)
> Destaques em tendência, lançamentos e recomendados.

### 🎬 Página do título
![Movie page](./Website%20Images/wyw-movie.png)
> Detalhes completos: trailer, elenco, sinopse, avaliação e provedores.

### 🎭 Página de pessoa
![Actor page](./Website%20Images/wyw-actor.png)
> Biografia, linha do tempo e trabalhos relacionados.

---

## 💡 Inspiração

O WYWatch nasceu da vontade de transformar um incômodo cotidiano — procurar onde assistir algo — em uma solução digital completa e visualmente envolvente.  
Mais do que um agregador, é uma plataforma em constante evolução, que combina tecnologia, design e curadoria.

---

## 📌 Como contribuir

Atualmente é um projeto pessoal, mas sugestões e melhorias são bem-vindas!  
Abra uma issue, envie feedback ou contribua com ideias de UX, performance ou arquitetura.

---

## 👨‍💻 Autor

**João Vitor Alves de Alencar**  
Desenvolvedor Front-end e entusiasta em UX, APIs e produtos digitais.  

[LinkedIn](https://www.linkedin.com/in/joaoalvesz)

---

## 📝 Copyright

Todos os direitos reservados © 2025 João Vitor Alves de Alencar  
Reprodução total ou parcial sem autorização é proibida.

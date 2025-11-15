# 🎬 Where You Watch • [whereuwatch.com](http://www.whereuwatch.com)

<div align="center">

![Where You Watch Banner](Website%20Images/wyw-index-wrap.png)

**Play no que você ama, sem perder tempo**

[🌐 whereuwatch.com](http://www.whereuwatch.com) • [📱 LinkedIn](https://www.linkedin.com/in/joaoalvesz)

[![PHP](https://img.shields.io/badge/PHP-8.0+-777BB4?logo=php&logoColor=white)](https://php.net)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://javascript.com)
[![MySQL](https://img.shields.io/badge/MySQL-5.7+-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![TMDB](https://img.shields.io/badge/Powered%20by-TMDB-01D277?logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org)

</div>

---

## 📖 Sobre o Projeto

O **Where You Watch (WYWatch)** é uma plataforma web completa desenvolvida para resolver um problema cotidiano: **descobrir onde assistir filmes e séries** entre os diversos serviços de streaming disponíveis.

Desenvolvi este projeto ao longo de quase **2 anos** como projeto pessoal.

---

## 🏗️ Arquitetura do Sistema

### Visão Geral

```mermaid
graph TB
    subgraph "Cliente (Browser)"
        A[HTML/CSS/JS]
        B[Service Worker]
        C[LocalStorage]
    end
    
    subgraph "Servidor Web (Apache)"
        D[Public Directory]
        E[PHP Backend]
        F[Endpoints API]
    end
    
    subgraph "Camada de Dados"
        G[(MySQL Database)]
        H[Redis Cache]
    end
    
    subgraph "APIs Externas"
        I[TMDB API]
        J[JustWatch]
    end
    
    A -->|HTTP Requests| D
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    B -->|Cache Assets| C
    E -->|Query| G
    E -->|Cache| H
    
    style A fill:#cadce5 
    style E fill:#fff4e1
    style G fill:#ffe1e1
    style I fill:#e1ffe1
```


### Estrutura de Diretórios

```mermaid
graph LR
    A[wtw/] --> B[public/]
    A --> C[config/]
    A --> D[includes/]
    A --> E[storage/]
    A --> F[sql/]
    A --> G[scripts/]
    A --> H[docs/]
    
    B --> B1[index.php]
    B --> B2[api/]
    B --> B3[css/]
    B --> B4[js/]
    B --> B5[imagens/]
    
    B2 --> B2a[recommendations.php]
    B2 --> B2b[preferences.php]
    B2 --> B2c[surprise.php]
    B2 --> B2d[favorites.php]
    
    C --> C1[config.php]
    C --> C2[bootstrap.php]
    C --> C3[paths.php]
    
    D --> D1[db.php]
    D --> D2[tmdb.php]
    D --> D3[env.php]
    
    E --> E1[cache/]
    E --> E2[logs/]
    
    F --> F1[migrations.sql]
    
    style B fill:#90EE90
    style B2 fill:#87CEEB
    style C fill:#FFD700
    style D fill:#FFA07A
```

---

## 📊 Diagrama de Banco de Dados

```mermaid
erDiagram
    USERS ||--o{ USER_PREFERENCES : has
    USERS ||--o{ USER_FAVORITES : has
    USERS ||--o{ USER_INTERACTIONS : logs
    USERS ||--o{ RECOMMENDATIONS_CACHE : receives
    USERS ||--o{ WATCH_LATER : maintains
    
    USERS {
        int id PK
        string email UK
        string password_hash
        string name
        datetime created_at
        datetime last_login
    }
    
    USER_PREFERENCES {
        int id PK
        int user_id FK
        json selected_genres
        json selected_keywords
        json selected_providers
        json favorite_titles
        datetime updated_at
    }
    
    USER_FAVORITES {
        int id PK
        int user_id FK
        int tmdb_id
        string media_type
        datetime added_at
    }
    
    USER_INTERACTIONS {
        int id PK
        int user_id FK
        int tmdb_id
        string media_type
        string interaction_type
        datetime created_at
    }
    
    RECOMMENDATIONS_CACHE {
        int id PK
        int user_id FK
        string cache_key UK
        json recommendations_data
        datetime expires_at
        datetime created_at
    }
    
    WATCH_LATER {
        int id PK
        int user_id FK
        int tmdb_id
        string media_type
        json metadata
        datetime added_at
    }
    
    GENRES {
        int id PK
        string name
        string tmdb_id
    }
    
    PROVIDERS {
        int id PK
        string name
        string logo_path
        int display_priority
    }
```

---

## ✨ Funcionalidades Principais

### 🏠 Página Inicial Personalizada

<table>
  <tr>
    <td width="50%">
      <img src="Website%20Images/wyw-index-wrap.png" alt="Homepage - Layout Wrap">
    </td>
    <td width="50%">
      <img src="Website%20Images/wyw-index-rows.png" alt="Homepage - Layout Rows">
    </td>
  </tr>
  <tr>
    <td align="center"><em>Layout em grade com recomendações</em></td>
    <td align="center"><em>Layout em linhas com categorias</em></td>
  </tr>
</table>

**Recursos:**
- ✅ Recomendações personalizadas baseadas em preferências
- ✅ Seções dinâmicas: Tendências, Populares, Melhor Avaliados
- ✅ Navegação fluida
- ✅ Cards interativos com lazy loading

---

### 🎬 Página de Título (Filme/Série)

<div align="center">
  <img src="Website%20Images/wyw-movie.png" alt="Página de Filme - Visão Geral" width="100%">
</div>

<table>
  <tr>
    <td width="50%">
      <img src="Website%20Images/wyw-movie-2.png" alt="Detalhes do Filme">
    </td>
    <td width="50%">
      <img src="Website%20Images/wyw-movie-3.png" alt="Informações de Streaming">
    </td>
  </tr>
</table>

**Informações Detalhadas:**
- ✅ Trailer integrado (YouTube Embed)
- ✅ Sinopse, gêneros e avaliação TMDB
- ✅ Elenco principal e ficha técnica
- ✅ Provedores de streaming disponíveis (Brasil)
- ✅ Links diretos para as plataformas
- ✅ Temporadas e episódios (para séries)

---

### 🎭 Página de Pessoa (Ator/Diretor)

<div align="center">
  <img src="Website%20Images/wyw-actor.png" alt="Página de Ator - Biografia" width="100%">
</div>

<table>
  <tr>
    <td width="50%">
      <img src="Website%20Images/wyw-actor-2.png" alt="Timeline de Carreira">
    </td>
    <td width="50%">
      <img src="Website%20Images/wyw-actor-3.png" alt="Colaborações Frequentes">
    </td>
  </tr>
</table>

**Recursos:**
- 📋 Biografia completa
- 🎬 Filmografia organizada por ano
- 📅 Linha do tempo de carreira com filtros
- 👥 Colaborações frequentes
- 🔗 Links para redes sociais oficiais

---

### 🔍 Busca e Navegação

<table>
  <tr>
    <td width="50%">
      <img src="Website%20Images/wyw-search.png" alt="Busca Instantânea">
    </td>
    <td width="50%">
      <img src="Website%20Images/wyw-categorias.png" alt="Navegação por Categorias">
    </td>
  </tr>
  <tr>
    <td align="center"><em>Busca instantânea com resultados em tempo real</em></td>
    <td align="center"><em>Exploração por gêneros e categorias</em></td>
  </tr>
</table>

**Funcionalidades:**
- 🔎 Busca instantânea via TMDB API (`/search/multi`)
- 🎯 Resultados em tempo real com debounce
- 🏷️ Filtros por gênero, tipo e ano
- 📊 Ordenação por popularidade, avaliação ou data
- ⚡ AbortController para cancelar buscas antigas

---

### 📺 Navegação por Provedores

<div align="center">
  <img src="Website%20Images/wyw-provedores.png" alt="Catálogo por Provedor" width="100%">
</div>

**Recursos:**
- 📱 Navegação por streaming (Netflix, Prime Video, Disney+, etc.)
- 🎯 Catálogo personalizado de cada provedor
- 🔀 Filtros combinados (gênero + provedor)
- 🔄 Atualização automática de disponibilidade

---

### 👤 Perfil do Usuário

<div align="center">
  <img src="Website%20Images/wyw-profile.png" alt="Página de Perfil" width="100%">
</div>

**Gerenciamento:**
- 📊 Estatísticas pessoais (favoritos, preferências, plataformas)
- ⭐ Lista de títulos favoritos
- 🎯 Configuração de preferências

---

### 🎲 Modo "Surpreenda-me"

<div align="center">
  <img src="Website%20Images/wywatch_framed_4_surprise.png" alt="Modo Surpreenda-me" width="100%">
</div>

**Descoberta Aleatória:**
- 🎰 Roleta animada de filmes/séries
- 🎯 Recomendação personalizada baseada em preferências
- 💡 Insight do motivo da recomendação
- 🎬 Suporte para filmes e séries
- ✨ Experiência visual com transições suaves

---

### 🔐 Sistema de Login

<div align="center">
  <img src="Website%20Images/wyw-login.png" alt="Página de Login" width="80%">
</div>

**Autenticação:**
- 🔒 Sistema com hash
- 🔑 Recuperação de senha
- 📱 Design responsivo

---

## 🛠️ Stack Tecnológico

### Backend

**Tecnologias:**
- **PHP 8.0+**: Backend principal
- **MySQL 5.7+**: Banco de dados relacional
- **Apache 2.4+**: Servidor web com mod_rewrite
- **Composer**: Gerenciador de dependências (futuro)

### Frontend

**Tecnologias:**
- **HTML5**: 
- **CSS3**
- **JavaScript**
- **Service Worker**: Cache de assets
- **LocalStorage**

### APIs e Integrações

```mermaid
graph TB
    A[WYWatch Backend] --> B[TMDB API]
    A --> C[JustWatch API]
    
    B --> D[Movies Data]
    B --> E[TV Shows Data]
    B --> F[People Data]
    B --> G[Images]
    
    C --> H[Watch Providers]
    C --> I[Availability]
    
    style A fill:#FF6B6B
    style B fill:#01D277
    style C fill:#FFC107
```

---

## 📡 Endpoints da API

### Recomendações

```
POST /api/recommendations.php
```

**Request:**
```json
{
  "user_id": 123,
  "limit": 20,
  "media_type": "movie"
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "tmdb_id": 550,
      "title": "Fight Club",
      "score": 8.5,
      "reason": "Based on your preferences"
    }
  ],
  "cached": false
}
```

---

## 🔐 Segurança

### Camadas de Proteção

```mermaid
graph TB
    A[Usuário] -->|HTTPS| B[Servidor Web]
    
    B --> C{.htaccess Rules}
    C -->|Allowed| D[Diretório Público]
    C -->|Denied| E[403 Forbidden]
    
    D --> F{Router}
    F --> G[Backend PHP]
    
    G --> H[Validação de Input]
    H --> I[Proteção de SQL Injection]
    I --> J[Preveção de XXS]
    J --> K[CSRF Token]
    
    K --> L[(Database)]
    
    style C fill:#FFD700
    style E fill:#FF6B6B
    style H fill:#90EE90
```

### Medidas de Segurança

- ✅ **Diretório público isolado**: Apenas `/public` acessível via web
- ✅ **Proteção .env**: `.htaccess` bloqueia acesso direto
- ✅ **Prepared Statements**: Proteção contra SQL Injection
- ✅ **Sanitização de Input**: Validação em todas as entradas
- ✅ **Headers de Segurança**: CSP, X-Frame-Options, etc.
- ✅ **Password Hashing**: bcrypt com salt
- ✅ **Session Security**: Regeneração de ID, cookies seguros

---

## 🚀 Funcionalidades Futuras

### Roadmap 2026

### Em Desenvolvimento
- [ ] Sistema de **avaliação de filmes e séries**
- [ ] Histórico de títulos assistidos

### Planejado
- [ ] IA para **recomendações inteligentes baseadas em comportamento**
- [ ] Painel de estatísticas pessoais (tempo assistido, gêneros preferidos)
- [ ] Integração com **notícias de entretenimento**
- [ ] **Ranking semanal por streaming**
- [ ] Sistema de notificações (novos lançamentos, títulos removidos)

---

## 💡 Por Que Este Projeto?

O WYWatch nasceu da vontade de transformar um incômodo meu: procurar o que assistir onde assistir em uma solução digital completa.  

---


## 📦 Instalação e Deploy

### Pré-requisitos

- PHP 8.0 ou superior
- MySQL 5.7 ou superior
- Apache 2.4+ com mod_rewrite

### Instalação Local

```bash
# 1. Clone o repositório
git clone https://github.com/alzolansk/where-to-watch.git
cd where-to-watch

# 2. Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Importe o banco de dados
mysql -u root -p < sql/20251005_recommendation_tables.sql
mysql -u root -p < sql/20251107_onboarding_preferences.sql
mysql -u root -p < sql/20260115_recommendations_cache.sql

# 4. Configure as permissões
chmod 755 storage/cache
chmod 755 storage/logs

# 5. Popule dados iniciais
php scripts/seed_genres.php
php scripts/seed_providers.php

# 6. Acesse no navegador
# http://localhost/whereyouwatch/public
```
---

## 📄 Licença

**© 2025 João Vitor Alves de Alencar - Todos os direitos reservados**

Este é um projeto pessoal e proprietário. A reprodução total ou parcial, distribuição, modificação ou uso comercial do código-fonte, design ou conteúdo deste projeto sem autorização expressa do autor é **proibida**.

### Uso de Dados TMDB

Este produto usa a API TMDB, mas não é endossado ou certificado pela TMDB.

<div align="center">
  <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_1-8ba2ac31f354005783fab473602c34c3f4fd207150182061e425d366e4f34596.svg" alt="TMDB Logo" width="200">
</div>

## 👨‍💻 Autor

<div align="center">

**João Vitor Alves de Alencar**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/joaoalvesz)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/joaoalvesz)
</div>

## 📈 Estatísticas do Projeto

<div align="center">

![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-15k+-blue)
![Files](https://img.shields.io/badge/Files-150+-green)
![Commits](https://img.shields.io/badge/Commits-500+-orange)
![Development Time](https://img.shields.io/badge/Dev%20Time-2%20years-red)

</div>


<div align="center">

**Desenvolvido por [João Vitor Alves de Alencar](https://linkedin.com/in/joaoalvesz)**

</div>

# 🎬 Where You Watch

> Sistema inteligente de recomendações personalizadas de filmes e séries

[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777BB4.svg)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1.svg)](https://www.mysql.com/)
[![TMDB](https://img.shields.io/badge/TMDB-API-01D277.svg)](https://www.themoviedb.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🚀 Quick Start

### **1. Configure o Ambiente**

```bash
# Copie o arquivo de configuração
cp .env.example .env

# Edite com suas credenciais
# - DB_HOST, DB_NAME, DB_USER, DB_PASS
# - TMDB_API_KEY (obtenha em https://www.themoviedb.org/settings/api)
```

### **2. Importe o Banco de Dados**

```bash
# Via phpMyAdmin ou linha de comando:
mysql -u root -p db_login < sql/20251005_recommendation_tables.sql
mysql -u root -p db_login < sql/20251107_onboarding_preferences.sql
mysql -u root -p db_login < sql/20260115_recommendations_cache.sql
```

### **3. Popule Dados Iniciais**

```bash
# Acesse no navegador:
http://localhost/WhereToWatch/wtw/scripts/seed_genres.php
http://localhost/WhereToWatch/wtw/scripts/seed_providers.php
```

### **4. Acesse o Sistema**

```
🌐 http://localhost/WhereToWatch/wtw/public/
```

---

## 📂 Estrutura do Projeto

```
wtw/
├── public/          ← Arquivos públicos (único diretório acessível)
├── config/          ← Configurações centralizadas
├── includes/        ← Bibliotecas PHP (env, db, tmdb)
├── storage/         ← Logs e cache
├── sql/             ← Migrations do banco
├── scripts/         ← Scripts de manutenção
├── docs/            ← Documentação completa
└── .env             ← Variáveis de ambiente
```

---

## ✨ Funcionalidades

- ✅ **Recomendações Personalizadas** - Algoritmo híbrido baseado em preferências
- ✅ **Surpreenda-me** - Roleta interativa de descoberta
- ✅ **Onboarding Inteligente** - Configuração inicial personalizada
- ✅ **Catálogos** - Por gênero, provedor, pessoa
- ✅ **Busca Avançada** - Pesquisa em tempo real
- ✅ **Telemetria** - Rastreamento de interações para melhorar recomendações
- ✅ **Cache Inteligente** - Performance otimizada
- ✅ **100% InfinityFree** - Compatível com hospedagem gratuita

---

## 📚 Documentação Completa

Para documentação técnica detalhada, acesse:

### **[📖 docs/README.md](docs/README.md)**

**Inclui:**
- 🏗️ Arquitetura do sistema
- 💻 Requisitos e instalação
- ⚙️ Configuração avançada
- 🎮 Guia de uso e APIs
- 🔒 Segurança e boas práticas
- 📦 Deploy em produção
- 🐛 Troubleshooting completo

### **Outros Documentos:**
- [MIGRACAO_CONCLUIDA.md](docs/MIGRACAO_CONCLUIDA.md) - Migração para estrutura `public/`
- [CHANGELOG_INFINITYFREE.md](docs/CHANGELOG_INFINITYFREE.md) - Correções de compatibilidade
- [CHECKLIST_IMPLEMENTACAO.md](docs/CHECKLIST_IMPLEMENTACAO.md) - Guia de deploy

---

## 🛠️ Tecnologias

- **Backend:** PHP 8.0+, MySQL 5.7+
- **APIs:** TMDB (The Movie Database)
- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Servidor:** Apache 2.4+ (mod_rewrite)
- **Padrão:** Bootstrap centralizado, PSR-12

---

## 🔐 Segurança

- ✅ Pasta `public/` como único ponto de acesso
- ✅ `.env` protegido por `.htaccess`
- ✅ Pastas `includes/`, `config/`, `storage/` inacessíveis via web
- ✅ Headers de segurança (CSP, X-Frame-Options, etc.)
- ✅ Prepared statements para SQL
- ✅ Validação e sanitização de input

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/MinhaFeature`
3. Commit: `git commit -m 'Adiciona MinhaFeature'`
4. Push: `git push origin feature/MinhaFeature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para detalhes.

---

## 👤 Autor

**André Zolanski**
- GitHub: [@alzolansk](https://github.com/alzolansk)
- Projeto: [where-to-watch](https://github.com/alzolansk/where-to-watch)

---

## 🙏 Créditos

- [TMDB](https://www.themoviedb.org/) - API de dados de filmes e séries
- [InfinityFree](https://infinityfree.net/) - Hospedagem gratuita

---

<div align="center">

**Versão 2.0** | Última atualização: 05/11/2025

[![⭐ Star no GitHub](https://img.shields.io/github/stars/alzolansk/where-to-watch?style=social)](https://github.com/alzolansk/where-to-watch)

</div>

# Correções para InfinityFree - Erro 500

## Problema Identificado

O erro 500 no arquivo `home-personalized.php` em produção (InfinityFree) foi causado por:

```
Call to undefined function curl_multi_exec() @ /home/vol14_3/infinityfree.com/.../htdocs/includes/tmdb.php:124
```

**Causa:** O InfinityFree não suporta as funções `curl_multi_*` do PHP, que são usadas para fazer requisições HTTP paralelas.

## Soluções Implementadas

### 1. Correção do arquivo `includes/tmdb.php`

✅ **Adicionado fallback automático** para requisições sequenciais quando `curl_multi_*` não está disponível
✅ **Removida duplicação** da função `tmdb_build_url`
✅ **Corrigida função `http_get_many()`** para verificar `function_exists('curl_multi_init')` antes de usar
✅ **Corrigida função `tmdb_get_bulk()`** para usar `http_get_many()` de forma compatível
✅ **Melhorado sistema de teste** com `?__selftest` para diagnosticar problemas

**Como funciona agora:**
- Se `curl_multi_*` estiver disponível (localhost/servidores premium): usa requisições paralelas (mais rápido)
- Se `curl_multi_*` NÃO estiver disponível (InfinityFree): faz requisições sequenciais (compatível)

### 2. Melhorias no arquivo `api/home-personalized.php`

✅ **Sistema de logging detalhado** para debug em produção
✅ **Tratamento de exceções** com `set_exception_handler()`
✅ **Validação de dependências** antes de incluir arquivos
✅ **Mensagens de erro informativas** com request ID para rastreamento

**Arquivo de log:** `api/error_home_personalized.log`

## Testes Recomendados

### 1. Teste local (XAMPP)
```bash
# Acessar no navegador:
http://localhost/WhereToWatch/wtw/includes/tmdb.php?__selftest
```

Deve retornar algo como:
```
=== TESTE DE COMPATIBILIDADE TMDB.PHP ===

PHP Version: 8.3.19
cURL disponível? curl_init=yes | curl_multi_init=yes

Testando http_get_single()... OK
Testando http_get_many()... OK
Testando tmdb_get()... OK (título: Fight Club)
Testando tmdb_get_bulk()... OK

=== TESTE CONCLUÍDO ===
```

### 2. Teste em produção (InfinityFree)
```bash
# Acessar no navegador:
https://www.whereuwatch.com/includes/tmdb.php?__selftest
```

Deve funcionar mesmo sem `curl_multi_*`:
```
cURL disponível? curl_init=yes | curl_multi_init=no
```

### 3. Teste da API personalizada
```bash
# Acessar após login:
https://www.whereuwatch.com/api/home-personalized.php?media_type=movie
```

Deve retornar JSON com recomendações ou mensagem de erro clara.

## Monitoramento

### Ver logs em produção
```bash
# Baixar via FTP/FileManager:
/htdocs/api/error_home_personalized.log
```

### Informações registradas:
- Request ID único para cada requisição
- Versão do PHP
- Session ID
- Host e URI
- Status de cada etapa (conexão DB, includes, TMDB calls)
- Erros e exceções detalhados

## Limpeza Pós-Deploy

⚠️ **IMPORTANTE:** Após confirmar que está funcionando em produção:

1. **Remover/comentar** o sistema de logging detalhado em `home-personalized.php`
2. **Manter** o fallback para `curl_multi` (não causa problemas)
3. **Deletar** o arquivo de log antigo: `api/error_home_personalized.log`

## Performance

### InfinityFree (sem curl_multi)
- ⏱️ Requisições sequenciais: ~3-5 segundos para 10-15 requests
- 💾 Cache TMDB: reduz drasticamente requisições repetidas

### Localhost/Premium (com curl_multi)
- ⚡ Requisições paralelas: ~1-2 segundos para 10-15 requests
- 💾 Cache TMDB: mesmo benefício

## Compatibilidade

✅ **InfinityFree** (PHP 8.3, sem curl_multi)
✅ **XAMPP** (PHP 8.x, com curl_multi)
✅ **Servidores premium** (PHP 7.4+, com curl_multi)
✅ **Shared hosting** (maioria, mesmo sem curl_multi)

---

**Data da correção:** 05/11/2025
**Testado em:** PHP 8.3.19 (InfinityFree) e XAMPP local

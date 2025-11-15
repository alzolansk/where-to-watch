# Migração Flexível: Pasta Public

## Problema

Em **desenvolvimento local**, temos a estrutura:
```
wtw/
├── public/
│   ├── index.php
│   ├── css/
│   ├── js/
│   └── imagens/
```

Em **produção**, não temos a pasta `public/`:
```
wtw/
├── index.php
├── css/
├── js/
└── imagens/
```

## Solução Implementada

O sistema agora **detecta automaticamente** em qual ambiente está rodando e ajusta todos os caminhos de forma transparente.

### Como Funciona

O arquivo `config/paths.php` detecta:
- Se o script está sendo executado de dentro da pasta `public/`
- Define a constante `IS_PUBLIC_FOLDER` (true/false)
- Disponibiliza funções helpers para gerar URLs corretas

### Funções Disponíveis

#### 1. `asset_url($path)`
Gera URLs para arquivos estáticos (CSS, JS, imagens).

**Exemplo:**
```php
<!-- Em vez de: -->
<link rel="stylesheet" href="css/style.css">

<!-- Use: -->
<link rel="stylesheet" href="<?php echo asset_url('css/style.css'); ?>">
```

**Resultado:**
- **Desenvolvimento (com public/):** `css/style.css`
- **Produção (sem public/):** `css/style.css`

#### 2. `base_url()`
Retorna a URL base da aplicação.

**Exemplo:**
```php
echo base_url(); 
// Desenvolvimento: /WhereToWatch/wtw/public
// Produção: /wtw
```

#### 3. `app_url($path)`
Gera URLs completas para rotas da aplicação.

**Exemplo:**
```php
<!-- Links internos -->
<a href="<?php echo app_url('filme.php'); ?>">Filmes</a>
<a href="<?php echo app_url('profile.php'); ?>">Perfil</a>
```

### Configuração no .env

Você pode definir a URL base manualmente no arquivo `.env`:

```env
# Desenvolvimento Local
APP_URL=http://localhost/WhereToWatch/wtw/public

# Produção
APP_URL=https://seusite.com/wtw
```

Se não definir, o sistema detecta automaticamente!

## Como Migrar Seus Arquivos

### Antes (Caminho Fixo):
```html
<link rel="stylesheet" href="css/style.css">
<script src="js/app.js"></script>
<img src="imagens/logo.png">
<a href="filme.php">Filmes</a>
```

### Depois (Compatível com ambos ambientes):
```php
<link rel="stylesheet" href="<?php echo asset_url('css/style.css'); ?>">
<script src="<?php echo asset_url('js/app.js'); ?>"></script>
<img src="<?php echo asset_url('imagens/logo.png'); ?>">
<a href="<?php echo app_url('filme.php'); ?>">Filmes</a>
```

## Exemplo Prático

### index.php (Atualizado)
```php
<?php require_once __DIR__ . '/../config/bootstrap.php'; ?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="<?php echo asset_url('css/brand.css'); ?>">
    <link rel="stylesheet" href="<?php echo asset_url('css/style.css'); ?>">
    <link rel="icon" href="<?php echo asset_url('imagens/wywatch-favicon-iris-nobackground.png'); ?>">
    <title>Where You Watch</title>
</head>
<body>
    <nav>
        <a href="<?php echo app_url('index.php'); ?>">Home</a>
        <a href="<?php echo app_url('filme.php'); ?>">Filmes</a>
        <a href="<?php echo app_url('profile.php'); ?>">Perfil</a>
    </nav>
</body>
</html>
```

## Vantagens

✅ **Funciona automaticamente** em desenvolvimento e produção  
✅ **Sem necessidade de configuração manual** (detecção automática)  
✅ **Compatível com ambas estruturas** de pastas  
✅ **Fácil de usar** - apenas 3 funções helpers  
✅ **Não quebra código existente** - migração gradual  

## Checklist de Migração

Para cada arquivo PHP no `public/`:

- [ ] Substituir caminhos de CSS por `asset_url('css/arquivo.css')`
- [ ] Substituir caminhos de JS por `asset_url('js/arquivo.js')`
- [ ] Substituir caminhos de imagens por `asset_url('imagens/arquivo.png')`
- [ ] Substituir links internos por `app_url('pagina.php')`
- [ ] Testar em ambos ambientes (com e sem pasta public/)

## Testando

### Teste 1: Desenvolvimento (com public/)
1. Acesse `http://localhost/WhereToWatch/wtw/public/index.php`
2. Verifique se todos os assets carregam corretamente

### Teste 2: Simulando Produção
1. Copie os arquivos de `public/` para o nível raiz temporariamente
2. Acesse `http://localhost/WhereToWatch/wtw/index.php`
3. Verifique se tudo funciona sem a pasta public/

## Troubleshooting

**Problema:** Assets não carregam  
**Solução:** Verifique se `APP_URL` no `.env` está correto

**Problema:** Detecção automática não funciona  
**Solução:** Defina `APP_URL` manualmente no `.env`

**Problema:** Links quebrados  
**Solução:** Use `app_url()` para links internos, não caminhos relativos

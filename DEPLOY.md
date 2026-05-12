# Guia de Deploy no GitHub Pages

## Pré-requisitos

- Conta GitHub
- Git instalado
- Node.js e npm instalados

## Passo 1: Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em "New repository"
3. Configure:
   - **Repository name**: `CheckListCamerasGitHubPages`
   - **Description**: `Aplicação web para checklist de câmeras de monitoramento`
   - **Visibility**: Public (necessário para GitHub Pages)
   - Deixe "Initialize this repository with:" desmarcado

4. Clique em "Create repository"

## Passo 2: Configurar git local

Abra o terminal na pasta do projeto e execute:

```bash
git init
git add .
git commit -m "Commit inicial"
git branch -M main
git remote add origin https://github.com/seu-usuario/CheckListCamerasGitHubPages.git
git push -u origin main
```

Substitua `seu-usuario` pelo seu nome de usuário GitHub.

## Passo 3: Configurar GitHub Pages

1. Acesse seu repositório no GitHub
2. Vá para **Settings** → **Pages**
3. Em "Build and deployment":
   - **Source**: Selecione "GitHub Actions"
   - O workflow será usado automaticamente

## Passo 4: Deploy automático

Quando você fizer push para a branch `main`, o GitHub Actions:
1. Instala dependências
2. Compila o projeto
3. Faz upload para GitHub Pages
4. Site fica disponível em: `https://seu-usuario.github.io/CheckListCamerasGitHubPages/`

## Passo 5: Acessar a aplicação

Após o deploy completar (2-3 minutos), acesse:

```
https://seu-usuario.github.io/CheckListCamerasGitHubPages/
```

## Deploy Manual (opcional)

Se preferir fazer deploy sem GitHub Actions:

```bash
npm run build
git add dist -f
git commit -m "Deploy"
git push
```

## Solução de Problemas

### "404 Not Found" ao acessar
- Aguarde 2-3 minutos após o push
- Verifique se o repositório está public
- Confirme se o workflow correu sem erros (vá em Actions)

### Mudanças não aparecem
- Limpe o cache do navegador (Ctrl+Shift+Del)
- Aguarde a ação do GitHub Actions completar
- Verifique se o branch é `main`

### Erro no build
- Verifique logs no GitHub Actions
- Certifique-se de que `npm install` funciona localmente
- Confirme que `npm run build` funciona sem erros

## Próximos passos

1. Clone o repositório em qualquer computador: `git clone https://github.com/seu-usuario/CheckListCamerasGitHubPages.git`
2. Instale dependências: `npm install`
3. Desenvolva localmente: `npm run dev`
4. Faça push das mudanças para publicar automaticamente

## Customizações

Para customizar o site:

- **URL base**: Edite `vite.config.js` - linha `base: '/CheckListCamerasGitHubPages/'`
- **Homepage**: Edite `package.json` - linha `"homepage"`
- **Aparência**: Modifique `src/App.jsx` e `src/index.css`

## Backup e Sincronização

Recomenda-se fazer backup regular:

```bash
# Sincronizar com repositório remoto
git pull origin main

# Verificar status
git status

# Ver histórico
git log --oneline
```

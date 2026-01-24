# 🎯 Como Tornar Este Repositório um Template no GitHub

## Passo a Passo Rápido

### 1. Acesse as Configurações do Repositório

1. Vá para o repositório no GitHub
2. Clique na aba **Settings** (⚙️ Configurações)

### 2. Marque como Template

1. Role até a seção **"Template repository"** (próximo ao final da página)
2. Marque a checkbox **"Template repository"**
3. Clique em **Save** (Salvar)

### 3. Verificar

Após salvar, você verá:
- ✅ Badge **"Template"** ao lado do nome do repositório
- ✅ Botão verde **"Use this template"** no topo da página

## ✅ Checklist Antes de Marcar como Template

Certifique-se de que:

- [x] ✅ `.env.example` está completo e sem valores reais
- [x] ✅ `.gitignore` está configurado corretamente
- [x] ✅ `README.md` está atualizado
- [x] ✅ `TEMPLATE.md` foi criado com instruções
- [x] ✅ Nenhum secret ou chave real está no código
- [x] ✅ Documentação dos módulos está completa
- [x] ✅ Scripts de setup funcionam

## 🚀 Após Marcar como Template

Quando alguém usar o template:

1. Clicará em **"Use this template"**
2. Criará um novo repositório
3. Verá o arquivo `.github/template-setup.md` automaticamente
4. Seguirá as instruções em `TEMPLATE.md`

## 📝 Arquivos Criados para o Template

- ✅ `TEMPLATE.md` - Guia completo de uso
- ✅ `TEMPLATE_SETUP.md` - Instruções de configuração
- ✅ `.github/template-setup.md` - Exibido ao criar novo repo
- ✅ `.github/PULL_REQUEST_TEMPLATE.md` - Template de PRs
- ✅ `.github/ISSUE_TEMPLATE/` - Templates de issues
- ✅ `scripts/setup.sh` - Script de setup automático

## 🔄 Manter o Template Atualizado

Quando fizer melhorias no template:

1. Commit e push normalmente
2. Projetos filhos podem sincronizar via `upstream` (veja `TEMPLATE.md`)

## ⚠️ Importante

- **NUNCA** commite arquivos `.env` com valores reais
- **SEMPRE** use `.env.example` para documentar variáveis
- **SEMPRE** gere novas chaves JWT para cada projeto criado

---

**Pronto!** Seu repositório está configurado para ser um template. 🎉

# 🚀 Como Usar Este Template

Este é um **template de repositório** para criar novos projetos SaaS multitenant rapidamente.

## 📋 Passo a Passo

### 1. Criar Novo Repositório a partir do Template

#### Via GitHub Web Interface:
1. Acesse este repositório no GitHub
2. Clique no botão **"Use this template"** (verde, no topo)
3. Escolha **"Create a new repository"**
4. Preencha:
   - **Repository name**: Nome do seu projeto
   - **Description**: Descrição do projeto
   - **Visibility**: Público ou Privado
5. Clique em **"Create repository from template"**

#### Via GitHub CLI:
```bash
gh repo create meu-projeto-saas --template SEU_USUARIO/ProjetoBase --public
```

#### Via Git Manual:
```bash
# Clonar o template
git clone https://github.com/SEU_USUARIO/ProjetoBase.git meu-projeto-saas
cd meu-projeto-saas

# Remover referências ao template
rm -rf .git
git init
git add .
git commit -m "Initial commit from template"

# Adicionar remote do novo repositório
git remote add origin https://github.com/SEU_USUARIO/meu-projeto-saas.git
git push -u origin main
```

### 2. Configurar o Projeto

```bash
# Instalar dependências
pnpm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas configurações
# - DATABASE_URL: URL do PostgreSQL/Supabase
# - JWT_SECRET: Chave secreta para JWT (gerar uma nova!)
# - CORS_ORIGIN: URL do frontend
```

### 3. Configurar Banco de Dados

```bash
# Executar migrations
cd apps/api
pnpm migrate

# (Opcional) Seed de dados iniciais
pnpm seed
```

### 4. Personalizar o Projeto

#### Atualizar Informações do Projeto:
- [ ] Atualizar `package.json` (nome, descrição, autor)
- [ ] Atualizar `README.md` com informações do seu projeto
- [ ] Atualizar logo/branding no frontend (`apps/portal/src/pages/Login.tsx`)
- [ ] Atualizar cores do Design System se necessário (`apps/portal/tailwind.config.js`)

#### Configurar Integrações:
- [ ] Stripe (se usar billing): Adicionar chaves em `.env`
- [ ] Email (se usar): Configurar SMTP
- [ ] Outras integrações conforme necessário

### 5. Iniciar Desenvolvimento

```bash
# Na raiz do projeto
pnpm dev

# Ou individualmente:
# Terminal 1 - API
cd apps/api && pnpm dev

# Terminal 2 - Frontend
cd apps/portal && pnpm dev
```

## 🔄 Sincronizar Atualizações do Template

Se o template original receber atualizações, você pode sincronizar:

```bash
# Adicionar o template como upstream
git remote add upstream https://github.com/SEU_USUARIO/ProjetoBase.git

# Buscar atualizações
git fetch upstream

# Mesclar atualizações (cuidado com conflitos!)
git merge upstream/main

# Resolver conflitos se houver
# ...

# Push das atualizações
git push
```

## 📝 Checklist de Personalização

Após criar o projeto a partir do template:

- [ ] Renomear projeto nos `package.json`
- [ ] Atualizar `README.md` com informações específicas
- [ ] Configurar variáveis de ambiente (`.env`)
- [ ] Executar migrations do banco de dados
- [ ] Atualizar branding/logo
- [ ] Configurar domínio/subdomínios (se multitenant por subdomínio)
- [ ] Configurar CI/CD (GitHub Actions, etc.)
- [ ] Adicionar testes
- [ ] Configurar monitoramento/logs
- [ ] Configurar backup do banco de dados

## 🎯 Próximos Passos

1. **Criar primeiro módulo**: Siga a estrutura em `apps/api/src/modules/` para criar novos módulos
2. **Customizar frontend**: Adicione páginas e componentes conforme necessário
3. **Configurar produção**: Setup de deploy, variáveis de ambiente, etc.

## 📚 Documentação

- Cada módulo possui `README.md` com regras de negócio
- Regras do Cursor AI em `.cursor/rules/`
- Estrutura detalhada em `ESTRUTURA.md`

## ⚠️ Importante

- **NUNCA** commite arquivos `.env` ou secrets
- **SEMPRE** gere novas chaves JWT para cada projeto
- **SEMPRE** configure CORS adequadamente para produção
- **SEMPRE** use HTTPS em produção

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação em cada módulo (`README.md`)
2. Consulte as regras do Cursor (`.cursor/rules/`)
3. Abra uma issue no repositório do template

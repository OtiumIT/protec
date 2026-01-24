# 🚀 Template SaaS Multitenant

> **Template de repositório** para criar novos projetos SaaS multitenant rapidamente.

[![Template](https://img.shields.io/badge/GitHub-Template-brightgreen)](https://github.com/SEU_USUARIO/ProjetoBase/generate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Boilerplate completo para aplicações SaaS multitenant com arquitetura modular. Use este template para criar novos projetos SaaS rapidamente.

## 📦 Como Usar Este Template

### Opção 1: Via GitHub (Recomendado)
1. Clique no botão **"Use this template"** acima
2. Escolha **"Create a new repository"**
3. Preencha os dados do seu novo projeto
4. Clone e configure conforme `TEMPLATE.md`

### Opção 2: Via GitHub CLI
```bash
gh repo create meu-projeto-saas --template SEU_USUARIO/ProjetoBase --public
```

### Opção 3: Clone Manual
```bash
git clone https://github.com/SEU_USUARIO/ProjetoBase.git meu-projeto-saas
cd meu-projeto-saas
rm -rf .git && git init
# Configure e commit
```

📖 **Veja `TEMPLATE.md` para instruções detalhadas de setup e personalização.**

## 🏗️ Arquitetura

- **Monorepo**: Turborepo com pnpm workspaces
- **Backend**: Node.js + Hono (API REST)
- **Frontend**: React + Vite + Tailwind CSS (Design System OtiumIT)
- **Workers**: Python (processamento pesado)
- **Database**: PostgreSQL (Supabase ou local)
- **Shared**: Tipos, schemas Zod e utilitários compartilhados

## 📁 Estrutura

```
.
├── apps/
│   ├── api/              # Backend Node.js (Hono)
│   ├── portal/           # Frontend React (Vite)
│   └── workers/          # Workers Python
├── packages/
│   └── shared/           # Código compartilhado (tipos, schemas)
└── .cursor/
    └── rules/            # Regras do Cursor AI
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- PostgreSQL (ou Supabase)
- Python 3.9+ (para workers)

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar migrations
cd apps/api
pnpm migrate

# Seed de dados iniciais
pnpm seed

# Iniciar desenvolvimento
pnpm dev
```

### Scripts Disponíveis

```bash
# Root
pnpm dev              # Iniciar todos os apps em modo dev
pnpm build            # Build de todos os apps
pnpm lint             # Lint de todos os apps

# API
cd apps/api
pnpm dev              # Iniciar API (porta 3000)
pnpm migrate          # Executar migrations
pnpm seed             # Seed de dados

# Portal
cd apps/portal
pnpm dev              # Iniciar frontend (porta 5173)
```

## 🔐 Autenticação

- **JWT**: Access tokens (15min) + Refresh tokens (7 dias)
- **Multitenant**: Identificação via header `X-Tenant-ID` ou subdomínio
- **Isolamento**: Todas as queries incluem filtro `company_id`

## 📦 Módulos

Cada módulo é autocontido com:
- `README.md` - Regras de negócio
- `*.repository.ts` - Acesso ao banco
- `*.service.ts` - Lógica de negócio
- `*.routes.ts` - Endpoints HTTP

### Módulos Disponíveis

- **auth**: Autenticação e autorização
- **users**: Gestão de usuários
- **companies**: Gestão de empresas (tenants)
- **feature-toggles**: Sistema de módulos/feature toggles
- **subscriptions**: Assinaturas e planos
- **billing**: Integração Stripe (webhooks)

## 🎨 Design System OtiumIT

O frontend segue o Design System OtiumIT:

- **Cores**: Brand (#32CD32), Otium Black (#000000), Slate scale
- **Tipografia**: Inter (Google Fonts)
- **Componentes**: Button, Card, Input, Badge (estilo OtiumIT)

## 🔒 Segurança

- **Passwords**: BCrypt com 10 rounds
- **JWT**: Tokens com expiração curta
- **Multitenancy**: Isolamento total de dados por tenant
- **Validação**: Zod schemas em todas as rotas
- **CORS**: Configurado por ambiente

## 📚 Documentação

Cada módulo possui `README.md` explicando:
- Regras de negócio
- Dependências
- Endpoints
- Fluxos importantes
- Casos especiais

## 🧪 Testes

```bash
# TODO: Implementar testes
pnpm test
```

## 📝 Licença

MIT

# Documentação do Projeto Base - SaaS Boilerplate Multitenant

## 📋 Visão Geral

Este é um **boilerplate completo** para criação de aplicações SaaS multitenant, servindo como **template repository** para múltiplos projetos.

### Stack Tecnológica
- **Backend**: Node.js (Hono) + Python (Workers)
- **Frontend**: React + Vite + Tailwind CSS
- **Banco de Dados**: PostgreSQL
- **Monorepo**: Turborepo + pnpm workspaces

### Requisitos Core
- ✅ Cadastro de Empresa e Usuários
- ✅ Cobrança por Empresa/Usuários (Stripe/ASAAS)
- ✅ Sistema Multitenant (Schema-level)
- ✅ Sistema Modular (Feature Toggles)

---

## 🏗️ Arquitetura

### Estrutura do Monorepo

```
ProjetoBase/
├── apps/
│   ├── api/              # Backend Node.js (Hono)
│   │   └── src/
│   │       ├── routes/   # Definição de rotas
│   │       ├── services/ # Lógica de negócio
│   │       ├── repositories/ # Acesso ao banco
│   │       └── middleware/   # Auth, Tenant, Modules
│   ├── workers/          # Processamento Python
│   │   └── src/
│   └── portal/           # Frontend React + Vite
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── hooks/
│           └── services/
├── packages/
│   └── shared/           # Código compartilhado
│       ├── types/        # Tipos TypeScript
│       ├── schemas/       # Schemas Zod
│       └── utils/        # Utilitários
├── .cursor/
│   └── rules/            # Regras do Cursor (formato .mdc)
└── docs/                 # Documentação
```

### Backend (Node.js + Hono)

**Características:**
- **Middleware de Tenant**: Identifica `company_id` via subdomínio ou header `X-Tenant-ID`
- **Database**: PostgreSQL com isolamento por Schema
- **Auth**: JWT + Refresh Tokens rotativos
- **Validação**: Zod schemas em todas as entradas
- **Service Layer**: Controllers → Services → Repositories

**Estrutura de Respostas:**
- Sucesso: `{ data: ... }`
- Erro: `{ error: { message: string, code: string } }`

### Frontend (React + Vite)

**Características:**
- **Routes**: Protegidas por permissões de módulo
- **State Management**: Context API ou Zustand para dados do Tenant
- **Layout**: Dashboard adaptável (Sidebar baseada em permissões)
- **UI**: Tailwind CSS com abordagem Mobile First
- **Hooks**: Customizados para API (ex: `useTenant()`, `useModules()`)

### Workers (Python)

**Características:**
- Processamento pesado (relatórios, exportações, etc.)
- Comunicação via RabbitMQ ou Redis
- Jobs agendados
- Processamento de arquivos

---

## 🔐 Multitenancy

### Isolamento de Dados

**Identificação do Tenant:**
1. Subdomínio (ex: `empresa.dominio.com`)
2. Header customizado `X-Tenant-ID`
3. Payload do JWT (preferencial para rotas autenticadas)

**Regra Crítica:**
- **TODAS** as queries ao banco **DEVEM** incluir `where company_id = context.companyId`
- **NUNCA** execute queries sem filtro de tenant

### Schema Dinâmico
Se usar múltiplos schemas PostgreSQL, o middleware deve setar o `search_path`:
```sql
SET search_path TO tenant_{companyId}, public;
```

---

## 💳 Módulos e Cobrança

### Sistema de Módulos (Feature Toggles)

**Estrutura:**
- `modules`: id, name, key
- `tenant_modules`: tenant_id, module_id, enabled_until

**Verificação:**
```typescript
const hasModule = await ModuleService.verify(companyId, 'NOME_DO_MODULO');
if (!hasModule) {
  return c.json({ error: { message: 'Module not active', code: 'MODULE_NOT_ACTIVE' } }, 402);
}
```

### Billing

**Integração:**
- Stripe ou ASAAS para processamento de pagamentos
- Webhooks para sincronizar status de assinatura
- Validação de 'seats' (número de usuários)

**Limite de Usuários:**
- Verificar `count(users) < plan.max_users` antes de criar usuário
- Bloquear operações de escrita se assinatura `past_due` ou `canceled`

---

## 🔄 Git e Workflow

### Template Repository

Este projeto serve como **template** para novos projetos SaaS.

### Fluxo de Novos Projetos

1. **Criar novo repo** a partir do template (GitHub/GitLab)
2. **Configurar upstream**:
   ```bash
   git remote add upstream [URL_DA_MATRIZ]
   ```
3. **Personalizar** projeto (nome, variáveis de ambiente, etc.)

### Sincronização

**Receber atualizações da matriz:**
```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

**Contribuir melhorias:**
- Melhorias genéricas: PR direto na matriz
- Melhorias específicas: manter apenas no projeto
- Bug fixes: corrigir na matriz primeiro

### Branch Strategy

- `main`: Código estável e testado
- `develop`: Desenvolvimento ativo
- `feature/*`: Novas funcionalidades
- `fix/*`: Correções de bugs

### Versionamento

- **Semantic Versioning**: `MAJOR.MINOR.PATCH`
- Tags para releases importantes
- Changelog mantido atualizado

---

## 🛠️ Ferramentas e Configuração

### Monorepo

- **Turborepo**: Build otimizado com cache incremental
- **pnpm workspaces**: Gerenciamento eficiente de dependências
- **TypeScript**: Configuração compartilhada em `packages/shared`

### Scripts Principais

```bash
# Desenvolvimento
pnpm dev              # Todos os apps
pnpm dev:api          # Apenas API
pnpm dev:portal       # Apenas Portal
pnpm dev:workers      # Apenas Workers

# Build e Testes
pnpm build            # Build de todos os apps
pnpm lint             # Lint de todos os apps
pnpm test             # Testes de todos os apps
pnpm type-check       # Verificação de tipos
```

### Variáveis de Ambiente

Copiar `.env.example` para `.env` e configurar:
- `DATABASE_URL`: PostgreSQL connection string
  - **Local**: `postgresql://user:password@localhost:5432/database`
  - **Supabase**: `postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres`
  - **Supabase Pooler (produção)**: `postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`
- `JWT_SECRET`: Secret para JWT
- `STRIPE_SECRET_KEY`: Chave do Stripe
- `REDIS_URL`: URL do Redis (para filas)

### Banco de Dados

**Supabase (Recomendado):**
- Usar conexão PostgreSQL direta (não API REST)
- Funciona como PostgreSQL normal
- Suporta todas as features: schemas, migrations, transactions
- Connection pooling incluído

---

## 📚 Regras do Cursor

As regras de desenvolvimento estão em `.cursor/rules/` no formato `.mdc`:

1. **arquitetura-core**: Estrutura monorepo (Always Apply)
2. **multitenancy**: Isolamento de dados (Always Apply)
3. **seguranca**: Zero Trust e proteção (Always Apply)
4. **backend-api**: Padrões Hono/Node.js
5. **frontend-react**: Padrões React/Tailwind
6. **billing-modular**: Controle de módulos e billing

Consulte `.cursor/rules/README.mdc` para lista completa.

---

## 🚀 Próximos Passos

1. **Configurar banco de dados**: Criar migrations e schema inicial
2. **Implementar autenticação**: JWT + Refresh Tokens
3. **Middleware de tenant**: Isolamento multitenant
4. **Sistema de módulos**: Feature toggles
5. **Billing**: Integração Stripe/ASAAS
6. **CI/CD**: Configurar pipelines

---

## 📝 Boas Práticas

### Commits
- Mensagens descritivas e claras
- Commits atômicos (uma mudança por commit)
- Referenciar issues quando aplicável

### Pull Requests
- Descrição clara do que foi alterado
- Testes passando
- Code review obrigatório
- Atualizar documentação se necessário

### Manutenção
- Sincronizar com upstream regularmente
- Manter dependências atualizadas
- Documentar decisões arquiteturais importantes

---

**Última atualização**: Estrutura consolidada do boilerplate SaaS multitenant.

# Estrutura do Projeto

## 📁 Visão Geral

```
ProjetoBase/
├── apps/                    # Aplicações do monorepo
│   ├── api/                 # Backend Node.js (Hono)
│   ├── portal/              # Frontend React + Vite
│   └── workers/             # Processamento Python
├── packages/                # Packages compartilhados
│   └── shared/              # Tipos, schemas e utilitários
├── .cursor/                 # Regras do Cursor
│   └── rules/               # Regras em formato .mdc
├── docs/                    # Documentação
├── package.json             # Configuração raiz do monorepo
├── pnpm-workspace.yaml      # Workspaces do pnpm
├── turbo.json               # Configuração do Turborepo
└── README.md                # Documentação principal
```

## 🎯 Apps

### `apps/api/`
Backend principal em Node.js com Hono.

**Estrutura:**
```
api/
├── src/
│   ├── routes/          # Definição de rotas
│   ├── services/        # Lógica de negócio
│   ├── repositories/   # Acesso ao banco
│   ├── middleware/      # Auth, Tenant, Modules
│   └── index.ts         # Entry point
├── package.json
└── tsconfig.json
```

### `apps/portal/`
Frontend React + Vite com Tailwind CSS.

**Estrutura:**
```
portal/
├── src/
│   ├── components/      # Componentes React
│   ├── pages/          # Páginas/Views
│   ├── hooks/          # Hooks customizados
│   ├── services/       # API clients
│   ├── contexts/        # Context API
│   ├── App.tsx         # Componente principal
│   └── main.tsx        # Entry point
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### `apps/workers/`
Processamento pesado em Python.

**Estrutura:**
```
workers/
├── src/
│   ├── workers/         # Workers específicos
│   ├── utils/           # Utilitários
│   └── main.py         # Entry point
├── requirements.txt
└── README.md
```

## 📦 Packages

### `packages/shared/`
Código compartilhado entre apps.

**Estrutura:**
```
shared/
├── src/
│   ├── types/           # Tipos TypeScript
│   ├── schemas/         # Schemas Zod
│   ├── utils/           # Utilitários
│   └── index.ts         # Exports principais
├── package.json
└── tsconfig.json
```

**Uso:**
```typescript
// Em qualquer app
import { UserSchema, type User } from '@shared/core';
import { validateEmail } from '@shared/core';
```

## 🔧 Configurações

### `package.json` (raiz)
- Define workspaces do monorepo
- Scripts globais (dev, build, lint, test)
- Configuração do Turborepo

### `pnpm-workspace.yaml`
- Define quais pastas são workspaces
- Permite compartilhamento de dependências

### `turbo.json`
- Pipeline de build otimizado
- Cache incremental
- Dependências entre tasks

## 🚀 Comandos Principais

```bash
# Instalar dependências
pnpm install

# Desenvolvimento (todos os apps)
pnpm dev

# Desenvolvimento (app específico)
pnpm dev:api
pnpm dev:portal
pnpm dev:workers

# Build
pnpm build

# Lint
pnpm lint

# Testes
pnpm test
```

## 📝 Próximos Passos

1. **Configurar banco de dados**: Criar migrations e schema inicial
2. **Implementar autenticação**: JWT + Refresh Tokens
3. **Middleware de tenant**: Isolamento multitenant
4. **Sistema de módulos**: Feature toggles
5. **Billing**: Integração Stripe/ASAAS
6. **CI/CD**: Configurar pipelines

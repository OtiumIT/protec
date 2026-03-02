# Deploy API no Vercel

## Configuração obrigatória no painel Vercel

### 1. Root Directory
- **Valor:** `apps/api`
- **Onde:** Project Settings → General → Root Directory
- Sem isso, o build e os paths falham.

### 2. Include source files outside of the Root Directory
- **Ativar** em Project Settings → General
- Necessário para o monorepo acessar `packages/shared`.

### 3. Variáveis de ambiente (obrigatórias)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string PostgreSQL (Supabase) |
| `JWT_SECRET` | Sim | Chave para JWT |
| `REFRESH_TOKEN_SECRET` | Sim | Chave para refresh token |
| `CORS_ORIGIN` ou `CORS_ORIGIN_DOMAINS` | Sim | Domínios permitidos (ex: `https://iataxsistemas.com.br`) |
| `STRIPE_SECRET_KEY` | Se usar billing | Chave Stripe |
| `STRIPE_WEBHOOK_SECRET` | Se usar billing | Webhook Stripe |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Sim | Service role key |
| `SUPABASE_ANON_KEY` | Sim | Anon key |
| `OPENAI_API_KEY` | Se usar IRPF | Chave OpenAI |

## Build

- **Build Command:** `cd ../.. && pnpm run build:vercel` (definido em vercel.json)
- **Output:** `api/index.js` (bundle único, ~670KB)
- **Node.js:** 20.x (definido em vercel.json)

## Rotas

- Todas as requisições são reescritas para `/api` (vercel.json)
- Health: `GET /health` ou `GET /`
- API v1: `GET/POST/PUT/DELETE /api/v1/*`

## Limite Hobby (12 funções)

- O projeto usa **1 única função** (`api/index.js`)
- `api/modules/` está em `.vercelignore` e `.gitignore` (artefatos antigos)

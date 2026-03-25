# Publicar o frontend no Cloudflare Pages

Somente o app **portal** (frontend React/Vite) é publicado no Cloudflare Pages.

**Resumo do envio:**
- **Pelo Git:** Conecte o repo no dashboard do Cloudflare Pages, configure build (`pnpm install && pnpm run build:portal`), output `apps/portal/dist`, root em branco, e defina **VITE_API_URL** nas variáveis de ambiente. Cada push na branch conectada gera um deploy.
- **Pelo CLI:** Na raiz do repo: `pnpm run build:portal`, depois `cd apps/portal && npx wrangler pages deploy dist --project-name=SEU_PROJETO`.

---

## Opção 1: Conectar o repositório no dashboard (recomendado)

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Conecte o repositório (GitHub/GitLab) e selecione o repositório do projeto.
3. Use as configurações abaixo.

### Configurações de build

| Campo | Valor |
|-------|--------|
| **Build command** | `pnpm install && pnpm run build:portal` |
| **Build output directory** | `apps/portal/dist` |
| **Root directory** | *(deixe em branco – raiz do repo)* |

### Variáveis de ambiente

| Variável | Valor | Obrigatório |
|----------|--------|-------------|
| **NODE_VERSION** | `24` | Recomendado |
| **PNPM_VERSION** | `8` | Se usar pnpm |
| **VITE_API_URL** | `https://xxxx.execute-api.us-east-1.amazonaws.com` ou domínio customizado no API Gateway | **Sim** – URL base da API (Lambda + API Gateway); veja `docs/DEPLOY_LAMBDA.md` |

Configure **VITE_API_URL** em **Settings → Environment variables** do projeto Pages (variáveis de produção).

Salve e faça o deploy. O Cloudflare vai instalar dependências, rodar `build:portal` e publicar o conteúdo de `apps/portal/dist`.

---

## Opção 2: Deploy via Wrangler CLI

1. Instale o Wrangler (se ainda não tiver): `pnpm add -D wrangler` na raiz ou use `npx wrangler`.
2. Faça login: `npx wrangler login`.
3. Crie o projeto Pages no dashboard (Workers & Pages → Create → Pages → Direct Upload) e anote o **project name**.
4. Build e deploy:

```bash
# Na raiz do monorepo
pnpm run build:portal
cd apps/portal
npx wrangler pages deploy dist --project-name=SEU_PROJETO
```

Substitua `SEU_PROJETO` pelo nome do projeto no Cloudflare Pages.

---

## Rotas (SPA)

O app é uma SPA (React Router). No Cloudflare Pages, configure **Redirects** para que todas as rotas caiam no `index.html`:

1. No projeto Pages → **Settings** → **Functions** (ou **Redirects**).
2. Adicione uma regra:
   - **URL**: `/*`
   - **Redirect to**: `/index.html`
   - **Status**: **200** (rewrite, não 302)

Ou crie o arquivo `apps/portal/public/_redirects` (ou `_redirects` na raiz de `dist` após o build) com:

```
/*    /index.html   200
```

Assim o Cloudflare Pages usa essa regra automaticamente. Vou adicionar esse arquivo no projeto.
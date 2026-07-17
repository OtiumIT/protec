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

## Homolog

O ambiente de homologação usa um **projeto Cloudflare Pages separado**, ligado à branch `homolog`, publicado em **`homolog.iataxsistemas.com.br`**. Assim produção (`main` → `iataxsistemas.com.br`) e homolog ficam isolados no frontend, cada um apontando para o seu stack de API.

### Passo a passo (uma vez)

1. **Branch `homolog`:** garanta que a branch existe no repositório (o push nela dispara o workflow `Deploy API Lambda (homolog)` e atualiza o stack `protec-api-homolog`).
2. **Novo projeto Pages:** Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → mesmo repositório.
   - **Project name:** ex. `iatax-homolog`.
   - **Production branch:** `homolog` (nas configurações do projeto, defina a branch de produção do projeto como `homolog`).
   - **Build command:** `pnpm install && pnpm run build:portal`.
   - **Build output directory:** `apps/portal/dist`.
   - **Root directory:** em branco.
3. **Variáveis de ambiente** (Settings → Environment variables → Production):
   - `NODE_VERSION` = `24`
   - `PNPM_VERSION` = `8`
   - `VITE_API_URL` = Output `ApiUrl` do stack **`protec-api-homolog`** (ex.: `https://xxxx.execute-api.us-east-1.amazonaws.com`).
   - A variável do dashboard **tem precedência** sobre `apps/portal/.env.production`, então o build de homolog usa a URL da API de homolog.
4. **Domínio customizado:** no projeto de homolog → Custom domains → Set up a custom domain → `homolog.iataxsistemas.com.br`. Como o domínio está na Cloudflare, o DNS (CNAME) e o certificado TLS são provisionados automaticamente.
5. **CORS:** `https://homolog.iataxsistemas.com.br` já está liberado no API Gateway (`infra/template.yaml`) e coberto por `CORS_ORIGIN_DOMAINS=iataxsistemas.com.br` na camada Hono. Nenhuma ação extra se o SSM já usa o domínio-base.

### Fluxo de trabalho

- Push em `homolog` → publica a API (`protec-api-homolog`) e o portal de homolog (`homolog.iataxsistemas.com.br`).
- Push em `main` → publica produção (`protec-api` + portal de produção).

> ⚠️ O banco de homolog é **o mesmo da produção** hoje (ver [DEPLOY_LAMBDA.md](DEPLOY_LAMBDA.md#ambiente-homolog-api-dedicada--portal-em-homologiataxsistemascombr)). Trate os testes em homolog com esse cuidado até que o banco seja isolado.

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
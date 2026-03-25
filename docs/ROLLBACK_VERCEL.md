# Rollback para Vercel (emergência)

O fluxo padrão é **Lambda + API Gateway** (`docs/DEPLOY_LAMBDA.md`). Use este guia só se precisar **voltar** a usar a API na Vercel:

## 1. Reconectar projeto no Vercel

1. Acesse [Vercel Dashboard](https://vercel.com)
2. Recupere ou crie o projeto da API
3. Conecte ao repositório Git (Settings → Git → Connect)
4. Configure **Root Directory**: `apps/api`
5. Ative **Include source files outside of the Root Directory**
6. Defina as variáveis de ambiente (ver `apps/api/VERCEL.md`)

## 2. Ajustar fluxo de push

Altere o comando de push para usar o build Vercel:

- Em `scripts/push-with-build.mjs`: troque `build:lambda` por `build:vercel:output`
- Em `scripts/push-with-build.mjs`: volte a incluir `apps/api/.vercel/output` no `git add -f`
- Em `.cursor/rules/push-workflow/rule.mdc`: documente o fluxo Vercel de novo

## 3. Atualizar VITE_API_URL

No **Cloudflare Pages** → Settings → Environment variables, altere `VITE_API_URL` para a URL da API na Vercel (ex: `https://protec-api.vercel.app`).

## 4. Desabilitar deploy Lambda (opcional)

Para evitar deploys duplicados:

- Remova ou desative o workflow `.github/workflows/deploy-api-lambda.yml` (adicione `if: false` no job ou delete o arquivo)

## Código preservado

O código Vercel (`apps/api/api/index.ts`, `vercel.json`, `build-vercel-output.mjs`) permanece no repositório. Não é necessária alteração de código para o rollback.

# Vercel — descontinuado para esta API

O backend em produção é **AWS Lambda + API Gateway**. A publicação da API na **Vercel** não é mais o fluxo oficial.

- Deploy: `docs/DEPLOY_LAMBDA.md`
- Infra (SAM, SSM): `infra/README.md`

Arquivos como `vercel.json` e `build:vercel:output` podem permanecer no repositório apenas para referência local; o **`pnpm run push`** na raiz do monorepo usa **`build:lambda`**.

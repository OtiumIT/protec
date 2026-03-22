# Deploy da API no AWS Lambda

A API roda em **Lambda + API Gateway HTTP API**. O deploy é feito automaticamente via GitHub Actions em cada push na `main`.

## Pré-requisitos

- Conta AWS
- Repositório no GitHub
- Projeto Cloudflare Pages (portal) configurado

## Configuração inicial

### 1. Configurar OIDC na AWS

Para o GitHub Actions autenticar na AWS sem chaves estáticas:

1. Crie uma role IAM com trust policy para o GitHub OIDC provider.
2. A role precisa das permissões: `lambda:`*, `apigateway:`*, `iam:PassRole`, `cloudformation:*`, `s3:*` (para o bucket de deploy do SAM).

**Trust policy** (configurado para conta `688123783562` e repositório `OtiumIT/protec`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::688123783562:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OtiumIT/protec:*"
        }
      }
    }
  ]
}
```

> **Migração de conta:** Para outra conta AWS, altere `688123783562` pelo Account ID da nova conta e `OtiumIT/protec` pelo org/repo se for outro repositório.

1. Configure o OIDC provider na AWS (uma vez por conta): [Documentação GitHub](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services).
2. Anote o ARN da role criada.

**Referência (conta 688123783562):**

- OIDC Provider ARN: `arn:aws:iam::688123783562:oidc-provider/token.actions.githubusercontent.com`
- Role ARN: `arn:aws:iam::688123783562:role/iatax_github`

### 2. Secrets e variáveis no GitHub

**URL:** [https://github.com/OtiumIT/protec/settings/secrets/actions](https://github.com/OtiumIT/protec/settings/secrets/actions)

---

#### Passo a passo: SECRETS

1. Acesse **Settings** → **Secrets and variables** → **Actions** (URL: [https://github.com/OtiumIT/protec/settings/secrets/actions](https://github.com/OtiumIT/protec/settings/secrets/actions))
2. Clique em **Secrets** (aba) → **New repository secret**
3. Adicione cada secret — **valores copiados do `.env.example`** (copie e cole no GitHub):


| #   | Nome no GitHub          | Valor para colar                                                                                                                                                                                                              |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `AWS_OIDC_ROLE_ARN`     | `arn:aws:iam::688123783562:role/iatax_github`                                                                                                                                                                                 |
| 2   | `DATABASE_URL`          | `postgresql://postgres:protecotium2026@db.cblhvaligwnrhvxrknyj.supabase.co:5432/postgres`                                                                                                                                     |
| 3   | `JWT_SECRET`            | `dev-secret-key-change-in-production`                                                                                                                                                                                         |
| 4   | `REFRESH_TOKEN_SECRET`  | `dev-refresh-secret-key-change-in-production`                                                                                                                                                                                 |
| 5   | `SUPABASE_URL`          | `https://cblhvaligwnrhvxrknyj.supabase.co`                                                                                                                                                                                    |
| 6   | `SUPABASE_SERVICE_KEY`  | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGh2YWxpZ3ducmh2eHJrbnlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMwMDIzMywiZXhwIjoyMDg0ODc2MjMzfQ.DF58YNsnwd7DDPD79TNO1UqheudUqlRxOE-mseArt-0` |
| 7   | `SUPABASE_ANON_KEY`     | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNibGh2YWxpZ3ducmh2eHJrbnlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDAyMzMsImV4cCI6MjA4NDg3NjIzM30.VNclDVtv4upDd3ASeIFU_aHYSn37KqfNzSXlt8LhQD4`            |
| 8   | `STRIPE_SECRET_KEY`     | `sk_test_...` *(não configurado no .env — adicione chave do Stripe se usar billing)*                                                                                                                                          |
| 9   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` *(não configurado no .env — adicione webhook do Stripe se usar billing)*                                                                                                                                          |
| 10  | `OPENAI_API_KEY`        | *(copie do .env — não commitar chave no repositório)*                                            |


---

#### Passo a passo: VARIÁVEIS

1. Na mesma página (Secrets and variables → Actions), clique na aba **Variables** → **New repository variable**
2. Adicione (variáveis aparecem nos logs — não use segredos):


| Nome da variável      | Valor para colar                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `AWS_REGION`          | `us-east-1`                                                                                                   |
| `CORS_ORIGIN`         | `http://localhost:5173` *(dev) ou `https://iataxsistemas.com.br,https://www.iataxsistemas.com.br` (produção)* |
| `CORS_ORIGIN_DOMAINS` | `iataxsistemas.com.br` *(domínio do portal em produção)*                                                      |
|                       |                                                                                                               |


### 3. Atualizar VITE_API_URL no Cloudflare

Após o primeiro deploy:

1. Acesse os Outputs do stack no AWS CloudFormation (ou o log do workflow).
2. Copie a URL da API (ex: `https://xxx.execute-api.us-east-1.amazonaws.com`).
3. Em **Cloudflare Pages** → projeto portal → Settings → Environment variables, defina `VITE_API_URL` com essa URL.

## Deploy manual

```bash
pnpm run build:lambda
sam build -t infra/template.yaml
sam deploy
```

Ver `infra/README.md` para parâmetros e detalhes.

## Migrar para outra conta AWS

1. Crie a role OIDC na nova conta (igual ao passo 1).
2. Configure os secrets no GitHub (podem ser os mesmos valores).
3. Altere `AWS_OIDC_ROLE_ARN` para o ARN da nova role.
4. Opcional: altere `AWS_REGION` se usar outra região.
5. O workflow fará o deploy na nova conta. Atualize `VITE_API_URL` com a nova URL.


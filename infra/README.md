# Infraestrutura AWS (SAM)

API Protec rodando em Lambda + API Gateway HTTP API.

## Pré-requisitos

- [AWS CLI](https://aws.amazon.com/cli/) configurado
- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20+ e pnpm

## Setup inicial (uma vez)

Antes do primeiro deploy, crie os parâmetros no SSM:

```bash
chmod +x infra/setup-ssm.sh
./infra/setup-ssm.sh
```

O script lê o `.env` e cria os parâmetros em `/protec-api/*`. No Windows, use Git Bash ou WSL.

## Deploy homolog (segunda API)

O workflow **Deploy API Lambda (homolog)** publica o stack `protec-api-homolog` (mesmo template e mesmos parâmetros SSM que `protec-api`). Veja [docs/DEPLOY_LAMBDA.md](../docs/DEPLOY_LAMBDA.md#ambiente-homolog-api-dedicada).

Deploy manual equivalente:

```bash
pnpm run build:lambda
sam build -t infra/template.yaml
sam deploy --stack-name protec-api-homolog --capabilities CAPABILITY_IAM --no-confirm-changeset --s3-bucket protec-sam-artifacts-688123783562
```

## Deploy manual

1. **Build da API** (na raiz do monorepo):
   ```bash
   pnpm run build:lambda
   ```

2. **Build SAM**:
   ```bash
   sam build -t infra/template.yaml
   ```

3. **Deploy**:
   ```bash
   sam deploy
   ```
   Ou com parâmetros na linha de comando:
   ```bash
   sam deploy --parameter-overrides \
     DatabaseUrl="postgresql://..." \
     JwtSecret="sua-chave" \
     RefreshTokenSecret="sua-chave" \
     SupabaseUrl="https://xxx.supabase.co" \
     SupabaseServiceKey="..." \
     SupabaseAnonKey="..." \
     CorsOriginDomains="seusite.com"
   ```

## Variáveis obrigatórias

| Parâmetro | Descrição |
|-----------|-----------|
| `DatabaseUrl` | Connection string PostgreSQL (Supabase) |
| `JwtSecret` | Chave JWT |
| `RefreshTokenSecret` | Chave refresh token |
| `SupabaseUrl` | URL do projeto Supabase |
| `SupabaseServiceKey` | Service role key |
| `SupabaseAnonKey` | Anon key |
| `CorsOrigin` ou `CorsOriginDomains` | Domínios permitidos (ex: `https://seusite.com` ou `seusite.com`) |

## Variáveis opcionais

| Parâmetro | Descrição |
|-----------|-----------|
| `StripeSecretKey` | Chave Stripe (billing) |
| `StripeWebhookSecret` | Webhook Stripe (billing) |
| `OpenaiApiKey` | Chave OpenAI (módulo IRPF) |
| `ForceAllModulesActive` | `true` para dev/demo |

## Migração de conta AWS

1. Configure credenciais da nova conta (perfil ou variáveis)
2. Edite `samconfig.toml`: `stack_name`, `region`
3. Crie os parâmetros na nova conta (ou use `--parameter-overrides`)
4. Execute `sam build -t infra/template.yaml && sam deploy`
5. Atualize `VITE_API_URL` no Cloudflare Pages com a nova URL do Output

## Usar Secrets Manager / Parameter Store

Para produção, em vez de passar parâmetros em texto, use referências no template:

```yaml
# Exemplo com SSM Parameter Store
DATABASE_URL: !Sub '{{resolve:ssm:/protec/DATABASE_URL}}'
```

Ou Secrets Manager:
```yaml
DATABASE_URL: !Sub '{{resolve:secretsmanager:protec/env:SecretString:DATABASE_URL}}'
```

Crie o secret/parâmetro na AWS e altere o template para usar `!Sub` com a sintaxe de resolução dinâmica.

## Outputs

Após o deploy, a URL da API aparece em Outputs → `ApiUrl`. Use essa URL em `VITE_API_URL` no Cloudflare Pages.

## Workers Python (EC2 + systemd)

Instancia EC2 `t3a.nano` com servico systemd `protec-worker`. Deploy via GitHub Actions + SSM Run Command. Ver [`docs/DEPLOY_WORKERS.md`](../docs/DEPLOY_WORKERS.md).

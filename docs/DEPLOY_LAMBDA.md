# Deploy da API no AWS Lambda

A API roda em **Lambda + API Gateway HTTP API**. O deploy é feito automaticamente via GitHub Actions em cada push na `main`.

**Workers Python (fiscal_files):** EC2 t3a.nano + systemd; ver [DEPLOY_WORKERS.md](DEPLOY_WORKERS.md) (reutiliza SSM `/protec-api/*`).

## Descontinuar a Vercel (API)

1. **Pare de usar** o projeto Vercel da API (pode arquivar/remover o projeto ou desligar o domínio apontando para a Vercel).
2. **DNS / HTTPS:** use uma destas opções:
   - **Rápido:** `VITE_API_URL` = URL do **Output** `ApiUrl` do CloudFormation (ex.: `https://xxxx.execute-api.us-east-1.amazonaws.com`) — o certificado TLS é válido para esse hostname.
   - **Domínio próprio** (ex.: `api.iataxsistemas.com.br`): crie um **Custom domain** no API Gateway + certificado **ACM** na mesma região da API, com registro DNS (CNAME) conforme a AWS indicar. Sem isso, o browser pode retornar `ERR_CERT_COMMON_NAME_INVALID`.
3. **CORS:** no SSM (`CORS_ORIGIN` / `CORS_ORIGIN_DOMAINS`), mantenha a origem do portal (ex.: `https://iataxsistemas.com.br` ou o domínio do Cloudflare Pages).
4. **Push local:** `pnpm run push` executa `build:lambda` e envia o código; o deploy da Lambda é o workflow **Deploy API Lambda**.

## Pré-requisitos

- Conta AWS
- Repositório no GitHub
- Projeto Cloudflare Pages (portal) configurado

## Configuração inicial

### 1. Configurar OIDC na AWS

Para o GitHub Actions autenticar na AWS sem chaves estáticas:

1. Crie uma role IAM com trust policy para o GitHub OIDC provider.
2. A role precisa das permissões: `lambda:*`, `apigateway:*`, `iam:PassRole`, `cloudformation:*`, `s3:*`, `ssm:GetParameters` (para ler parâmetros no deploy).

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

### 2. Criar parâmetros no AWS SSM (uma vez)

**Não use mais GitHub Secrets** para a aplicação. Os valores vêm do **AWS Parameter Store**.

Execute o script (com AWS CLI configurado):

```bash
cd protec
chmod +x infra/setup-ssm.sh
./infra/setup-ssm.sh
```

O script lê o `.env` da raiz e cria os parâmetros em `/protec-api/*`. Requer permissão `ssm:PutParameter` na sua conta.

**Adicione `ssm:GetParameters`** à policy da role OIDC (`iatax_github`) para o deploy funcionar.


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

## Troubleshooting

### `Stack is in ROLLBACK_FAILED state and can not be updated`

O workflow tenta **excluir** automaticamente o stack `protec-api` nesses estados antes do deploy. Se a exclusão travar (ex.: role IAM presa), apague manualmente a role órfã em **IAM → Roles** e depois **Delete stack** no CloudFormation.

### `ROLLBACK_FAILED` no stack `aws-sam-cli-managed-default`

O workflow usa o bucket `protec-sam-artifacts-688123783562` em vez de `--resolve-s3`, para não depender desse stack.

Se ainda aparecer erro antigo, no CloudFormation **exclua** o stack `aws-sam-cli-managed-default` (se existir e estiver em falha).

### Permissões da role `iatax_github`

Inclua na policy:

- `s3:CreateBucket`, `s3:HeadBucket`, `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` no bucket `protec-sam-artifacts-688123783562` (ou `arn:aws:s3:::protec-sam-artifacts-688123783562/*`)

### CORS bloqueado no browser (`No 'Access-Control-Allow-Origin'`)

A API só devolve cabeçalhos CORS para origens listadas em **`/protec-api/CORS_ORIGIN`** (URLs completas, separadas por vírgula) ou **`/protec-api/CORS_ORIGIN_DOMAINS`** (domínios base, ex.: `iataxsistemas.com.br`, cobre `www` e subdomínios). Veja [`apps/api/src/modules/index.ts`](../apps/api/src/modules/index.ts).

1. **Atualize o SSM** (ex.: produção no Cloudflare em `https://iataxsistemas.com.br`):

   ```bash
   # Opção A — domínio (recomendado: cobre www e subdomínios do mesmo domínio)
   aws ssm put-parameter --name /protec-api/CORS_ORIGIN_DOMAINS --value "iataxsistemas.com.br" --type String --overwrite --region us-east-1

   # Opção B — URL exata (use várias origens separadas por vírgula, sem espaços extras)
   aws ssm put-parameter --name /protec-api/CORS_ORIGIN --value "https://iataxsistemas.com.br,https://www.iataxsistemas.com.br" --type String --overwrite --region us-east-1
   ```

   Se já existir outra origem (ex. preview do Pages), **junte** na mesma string: `https://preview.pages.dev,https://iataxsistemas.com.br`.

2. **Faça um novo deploy do stack** (`sam deploy` ou push na `main` que dispare o workflow **Deploy API Lambda**). O template resolve `{{resolve:ssm:...}}` no **momento do deploy**; só atualizar o SSM **não** altera as variáveis de ambiente da Lambda até o próximo deploy.

3. Confirme com o endpoint de diagnóstico (após o deploy): `GET /api/v1/debug/cors?origin=https://iataxsistemas.com.br` — o campo `wouldAllow` deve ser `true`.

### `MaxClientsInSessionMode: max clients reached` (Supabase)

O **pooler do Supabase em modo Session** aceita poucas sessões simultâneas no total (várias Lambdas × várias conexões no `pg` Pool esgotam rápido).

1. O template da API define **`DATABASE_POOL_MAX=1`** na Lambda e o código usa **1 conexão por instância** quando detecta ambiente Lambda (veja `apps/api/src/db/client.ts`).
2. Se o `DATABASE_URL` no SSM apontar para o **Session pooler**, confira no painel Supabase se precisa **aumentar o pool size** do modo Session ou reduzir concorrência (reserved concurrency na Lambda).
3. **Transaction mode** (porta 6543) aguenta mais conexões curtas, mas exige que a aplicação seja compatível com PgBouncer em modo transação (hoje o tenant usa `SET search_path` por conexão; mudar exige cuidado).


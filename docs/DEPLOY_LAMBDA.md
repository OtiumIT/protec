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

### `ROLLBACK_FAILED` no stack `aws-sam-cli-managed-default`

O workflow usa o bucket `protec-sam-artifacts-688123783562` em vez de `--resolve-s3`, para não depender desse stack.

Se ainda aparecer erro antigo, no CloudFormation **exclua** o stack `aws-sam-cli-managed-default` (se existir e estiver em falha).

### Permissões da role `iatax_github`

Inclua na policy:

- `s3:CreateBucket`, `s3:HeadBucket`, `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` no bucket `protec-sam-artifacts-688123783562` (ou `arn:aws:s3:::protec-sam-artifacts-688123783562/*`)


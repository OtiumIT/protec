# Deploy dos workers Python (ECS Fargate)

Processamento assíncrono de `fiscal_files` (`apps/workers`) em **ECS Fargate**, stack CloudFormation **`protec-workers`**, imagem em **ECR** `protec-worker`. Rede: **VPC dedicada** com subnets públicas e **AssignPublicIp** (sem NAT Gateway no primeiro corte).

## Pré-requisitos

1. **SSM Parameter Store** com os mesmos parâmetros da API (`infra/setup-ssm.sh`), no mínimo:
   - `/protec-api/DATABASE_URL`
   - `/protec-api/SUPABASE_URL`
   - `/protec-api/SUPABASE_SERVICE_KEY`

2. **Role OIDC do GitHub** (mesma usada em `Deploy API Lambda`) com permissões adicionais para ECR, ECS e CloudFormation desta stack. Veja a seção [IAM](#iam-política-complementar-para-a-role-oidc) abaixo.

3. **Docker** no ambiente local (apenas para deploy manual).

## Deploy automático (GitHub Actions)

O workflow [`.github/workflows/deploy-workers.yml`](../.github/workflows/deploy-workers.yml) roda em:

- `push` na branch `main` alterando `apps/workers/**`, `infra/workers-template.yaml` ou o próprio workflow;
- `workflow_dispatch` (manual).

Passos do job: `cloudformation deploy` → build/push da imagem com tag `${GITHUB_SHA}` → `ecs update-service --force-new-deployment`.

Variáveis: use `vars.AWS_REGION` (opcional; padrão `us-east-1`) e `secrets.AWS_OIDC_ROLE_ARN` ou `vars.AWS_OIDC_ROLE_ARN` como na API.

## Deploy manual

Na raiz do monorepo (com AWS CLI configurado):

```bash
export AWS_REGION="${AWS_REGION:-us-east-1}"
export IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"

aws cloudformation deploy \
  --template-file infra/workers-template.yaml \
  --stack-name protec-workers \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "ImageTag=${IMAGE_TAG}" \
  --region "$AWS_REGION"

ECR_URI=$(aws cloudformation describe-stacks --stack-name protec-workers --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' --output text)

REGISTRY="${ECR_URI%%/*}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

docker build -t "${ECR_URI}:${IMAGE_TAG}" -f apps/workers/Dockerfile apps/workers
docker push "${ECR_URI}:${IMAGE_TAG}"

aws ecs update-service \
  --cluster protec-workers \
  --service protec-workers \
  --region "$AWS_REGION" \
  --force-new-deployment
```

Na **primeira** execução, o serviço ECS pode falhar o pull até o push terminar; após o push e o `update-service`, as tasks devem estabilizar.

## Observabilidade

- **Logs**: grupo CloudWatch `/ecs/protec-workers`, retenção 30 dias. Streams por task (`fiscal-worker/...`).
- **Container Insights**: desligado na stack para reduzir custo. Para alarmes nativos de contagem de tasks, ative Container Insights no cluster e crie alarmes em `ECS/ContainerInsights`.
- **Métricas recomendadas depois**: filtrar nos logs por `processed` / `errors` do worker; opcional **metric filter** + alarme em taxa de linhas com `❌` ou `error`.

## Evolução: de polling para fila

Hoje o worker lista schemas `tenant_*` e usa `FOR UPDATE SKIP LOCKED` em `fiscal_files`. Caminho típico de evolução:

1. **Manter Fargate**, mas a API publica mensagens (SQS/EventBridge) por arquivo ou tenant após upload.
2. O worker passa a consumir a fila (long polling) em vez de varrer todos os tenants a cada ciclo; reduz carga no banco e melhora priorização.
3. **DLQ** para falhas repetidas e política de retry explícita.

Isso não exige trocar de ECS para Lambda; exige mudança de código em `apps/workers` e permissões IAM para SQS.

## Troubleshooting

| Sintoma | Verificação |
|--------|-------------|
| `CannotPullContainerError` | Imagem com a tag do deploy existe no ECR? Rode o push e `update-service --force-new-deployment`. |
| Task para com erro de SSM | A role de execução da task tem `ssm:GetParameters` em `arn:...:parameter/protec-api/*`? Parâmetros existem na mesma conta/região? |
| Timeout / falha ao conectar no Postgres | Security group só tem egress; confirme se o endpoint do banco é acessível pela internet (ex.: Supabase). Sem NAT, a task usa IP público. |
| `ResourceInitializationError` secrets | Nomes SSM exatos: `/protec-api/DATABASE_URL`, etc. (como em `setup-ssm.sh`). |

## IAM: política complementar para a role OIDC

A role usada pelo GitHub Actions no deploy da API já costuma incluir `cloudformation:*` e `iam:*` para criar a Lambda. Para os workers, garanta pelo menos:

- **ECR**: `GetAuthorizationToken` (resource `*`) e operações de push na imagem no repositório criado pela stack (ou `*` no repositório).
- **ECS**: `UpdateService`, `DescribeServices`, `DescribeClusters` nos recursos do cluster/serviço `protec-workers` (ou `*` durante a adoção).
- **CloudFormation**: mesmo nível já usado para `protec-api` (criar/atualizar stack `protec-workers`).
- **IAM**: `PassRole` para as roles que o CloudFormation anexa à task (`ecs-tasks.amazonaws.com`).

Exemplo de bloco **adicional** (ajuste `ACCOUNT_ID` e refine ARNs quando estiver estável):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrPushProtecWorker",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EcrRepoProtecWorker",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories"
      ],
      "Resource": "arn:aws:ecr:REGION:ACCOUNT_ID:repository/protec-worker"
    },
    {
      "Sid": "EcsUpdateProtecWorkers",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeClusters"
      ],
      "Resource": "*"
    }
  ]
}
```

`GetAuthorizationToken` em ECR exige `Resource: *` na AWS.

Se o deploy CloudFormation falhar por IAM, amplie as mesmas permissões que já funcionam para o stack `protec-api` (criação de roles/policies pelo CFN).

## Referências no repositório

- Template: [`infra/workers-template.yaml`](../infra/workers-template.yaml)
- Worker: [`apps/workers/src/main.py`](../apps/workers/src/main.py)
- API / SSM: [`docs/DEPLOY_LAMBDA.md`](DEPLOY_LAMBDA.md)

# Deploy dos workers Python (ECS Fargate)

Processamento assíncrono de `fiscal_files` (`apps/workers`) em **ECS Fargate**, stack CloudFormation **`protec-workers`**, imagem em **ECR** `protec-worker`. Rede: **VPC dedicada** com subnets públicas e **AssignPublicIp** (sem NAT Gateway no primeiro corte).

## Pré-requisitos

1. **SSM Parameter Store** com os mesmos parâmetros da API (`infra/setup-ssm.sh`), no mínimo:
   - `/protec-api/DATABASE_URL`
   - `/protec-api/SUPABASE_URL`
   - `/protec-api/SUPABASE_SERVICE_KEY`

2. **Role OIDC do GitHub** (mesma usada em `Deploy API Lambda`) com permissões adicionais para **criar** o repositório ECR (`ecr:CreateRepository`), além de push/pull e ECS. Sem `ecr:CreateRepository`, o deploy falha com `AccessDenied` no recurso `WorkerRepository`. Veja [IAM](#iam-política-complementar-para-a-role-oidc).

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
| `User ... is not authorized to perform: ecr:CreateRepository` | Anexe à role OIDC **`ecr:CreateRepository`** (veja IAM abaixo). Sem isso o recurso `WorkerRepository` falha. |
| `iam:CreateRole` / `UnauthorizedTaggingOperation` em `TaskRole` ou `TaskExecutionRole` | Falta permissão para **criar** (e taguear) roles IAM. Inclua `iam:CreateRole`, `iam:TagRole`, `iam:PutRolePolicy`, `iam:AttachRolePolicy`, `iam:PassRole` nas roles criadas pela stack (ou `iam:*` na role de deploy). Ver [IAM](#iam-política-complementar-para-a-role-oidc). |
| `iam:GetRolePolicy` em `WorkerTaskDefinition` | O CloudFormation precisa ler a policy inline da role de execução ao criar a task definition. Inclua **`iam:GetRolePolicy`** no mesmo `Resource` das roles `protec-workers-*`. |
| Stack **`ROLLBACK_FAILED`** (rollback não concluiu) | O CloudFormation tentou apagar roles IAM e a role OIDC não tinha `iam:DeleteRole` / `iam:DeleteRolePolicy`. **(1)** Anexe essas permissões à `iatax_github` (ou equivalente). **(2)** No console CloudFormation, **Delete** na stack `protec-workers` **ou** rode o workflow de novo: o job **Remove stack protec-workers se estiver em falha** tenta excluir automaticamente. Se ainda falhar, um usuário **administrador** na AWS deve excluir a stack ou as roles órfãs (`protec-workers-TaskRole-*`, `protec-workers-TaskExecutionRole-*`). |
| Stack **`DELETE_FAILED`** | A exclusão da stack parou porque algum recurso não pôde ser removido (quase sempre **IAM**). O workflow **falha com mensagem explícita** e lista eventos. Corrija permissões (`iam:DeleteRole`, `iam:DeleteRolePolicy`, `iam:DetachRolePolicy`, `iam:DeletePolicy` nas policies inline) na role OIDC **ou** exclua a stack na console com um usuário **administrador** / apague manualmente as roles indicadas nos eventos da stack. |
| `ROLLBACK_COMPLETE` após primeiro erro | Stack vazia de recursos úteis: pode **Delete** no console e rodar o workflow outra vez (com IAM ECR corrigido). |
| `CannotPullContainerError` | Imagem com a tag do deploy existe no ECR? Rode o push e `update-service --force-new-deployment`. |
| Task para com erro de SSM | A role de execução da task tem `ssm:GetParameters` em `arn:...:parameter/protec-api/*`? Parâmetros existem na mesma conta/região? |
| Timeout / falha ao conectar no Postgres | Security group só tem egress; confirme se o endpoint do banco é acessível pela internet (ex.: Supabase). Sem NAT, a task usa IP público. |
| `ResourceInitializationError` secrets | Nomes SSM exatos: `/protec-api/DATABASE_URL`, etc. (como em `setup-ssm.sh`). |

## IAM: política complementar para a role OIDC

A role usada pelo GitHub Actions no deploy da API já costuma incluir `cloudformation:*` e `iam:*` para criar a Lambda. Para os workers, o CloudFormation **cria** o repositório ECR — a role precisa de **`ecr:CreateRepository`** (e ações relacionadas ao repositório), não só de push.

Garanta também:

- **ECR**: `GetAuthorizationToken` (`Resource: *`) + criação/alteração do repositório (`CreateRepository`, lifecycle, scan) + push de imagem no `protec-worker`.
- **ECS**: `UpdateService`, `DescribeServices`, `DescribeClusters`, `RegisterTaskDefinition`, etc., para o workflow concluir após o push.
- **EC2**: `ec2:*` em VPC/subnet/SG/IGW **ou** as ações que o CloudFormation usar ao criar a VPC do template (a role da API muitas vezes não inclui EC2).
- **CloudFormation**: criar/atualizar stack `protec-workers`.
- **IAM**: o CloudFormation **cria** roles (`TaskExecutionRole`, `TaskRole`). A role OIDC precisa de pelo menos: `iam:CreateRole`, `iam:TagRole`, `iam:UntagRole`, `iam:PutRolePolicy`, `iam:AttachRolePolicy`, `iam:PassRole` (principal `ecs-tasks.amazonaws.com`), além de `iam:DeleteRole`, `iam:DeleteRolePolicy`, `iam:DetachRolePolicy` para rollback/exclusão. Sem `iam:CreateRole` o erro costuma ser `UnauthorizedTaggingOperation` / `not authorized to perform: iam:CreateRole` no recurso `TaskRole` ou `TaskExecutionRole`. Em muitos times usa-se `iam:*` na role de deploy, como no SAM da API.

Política **complementar** sugerida (inline na role `iatax_github` ou anexa dedicada). Ajuste `REGION` e `ACCOUNT_ID`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrAuth",
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Sid": "EcrCreateRepoForCf",
      "Effect": "Allow",
      "Action": [
        "ecr:CreateRepository",
        "ecr:DeleteRepository",
        "ecr:DescribeRepositories",
        "ecr:PutLifecyclePolicy",
        "ecr:PutImageScanningConfiguration"
      ],
      "Resource": "*"
    },
    {
      "Sid": "EcrPushProtecWorker",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "arn:aws:ecr:REGION:ACCOUNT_ID:repository/protec-worker"
    },
    {
      "Sid": "EcsWorkers",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeClusters",
        "ecs:RegisterTaskDefinition",
        "ecs:DescribeTaskDefinition",
        "ecs:CreateCluster",
        "ecs:DeleteCluster",
        "ecs:CreateService",
        "ecs:DeleteService"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Ec2WorkersVpc",
      "Effect": "Allow",
      "Action": ["ec2:*"],
      "Resource": "*"
    },
    {
      "Sid": "IamCfCreateAndTagRoles",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:ListRolePolicies",
        "iam:ListAttachedRolePolicies"
      ],
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/protec-workers-*"
      ]
    },
    {
      "Sid": "IamPassRoleEcsTasks",
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/protec-workers-*"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    },
    {
      "Sid": "LogsWorkers",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:PutRetentionPolicy",
        "logs:DeleteLogGroup",
        "logs:DescribeLogGroups"
      ],
      "Resource": "arn:aws:logs:REGION:ACCOUNT_ID:log-group:/ecs/protec-workers*"
    }
  ]
}
```

**Nota:** `ecr:CreateRepository` na AWS é avaliado com recurso inexistente; por isso muitas políticas usam `"Resource": "*"` só para esse bloco ou incluem `*` na lista. Se a policy acima for rejeitada pelo editor IAM, separe em dois statements: um com `CreateRepository`/`DeleteRepository` e `Resource: "*"` e outro com push restrito ao ARN do repositório.

`GetAuthorizationToken` em ECR exige `Resource: *`.

Se o deploy CloudFormation falhar por IAM, amplie as mesmas permissões que já funcionam para o stack `protec-api` (criação de roles/policies pelo CFN).

## Referências no repositório

- Template: [`infra/workers-template.yaml`](../infra/workers-template.yaml)
- Worker: [`apps/workers/src/main.py`](../apps/workers/src/main.py)
- API / SSM: [`docs/DEPLOY_LAMBDA.md`](DEPLOY_LAMBDA.md)

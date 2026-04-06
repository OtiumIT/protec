# Deploy dos Workers Python (EC2 + systemd)

Processamento assincrono de `fiscal_files` (`apps/workers`) em **EC2 t3a.nano**, servico **systemd** `protec-worker`, deploy via **SSM Run Command**.

## Infraestrutura

| Recurso | Valor |
|---------|-------|
| Instancia | `t3a.nano` (2 vCPU AMD, 0.5 GB) |
| AMI | Amazon Linux 2023 (x86_64) |
| Instance ID | `i-0543526ca45992d24` |
| Tag | `Name=protec-worker`, `Project=protec` |
| Security Group | `sg-0c5b6287943e476dc` (egress-only) |
| IAM Role | `protec-worker-ec2-role` |
| Instance Profile | `protec-worker-ec2-profile` |
| S3 Deploy Bucket | `protec-worker-deploy-688123783562` |
| VPC | Default (`vpc-4033093a`) |
| Regiao | `us-east-1` |
| Custo estimado | ~$4/mes (instancia + EBS 8GB gp3) |

## Pre-requisitos

1. **SSM Parameter Store** com os mesmos parametros da API (`infra/setup-ssm.sh`):
   - `/protec-api/DATABASE_URL`
   - `/protec-api/SUPABASE_URL`
   - `/protec-api/SUPABASE_SERVICE_KEY`

2. **Role OIDC** (`iatax_github`) com policy `ProtecWorkerEC2Deploy`:
   - `ssm:SendCommand`, `ssm:GetCommandInvocation` (deploy remoto)
   - `ec2:DescribeInstances` (localizar instancia por tag)
   - `s3:PutObject`, `s3:GetObject` em `protec-worker-deploy-688123783562/*`

## Deploy automatico (GitHub Actions)

O workflow [`.github/workflows/deploy-workers.yml`](../.github/workflows/deploy-workers.yml) roda em:

- `push` na branch `main` alterando `apps/workers/**` ou o proprio workflow;
- `workflow_dispatch` (manual).

Passos:
1. Localiza a instancia EC2 por tag `Name=protec-worker`
2. Empacota `apps/workers/` em tarball e faz upload para S3
3. SSM `send-command`: baixa do S3, extrai em `/opt/protec-workers/`, `pip install`, copia unit file, `systemctl restart`
4. Aguarda confirmacao de sucesso via SSM

## Deploy manual

```bash
# Na raiz do monorepo, com AWS CLI configurado
INSTANCE_ID="i-0543526ca45992d24"
REGION="us-east-1"
BUCKET="protec-worker-deploy-688123783562"

tar czf /tmp/workers.tar.gz -C apps/workers .
aws s3 cp /tmp/workers.tar.gz "s3://$BUCKET/workers.tar.gz" --region "$REGION"

aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --parameters '{"commands":["set -e","aws s3 cp s3://'"$BUCKET"'/workers.tar.gz /tmp/workers.tar.gz --region '"$REGION"'","tar xzf /tmp/workers.tar.gz -C /opt/protec-workers/","rm -f /tmp/workers.tar.gz","python3.12 -m pip install --break-system-packages -q -r /opt/protec-workers/requirements.txt","cp /opt/protec-workers/protec-worker.service /etc/systemd/system/protec-worker.service","systemctl daemon-reload","systemctl restart protec-worker"]}' \
  --region "$REGION"
```

## Estrutura na instancia

```
/opt/protec-workers/
  .env                    # Gerado por fetch-env.sh (secretos do SSM)
  fetch-env.sh            # Le parametros SSM e escreve .env
  requirements.txt
  protec-worker.service   # Copiado pelo deploy para /etc/systemd/system/
  src/
    main.py
```

## Systemd

```bash
# Status
systemctl status protec-worker

# Logs (ultimas 50 linhas)
journalctl -u protec-worker --no-pager -n 50

# Logs em tempo real
journalctl -u protec-worker -f

# Reiniciar
systemctl restart protec-worker

# Parar
systemctl stop protec-worker
```

## Acesso a instancia

Sem key pair SSH. Acesso via **SSM Session Manager**:

```bash
aws ssm start-session --target i-0543526ca45992d24 --region us-east-1
```

Ou pelo console AWS: EC2 > Instances > Connect > Session Manager.

## Observabilidade

- **Logs**: `journalctl -u protec-worker` (local na instancia).
- **Worker output**: cada ciclo imprime `processed=N, errors=N`.
- **Monitoramento basico**: CloudWatch metricas EC2 (CPU, Status Checks). Alertas opcionais.
- Para centralizar logs em CloudWatch Logs, instale o CloudWatch Agent e configure o journal.

## Troubleshooting

| Sintoma | Verificacao |
|---------|-------------|
| Worker parado | `systemctl status protec-worker` + `journalctl -u protec-worker -n 50` |
| Erro de conexao Postgres | Verificar `/opt/protec-workers/.env` e acesso de rede (SG egress) |
| Erro SSM params | Instance profile tem `ssm:GetParameter` em `/protec-api/*`? Params existem? |
| Deploy falha "Nenhuma instancia" | Tag `Name=protec-worker` existe? Instancia em `running`? |
| SSM command timeout | SSM Agent online? `aws ssm describe-instance-information` |
| Pip install falha | `python3.12 -m pip install -r requirements.txt` manual via SSM |

## Evolucao: de polling para fila

Hoje o worker lista schemas `tenant_*` e usa `FOR UPDATE SKIP LOCKED` em `fiscal_files`. Caminho de evolucao:

1. API publica mensagens (SQS) por arquivo apos upload
2. Worker consome a fila (long polling) em vez de varrer todos os tenants
3. DLQ para falhas repetidas e retry explicito

Nao exige trocar de EC2; exige mudanca de codigo em `apps/workers` e permissoes SQS no instance profile.

## Referencias

- Worker: [`apps/workers/src/main.py`](../apps/workers/src/main.py)
- Systemd unit: [`apps/workers/protec-worker.service`](../apps/workers/protec-worker.service)
- User-data: [`infra/ec2-workers-userdata.sh`](../infra/ec2-workers-userdata.sh)
- API / SSM: [`docs/DEPLOY_LAMBDA.md`](DEPLOY_LAMBDA.md)

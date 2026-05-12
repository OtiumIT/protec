#!/bin/bash
# Cria parâmetros no AWS SSM Parameter Store (uma vez) a partir do .env
# Execute: AWS_PROFILE=xxx ./setup-ssm.sh  OU  aws configure && ./setup-ssm.sh
# Requer: AWS CLI instalado e configurado

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
PREFIX="/protec-api"

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo .env não encontrado em $ENV_FILE"
  echo "Copie .env.example para .env e preencha os valores."
  exit 1
fi

echo "Criando parâmetros SSM com prefixo $PREFIX..."
echo ""

put_param() {
  local key="$1"
  local val="$2"
  # AWS SSM não aceita valor vazio; use espaço para optional
  [ -z "$val" ] && val=" "
  aws ssm put-parameter \
    --name "${PREFIX}/${key}" \
    --value "$val" \
    --type String \
    --overwrite \
    --no-cli-pager 2>/dev/null && echo "  OK ${PREFIX}/${key}" || echo "  ERRO ${PREFIX}/${key}"
}

get_var() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | head -1 || echo ""
}

put_param "DATABASE_URL" "$(get_var DATABASE_URL)"
put_param "JWT_SECRET" "$(get_var JWT_SECRET)"
put_param "REFRESH_TOKEN_SECRET" "$(get_var REFRESH_TOKEN_SECRET)"
put_param "CORS_ORIGIN" "$(get_var CORS_ORIGIN)"
put_param "CORS_ORIGIN_DOMAINS" "$(get_var CORS_ORIGIN_DOMAINS)"
put_param "SUPABASE_URL" "$(get_var SUPABASE_URL)"
put_param "SUPABASE_SERVICE_KEY" "$(get_var SUPABASE_SERVICE_KEY)"
put_param "SUPABASE_ANON_KEY" "$(get_var SUPABASE_ANON_KEY)"
put_param "STRIPE_SECRET_KEY" "$(get_var STRIPE_SECRET_KEY)"
put_param "STRIPE_WEBHOOK_SECRET" "$(get_var STRIPE_WEBHOOK_SECRET)"
put_param "OPENAI_API_KEY" "$(get_var OPENAI_API_KEY)"
put_param "RESEND_API_KEY" "$(get_var RESEND_API_KEY)"
put_param "APP_URL" "$(get_var APP_URL)"
put_param "EMAIL_FROM" "$(get_var EMAIL_FROM)"
put_param "ADMIN_FEEDBACK_EMAILS" "$(get_var ADMIN_FEEDBACK_EMAILS)"

echo ""
echo "Concluído. Os parâmetros estão em SSM Parameter Store."
echo "O deploy via GitHub Actions usará esses valores automaticamente."

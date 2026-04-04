#!/bin/bash
set -euo pipefail

REGION="us-east-1"
WORKER_DIR="/opt/protec-workers"
ENV_FILE="$WORKER_DIR/.env"

dnf install -y python3.12 python3.12-pip git

mkdir -p "$WORKER_DIR/src"

cat > "$WORKER_DIR/fetch-env.sh" << 'FETCHSCRIPT'
#!/bin/bash
set -euo pipefail
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
WORKER_DIR="/opt/protec-workers"
ENV_FILE="$WORKER_DIR/.env"

get_param() {
  aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text --region "$REGION" 2>/dev/null || echo ""
}

DATABASE_URL=$(get_param /protec-api/DATABASE_URL)
SUPABASE_URL=$(get_param /protec-api/SUPABASE_URL)
SUPABASE_SERVICE_KEY=$(get_param /protec-api/SUPABASE_SERVICE_KEY)

cat > "$ENV_FILE" << EOF
DATABASE_URL=$DATABASE_URL
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
EOF

chmod 600 "$ENV_FILE"
FETCHSCRIPT

chmod +x "$WORKER_DIR/fetch-env.sh"

cat > /etc/systemd/system/protec-worker.service << 'UNIT'
[Unit]
Description=Protec fiscal file worker (Python)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/protec-workers
EnvironmentFile=/opt/protec-workers/.env
ExecStartPre=/opt/protec-workers/fetch-env.sh
ExecStart=/usr/bin/python3.12 src/main.py --loop --sleep-seconds 60
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=protec-worker

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable protec-worker

python3.12 -m pip install --break-system-packages psycopg[binary] requests python-dotenv 2>/dev/null || \
  python3.12 -m pip install psycopg[binary] requests python-dotenv

bash "$WORKER_DIR/fetch-env.sh"

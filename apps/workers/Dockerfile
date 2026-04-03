# Fiscal worker — ECS Fargate (polling SPED / fiscal_files)
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

# Sem .env na imagem; DATABASE_URL / SUPABASE_* vêm do ambiente (ECS secrets → SSM).
CMD ["python", "src/main.py", "--loop", "--sleep-seconds", "15"]

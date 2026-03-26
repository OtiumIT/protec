# Workers - Processamento Python

Worker local para processar arquivos fiscais pendentes (`status = uploaded`) no banco.

## O que o worker faz

1. Lista schemas `tenant_*`.
2. Reivindica arquivos em `fiscal_files` com `FOR UPDATE SKIP LOCKED`.
3. Baixa o arquivo no Supabase Storage.
4. Faz extração SPED básica (`0000`, `J100`, `J150`).
5. Salva `metadata.sped_inspection`, persiste `extracted_fiscal_data` (`balance_sheet` / `dre`) e marca:
   - `processed`, ou
   - `error` com `processing_error`.

## Requisitos

- Variáveis no `.env` da raiz:
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`

## Setup rápido

```bash
cd apps/workers
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Execução

```bash
# Uma passada (processa tudo que estiver pendente)
python3 src/main.py

# Modo contínuo (polling)
python3 src/main.py --loop
```

Também disponível via scripts:

```bash
pnpm run run-once
pnpm run dev
```

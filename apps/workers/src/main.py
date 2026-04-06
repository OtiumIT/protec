"""
Worker local para processamento de fiscal_files (status uploaded).

Fluxo:
1) Busca schemas tenant_*
2) Reivindica arquivos uploaded (FOR UPDATE SKIP LOCKED -> status processing)
3) Baixa arquivo no Supabase Storage
4) Extrai dados SPED basicos (header, counts, J100, J150)
5) Persiste metadata + extracted_fiscal_data e marca status processed/error
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import quote

import psycopg
import requests
from dotenv import load_dotenv
from psycopg.rows import dict_row


def _load_env_optional() -> None:
    """Produção (ECS): variáveis vêm do ambiente ou secrets da task. Dev local: carrega .env na raiz do monorepo."""
    if os.getenv("DATABASE_URL", "").strip():
        return
    root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
    if os.path.isfile(root_env):
        load_dotenv(root_env)


_load_env_optional()


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    return (
        unicodedata.normalize("NFD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .upper()
        .strip()
    )


def parse_sped_number(value: str | None) -> float | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    negative = trimmed.startswith("(") and trimmed.endswith(")")
    no_parens = trimmed.replace("(", "").replace(")", "")
    normalized = no_parens.replace(".", "").replace(",", ".")
    try:
        number = float(normalized)
    except ValueError:
        return None
    return -number if negative else number


def parse_date_ddmmyyyy(value: str | None) -> str | None:
    if not value or not re.match(r"^\d{8}$", value):
        return None
    return f"{value[4:8]}-{value[2:4]}-{value[0:2]}"


def iso_to_sped_ddmmyyyy(iso: str | None) -> str | None:
    if not iso:
        return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", iso.strip())
    if not m:
        return None
    return f"{m.group(3)}{m.group(2)}{m.group(1)}"


def map_j100_balance_slot(descricao: str) -> str | None:
    if descricao == "ATIVO":
        return "ativo_total"
    if descricao == "ATIVO CIRCULANTE":
        return "ativo_circulante"
    if descricao in ("ATIVO NAO CIRCULANTE", "ATIVO NAO-CIRCULANTE"):
        return "ativo_nao_circulante"
    if descricao == "PASSIVO":
        return "passivo_total"
    if descricao == "PASSIVO CIRCULANTE":
        return "passivo_circulante"
    if descricao in ("PASSIVO NAO CIRCULANTE", "PASSIVO NAO-CIRCULANTE"):
        return "passivo_nao_circulante"
    if descricao == "PATRIMONIO LIQUIDO":
        return "patrimonio_liquido"
    return None


def pick_best_j100_balance(
    candidates: list[dict[str, Any]], slot: str, header: dict[str, Any]
) -> float | None:
    of_slot = [c for c in candidates if c.get("slot") == slot]
    if not of_slot:
        return None
    if len(of_slot) == 1:
        return float(of_slot[0]["valor"])

    header_end = iso_to_sped_ddmmyyyy(header.get("period_end"))
    header_start = iso_to_sped_ddmmyyyy(header.get("period_start"))
    pool = of_slot
    if header.get("type") == "ecd" and header_end:
        match_end = [c for c in of_slot if c.get("dt_fim") == header_end]
        if match_end:
            pool = match_end
    if header.get("type") == "ecd" and header_start and len(pool) > 1:
        match_both = [c for c in pool if c.get("dt_ini") == header_start]
        if match_both:
            pool = match_both
    tot = [c for c in pool if str(c.get("ind_tot") or "").upper() == "T"]
    if tot:
        pool = tot
    min_nivel = min(int(c.get("nivel", 99)) for c in pool)
    pool = [c for c in pool if int(c.get("nivel", 99)) == min_nivel]
    pool.sort(key=lambda c: int(c.get("file_order", 0)))
    return float(pool[-1]["valor"]) if pool else None


def materialize_j100_balance(
    candidates: list[dict[str, Any]], header: dict[str, Any]
) -> dict[str, float]:
    slots = [
        "ativo_total",
        "ativo_circulante",
        "ativo_nao_circulante",
        "passivo_total",
        "passivo_circulante",
        "passivo_nao_circulante",
        "patrimonio_liquido",
    ]
    out: dict[str, float] = {}
    for s in slots:
        v = pick_best_j100_balance(candidates, s, header)
        if v is not None:
            out[s] = v
    return out


def is_revenue_description(description: str) -> bool:
    return any(k in description for k in ("RECEITA", "VENDA", "FATURAMENTO", "SERVIC", "PRODUT", "MERCADORIA"))


def is_expense_description(description: str) -> bool:
    return any(k in description for k in ("DESPESA", "CUSTO", "IMPOST", "TRIBUT", "ICMS", "COFINS", "PIS"))


def decode_bytes(content: bytes) -> str:
    utf8 = content.decode("utf-8", errors="replace")
    replacement_ratio = utf8.count("\ufffd") / max(len(utf8), 1)
    if replacement_ratio > 0.02:
        return content.decode("latin-1", errors="replace")
    return utf8


def parse_sped(content: bytes) -> dict[str, Any]:
    text = decode_bytes(content)
    lines = text.splitlines()

    header: dict[str, Any] = {"type": "unknown"}
    register_counts: dict[str, int] = {}
    j100_candidates: list[dict[str, Any]] = []
    j100_file_order = 0
    current_j005_ini: str | None = None
    current_j005_fim: str | None = None
    dre: dict[str, float] = {}
    conta_descricao_by_codigo: dict[str, str] = {}
    current_quarter_key: str | None = None
    quarter_signals: dict[str, dict[str, Any]] = {}
    socios_remuneracao: list[dict[str, Any]] = []

    for raw in lines:
        line = raw.strip()
        if not line.startswith("|"):
            continue
        parts = line.split("|")
        if len(parts) < 3:
            continue
        reg = parts[1].strip()
        values = parts[2:-1]
        if not reg:
            continue

        register_counts[reg] = register_counts.get(reg, 0) + 1

        if reg == "0000":
            marker = (values[0] if len(values) > 0 else "").upper()
            if marker == "LECD":
                header = {
                    "type": "ecd",
                    "layout_code": marker,
                    "period_start": parse_date_ddmmyyyy(values[1] if len(values) > 1 else None),
                    "period_end": parse_date_ddmmyyyy(values[2] if len(values) > 2 else None),
                    "company_name": values[3] if len(values) > 3 else None,
                    "company_cnpj": re.sub(r"\D", "", values[4] if len(values) > 4 else ""),
                }
            elif marker == "LECF":
                maybe_dates = [v for v in values if re.match(r"^\d{8}$", v or "")]
                period_start = parse_date_ddmmyyyy(maybe_dates[0]) if len(maybe_dates) > 0 else None
                period_end = parse_date_ddmmyyyy(maybe_dates[1]) if len(maybe_dates) > 1 else None
                header = {
                    "type": "ecf",
                    "layout_code": marker,
                    "period_start": period_start,
                    "period_end": period_end,
                    "company_cnpj": re.sub(r"\D", "", values[2] if len(values) > 2 else ""),
                    "company_name": values[3] if len(values) > 3 else None,
                }
            continue

        if reg == "J005":
            ini = (values[0] or "").strip() if len(values) > 0 else ""
            fim = (values[1] or "").strip() if len(values) > 1 else ""
            current_j005_ini = ini if re.match(r"^\d{8}$", ini) else None
            current_j005_fim = fim if re.match(r"^\d{8}$", fim) else None
            continue

        if reg == "J100":
            j100_file_order += 1
            descricao = normalize_text(values[5] if len(values) > 5 else "")
            valor = parse_sped_number(values[8] if len(values) > 8 else None)
            if valor is None:
                continue
            slot = map_j100_balance_slot(descricao)
            if slot:
                ind_tot = (values[1] if len(values) > 1 else "").strip().upper()
                try:
                    nivel = int((values[2] if len(values) > 2 else "99").strip())
                except ValueError:
                    nivel = 99
                j100_candidates.append(
                    {
                        "slot": slot,
                        "valor": float(valor),
                        "dt_ini": current_j005_ini,
                        "dt_fim": current_j005_fim,
                        "nivel": nivel,
                        "ind_tot": ind_tot,
                        "file_order": j100_file_order,
                    }
                )
            continue

        if reg == "C050":
            codigo_conta = values[4] if len(values) > 4 else ""
            descricao_conta = (values[7] if len(values) > 7 else "") or (values[6] if len(values) > 6 else "")
            if codigo_conta and descricao_conta:
                conta_descricao_by_codigo[codigo_conta] = descricao_conta
            continue

        if reg == "K030":
            inicio = parse_date_ddmmyyyy(values[0] if len(values) > 0 else None)
            fim = parse_date_ddmmyyyy(values[1] if len(values) > 1 else None)
            quarter_key = f"{inicio or ''}_{fim or ''}"
            current_quarter_key = quarter_key
            if quarter_key not in quarter_signals:
                quarter_signals[quarter_key] = {
                    "inicio": inicio,
                    "fim": fim,
                    "receitas_possiveis": 0.0,
                    "despesas_possiveis": 0.0,
                    "linhas_analisadas": 0,
                }
            continue

        if reg == "K355" and current_quarter_key:
            codigo_conta = values[0] if len(values) > 0 else ""
            valor = parse_sped_number(values[2] if len(values) > 2 else None)
            if valor is None:
                continue
            descricao = normalize_text(conta_descricao_by_codigo.get(codigo_conta, ""))
            quarter = quarter_signals[current_quarter_key]
            quarter["linhas_analisadas"] += 1
            magnitude = round(abs(valor), 2)
            if descricao and is_revenue_description(descricao):
                quarter["receitas_possiveis"] = round(quarter["receitas_possiveis"] + magnitude, 2)
            elif descricao and is_expense_description(descricao):
                quarter["despesas_possiveis"] = round(quarter["despesas_possiveis"] + magnitude, 2)
            continue

        if reg == "J150":
            descricao = normalize_text(values[5] if len(values) > 5 else "")
            valor = parse_sped_number(values[8] if len(values) > 8 else None)
            if valor is None:
                continue
            if "RECEITA BRUTA" in descricao:
                dre["receita_bruta"] = valor
            elif "DEDU" in descricao:
                dre["deducoes"] = valor
            elif "RECEITA LIQUIDA" in descricao:
                dre["receita_liquida"] = valor
            elif "LUCRO BRUTO" in descricao:
                dre["lucro_bruto"] = valor
            elif "DESPESAS OPERACIONAIS" in descricao:
                dre["despesas_operacionais"] = valor
            elif "RESULTADO DO PERIODO" in descricao or "RESULTADO DO EXERCICIO" in descricao or "LUCRO LIQUIDO" in descricao:
                dre["resultado_periodo"] = valor

        if reg == "Y600":
            cpf_cnpj = re.sub(r"\D", "", values[4] if len(values) > 4 else "")
            nome = values[5] if len(values) > 5 else None
            qualificacao = values[6] if len(values) > 6 else None
            participacao = parse_sped_number(values[7] if len(values) > 7 else None)
            socios_remuneracao.append(
                {
                    "cpf_cnpj": cpf_cnpj or None,
                    "nome": nome,
                    "qualificacao": qualificacao,
                    "participacao_percentual": participacao,
                    "valores_declarados": [],
                }
            )

    balance = materialize_j100_balance(j100_candidates, header) if j100_candidates else {}

    ecf_trimestres = sorted(
        [
            {
                "inicio": q["inicio"],
                "fim": q["fim"],
                "receitas_possiveis": round(float(q["receitas_possiveis"]), 2),
                "despesas_possiveis": round(float(q["despesas_possiveis"]), 2),
                "resultado_aproximado": round(float(q["receitas_possiveis"]) - float(q["despesas_possiveis"]), 2),
                "linhas_analisadas": int(q["linhas_analisadas"]),
            }
            for q in quarter_signals.values()
        ],
        key=lambda item: str(item.get("inicio") or ""),
    )
    receita_bruta_anual_estimada = round(sum(t["receitas_possiveis"] for t in ecf_trimestres), 2)
    has_ecf_tax_signals = len(ecf_trimestres) > 0
    in2306_confidence = 0.65 if has_ecf_tax_signals else 0.0
    module_prefill: dict[str, Any] = {}
    prefill_catalog: list[dict[str, Any]] = []

    if has_ecf_tax_signals:
        module_prefill["simulador_in2306"] = {
            "schema_target": "SimulateTributarioIN2306InputSchema",
            "ano": int((header.get("period_end") or "0000")[:4]) if header.get("period_end") else None,
            "receita_bruta_anual_estimada": receita_bruta_anual_estimada,
            "confidence": {"overall": in2306_confidence},
            "origem": "ecf_k030_k355_c050_python_worker",
        }
        prefill_catalog.append(
            {
                "modulo": "simulador_in2306",
                "campo_destino": "receita_bruta_anual_estimada",
                "origem_sped": "K030 + K355 + C050",
                "transformacao": "soma de receitas possiveis por trimestre",
                "confianca": in2306_confidence,
            }
        )

    return {
        "header": header,
        "register_counts": register_counts,
        "balance_sheet": balance if balance else None,
        "dre": dre if dre else None,
        "ecf_tax_signals": {
            "trimestres": ecf_trimestres,
            "receita_bruta_anual_estimada": receita_bruta_anual_estimada,
        }
        if has_ecf_tax_signals
        else None,
        "socios_remuneracao": socios_remuneracao,
        "prefill_catalog": prefill_catalog,
        "module_prefill": module_prefill,
    }


@dataclass
class AppConfig:
    database_url: str
    supabase_url: str
    supabase_service_key: str
    storage_bucket: str = "fiscal-files"


def load_config() -> AppConfig:
    database_url = os.getenv("DATABASE_URL", "").strip()
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL não configurado")
    if not supabase_url:
        raise RuntimeError("SUPABASE_URL não configurado")
    if not service_key:
        raise RuntimeError("SUPABASE_SERVICE_KEY não configurado")
    return AppConfig(
        database_url=database_url,
        supabase_url=supabase_url.rstrip("/"),
        supabase_service_key=service_key,
    )


class FiscalFileWorker:
    def __init__(self, config: AppConfig):
        self.config = config
        self.conn = psycopg.connect(config.database_url, autocommit=False, row_factory=dict_row)
        self.http = requests.Session()
        self.http.headers.update(
            {
                "Authorization": f"Bearer {config.supabase_service_key}",
                "apikey": config.supabase_service_key,
            }
        )

    def close(self) -> None:
        self.http.close()
        self.conn.close()

    def list_tenant_schemas(self) -> list[str]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name LIKE 'tenant_%'
                ORDER BY schema_name
                """
            )
            rows = cur.fetchall()
        return [r["schema_name"] for r in rows]

    def _validate_schema(self, schema: str) -> None:
        if not re.match(r"^tenant_[a-z0-9_]+$", schema):
            raise RuntimeError(f"Schema inválido: {schema}")

    def claim_uploaded_file(self, schema: str) -> dict[str, Any] | None:
        self._validate_schema(schema)
        with self.conn.cursor() as cur:
            cur.execute(
                f"""
                WITH target AS (
                  SELECT id
                  FROM "{schema}".fiscal_files
                  WHERE status = 'uploaded'
                  ORDER BY created_at ASC
                  LIMIT 1
                  FOR UPDATE SKIP LOCKED
                )
                UPDATE "{schema}".fiscal_files f
                SET status = 'processing',
                    processing_error = NULL,
                    updated_at = NOW()
                FROM target
                WHERE f.id = target.id
                RETURNING f.id, f.client_id, f.file_name, f.file_path, f.competence
                """
            )
            row = cur.fetchone()
        self.conn.commit()
        return row

    def download_file(self, file_path: str) -> bytes:
        encoded_path = quote(file_path, safe="/")
        url = f"{self.config.supabase_url}/storage/v1/object/{self.config.storage_bucket}/{encoded_path}"
        response = self.http.get(url, timeout=60)
        if response.status_code != 200:
            raise RuntimeError(f"Falha no download do storage ({response.status_code})")
        return response.content

    def persist_success(
        self,
        schema: str,
        file_id: str,
        client_id: str,
        competence: str,
        inspection: dict[str, Any],
    ) -> None:
        self._validate_schema(schema)
        metadata = {
            "extraction_version": 3,
            "extraction_origin": "python_worker_local_v1",
            "processed_at": datetime.utcnow().isoformat() + "Z",
            "sped_inspection": inspection,
            "module_prefill": inspection.get("module_prefill") or {},
        }
        with self.conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE "{schema}".fiscal_files
                SET status = 'processed',
                    processing_error = NULL,
                    metadata = %s::jsonb,
                    updated_at = NOW()
                WHERE id = %s
                """,
                [json.dumps(metadata), file_id],
            )

            cur.execute(
                f"""
                DELETE FROM "{schema}".extracted_fiscal_data
                WHERE fiscal_file_id = %s
                  AND data_type IN ('balance_sheet', 'dre')
                """,
                [file_id],
            )

            if inspection.get("balance_sheet"):
                cur.execute(
                    f"""
                    INSERT INTO "{schema}".extracted_fiscal_data
                    (fiscal_file_id, client_id, data_type, competence, data)
                    VALUES (%s, %s, 'balance_sheet', %s, %s::jsonb)
                    """,
                    [file_id, client_id, competence, json.dumps(inspection["balance_sheet"])],
                )

            if inspection.get("dre"):
                cur.execute(
                    f"""
                    INSERT INTO "{schema}".extracted_fiscal_data
                    (fiscal_file_id, client_id, data_type, competence, data)
                    VALUES (%s, %s, 'dre', %s, %s::jsonb)
                    """,
                    [file_id, client_id, competence, json.dumps(inspection["dre"])],
                )

            if inspection.get("ecf_tax_signals"):
                cur.execute(
                    f"""
                    INSERT INTO "{schema}".extracted_fiscal_data
                    (fiscal_file_id, client_id, data_type, competence, data)
                    VALUES (%s, %s, 'ecf_tax_signals', %s, %s::jsonb)
                    """,
                    [file_id, client_id, competence, json.dumps(inspection["ecf_tax_signals"])],
                )

        self.conn.commit()

    def persist_error(self, schema: str, file_id: str, message: str) -> None:
        self._validate_schema(schema)
        with self.conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE "{schema}".fiscal_files
                SET status = 'error',
                    processing_error = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                [message[:1000], file_id],
            )
        self.conn.commit()

    def process_file(self, schema: str, file_row: dict[str, Any]) -> bool:
        file_id = file_row["id"]
        file_name = file_row["file_name"]
        try:
            content = self.download_file(file_row["file_path"])
            inspection = parse_sped(content)
            has_useful_data = (
                bool(inspection.get("balance_sheet"))
                or bool(inspection.get("dre"))
                or inspection.get("header", {}).get("type") in ("ecd", "ecf")
            )
            if not has_useful_data:
                raise RuntimeError("Arquivo sem dados estruturados relevantes para SPED")

            self.persist_success(
                schema=schema,
                file_id=file_id,
                client_id=file_row["client_id"],
                competence=file_row["competence"],
                inspection=inspection,
            )
            print(f"✅ {schema}: {file_name} -> processed")
            return True
        except Exception as exc:
            self.persist_error(schema, file_id, str(exc))
            print(f"❌ {schema}: {file_name} -> error ({exc})")
            return False

    def run_once(self) -> tuple[int, int]:
        total_processed = 0
        total_errors = 0
        schemas = self.list_tenant_schemas()
        for schema in schemas:
            while True:
                file_row = self.claim_uploaded_file(schema)
                if not file_row:
                    break
                ok = self.process_file(schema, file_row)
                if ok:
                    total_processed += 1
                else:
                    total_errors += 1
        return total_processed, total_errors

    def run_loop(self, sleep_seconds: int) -> None:
        print(f"🚀 Worker loop iniciado (intervalo: {sleep_seconds}s)")
        while True:
            processed, errors = self.run_once()
            print(f"🔁 Ciclo concluído: processed={processed}, errors={errors}")
            time.sleep(sleep_seconds)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Worker local de processamento fiscal_files")
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Executa continuamente (polling). Sem esta flag, roda uma única vez.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=int,
        default=60,
        help="Intervalo entre ciclos quando --loop estiver ativo (segundos).",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        config = load_config()
        worker = FiscalFileWorker(config)
    except Exception as exc:
        print(f"❌ Falha ao iniciar worker: {exc}")
        return 1

    try:
        if args.loop:
            worker.run_loop(args.sleep_seconds)
        else:
            print("🚀 Worker one-shot iniciado")
            processed, errors = worker.run_once()
            print(f"✅ Finalizado: processed={processed}, errors={errors}")
    finally:
        worker.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

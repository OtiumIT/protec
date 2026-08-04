import { BaseRepository } from '../../shared/repositories/base.repository';
import type { ExpenseMappingDiagnosis, ClassifiedExpenseItem } from '@shared/core';

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') { try { return JSON.parse(v) as T; } catch { return fallback; } }
  return v as T;
}

function normalizeDiagnosis(row: any): ExpenseMappingDiagnosis {
  return {
    ...row,
    reference_year: Number(row.reference_year),
    totals: parseJson(row.totals, {} as any),
    result_snapshot: row.result_snapshot ? parseJson(row.result_snapshot, null as any) : null,
  };
}

export class MapeamentoDespesasPjRepository extends BaseRepository {
  // ---- Diagnoses ----
  async createDiagnosis(data: Record<string, any>): Promise<ExpenseMappingDiagnosis> {
    const r = await this.query(
      `INSERT INTO expense_mapping_diagnoses
        (client_id, title, reference_year, activity, tax_regime, ibs_cbs_treatment, objective, reviewer_user_id, status, rules_version, totals, result_snapshot, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13) RETURNING *`,
      [
        data.client_id, data.title ?? null, data.reference_year, data.activity ?? null,
        data.tax_regime ?? 'simples_nacional', data.ibs_cbs_treatment ?? 'nao_avaliar',
        data.objective ?? null, data.reviewer_user_id ?? null, data.status ?? 'draft',
        data.rules_version, JSON.stringify(data.totals ?? {}),
        data.result_snapshot ? JSON.stringify(data.result_snapshot) : null, data.created_by ?? null,
      ],
      false
    );
    return normalizeDiagnosis(r.rows[0]);
  }

  async getDiagnosis(id: string): Promise<ExpenseMappingDiagnosis | null> {
    const r = await this.query(
      `SELECT d.*, c.name AS client_name
       FROM expense_mapping_diagnoses d
       LEFT JOIN clients c ON c.id = d.client_id
       WHERE d.id = $1`, [id], false
    );
    return r.rows[0] ? normalizeDiagnosis(r.rows[0]) : null;
  }

  async updateDiagnosis(id: string, fields: Record<string, any>): Promise<ExpenseMappingDiagnosis | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      if (key === 'totals' || key === 'result_snapshot') {
        updates.push(`${key} = $${idx++}::jsonb`);
        params.push(value === null ? null : JSON.stringify(value));
      } else {
        updates.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (!updates.length) return this.getDiagnosis(id);
    await this.query(
      `UPDATE expense_mapping_diagnoses SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      [...params, id], false
    );
    return this.getDiagnosis(id);
  }

  async deleteDiagnosis(id: string): Promise<void> {
    await this.query('DELETE FROM expense_mapping_diagnoses WHERE id = $1', [id], false);
  }

  async listDiagnoses(filters: {
    client_id?: string; reference_year?: number; status?: string; page: number; limit: number;
  }): Promise<{ diagnoses: ExpenseMappingDiagnosis[]; total: number }> {
    const params: unknown[] = [];
    const conds: string[] = [];
    if (filters.client_id) { conds.push(`d.client_id = $${params.length + 1}`); params.push(filters.client_id); }
    if (filters.reference_year) { conds.push(`d.reference_year = $${params.length + 1}`); params.push(filters.reference_year); }
    if (filters.status) { conds.push(`d.status = $${params.length + 1}`); params.push(filters.status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const countR = await this.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM expense_mapping_diagnoses d ${where}`, params, false
    );
    const total = parseInt(countR.rows[0].count, 10);
    const offset = (filters.page - 1) * filters.limit;
    const r = await this.query(
      `SELECT d.*, c.name AS client_name
       FROM expense_mapping_diagnoses d
       LEFT JOIN clients c ON c.id = d.client_id
       ${where} ORDER BY d.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, offset], false
    );
    return { diagnoses: r.rows.map(normalizeDiagnosis), total };
  }

  // ---- Items (replace-all na atualização) ----
  async replaceItems(diagnosisId: string, items: ClassifiedExpenseItem[]): Promise<void> {
    await this.query('DELETE FROM expense_mapping_items WHERE diagnosis_id = $1', [diagnosisId], false);
    let order = 0;
    for (const it of items) {
      await this.query(
        `INSERT INTO expense_mapping_items
          (diagnosis_id, category_key, label, monthly_amount, annual_amount, business_use_pct, current_payer,
           pf_pj_lens, credit_lens, classification, criteria, foundation_refs, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14)`,
        [
          diagnosisId, it.category_key, it.label, it.monthly_amount, it.annual_amount, it.business_use_pct,
          it.current_payer, it.pf_pj_lens, it.credit_lens, it.classification,
          JSON.stringify(it.criteria), JSON.stringify(it.foundation_refs), it.notes ?? null, order++,
        ],
        false
      );
    }
  }

  async listItems(diagnosisId: string) {
    const r = await this.query(
      `SELECT * FROM expense_mapping_items WHERE diagnosis_id = $1 ORDER BY sort_order ASC`, [diagnosisId], false
    );
    return r.rows.map((row: any) => ({
      ...row,
      monthly_amount: Number(row.monthly_amount),
      annual_amount: Number(row.annual_amount),
      business_use_pct: Number(row.business_use_pct),
      criteria: parseJson(row.criteria, {}),
      foundation_refs: parseJson(row.foundation_refs, []),
    }));
  }

  async getItem(id: string) {
    const r = await this.query('SELECT * FROM expense_mapping_items WHERE id = $1', [id], false);
    return r.rows[0] ?? null;
  }

  // ---- Answers ----
  async replaceAnswers(diagnosisId: string, catalogVersion: string, answers: Array<{ category_key: string; question_key: string; answer: Record<string, unknown> }>): Promise<void> {
    await this.query('DELETE FROM expense_mapping_answers WHERE diagnosis_id = $1', [diagnosisId], false);
    for (const a of answers) {
      await this.query(
        `INSERT INTO expense_mapping_answers (diagnosis_id, category_key, question_key, answer, catalog_version)
         VALUES ($1,$2,$3,$4::jsonb,$5)`,
        [diagnosisId, a.category_key, a.question_key, JSON.stringify(a.answer), catalogVersion], false
      );
    }
  }

  async listAnswers(diagnosisId: string) {
    const r = await this.query('SELECT * FROM expense_mapping_answers WHERE diagnosis_id = $1', [diagnosisId], false);
    return r.rows.map((row: any) => ({ ...row, answer: parseJson(row.answer, {}) }));
  }

  // ---- Pendencies ----
  async createPendency(diagnosisId: string, data: Record<string, any>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO expense_mapping_pendencies (diagnosis_id, item_id, tipo, titulo, descricao, status, due_at, owner_user_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [diagnosisId, data.item_id ?? null, data.tipo ?? 'documento', data.titulo, data.descricao ?? null,
       data.status ?? 'pendente', data.due_at ?? null, data.owner_user_id ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listPendencies(diagnosisId: string) {
    const r = await this.query('SELECT * FROM expense_mapping_pendencies WHERE diagnosis_id = $1 ORDER BY created_at DESC', [diagnosisId], false);
    return r.rows;
  }
  async updatePendency(id: string, fields: Record<string, any>) {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(fields)) { if (v !== undefined) { updates.push(`${k} = $${idx++}`); params.push(v); } }
    if (!updates.length) { const r = await this.query('SELECT * FROM expense_mapping_pendencies WHERE id = $1', [id], false); return r.rows[0] ?? null; }
    const r = await this.query(`UPDATE expense_mapping_pendencies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`, [...params, id], false);
    return r.rows[0] ?? null;
  }
  async deletePendency(id: string) { await this.query('DELETE FROM expense_mapping_pendencies WHERE id = $1', [id], false); }

  // ---- Evidence ----
  async createEvidence(diagnosisId: string, data: Record<string, any>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO expense_mapping_evidence (diagnosis_id, item_id, pendency_id, kind, nome_arquivo, mime_type, tamanho_bytes, storage_status, metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'em_criacao',$8::jsonb,$9) RETURNING *`,
      [diagnosisId, data.item_id ?? null, data.pendency_id ?? null, data.kind ?? 'outro', data.nome_arquivo,
       data.mime_type ?? null, data.tamanho_bytes ?? null, JSON.stringify(data.metadata ?? {}), createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listEvidence(diagnosisId: string) {
    const r = await this.query('SELECT * FROM expense_mapping_evidence WHERE diagnosis_id = $1 ORDER BY created_at DESC', [diagnosisId], false);
    return r.rows;
  }
  async deleteEvidence(id: string) { await this.query('DELETE FROM expense_mapping_evidence WHERE id = $1', [id], false); }

  // ---- Import batches (stub) ----
  async createImportBatch(diagnosisId: string | null, data: Record<string, any>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO expense_mapping_import_batches (diagnosis_id, referencia, status, metadata, created_by)
       VALUES ($1,$2,'aberto',$3::jsonb,$4) RETURNING *`,
      [diagnosisId, data.referencia, JSON.stringify(data.metadata ?? {}), createdBy ?? null], false
    );
    return r.rows[0];
  }
  async listImportBatches(diagnosisId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (diagnosisId) { where = 'WHERE diagnosis_id = $1'; params.push(diagnosisId); }
    const r = await this.query(`SELECT * FROM expense_mapping_import_batches ${where} ORDER BY created_at DESC`, params, false);
    return r.rows;
  }

  // ---- Audit ----
  async audit(diagnosisId: string | null, entityType: string, entityId: string | null, action: string, actorUserId: string | null, before?: unknown, after?: unknown): Promise<void> {
    await this.query(
      `INSERT INTO expense_mapping_audit_events (diagnosis_id, entity_type, entity_id, action, actor_user_id, before_data, after_data)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
      [diagnosisId, entityType, entityId, action, actorUserId,
       before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
      false
    );
  }
  async listAudit(diagnosisId: string) {
    const r = await this.query('SELECT * FROM expense_mapping_audit_events WHERE diagnosis_id = $1 ORDER BY created_at DESC', [diagnosisId], false);
    return r.rows;
  }

  // ---- Dashboard / carteira ----
  async getPortfolioSummary() {
    const r = await this.query<{
      total: string; concluidos: string; base_anual: string; potencial: string; condicionado: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status='completed')::text AS concluidos,
         COALESCE(SUM((totals->>'total_analisado_anual')::numeric),0)::text AS base_anual,
         COALESCE(SUM((totals->>'potencial_anual')::numeric),0)::text AS potencial,
         COALESCE(SUM((totals->>'condicionado_anual')::numeric),0)::text AS condicionado
       FROM expense_mapping_diagnoses`,
      [], false
    );
    const row = r.rows[0];
    const pendR = await this.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM expense_mapping_pendencies WHERE status IN ('pendente','em_andamento')`, [], false
    );
    return {
      clientes_mapeados: Number(row.total) || 0,
      diagnosticos_concluidos: Number(row.concluidos) || 0,
      base_anual_analisada: Number(row.base_anual) || 0,
      potencial_operacional: Number(row.potencial) || 0,
      condicionado: Number(row.condicionado) || 0,
      pendencias_abertas: Number(pendR.rows[0].count) || 0,
    };
  }
}

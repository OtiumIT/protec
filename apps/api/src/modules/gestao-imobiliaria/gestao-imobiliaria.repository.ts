import { BaseRepository } from '../../shared/repositories/base.repository';
import type {
  PropertyTenant,
  PropertyLease,
  PropertyLedgerEntry,
  PropertyStatementShare,
} from '@shared/core';

/**
 * Repositório único da camada contábil-operacional da Gestão Imobiliária.
 * Todas as tabelas vivem no schema do tenant (isolamento por schema);
 * por isso as queries usam requireCompanyId=false.
 */
export class GestaoImobiliariaRepository extends BaseRepository {
  // ---- helper genérico de update parcial ----
  private buildUpdate(fields: Record<string, unknown>): { setSql: string; params: unknown[] } {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${idx++}`);
        params.push(value === null ? null : value);
      }
    }
    return { setSql: updates.join(', '), params };
  }

  // ========================================================================
  // Inquilinos
  // ========================================================================
  async createTenant(data: Record<string, unknown>, createdBy?: string | null): Promise<PropertyTenant> {
    const r = await this.query<PropertyTenant>(
      `INSERT INTO property_tenants (client_id, nome, documento, tipo_pessoa, email, telefone, observacao, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [data.client_id ?? null, data.nome, data.documento ?? null, data.tipo_pessoa ?? 'pf',
       data.email ?? null, data.telefone ?? null, data.observacao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listTenants(clientId?: string): Promise<PropertyTenant[]> {
    const params: unknown[] = [];
    let where = '';
    if (clientId) { where = 'WHERE client_id = $1'; params.push(clientId); }
    const r = await this.query<PropertyTenant>(
      `SELECT * FROM property_tenants ${where} ORDER BY nome ASC`, params, false
    );
    return r.rows;
  }

  async getTenant(id: string): Promise<PropertyTenant | null> {
    const r = await this.query<PropertyTenant>('SELECT * FROM property_tenants WHERE id = $1', [id], false);
    return r.rows[0] ?? null;
  }

  async updateTenant(id: string, fields: Record<string, unknown>): Promise<PropertyTenant | null> {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getTenant(id);
    const r = await this.query<PropertyTenant>(
      `UPDATE property_tenants SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id], false
    );
    return r.rows[0] ?? null;
  }

  async deleteTenant(id: string): Promise<void> {
    await this.query('DELETE FROM property_tenants WHERE id = $1', [id], false);
  }

  // ========================================================================
  // Contratos
  // ========================================================================
  async createLease(data: Record<string, unknown>, createdBy?: string | null): Promise<PropertyLease> {
    const r = await this.query<PropertyLease>(
      `INSERT INTO property_leases
        (property_id, tenant_id, data_inicio, data_fim, valor_aluguel, dia_vencimento, indice_reajuste, status, observacao, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [data.property_id, data.tenant_id ?? null, data.data_inicio, data.data_fim ?? null,
       data.valor_aluguel ?? 0, data.dia_vencimento ?? 10, data.indice_reajuste ?? 'IPCA',
       data.status ?? 'ativo', data.observacao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listLeases(filters: { property_id?: string; status?: string; client_id?: string }): Promise<PropertyLease[]> {
    const params: unknown[] = [];
    const conds: string[] = [];
    if (filters.property_id) { conds.push(`l.property_id = $${params.length + 1}`); params.push(filters.property_id); }
    if (filters.status) { conds.push(`l.status = $${params.length + 1}`); params.push(filters.status); }
    if (filters.client_id) { conds.push(`p.client_id = $${params.length + 1}`); params.push(filters.client_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const r = await this.query<PropertyLease>(
      `SELECT l.*, t.nome AS tenant_nome, p.identificador AS property_identificador
       FROM property_leases l
       LEFT JOIN property_tenants t ON t.id = l.tenant_id
       LEFT JOIN properties p ON p.id = l.property_id
       ${where}
       ORDER BY l.data_inicio DESC`,
      params, false
    );
    return r.rows;
  }

  async getLease(id: string): Promise<PropertyLease | null> {
    const r = await this.query<PropertyLease>(
      `SELECT l.*, t.nome AS tenant_nome, p.identificador AS property_identificador
       FROM property_leases l
       LEFT JOIN property_tenants t ON t.id = l.tenant_id
       LEFT JOIN properties p ON p.id = l.property_id
       WHERE l.id = $1`, [id], false
    );
    return r.rows[0] ?? null;
  }

  async updateLease(id: string, fields: Record<string, unknown>): Promise<PropertyLease | null> {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getLease(id);
    await this.query(
      `UPDATE property_leases SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1}`,
      [...params, id], false
    );
    return this.getLease(id);
  }

  async deleteLease(id: string): Promise<void> {
    await this.query('DELETE FROM property_leases WHERE id = $1', [id], false);
  }

  async createAmendment(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_lease_amendments
        (lease_id, tipo, data_evento, indice_aplicado, percentual, valor_anterior, valor_novo, descricao, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [data.lease_id, data.tipo ?? 'reajuste', data.data_evento, data.indice_aplicado ?? null,
       data.percentual ?? null, data.valor_anterior ?? null, data.valor_novo ?? null,
       data.descricao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listAmendments(leaseId: string) {
    const r = await this.query(
      'SELECT * FROM property_lease_amendments WHERE lease_id = $1 ORDER BY data_evento DESC',
      [leaseId], false
    );
    return r.rows;
  }

  async createGuarantee(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_guarantees (lease_id, tipo, valor, descricao, status, data_devolucao, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.lease_id, data.tipo, data.valor ?? null, data.descricao ?? null,
       data.status ?? 'ativa', data.data_devolucao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listGuarantees(leaseId: string) {
    const r = await this.query('SELECT * FROM property_guarantees WHERE lease_id = $1 ORDER BY created_at DESC', [leaseId], false);
    return r.rows;
  }

  async updateGuarantee(id: string, fields: Record<string, unknown>) {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) {
      const r = await this.query('SELECT * FROM property_guarantees WHERE id = $1', [id], false);
      return r.rows[0] ?? null;
    }
    const r = await this.query(
      `UPDATE property_guarantees SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id], false
    );
    return r.rows[0] ?? null;
  }

  // ========================================================================
  // Ledger
  // ========================================================================
  async createLedgerEntry(data: Record<string, unknown>, createdBy?: string | null): Promise<PropertyLedgerEntry> {
    const r = await this.query<PropertyLedgerEntry>(
      `INSERT INTO property_ledger_entries
        (property_id, lease_id, competencia, vencimento, natureza, categoria, descricao, valor, status, paid_at, recurring_rule_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [data.property_id, data.lease_id ?? null, data.competencia, data.vencimento, data.natureza,
       data.categoria, data.descricao ?? null, data.valor ?? 0, data.status ?? 'previsto',
       data.paid_at ?? null, data.recurring_rule_id ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async getLedgerEntry(id: string): Promise<PropertyLedgerEntry | null> {
    const r = await this.query<PropertyLedgerEntry>('SELECT * FROM property_ledger_entries WHERE id = $1', [id], false);
    return r.rows[0] ?? null;
  }

  async updateLedgerEntry(id: string, fields: Record<string, unknown>): Promise<PropertyLedgerEntry | null> {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getLedgerEntry(id);
    const r = await this.query<PropertyLedgerEntry>(
      `UPDATE property_ledger_entries SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id], false
    );
    return r.rows[0] ?? null;
  }

  async deleteLedgerEntry(id: string): Promise<void> {
    await this.query('DELETE FROM property_ledger_entries WHERE id = $1', [id], false);
  }

  async listLedger(filters: {
    property_id?: string; lease_id?: string; competencia?: string; status?: string;
    natureza?: string; client_id?: string; page: number; limit: number;
  }): Promise<{ entries: PropertyLedgerEntry[]; total: number }> {
    const params: unknown[] = [];
    const conds: string[] = [];
    if (filters.property_id) { conds.push(`e.property_id = $${params.length + 1}`); params.push(filters.property_id); }
    if (filters.lease_id) { conds.push(`e.lease_id = $${params.length + 1}`); params.push(filters.lease_id); }
    if (filters.competencia) { conds.push(`e.competencia = $${params.length + 1}`); params.push(filters.competencia); }
    if (filters.status) { conds.push(`e.status = $${params.length + 1}`); params.push(filters.status); }
    if (filters.natureza) { conds.push(`e.natureza = $${params.length + 1}`); params.push(filters.natureza); }
    if (filters.client_id) { conds.push(`p.client_id = $${params.length + 1}`); params.push(filters.client_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const countR = await this.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM property_ledger_entries e LEFT JOIN properties p ON p.id = e.property_id ${where}`,
      params, false
    );
    const total = parseInt(countR.rows[0].count, 10);
    const offset = (filters.page - 1) * filters.limit;
    const r = await this.query<PropertyLedgerEntry>(
      `SELECT e.*, p.identificador AS property_identificador
       FROM property_ledger_entries e
       LEFT JOIN properties p ON p.id = e.property_id
       ${where}
       ORDER BY e.vencimento DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, offset], false
    );
    return { entries: r.rows, total };
  }

  /** Marca como atrasado tudo que venceu e não foi pago/cancelado. */
  async markOverdue(): Promise<number> {
    const r = await this.query(
      `UPDATE property_ledger_entries
       SET status = 'atrasado', updated_at = NOW()
       WHERE status IN ('previsto', 'confirmado') AND vencimento < CURRENT_DATE`,
      [], false
    );
    return r.rowCount ?? 0;
  }

  // ========================================================================
  // Recorrências
  // ========================================================================
  async createRecurringRule(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_recurring_rules
        (property_id, lease_id, natureza, categoria, descricao, valor, dia_vencimento, ativo, inicio_competencia, fim_competencia, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [data.property_id, data.lease_id ?? null, data.natureza, data.categoria, data.descricao ?? null,
       data.valor ?? 0, data.dia_vencimento ?? 10, data.ativo ?? true,
       data.inicio_competencia ?? null, data.fim_competencia ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listRecurringRules(propertyId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (propertyId) { where = 'WHERE property_id = $1'; params.push(propertyId); }
    const r = await this.query(`SELECT * FROM property_recurring_rules ${where} ORDER BY created_at DESC`, params, false);
    return r.rows;
  }

  async getRecurringRule(id: string) {
    const r = await this.query('SELECT * FROM property_recurring_rules WHERE id = $1', [id], false);
    return r.rows[0] ?? null;
  }

  async updateRecurringRule(id: string, fields: Record<string, unknown>) {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getRecurringRule(id);
    const r = await this.query(
      `UPDATE property_recurring_rules SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id], false
    );
    return r.rows[0] ?? null;
  }

  async deleteRecurringRule(id: string): Promise<void> {
    await this.query('DELETE FROM property_recurring_rules WHERE id = $1', [id], false);
  }

  async listActiveRecurringForCompetencia(competencia: string) {
    const r = await this.query(
      `SELECT * FROM property_recurring_rules
       WHERE ativo = true
         AND (inicio_competencia IS NULL OR inicio_competencia <= $1)
         AND (fim_competencia IS NULL OR fim_competencia >= $1)`,
      [competencia], false
    );
    return r.rows as Array<Record<string, any>>;
  }

  async ledgerExistsForRule(ruleId: string, competencia: string): Promise<boolean> {
    const r = await this.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM property_ledger_entries WHERE recurring_rule_id = $1 AND competencia = $2`,
      [ruleId, competencia], false
    );
    return parseInt(r.rows[0].count, 10) > 0;
  }

  // ========================================================================
  // Documentos
  // ========================================================================
  async createDocument(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_documents (property_id, lease_id, categoria, nome_arquivo, mime_type, tamanho_bytes, storage_status, metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'em_criacao',$7::jsonb,$8) RETURNING *`,
      [data.property_id ?? null, data.lease_id ?? null, data.categoria ?? 'outro', data.nome_arquivo,
       data.mime_type ?? null, data.tamanho_bytes ?? null, JSON.stringify(data.metadata ?? {}), createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listDocuments(filters: { property_id?: string; lease_id?: string }) {
    const params: unknown[] = [];
    const conds: string[] = [];
    if (filters.property_id) { conds.push(`property_id = $${params.length + 1}`); params.push(filters.property_id); }
    if (filters.lease_id) { conds.push(`lease_id = $${params.length + 1}`); params.push(filters.lease_id); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const r = await this.query(`SELECT * FROM property_documents ${where} ORDER BY created_at DESC`, params, false);
    return r.rows;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.query('DELETE FROM property_documents WHERE id = $1', [id], false);
  }

  // ========================================================================
  // Ownership shares
  // ========================================================================
  async createOwnershipShare(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_ownership_shares (property_id, client_id, nome_proprietario, documento, percentual, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [data.property_id, data.client_id ?? null, data.nome_proprietario, data.documento ?? null,
       data.percentual ?? 100, createdBy ?? null],
      false
    );
    return r.rows[0];
  }

  async listOwnershipShares(propertyId: string) {
    const r = await this.query('SELECT * FROM property_ownership_shares WHERE property_id = $1 ORDER BY percentual DESC', [propertyId], false);
    return r.rows;
  }

  async updateOwnershipShare(id: string, fields: Record<string, unknown>) {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) {
      const r = await this.query('SELECT * FROM property_ownership_shares WHERE id = $1', [id], false);
      return r.rows[0] ?? null;
    }
    const r = await this.query(
      `UPDATE property_ownership_shares SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id], false
    );
    return r.rows[0] ?? null;
  }

  async deleteOwnershipShare(id: string): Promise<void> {
    await this.query('DELETE FROM property_ownership_shares WHERE id = $1', [id], false);
  }

  // ========================================================================
  // Operação interna (vendors, maintenance, inspections, inventory)
  // ========================================================================
  async createVendor(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_vendors (nome, documento, categoria, email, telefone, observacao, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.nome, data.documento ?? null, data.categoria ?? null, data.email ?? null,
       data.telefone ?? null, data.observacao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listVendors() {
    const r = await this.query('SELECT * FROM property_vendors ORDER BY nome ASC', [], false);
    return r.rows;
  }
  async updateVendor(id: string, fields: Record<string, unknown>) {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) { const r = await this.query('SELECT * FROM property_vendors WHERE id = $1', [id], false); return r.rows[0] ?? null; }
    const r = await this.query(`UPDATE property_vendors SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`, [...params, id], false);
    return r.rows[0] ?? null;
  }
  async deleteVendor(id: string): Promise<void> { await this.query('DELETE FROM property_vendors WHERE id = $1', [id], false); }

  async createMaintenance(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_maintenance_tickets
        (property_id, vendor_id, titulo, descricao, status, prioridade, valor_orcado, valor_final, aberto_em, concluido_em, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, CURRENT_DATE),$10,$11) RETURNING *`,
      [data.property_id, data.vendor_id ?? null, data.titulo, data.descricao ?? null,
       data.status ?? 'aberto', data.prioridade ?? 'media', data.valor_orcado ?? null,
       data.valor_final ?? null, data.aberto_em ?? null, data.concluido_em ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listMaintenance(propertyId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (propertyId) { where = 'WHERE property_id = $1'; params.push(propertyId); }
    const r = await this.query(`SELECT * FROM property_maintenance_tickets ${where} ORDER BY aberto_em DESC`, params, false);
    return r.rows;
  }
  async updateMaintenance(id: string, fields: Record<string, unknown>) {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) { const r = await this.query('SELECT * FROM property_maintenance_tickets WHERE id = $1', [id], false); return r.rows[0] ?? null; }
    const r = await this.query(`UPDATE property_maintenance_tickets SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`, [...params, id], false);
    return r.rows[0] ?? null;
  }
  async deleteMaintenance(id: string): Promise<void> { await this.query('DELETE FROM property_maintenance_tickets WHERE id = $1', [id], false); }

  async createInspection(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_inspections (property_id, lease_id, tipo, data_vistoria, responsavel, checklist, observacao, status, created_by)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,$6::jsonb,$7,$8,$9) RETURNING *`,
      [data.property_id, data.lease_id ?? null, data.tipo ?? 'entrada', data.data_vistoria ?? null,
       data.responsavel ?? null, JSON.stringify(data.checklist ?? []), data.observacao ?? null,
       data.status ?? 'rascunho', createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listInspections(propertyId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (propertyId) { where = 'WHERE property_id = $1'; params.push(propertyId); }
    const r = await this.query(`SELECT * FROM property_inspections ${where} ORDER BY data_vistoria DESC`, params, false);
    return r.rows;
  }
  async updateInspection(id: string, fields: Record<string, unknown>) {
    const patch = { ...fields };
    if (patch.checklist !== undefined) patch.checklist = JSON.stringify(patch.checklist) as unknown as string;
    const { setSql, params } = this.buildUpdate(patch);
    if (!setSql) { const r = await this.query('SELECT * FROM property_inspections WHERE id = $1', [id], false); return r.rows[0] ?? null; }
    // checklist precisa de cast jsonb
    const setSqlCast = setSql.replace('checklist = $', 'checklist = $');
    const r = await this.query(`UPDATE property_inspections SET ${setSqlCast}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`, [...params, id], false);
    return r.rows[0] ?? null;
  }
  async deleteInspection(id: string): Promise<void> { await this.query('DELETE FROM property_inspections WHERE id = $1', [id], false); }

  async createInventoryItem(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_inventory_items (property_id, nome, quantidade, estado_conservacao, valor_estimado, observacao, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.property_id, data.nome, data.quantidade ?? 1, data.estado_conservacao ?? 'bom',
       data.valor_estimado ?? null, data.observacao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listInventory(propertyId: string) {
    const r = await this.query('SELECT * FROM property_inventory_items WHERE property_id = $1 ORDER BY nome ASC', [propertyId], false);
    return r.rows;
  }
  async updateInventoryItem(id: string, fields: Record<string, unknown>) {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) { const r = await this.query('SELECT * FROM property_inventory_items WHERE id = $1', [id], false); return r.rows[0] ?? null; }
    const r = await this.query(`UPDATE property_inventory_items SET ${setSql}, updated_at = NOW() WHERE id = $${params.length + 1} RETURNING *`, [...params, id], false);
    return r.rows[0] ?? null;
  }
  async deleteInventoryItem(id: string): Promise<void> { await this.query('DELETE FROM property_inventory_items WHERE id = $1', [id], false); }

  // ========================================================================
  // Integrações externas (stubs)
  // ========================================================================
  async createPaymentCharge(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_payment_charges (property_id, ledger_entry_id, metodo, valor, vencimento, descricao, provider_status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'em_criacao',$7) RETURNING *`,
      [data.property_id, data.ledger_entry_id ?? null, data.metodo ?? 'boleto', data.valor ?? 0,
       data.vencimento, data.descricao ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listPaymentCharges(propertyId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (propertyId) { where = 'WHERE property_id = $1'; params.push(propertyId); }
    const r = await this.query(`SELECT * FROM property_payment_charges ${where} ORDER BY created_at DESC`, params, false);
    return r.rows;
  }

  async createCommunication(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_communications (client_id, property_id, canal, assunto, mensagem, destinatario, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'em_criacao',$7) RETURNING *`,
      [data.client_id ?? null, data.property_id ?? null, data.canal ?? 'email', data.assunto ?? null,
       data.mensagem ?? null, data.destinatario ?? null, createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listCommunications(clientId?: string) {
    const params: unknown[] = [];
    let where = '';
    if (clientId) { where = 'WHERE client_id = $1'; params.push(clientId); }
    const r = await this.query(`SELECT * FROM property_communications ${where} ORDER BY created_at DESC`, params, false);
    return r.rows;
  }

  async createBankImportBatch(data: Record<string, unknown>, createdBy?: string | null) {
    const r = await this.query(
      `INSERT INTO property_bank_import_batches (referencia, status, metadata, created_by)
       VALUES ($1,'em_criacao',$2::jsonb,$3) RETURNING *`,
      [data.referencia, JSON.stringify(data.metadata ?? {}), createdBy ?? null],
      false
    );
    return r.rows[0];
  }
  async listBankImportBatches() {
    const r = await this.query('SELECT * FROM property_bank_import_batches ORDER BY created_at DESC', [], false);
    return r.rows;
  }

  // ========================================================================
  // Share links (prestação de contas)
  // ========================================================================
  async createStatementShare(data: {
    client_id: string; token_hash: string; property_ids: string[];
    period_from: string; period_to: string; title: string | null; expires_at: Date; created_by: string | null;
  }): Promise<PropertyStatementShare> {
    const r = await this.query<PropertyStatementShare>(
      `INSERT INTO property_statement_shares (client_id, token_hash, property_ids, period_from, period_to, title, expires_at, created_by)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8) RETURNING *`,
      [data.client_id, data.token_hash, JSON.stringify(data.property_ids), data.period_from,
       data.period_to, data.title, data.expires_at, data.created_by],
      false
    );
    return r.rows[0];
  }

  async listStatementShares(clientId?: string): Promise<PropertyStatementShare[]> {
    const params: unknown[] = [];
    let where = '';
    if (clientId) { where = 'WHERE client_id = $1'; params.push(clientId); }
    const r = await this.query<PropertyStatementShare>(
      `SELECT * FROM property_statement_shares ${where} ORDER BY created_at DESC`, params, false
    );
    return r.rows;
  }

  async getStatementShareByTokenHash(tokenHash: string): Promise<PropertyStatementShare | null> {
    const r = await this.query<PropertyStatementShare>(
      'SELECT * FROM property_statement_shares WHERE token_hash = $1', [tokenHash], false
    );
    return r.rows[0] ?? null;
  }

  async revokeStatementShare(id: string): Promise<PropertyStatementShare | null> {
    const r = await this.query<PropertyStatementShare>(
      `UPDATE property_statement_shares SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id], false
    );
    return r.rows[0] ?? null;
  }

  async registerShareAccess(tokenHash: string): Promise<void> {
    await this.query(
      `UPDATE property_statement_shares SET access_count = access_count + 1, last_accessed_at = NOW() WHERE token_hash = $1`,
      [tokenHash], false
    );
  }

  // ========================================================================
  // Agregações: DRE / extrato / dashboard / alertas
  // ========================================================================
  async getStatementData(clientId: string, propertyIds: string[], periodFrom: string, periodTo: string) {
    const params: unknown[] = [clientId, periodFrom, periodTo];
    let propFilter = '';
    if (propertyIds.length > 0) {
      const ph = propertyIds.map((_, i) => `$${i + 4}`).join(',');
      propFilter = `AND e.property_id IN (${ph})`;
      params.push(...propertyIds);
    }
    const r = await this.query<{
      property_id: string; identificador: string; natureza: string; categoria: string; status: string; total: string;
    }>(
      `SELECT e.property_id, p.identificador, e.natureza, e.categoria, e.status,
              SUM(e.valor)::text AS total
       FROM property_ledger_entries e
       JOIN properties p ON p.id = e.property_id
       WHERE p.client_id = $1 AND e.competencia BETWEEN $2 AND $3 AND e.status <> 'cancelado' ${propFilter}
       GROUP BY e.property_id, p.identificador, e.natureza, e.categoria, e.status
       ORDER BY p.identificador`,
      params, false
    );
    return r.rows.map((row) => ({ ...row, total: Number(row.total) || 0 }));
  }

  async getDashboard(clientId: string | undefined, competencia: string) {
    const params: unknown[] = [competencia];
    let clientFilter = '';
    if (clientId) { clientFilter = `AND p.client_id = $2`; params.push(clientId); }
    const kpisR = await this.query<{
      receita_recebida: string; receita_prevista: string; despesa_paga: string; pendencias: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN e.natureza='receita' AND e.status='pago' THEN e.valor ELSE 0 END),0)::text AS receita_recebida,
         COALESCE(SUM(CASE WHEN e.natureza='receita' AND e.status IN ('previsto','confirmado','atrasado') THEN e.valor ELSE 0 END),0)::text AS receita_prevista,
         COALESCE(SUM(CASE WHEN e.natureza='despesa' AND e.status='pago' THEN e.valor ELSE 0 END),0)::text AS despesa_paga,
         COALESCE(SUM(CASE WHEN e.status='atrasado' THEN e.valor ELSE 0 END),0)::text AS pendencias
       FROM property_ledger_entries e
       JOIN properties p ON p.id = e.property_id
       WHERE e.competencia = $1 ${clientFilter}`,
      params, false
    );
    const perPropParams: unknown[] = [competencia];
    let perPropFilter = '';
    if (clientId) { perPropFilter = `AND p.client_id = $2`; perPropParams.push(clientId); }
    const perProp = await this.query<{
      property_id: string; identificador: string; receita: string; despesa: string; atrasado: string;
    }>(
      `SELECT p.id AS property_id, p.identificador,
              COALESCE(SUM(CASE WHEN e.natureza='receita' THEN e.valor ELSE 0 END),0)::text AS receita,
              COALESCE(SUM(CASE WHEN e.natureza='despesa' THEN e.valor ELSE 0 END),0)::text AS despesa,
              COALESCE(SUM(CASE WHEN e.status='atrasado' THEN e.valor ELSE 0 END),0)::text AS atrasado
       FROM properties p
       LEFT JOIN property_ledger_entries e ON e.property_id = p.id AND e.competencia = $1 AND e.status <> 'cancelado'
       WHERE 1=1 ${perPropFilter}
       GROUP BY p.id, p.identificador
       ORDER BY p.identificador`,
      perPropParams, false
    );
    const k = kpisR.rows[0];
    return {
      kpis: {
        receita_recebida: Number(k.receita_recebida) || 0,
        receita_prevista: Number(k.receita_prevista) || 0,
        despesa_paga: Number(k.despesa_paga) || 0,
        pendencias: Number(k.pendencias) || 0,
        resultado_liquido: (Number(k.receita_recebida) || 0) - (Number(k.despesa_paga) || 0),
      },
      imoveis: perProp.rows.map((x) => ({
        property_id: x.property_id,
        identificador: x.identificador,
        receita: Number(x.receita) || 0,
        despesa: Number(x.despesa) || 0,
        resultado: (Number(x.receita) || 0) - (Number(x.despesa) || 0),
        atrasado: Number(x.atrasado) || 0,
      })),
    };
  }

  async getAlerts(clientId: string | undefined, dias: number) {
    const alerts: Array<Record<string, unknown>> = [];
    const leaseParams: unknown[] = [dias];
    let leaseClient = '';
    if (clientId) { leaseClient = `AND p.client_id = $2`; leaseParams.push(clientId); }
    const leasesEnding = await this.query<{ id: string; identificador: string; data_fim: string }>(
      `SELECT l.id, p.identificador, l.data_fim
       FROM property_leases l JOIN properties p ON p.id = l.property_id
       WHERE l.status = 'ativo' AND l.data_fim IS NOT NULL
         AND l.data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::interval ${leaseClient}
       ORDER BY l.data_fim ASC`,
      leaseParams, false
    );
    for (const l of leasesEnding.rows) {
      alerts.push({ tipo: 'contrato_encerrando', property_identificador: l.identificador, data: l.data_fim, lease_id: l.id });
    }
    const ledgerParams: unknown[] = [dias];
    let ledgerClient = '';
    if (clientId) { ledgerClient = `AND p.client_id = $2`; ledgerParams.push(clientId); }
    const dueSoon = await this.query<{ id: string; identificador: string; vencimento: string; valor: string; status: string; categoria: string }>(
      `SELECT e.id, p.identificador, e.vencimento, e.valor::text AS valor, e.status, e.categoria
       FROM property_ledger_entries e JOIN properties p ON p.id = e.property_id
       WHERE e.status IN ('previsto','confirmado','atrasado')
         AND e.vencimento <= CURRENT_DATE + ($1 || ' days')::interval ${ledgerClient}
       ORDER BY e.vencimento ASC
       LIMIT 100`,
      ledgerParams, false
    );
    for (const e of dueSoon.rows) {
      alerts.push({
        tipo: e.status === 'atrasado' ? 'lancamento_atrasado' : 'lancamento_a_vencer',
        property_identificador: e.identificador, data: e.vencimento,
        valor: Number(e.valor) || 0, categoria: e.categoria, ledger_id: e.id,
      });
    }
    return alerts;
  }

  async propertyBelongsToClient(propertyId: string): Promise<string | null> {
    const r = await this.query<{ client_id: string }>('SELECT client_id FROM properties WHERE id = $1', [propertyId], false);
    return r.rows[0]?.client_id ?? null;
  }
}

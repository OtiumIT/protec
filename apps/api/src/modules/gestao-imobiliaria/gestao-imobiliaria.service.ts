import { randomBytes, createHash } from 'crypto';
import { GestaoImobiliariaRepository } from './gestao-imobiliaria.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import { query } from '../../db/client';
import { calcularPF, calcularPJ } from '../properties/calculations';
import { createPropertyDocumentUploadUrl, generatePropertyDocumentSignedUrl, deletePropertyDocumentFile } from '../../shared/services/storage.service';

const LEASE_DOC_MAX_BYTES = 15 * 1024 * 1024;
const LEASE_DOC_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

function deriveDataFim(dataInicio: string, prazoMeses?: number | null, dataFim?: string | null): string | null {
  if (dataFim) return dataFim;
  if (!prazoMeses || prazoMeses <= 0) return dataFim ?? null;
  const d = new Date(`${dataInicio}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dataFim ?? null;
  d.setMonth(d.getMonth() + prazoMeses);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Erro padronizado para funcionalidades que dependem de integração externa (em criação). */
export function integrationNotReady(nome: string): AppError {
  return new AppError(
    `A integração "${nome}" está em criação. O registro foi salvo, mas o envio/execução externa ainda não está disponível.`,
    'INTEGRATION_NOT_READY',
    422
  );
}

export class GestaoImobiliariaService {
  constructor(
    private repo: GestaoImobiliariaRepository,
    private clientRepo: ClientRepository
  ) {}

  private async assertClient(clientId: string): Promise<void> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
  }

  private async assertProperty(propertyId: string): Promise<void> {
    const clientId = await this.repo.propertyBelongsToClient(propertyId);
    if (!clientId) throw new AppError('Imóvel não encontrado', 'PROPERTY_NOT_FOUND', 404);
  }

  // ---- Inquilinos ----
  async createTenant(data: any, userId?: string) {
    if (data.client_id) await this.assertClient(data.client_id);
    return this.repo.createTenant(data, userId ?? null);
  }
  listTenants(clientId?: string) { return this.repo.listTenants(clientId); }
  async updateTenant(id: string, data: any) {
    const existing = await this.repo.getTenant(id);
    if (!existing) throw new AppError('Inquilino não encontrado', 'TENANT_NOT_FOUND', 404);
    return this.repo.updateTenant(id, data);
  }
  async deleteTenant(id: string) {
    const existing = await this.repo.getTenant(id);
    if (!existing) throw new AppError('Inquilino não encontrado', 'TENANT_NOT_FOUND', 404);
    await this.repo.deleteTenant(id);
  }

  // ---- Contratos ----
  async createLease(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    const payload = {
      ...data,
      data_fim: deriveDataFim(data.data_inicio, data.prazo_meses, data.data_fim),
    };
    return this.repo.createLease(payload, userId ?? null);
  }
  listLeases(filters: any) { return this.repo.listLeases(filters); }
  async getLease(id: string) {
    const lease = await this.repo.getLease(id);
    if (!lease) throw new AppError('Contrato não encontrado', 'LEASE_NOT_FOUND', 404);
    return lease;
  }
  async updateLease(id: string, data: any) {
    const existing = await this.getLease(id);
    const shouldDerive = data.prazo_meses !== undefined || data.data_inicio !== undefined || data.data_fim !== undefined;
    const payload = { ...data };
    if (shouldDerive) {
      const inicio = String(data.data_inicio ?? existing.data_inicio ?? '').slice(0, 10);
      payload.data_fim = deriveDataFim(inicio, data.prazo_meses ?? existing.prazo_meses, data.data_fim);
    }
    return this.repo.updateLease(id, payload);
  }
  async deleteLease(id: string) {
    await this.getLease(id);
    await this.repo.deleteLease(id);
  }
  async createAmendment(data: any, userId?: string) {
    await this.getLease(data.lease_id);
    return this.repo.createAmendment(data, userId ?? null);
  }
  async listAmendments(leaseId: string) {
    await this.getLease(leaseId);
    return this.repo.listAmendments(leaseId);
  }
  async createGuarantee(data: any, userId?: string) {
    await this.getLease(data.lease_id);
    return this.repo.createGuarantee(data, userId ?? null);
  }
  async listGuarantees(leaseId: string) {
    await this.getLease(leaseId);
    return this.repo.listGuarantees(leaseId);
  }
  updateGuarantee(id: string, data: any) { return this.repo.updateGuarantee(id, data); }

  // ---- Ledger ----
  async createLedgerEntry(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    return this.repo.createLedgerEntry(data, userId ?? null);
  }
  listLedger(filters: any) { return this.repo.listLedger(filters); }
  async updateLedgerEntry(id: string, data: any) {
    const existing = await this.repo.getLedgerEntry(id);
    if (!existing) throw new AppError('Lançamento não encontrado', 'LEDGER_NOT_FOUND', 404);
    return this.repo.updateLedgerEntry(id, data);
  }
  async settleLedgerEntry(id: string, paidAt?: string) {
    const existing = await this.repo.getLedgerEntry(id);
    if (!existing) throw new AppError('Lançamento não encontrado', 'LEDGER_NOT_FOUND', 404);
    return this.repo.updateLedgerEntry(id, {
      status: 'pago',
      paid_at: paidAt ?? new Date().toISOString().slice(0, 10),
    });
  }
  async cancelLedgerEntry(id: string) {
    const existing = await this.repo.getLedgerEntry(id);
    if (!existing) throw new AppError('Lançamento não encontrado', 'LEDGER_NOT_FOUND', 404);
    return this.repo.updateLedgerEntry(id, { status: 'cancelado' });
  }
  async deleteLedgerEntry(id: string) {
    const existing = await this.repo.getLedgerEntry(id);
    if (!existing) throw new AppError('Lançamento não encontrado', 'LEDGER_NOT_FOUND', 404);
    await this.repo.deleteLedgerEntry(id);
  }
  markOverdue() { return this.repo.markOverdue(); }

  // ---- Recorrências ----
  async createRecurringRule(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    return this.repo.createRecurringRule(data, userId ?? null);
  }
  listRecurringRules(propertyId?: string) { return this.repo.listRecurringRules(propertyId); }
  updateRecurringRule(id: string, data: any) { return this.repo.updateRecurringRule(id, data); }
  deleteRecurringRule(id: string) { return this.repo.deleteRecurringRule(id); }

  /** Gera lançamentos de ledger para uma competência a partir das regras ativas. */
  async generateRecurring(competencia: string, userId?: string) {
    const rules = await this.repo.listActiveRecurringForCompetencia(competencia);
    const [ano, mes] = competencia.split('-');
    const created: unknown[] = [];
    let skipped = 0;
    for (const rule of rules) {
      const exists = await this.repo.ledgerExistsForRule(rule.id, competencia);
      if (exists) { skipped++; continue; }
      const dia = String(Math.min(Number(rule.dia_vencimento) || 10, 28)).padStart(2, '0');
      const vencimento = `${ano}-${mes}-${dia}`;
      const entry = await this.repo.createLedgerEntry({
        property_id: rule.property_id,
        lease_id: rule.lease_id ?? null,
        competencia,
        vencimento,
        natureza: rule.natureza,
        categoria: rule.categoria,
        descricao: rule.descricao ?? null,
        valor: rule.valor ?? 0,
        status: 'previsto',
        recurring_rule_id: rule.id,
      }, userId ?? null);
      created.push(entry);
    }
    return { created: created.length, skipped, entries: created };
  }

  // ---- Documentos ----
  async createDocumentUploadUrl(companyId: string, leaseId: string, filename: string, mimeType?: string | null) {
    await this.getLease(leaseId);
    if (mimeType && !LEASE_DOC_MIMES.has(mimeType)) {
      throw new AppError('Tipo de arquivo não permitido. Use PDF, imagem ou DOCX.', 'INVALID_MIME', 400);
    }
    const uid = randomBytes(8).toString('hex');
    const storagePath = `${companyId}/leases/${leaseId}/${uid}-${sanitizeFilename(filename)}`;
    const signed = await createPropertyDocumentUploadUrl(storagePath);
    return {
      upload_url: signed.signedUrl,
      storage_path: signed.path,
      token: signed.token,
      expires_in: 600,
    };
  }

  async createDocument(data: any, userId?: string, companyId?: string) {
    if (data.lease_id) await this.getLease(data.lease_id);
    if (data.property_id) await this.assertProperty(data.property_id);
    if (data.mime_type && !LEASE_DOC_MIMES.has(data.mime_type)) {
      throw new AppError('Tipo de arquivo não permitido. Use PDF, imagem ou DOCX.', 'INVALID_MIME', 400);
    }
    if (data.tamanho_bytes != null && Number(data.tamanho_bytes) > LEASE_DOC_MAX_BYTES) {
      throw new AppError('Arquivo excede o limite de 15 MB.', 'FILE_TOO_LARGE', 400);
    }
    if (data.storage_key && companyId && !String(data.storage_key).startsWith(`${companyId}/`)) {
      throw new AppError('storage_key inválido para este tenant.', 'FORBIDDEN', 403);
    }
    return this.repo.createDocument(data, userId ?? null);
  }

  listDocuments(filters: any) { return this.repo.listDocuments(filters); }

  async getDocumentDownloadUrl(id: string, companyId: string) {
    const doc = await this.repo.getDocument(id);
    if (!doc) throw new AppError('Documento não encontrado', 'DOCUMENT_NOT_FOUND', 404);
    if (!doc.storage_key || doc.storage_status !== 'armazenado') {
      throw new AppError('Arquivo ainda não está disponível.', 'DOCUMENT_NOT_READY', 409);
    }
    if (!String(doc.storage_key).startsWith(`${companyId}/`)) {
      throw new AppError('Documento não encontrado', 'DOCUMENT_NOT_FOUND', 404);
    }
    const download_url = await generatePropertyDocumentSignedUrl(doc.storage_key, 600);
    return { download_url, nome_arquivo: doc.nome_arquivo, mime_type: doc.mime_type, expires_in: 600 };
  }

  async deleteDocument(id: string, companyId: string) {
    const doc = await this.repo.getDocument(id);
    if (!doc) throw new AppError('Documento não encontrado', 'DOCUMENT_NOT_FOUND', 404);
    if (doc.storage_key && String(doc.storage_key).startsWith(`${companyId}/`)) {
      await deletePropertyDocumentFile(doc.storage_key).catch(() => undefined);
    }
    await this.repo.deleteDocument(id);
  }

  // ---- Ownership ----
  async createOwnershipShare(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    return this.repo.createOwnershipShare(data, userId ?? null);
  }
  listOwnershipShares(propertyId: string) { return this.repo.listOwnershipShares(propertyId); }
  updateOwnershipShare(id: string, data: any) { return this.repo.updateOwnershipShare(id, data); }
  deleteOwnershipShare(id: string) { return this.repo.deleteOwnershipShare(id); }

  // ---- Operação interna ----
  createVendor(data: any, userId?: string) { return this.repo.createVendor(data, userId ?? null); }
  listVendors() { return this.repo.listVendors(); }
  updateVendor(id: string, data: any) { return this.repo.updateVendor(id, data); }
  deleteVendor(id: string) { return this.repo.deleteVendor(id); }

  async createMaintenance(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    return this.repo.createMaintenance(data, userId ?? null);
  }
  listMaintenance(propertyId?: string) { return this.repo.listMaintenance(propertyId); }
  updateMaintenance(id: string, data: any) { return this.repo.updateMaintenance(id, data); }
  deleteMaintenance(id: string) { return this.repo.deleteMaintenance(id); }

  async createInspection(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    return this.repo.createInspection(data, userId ?? null);
  }
  listInspections(propertyId?: string) { return this.repo.listInspections(propertyId); }
  updateInspection(id: string, data: any) { return this.repo.updateInspection(id, data); }
  deleteInspection(id: string) { return this.repo.deleteInspection(id); }

  async createInventoryItem(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    return this.repo.createInventoryItem(data, userId ?? null);
  }
  listInventory(propertyId: string) { return this.repo.listInventory(propertyId); }
  updateInventoryItem(id: string, data: any) { return this.repo.updateInventoryItem(id, data); }
  deleteInventoryItem(id: string) { return this.repo.deleteInventoryItem(id); }

  // ---- Integrações externas (stubs) ----
  /** Cria a cobrança localmente e sinaliza que o provedor externo está em criação. */
  async createPaymentCharge(data: any, userId?: string) {
    await this.assertProperty(data.property_id);
    const charge = await this.repo.createPaymentCharge(data, userId ?? null);
    return {
      charge,
      integration_status: 'em_criacao' as const,
      message: 'Cobrança registrada. A emissão de boleto/PIX via provedor externo está em criação.',
    };
  }
  listPaymentCharges(propertyId?: string) { return this.repo.listPaymentCharges(propertyId); }

  async createCommunication(data: any, userId?: string) {
    const comm = await this.repo.createCommunication(data, userId ?? null);
    return {
      communication: comm,
      integration_status: 'em_criacao' as const,
      message: 'Aviso registrado. O envio por e-mail/WhatsApp está em criação.',
    };
  }
  listCommunications(clientId?: string) { return this.repo.listCommunications(clientId); }

  async createBankImportBatch(data: any, userId?: string) {
    const batch = await this.repo.createBankImportBatch(data, userId ?? null);
    return {
      batch,
      integration_status: 'em_criacao' as const,
      message: 'Lote criado. A conciliação bancária automática está em criação.',
    };
  }
  listBankImportBatches() { return this.repo.listBankImportBatches(); }

  // ---- DRE / Extrato ----
  async buildStatement(clientId: string, propertyIds: string[], periodFrom: string, periodTo: string) {
    await this.assertClient(clientId);
    const rows = await this.repo.getStatementData(clientId, propertyIds, periodFrom, periodTo);

    const porImovel = new Map<string, {
      property_id: string; identificador: string;
      receitas: number; despesas: number; categorias: Record<string, number>;
    }>();
    let totalReceitas = 0;
    let totalDespesas = 0;

    for (const row of rows) {
      if (!porImovel.has(row.property_id)) {
        porImovel.set(row.property_id, {
          property_id: row.property_id, identificador: row.identificador,
          receitas: 0, despesas: 0, categorias: {},
        });
      }
      const item = porImovel.get(row.property_id)!;
      const signed = row.natureza === 'receita' ? row.total : -row.total;
      if (row.natureza === 'receita') { item.receitas += row.total; totalReceitas += row.total; }
      else { item.despesas += row.total; totalDespesas += row.total; }
      const catKey = `${row.natureza}:${row.categoria}`;
      item.categorias[catKey] = (item.categorias[catKey] ?? 0) + signed;
    }

    return {
      client_id: clientId,
      period_from: periodFrom,
      period_to: periodTo,
      resumo: {
        receitas: Math.round(totalReceitas * 100) / 100,
        despesas: Math.round(totalDespesas * 100) / 100,
        resultado_liquido: Math.round((totalReceitas - totalDespesas) * 100) / 100,
      },
      imoveis: Array.from(porImovel.values()).map((i) => ({
        ...i,
        resultado: Math.round((i.receitas - i.despesas) * 100) / 100,
      })),
    };
  }

  // ---- Dashboard / Alertas ----
  getDashboard(clientId: string | undefined, competencia: string) {
    return this.repo.getDashboard(clientId, competencia);
  }
  getAlerts(clientId: string | undefined, dias: number) {
    return this.repo.getAlerts(clientId, dias);
  }

  // ---- Share links (prestação de contas read-only) ----
  async createStatementShare(data: {
    client_id: string; property_ids: string[]; period_from: string; period_to: string;
    title?: string | null; expires_in_days: number;
  }, companyId: string, userId?: string) {
    await this.assertClient(data.client_id);
    const rawToken = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000);

    const share = await this.repo.createStatementShare({
      client_id: data.client_id,
      token_hash: tokenHash,
      property_ids: data.property_ids,
      period_from: data.period_from,
      period_to: data.period_to,
      title: data.title ?? null,
      expires_at: expiresAt,
      created_by: userId ?? null,
    });

    // Registro público mínimo (resolve tenant sem auth)
    await query(
      `INSERT INTO public.statement_share_tokens (token_hash, company_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token_hash) DO NOTHING`,
      [tokenHash, companyId, expiresAt]
    );

    return { share, token: rawToken };
  }

  listStatementShares(clientId?: string) { return this.repo.listStatementShares(clientId); }

  async revokeStatementShare(id: string) {
    const shares = await this.repo.listStatementShares();
    const share = shares.find((s) => s.id === id);
    if (!share) throw new AppError('Compartilhamento não encontrado', 'SHARE_NOT_FOUND', 404);
    const revoked = await this.repo.revokeStatementShare(id);
    await query(`UPDATE public.statement_share_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [(share as any).token_hash]);
    return revoked;
  }

  async quickSimulateLease(leaseId: string) {
    const lease = await this.getLease(leaseId);
    const aluguel = Number(lease.valor_aluguel) || 0;
    if (aluguel <= 0) throw new AppError('Contrato sem valor de aluguel', 'NO_RENT_VALUE', 400);

    const prop = await this.repo.getPropertyById(lease.property_id);
    if (!prop) throw new AppError('Imóvel do contrato não encontrado', 'PROPERTY_NOT_FOUND', 404);

    const despesas = (Number(prop.iptu_mensal_padrao) || 0)
      + (Number(prop.condominio_mensal_padrao) || 0)
      + (Number(prop.seguro_mensal_padrao) || 0);

    let taxaImobiliaria = 0;
    if (lease.tem_imobiliaria && lease.imobiliaria_valor) {
      taxaImobiliaria = lease.imobiliaria_tipo === 'percentual'
        ? aluguel * (Number(lease.imobiliaria_valor) / 100)
        : Number(lease.imobiliaria_valor);
    }

    const custos = (Number(prop.camareira_mensal_padrao) || 0)
      + (Number(prop.seguranca_mensal_padrao) || 0)
      + (Number(prop.material_limpeza_mensal_padrao) || 0)
      + (Number(prop.lavanderia_enxoval_mensal_padrao) || 0)
      + (Number(prop.checkin_checkout_mensal_padrao) || 0)
      + (Number(prop.taxas_pagamento_mensal_padrao) || 0)
      + (Number(prop.tarifas_bancarias_mensal_padrao) || 0)
      + (Number(prop.vacancia_mensal_padrao) || 0)
      + (Number(prop.inadimplencia_mensal_padrao) || 0)
      + taxaImobiliaria;

    const ano = new Date().getFullYear();
    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: `${ano}-${String(i + 1).padStart(2, '0')}`,
      receita: aluguel,
      despesas_dedutiveis: despesas,
      custos_operacionais: custos,
    }));
    const aggregated = {
      ano,
      receita_total: aluguel * 12,
      despesas_dedutiveis_total: despesas * 12,
      custos_operacionais_total: custos * 12,
      meses,
    };

    const resPF = calcularPF(aggregated);
    const resPJ = calcularPJ(aggregated);

    const resultado = {
      pf: { imposto_anual: resPF.imposto_total, aliquota_efetiva: resPF.aliquota_efetiva_anual },
      pj: { imposto_anual: resPJ.imposto_total, aliquota_efetiva: resPJ.aliquota_efetiva },
      recomendacao: (resPF.imposto_total <= resPJ.imposto_total ? 'pf' : 'pj') as 'pf' | 'pj',
      economia_anual: Math.abs(resPF.imposto_total - resPJ.imposto_total),
      receita_anual: aluguel * 12,
      custos_anual: (despesas + custos) * 12,
    };

    await this.repo.updateLease(leaseId, { ultimo_resultado_simulacao: JSON.stringify(resultado) });
    return resultado;
  }

  async saveLeaseRegime(leaseId: string, regime: 'pf' | 'pj') {
    await this.getLease(leaseId);
    await this.repo.updateLease(leaseId, { regime_tributario: regime });
    return { regime_tributario: regime };
  }

  /** Consome um link read-only (token bruto), valida e devolve o extrato. */
  async getPublicStatement(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const share = await this.repo.getStatementShareByTokenHash(tokenHash);
    if (!share) throw new AppError('Link inválido', 'SHARE_NOT_FOUND', 404);
    if (share.revoked_at) throw new AppError('Este link foi revogado', 'SHARE_REVOKED', 403);
    if (new Date(share.expires_at).getTime() < Date.now()) {
      throw new AppError('Este link expirou', 'SHARE_EXPIRED', 403);
    }
    await this.repo.registerShareAccess(tokenHash);
    const propertyIds = Array.isArray(share.property_ids) ? share.property_ids : [];
    const statement = await this.buildStatement(share.client_id, propertyIds, share.period_from, share.period_to);
    return { share: { title: share.title, period_from: share.period_from, period_to: share.period_to }, statement };
  }
}

import { AtividadeImobiliariaRepository } from './atividade-imobiliaria.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import { buildDominioExport } from './dominio-export';
import type {
  RealEstateDevelopment,
  RealEstateUnit,
  DevelopmentIntegrity,
  CreateDevelopmentInput,
  UpdateDevelopmentInput,
  CreateUnitInput,
  UpdateUnitInput,
  ListDevelopmentsQuery,
  CreateSaleContractInput,
  UpdateSaleContractInput,
  SaleContractDetail,
  RealEstateSaleContract,
  ContractIntegrity,
  CreateReceiptInput,
  RealEstateSaleReceipt,
  DominioExportFile,
} from '@shared/core';

function r2(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

function moneyEq(a: number, b: number): boolean {
  return r2(a) === r2(b);
}

export class AtividadeImobiliariaService {
  constructor(
    private repo: AtividadeImobiliariaRepository,
    private clientRepo: ClientRepository,
  ) {}

  // ========================================================================
  // Empreendimentos
  // ========================================================================

  async createDevelopment(data: CreateDevelopmentInput): Promise<RealEstateDevelopment> {
    if (await this.repo.codigoExists(data.codigo)) {
      throw new AppError('Código de empreendimento já existe', 'DEVELOPMENT_CODE_EXISTS', 409);
    }
    return this.repo.createDevelopment(data as Record<string, unknown>);
  }

  async listDevelopments(query: ListDevelopmentsQuery): Promise<{ developments: RealEstateDevelopment[]; total: number }> {
    const { rows, total } = await this.repo.listDevelopments({
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return { developments: rows, total };
  }

  async getDevelopment(id: string): Promise<RealEstateDevelopment> {
    const dev = await this.repo.getDevelopment(id);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
    const integrity = await this.repo.getIntegrity(id);
    return { ...dev, integrity };
  }

  async updateDevelopment(id: string, data: UpdateDevelopmentInput): Promise<RealEstateDevelopment> {
    const existing = await this.repo.getDevelopment(id);
    if (!existing) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);

    if (data.codigo && data.codigo !== existing.codigo) {
      if (await this.repo.codigoExists(data.codigo, id)) {
        throw new AppError('Código de empreendimento já existe', 'DEVELOPMENT_CODE_EXISTS', 409);
      }
    }

    if (data.status === 'ativo' && existing.status !== 'ativo') {
      const integrity = await this.repo.getIntegrity(id);
      if (!integrity.area_ok) {
        throw new AppError(
          `Não é possível ativar: diferença de área = ${integrity.area_diff} m². A soma das unidades deve fechar com a área total.`,
          'INTEGRITY_AREA_MISMATCH',
          422,
        );
      }
    }

    const updated = await this.repo.updateDevelopment(id, data as Record<string, unknown>);
    if (!updated) throw new AppError('Falha ao atualizar', 'UPDATE_FAILED', 500);
    return updated;
  }

  async deleteDevelopment(id: string): Promise<void> {
    const dev = await this.repo.getDevelopment(id);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
    await this.repo.deleteDevelopment(id);
  }

  // ========================================================================
  // Unidades
  // ========================================================================

  async createUnit(developmentId: string, data: CreateUnitInput): Promise<RealEstateUnit> {
    await this.assertDevelopment(developmentId);
    if (await this.repo.unitCodigoExists(developmentId, data.codigo)) {
      throw new AppError('Código de unidade já existe neste empreendimento', 'UNIT_CODE_EXISTS', 409);
    }
    return this.repo.createUnit(developmentId, data as Record<string, unknown>);
  }

  async createUnitsBatch(developmentId: string, units: CreateUnitInput[]): Promise<RealEstateUnit[]> {
    await this.assertDevelopment(developmentId);

    const codigos = units.map((u) => u.codigo);
    const unique = new Set(codigos);
    if (unique.size !== codigos.length) {
      throw new AppError('Códigos de unidade duplicados no lote', 'UNIT_BATCH_DUPLICATE', 422);
    }

    for (const u of units) {
      if (await this.repo.unitCodigoExists(developmentId, u.codigo)) {
        throw new AppError(`Código "${u.codigo}" já existe neste empreendimento`, 'UNIT_CODE_EXISTS', 409);
      }
    }

    return this.repo.createUnitsBatch(developmentId, units as Array<Record<string, unknown>>);
  }

  async listUnits(developmentId: string): Promise<RealEstateUnit[]> {
    await this.assertDevelopment(developmentId);
    return this.repo.listUnits(developmentId);
  }

  async updateUnit(unitId: string, data: UpdateUnitInput): Promise<RealEstateUnit> {
    const unit = await this.repo.getUnit(unitId);
    if (!unit) throw new AppError('Unidade não encontrada', 'UNIT_NOT_FOUND', 404);

    if (data.codigo && data.codigo !== unit.codigo) {
      if (await this.repo.unitCodigoExists(unit.development_id, data.codigo, unitId)) {
        throw new AppError('Código de unidade já existe neste empreendimento', 'UNIT_CODE_EXISTS', 409);
      }
    }

    const updated = await this.repo.updateUnit(unitId, data as Record<string, unknown>);
    if (!updated) throw new AppError('Falha ao atualizar unidade', 'UPDATE_FAILED', 500);
    return updated;
  }

  async deleteUnit(unitId: string): Promise<void> {
    const unit = await this.repo.getUnit(unitId);
    if (!unit) throw new AppError('Unidade não encontrada', 'UNIT_NOT_FOUND', 404);
    await this.repo.deleteUnit(unitId);
  }

  // ========================================================================
  // Integridade
  // ========================================================================

  async getIntegrity(developmentId: string): Promise<DevelopmentIntegrity> {
    await this.assertDevelopment(developmentId);
    return this.repo.getIntegrity(developmentId);
  }

  // ========================================================================
  // Contratos
  // ========================================================================

  async listContracts(developmentId: string): Promise<RealEstateSaleContract[]> {
    await this.assertDevelopment(developmentId);
    return this.repo.listContracts(developmentId);
  }

  async getContractDetail(contractId: string): Promise<SaleContractDetail> {
    const contract = await this.repo.getContract(contractId);
    if (!contract) throw new AppError('Contrato não encontrado', 'CONTRACT_NOT_FOUND', 404);
    return this.loadDetail(contract);
  }

  async createContract(developmentId: string, data: CreateSaleContractInput): Promise<SaleContractDetail> {
    await this.assertDevelopment(developmentId);
    if (await this.repo.contractNumeroExists(developmentId, data.numero)) {
      throw new AppError('Número de contrato já existe neste empreendimento', 'CONTRACT_NUMBER_EXISTS', 409);
    }
    await this.assertParties(data.parties);
    await this.assertContractUnits(developmentId, data.units);

    const header = {
      numero: data.numero,
      data_contrato: data.data_contrato,
      valor_venda: data.valor_venda,
      operacao: data.operacao,
      indice_atualizacao: data.indice_atualizacao ?? null,
      taxa_juros: data.taxa_juros ?? null,
      informacoes_complementares: data.informacoes_complementares ?? null,
      status: 'rascunho',
    };

    const created = await this.repo.createContract(developmentId, header);
    try {
      await this.repo.replaceParties(created.id, data.parties);
      await this.repo.replaceContractUnits(created.id, data.units);
      await this.repo.replaceInstallments(created.id, data.installments ?? []);
    } catch (err) {
      await this.repo.deleteContract(created.id);
      throw err;
    }

    if (data.status === 'ativo') {
      return this.updateContract(created.id, { status: 'ativo' });
    }
    return this.getContractDetail(created.id);
  }

  async updateContract(contractId: string, data: UpdateSaleContractInput): Promise<SaleContractDetail> {
    const existing = await this.repo.getContract(contractId);
    if (!existing) throw new AppError('Contrato não encontrado', 'CONTRACT_NOT_FOUND', 404);

    if (data.numero && data.numero !== existing.numero) {
      if (await this.repo.contractNumeroExists(existing.development_id, data.numero, contractId)) {
        throw new AppError('Número de contrato já existe neste empreendimento', 'CONTRACT_NUMBER_EXISTS', 409);
      }
    }

    if (data.parties) await this.assertParties(data.parties);
    if (data.units) await this.assertContractUnits(existing.development_id, data.units, contractId);

    const header: Record<string, unknown> = {};
    for (const key of [
      'numero', 'data_contrato', 'valor_venda', 'operacao',
      'indice_atualizacao', 'taxa_juros', 'informacoes_complementares',
    ] as const) {
      if (data[key] !== undefined) header[key] = data[key];
    }

    if (Object.keys(header).length) {
      await this.repo.updateContract(contractId, header);
    }
    if (data.parties) await this.repo.replaceParties(contractId, data.parties);
    if (data.units) await this.repo.replaceContractUnits(contractId, data.units);
    if (data.installments) {
      const existingReceipts = await this.repo.listReceiptsByContract(contractId);
      if (existingReceipts.length > 0) {
        throw new AppError(
          'Não é possível alterar o cronograma: já existem baixas. Exclua as baixas primeiro.',
          'INSTALLMENTS_HAVE_RECEIPTS',
          422,
        );
      }
      await this.repo.replaceInstallments(contractId, data.installments);
    }

    if (data.status && data.status !== existing.status) {
      await this.applyContractStatus(contractId, existing, data.status);
    }

    return this.getContractDetail(contractId);
  }

  async deleteContract(contractId: string): Promise<void> {
    const existing = await this.repo.getContract(contractId);
    if (!existing) throw new AppError('Contrato não encontrado', 'CONTRACT_NOT_FOUND', 404);
    if (existing.status === 'ativo') {
      const units = await this.repo.listContractUnits(contractId);
      await this.repo.setUnitsSituacao(units.map((u) => u.unit_id), 'disponivel');
    }
    await this.repo.deleteContract(contractId);
  }

  async getContractIntegrity(contractId: string): Promise<ContractIntegrity> {
    const contract = await this.repo.getContract(contractId);
    if (!contract) throw new AppError('Contrato não encontrado', 'CONTRACT_NOT_FOUND', 404);
    const units = await this.repo.listContractUnits(contractId);
    const installments = await this.repo.listInstallments(contractId);
    const parties = await this.repo.listParties(contractId);
    return this.computeIntegrity(contract, units, installments, parties);
  }

  // ========================================================================
  // Baixas
  // ========================================================================

  async createReceipt(installmentId: string, data: CreateReceiptInput): Promise<RealEstateSaleReceipt> {
    const inst = await this.repo.getInstallment(installmentId);
    if (!inst) throw new AppError('Parcela não encontrada', 'INSTALLMENT_NOT_FOUND', 404);

    const already = await this.repo.sumReceiptPrincipal(installmentId);
    const remaining = r2(Number(inst.principal) - already);
    if (r2(data.principal) > remaining) {
      throw new AppError(
        `Principal da baixa (${r2(data.principal)}) excede o saldo da parcela (${remaining})`,
        'RECEIPT_EXCEEDS_BALANCE',
        422,
      );
    }

    const total = r2(
      data.principal + (data.correcao_monetaria ?? 0) + (data.juros ?? 0) + (data.multa ?? 0) - (data.desconto ?? 0),
    );
    if (total < 0) {
      throw new AppError('Total recebido não pode ser negativo', 'RECEIPT_NEGATIVE_TOTAL', 422);
    }

    const receipt = await this.repo.createReceipt(installmentId, {
      ...data,
      total_recebido: total,
    });

    const paid = r2(already + data.principal);
    await this.repo.updateInstallmentStatus(installmentId, paid >= r2(Number(inst.principal)) ? 'pago' : 'aberto');
    return receipt;
  }

  async deleteReceipt(receiptId: string): Promise<void> {
    const receipt = await this.repo.getReceipt(receiptId);
    if (!receipt) throw new AppError('Baixa não encontrada', 'RECEIPT_NOT_FOUND', 404);
    const installmentId = receipt.installment_id;
    await this.repo.deleteReceipt(receiptId);
    const inst = await this.repo.getInstallment(installmentId);
    if (inst) {
      const paid = await this.repo.sumReceiptPrincipal(installmentId);
      await this.repo.updateInstallmentStatus(installmentId, r2(paid) >= r2(Number(inst.principal)) ? 'pago' : 'aberto');
    }
  }

  // ========================================================================
  // Exportação Domínio
  // ========================================================================

  async exportDominio(developmentId: string): Promise<DominioExportFile> {
    const dev = await this.repo.getDevelopment(developmentId);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
    const units = await this.repo.listUnits(developmentId);
    const contracts = await this.repo.listContracts(developmentId);
    const details: SaleContractDetail[] = [];
    for (const c of contracts) {
      details.push(await this.loadDetail(c));
    }
    const content = buildDominioExport(dev, units, details);
    const safe = (dev.codigo || 'empreendimento').replace(/[^a-zA-Z0-9_-]/g, '_');
    return { filename: `dominio_${safe}.txt`, content };
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private async assertDevelopment(id: string): Promise<void> {
    const dev = await this.repo.getDevelopment(id);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
  }

  private async loadDetail(contract: RealEstateSaleContract): Promise<SaleContractDetail> {
    const parties = await this.repo.listParties(contract.id);
    const units = await this.repo.listContractUnits(contract.id);
    const installments = await this.repo.listInstallments(contract.id);
    const receipts = await this.repo.listReceiptsByContract(contract.id);
    const integrity = this.computeIntegrity(contract, units, installments, parties);
    return { contract: { ...contract, integrity }, parties, units, installments, receipts, integrity };
  }

  private computeIntegrity(
    contract: RealEstateSaleContract,
    units: Array<{ valor_atribuido_contrato: number }>,
    installments: Array<{ principal: number }>,
    parties: Array<{ participacao_pct: number }>,
  ): ContractIntegrity {
    const valor = r2(Number(contract.valor_venda));
    const unitsSum = r2(units.reduce((s, u) => s + Number(u.valor_atribuido_contrato), 0));
    const instSum = r2(installments.reduce((s, i) => s + Number(i.principal), 0));
    const partiesSum = r2(parties.reduce((s, p) => s + Number(p.participacao_pct), 0));
    const aVista = contract.operacao === '01';
    const aVistaOk = aVista ? installments.length === 0 : installments.length > 0;
    const installmentsOk = aVista ? aVistaOk : moneyEq(instSum, valor);
    const unitsOk = moneyEq(unitsSum, valor);
    const partiesOk = moneyEq(partiesSum, 100);
    return {
      valor_venda: valor,
      units_sum: unitsSum,
      units_diff: r2(valor - unitsSum),
      units_ok: unitsOk,
      installments_sum: instSum,
      installments_diff: r2(valor - instSum),
      installments_ok: installmentsOk,
      parties_sum: partiesSum,
      parties_ok: partiesOk,
      a_vista_ok: aVistaOk,
      ok: unitsOk && installmentsOk && partiesOk && aVistaOk,
    };
  }

  private async assertParties(parties: Array<{ client_id: string; participacao_pct: number }>): Promise<void> {
    const ids = parties.map((p) => p.client_id);
    if (new Set(ids).size !== ids.length) {
      throw new AppError('Comprador duplicado no contrato', 'PARTY_DUPLICATE', 422);
    }
    for (const p of parties) {
      const client = await this.clientRepo.findById(p.client_id);
      if (!client) throw new AppError('Comprador não encontrado', 'CLIENT_NOT_FOUND', 404);
    }
  }

  private async assertContractUnits(
    developmentId: string,
    units: Array<{ unit_id: string }>,
    excludeContractId?: string,
  ): Promise<void> {
    const ids = units.map((u) => u.unit_id);
    if (new Set(ids).size !== ids.length) {
      throw new AppError('Unidade duplicada no contrato', 'CONTRACT_UNIT_DUPLICATE', 422);
    }
    for (const u of units) {
      const unit = await this.repo.getUnit(u.unit_id);
      if (!unit || unit.development_id !== developmentId) {
        throw new AppError('Unidade não pertence a este empreendimento', 'UNIT_NOT_IN_DEVELOPMENT', 422);
      }
      if (await this.repo.unitInOtherActiveContract(u.unit_id, excludeContractId)) {
        throw new AppError(`Unidade ${unit.codigo} já está em outro contrato ativo`, 'UNIT_ALREADY_SOLD', 409);
      }
    }
  }

  private async applyContractStatus(
    contractId: string,
    existing: RealEstateSaleContract,
    next: string,
  ): Promise<void> {
    if (next === 'ativo' && existing.status !== 'ativo') {
      const detail = await this.loadDetail({ ...existing, ...(await this.repo.getContract(contractId))! });
      if (!detail.integrity.ok) {
        throw new AppError(
          'Não é possível ativar: fechamentos do contrato não zeraram (unidades, parcelas ou participações).',
          'CONTRACT_INTEGRITY_MISMATCH',
          422,
        );
      }
      await this.repo.setUnitsSituacao(detail.units.map((u) => u.unit_id), 'vendida');
    }
    if (existing.status === 'ativo' && (next === 'cancelado' || next === 'rascunho')) {
      const units = await this.repo.listContractUnits(contractId);
      await this.repo.setUnitsSituacao(units.map((u) => u.unit_id), 'disponivel');
    }
    await this.repo.updateContract(contractId, { status: next });
  }
}

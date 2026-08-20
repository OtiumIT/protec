import { BaseRepository } from '../../shared/repositories/base.repository';
import type {
  RealEstateDevelopment,
  RealEstateUnit,
  DevelopmentIntegrity,
  RealEstateSaleContract,
  RealEstateSaleParty,
  RealEstateSaleContractUnit,
  RealEstateSaleInstallment,
  RealEstateSaleReceipt,
} from '@shared/core';

export class AtividadeImobiliariaRepository extends BaseRepository {
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
  // Empreendimentos
  // ========================================================================

  async createDevelopment(data: Record<string, unknown>): Promise<RealEstateDevelopment> {
    const r = await this.query<RealEstateDevelopment>(
      `INSERT INTO real_estate_developments
        (codigo, nome, tipo, natureza, descricao, data_inicio, cno, cno_data,
         area_total_m2, area_credito_m2, metrica_area,
         cep, logradouro, numero, complemento, bairro, cidade, uf,
         processo_numero, processo_obs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        data.codigo, data.nome, data.tipo ?? null, data.natureza ?? null,
        data.descricao ?? null, data.data_inicio ?? null, data.cno ?? null, data.cno_data ?? null,
        data.area_total_m2 ?? null, data.area_credito_m2 ?? null, data.metrica_area ?? null,
        data.cep ?? null, data.logradouro ?? null, data.numero ?? null,
        data.complemento ?? null, data.bairro ?? null, data.cidade ?? null, data.uf ?? null,
        data.processo_numero ?? null, data.processo_obs ?? null, data.status ?? 'rascunho',
      ],
      false,
    );
    return r.rows[0];
  }

  async listDevelopments(opts: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ rows: RealEstateDevelopment[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (opts.status) {
      conditions.push(`d.status = $${idx++}`);
      params.push(opts.status);
    }
    if (opts.search) {
      conditions.push(`(d.nome ILIKE $${idx} OR d.codigo ILIKE $${idx})`);
      params.push(`%${opts.search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (opts.page - 1) * opts.limit;

    const countR = await this.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM real_estate_developments d ${where}`,
      params,
      false,
    );
    const total = parseInt(countR.rows[0].count, 10);

    const dataR = await this.query<RealEstateDevelopment>(
      `SELECT d.*, (SELECT COUNT(*) FROM real_estate_units u WHERE u.development_id = d.id)::int AS unit_count
       FROM real_estate_developments d ${where}
       ORDER BY d.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, opts.limit, offset],
      false,
    );

    return { rows: dataR.rows, total };
  }

  async getDevelopment(id: string): Promise<RealEstateDevelopment | null> {
    const r = await this.query<RealEstateDevelopment>(
      `SELECT d.*, (SELECT COUNT(*) FROM real_estate_units u WHERE u.development_id = d.id)::int AS unit_count
       FROM real_estate_developments d WHERE d.id = $1`,
      [id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async updateDevelopment(id: string, fields: Record<string, unknown>): Promise<RealEstateDevelopment | null> {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getDevelopment(id);
    const r = await this.query<RealEstateDevelopment>(
      `UPDATE real_estate_developments SET ${setSql}, updated_at = NOW()
       WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async deleteDevelopment(id: string): Promise<void> {
    await this.query('DELETE FROM real_estate_developments WHERE id = $1', [id], false);
  }

  async codigoExists(codigo: string, excludeId?: string): Promise<boolean> {
    const sql = excludeId
      ? 'SELECT 1 FROM real_estate_developments WHERE codigo = $1 AND id != $2 LIMIT 1'
      : 'SELECT 1 FROM real_estate_developments WHERE codigo = $1 LIMIT 1';
    const params = excludeId ? [codigo, excludeId] : [codigo];
    const r = await this.query(sql, params, false);
    return r.rows.length > 0;
  }

  // ========================================================================
  // Unidades
  // ========================================================================

  async createUnit(developmentId: string, data: Record<string, unknown>): Promise<RealEstateUnit> {
    const r = await this.query<RealEstateUnit>(
      `INSERT INTO real_estate_units
        (development_id, codigo, descricao, matricula, tipo_unidade, area_m2, custo, valor_atribuido, situacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        developmentId,
        data.codigo, data.descricao, data.matricula ?? null,
        data.tipo_unidade ?? null, data.area_m2 ?? null,
        data.custo ?? null, data.valor_atribuido ?? null,
        data.situacao ?? 'disponivel',
      ],
      false,
    );
    return r.rows[0];
  }

  async createUnitsBatch(developmentId: string, units: Array<Record<string, unknown>>): Promise<RealEstateUnit[]> {
    const results: RealEstateUnit[] = [];
    for (const data of units) {
      results.push(await this.createUnit(developmentId, data));
    }
    return results;
  }

  async listUnits(developmentId: string): Promise<RealEstateUnit[]> {
    const r = await this.query<RealEstateUnit>(
      'SELECT * FROM real_estate_units WHERE development_id = $1 ORDER BY codigo ASC',
      [developmentId],
      false,
    );
    return r.rows;
  }

  async getUnit(id: string): Promise<RealEstateUnit | null> {
    const r = await this.query<RealEstateUnit>(
      'SELECT * FROM real_estate_units WHERE id = $1',
      [id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async updateUnit(id: string, fields: Record<string, unknown>): Promise<RealEstateUnit | null> {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getUnit(id);
    const r = await this.query<RealEstateUnit>(
      `UPDATE real_estate_units SET ${setSql}, updated_at = NOW()
       WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async deleteUnit(id: string): Promise<void> {
    await this.query('DELETE FROM real_estate_units WHERE id = $1', [id], false);
  }

  async unitCodigoExists(developmentId: string, codigo: string, excludeId?: string): Promise<boolean> {
    const sql = excludeId
      ? 'SELECT 1 FROM real_estate_units WHERE development_id = $1 AND codigo = $2 AND id != $3 LIMIT 1'
      : 'SELECT 1 FROM real_estate_units WHERE development_id = $1 AND codigo = $2 LIMIT 1';
    const params = excludeId ? [developmentId, codigo, excludeId] : [developmentId, codigo];
    const r = await this.query(sql, params, false);
    return r.rows.length > 0;
  }

  // ========================================================================
  // Integridade
  // ========================================================================

  async getIntegrity(developmentId: string): Promise<DevelopmentIntegrity> {
    const dev = await this.getDevelopment(developmentId);
    const areaTotal = dev?.area_total_m2 != null ? Number(dev.area_total_m2) : null;

    const r = await this.query<{ area_sum: string; valor_total: string; unit_count: string }>(
      `SELECT
         COALESCE(SUM(area_m2), 0) AS area_sum,
         COALESCE(SUM(valor_atribuido), 0) AS valor_total,
         COUNT(*)::int AS unit_count
       FROM real_estate_units WHERE development_id = $1`,
      [developmentId],
      false,
    );
    const row = r.rows[0];
    const areaSum = parseFloat(row.area_sum);
    const areaDiff = areaTotal != null ? Math.round((areaTotal - areaSum) * 100) / 100 : 0;

    return {
      area_total: areaTotal,
      area_sum: areaSum,
      area_diff: areaDiff,
      area_ok: areaTotal != null ? areaDiff === 0 : true,
      valor_total: parseFloat(row.valor_total),
      unit_count: parseInt(row.unit_count as string, 10),
    };
  }

  // ========================================================================
  // Contratos
  // ========================================================================

  async createContract(developmentId: string, data: Record<string, unknown>): Promise<RealEstateSaleContract> {
    const r = await this.query<RealEstateSaleContract>(
      `INSERT INTO real_estate_sale_contracts
        (development_id, numero, data_contrato, valor_venda, operacao,
         indice_atualizacao, taxa_juros, informacoes_complementares, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        developmentId, data.numero, data.data_contrato, data.valor_venda, data.operacao ?? '02',
        data.indice_atualizacao ?? null, data.taxa_juros ?? null,
        data.informacoes_complementares ?? null, data.status ?? 'rascunho',
      ],
      false,
    );
    return r.rows[0];
  }

  async listContracts(developmentId: string): Promise<RealEstateSaleContract[]> {
    const r = await this.query<RealEstateSaleContract>(
      `SELECT c.*,
         (SELECT string_agg(cl.name, ', ' ORDER BY p.participacao_pct DESC)
          FROM real_estate_sale_contract_parties p
          JOIN clients cl ON cl.id = p.client_id
          WHERE p.contract_id = c.id) AS party_names
       FROM real_estate_sale_contracts c
       WHERE c.development_id = $1
       ORDER BY c.data_contrato DESC, c.numero ASC`,
      [developmentId],
      false,
    );
    return r.rows;
  }

  async getContract(id: string): Promise<RealEstateSaleContract | null> {
    const r = await this.query<RealEstateSaleContract>(
      'SELECT * FROM real_estate_sale_contracts WHERE id = $1',
      [id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async updateContract(id: string, fields: Record<string, unknown>): Promise<RealEstateSaleContract | null> {
    const { setSql, params } = this.buildUpdate(fields);
    if (!setSql) return this.getContract(id);
    const r = await this.query<RealEstateSaleContract>(
      `UPDATE real_estate_sale_contracts SET ${setSql}, updated_at = NOW()
       WHERE id = $${params.length + 1} RETURNING *`,
      [...params, id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async deleteContract(id: string): Promise<void> {
    await this.query('DELETE FROM real_estate_sale_contracts WHERE id = $1', [id], false);
  }

  async contractNumeroExists(developmentId: string, numero: string, excludeId?: string): Promise<boolean> {
    const sql = excludeId
      ? 'SELECT 1 FROM real_estate_sale_contracts WHERE development_id = $1 AND numero = $2 AND id != $3 LIMIT 1'
      : 'SELECT 1 FROM real_estate_sale_contracts WHERE development_id = $1 AND numero = $2 LIMIT 1';
    const params = excludeId ? [developmentId, numero, excludeId] : [developmentId, numero];
    const r = await this.query(sql, params, false);
    return r.rows.length > 0;
  }

  async replaceParties(contractId: string, parties: Array<{ client_id: string; participacao_pct: number }>): Promise<void> {
    await this.query('DELETE FROM real_estate_sale_contract_parties WHERE contract_id = $1', [contractId], false);
    for (const p of parties) {
      await this.query(
        `INSERT INTO real_estate_sale_contract_parties (contract_id, client_id, participacao_pct)
         VALUES ($1,$2,$3)`,
        [contractId, p.client_id, p.participacao_pct],
        false,
      );
    }
  }

  async listParties(contractId: string): Promise<RealEstateSaleParty[]> {
    const r = await this.query<RealEstateSaleParty>(
      `SELECT p.*, cl.name AS client_name,
              COALESCE(cl.cpf, cl.cnpj) AS client_documento
       FROM real_estate_sale_contract_parties p
       JOIN clients cl ON cl.id = p.client_id
       WHERE p.contract_id = $1
       ORDER BY p.participacao_pct DESC, cl.name ASC`,
      [contractId],
      false,
    );
    return r.rows;
  }

  async replaceContractUnits(contractId: string, units: Array<{ unit_id: string; valor_atribuido_contrato: number }>): Promise<void> {
    await this.query('DELETE FROM real_estate_sale_contract_units WHERE contract_id = $1', [contractId], false);
    for (const u of units) {
      await this.query(
        `INSERT INTO real_estate_sale_contract_units (contract_id, unit_id, valor_atribuido_contrato)
         VALUES ($1,$2,$3)`,
        [contractId, u.unit_id, u.valor_atribuido_contrato],
        false,
      );
    }
  }

  async listContractUnits(contractId: string): Promise<RealEstateSaleContractUnit[]> {
    const r = await this.query<RealEstateSaleContractUnit>(
      `SELECT cu.*, un.codigo AS unit_codigo, un.descricao AS unit_descricao
       FROM real_estate_sale_contract_units cu
       JOIN real_estate_units un ON un.id = cu.unit_id
       WHERE cu.contract_id = $1
       ORDER BY un.codigo ASC`,
      [contractId],
      false,
    );
    return r.rows;
  }

  async unitInOtherActiveContract(unitId: string, excludeContractId?: string): Promise<boolean> {
    const sql = excludeContractId
      ? `SELECT 1 FROM real_estate_sale_contract_units cu
         JOIN real_estate_sale_contracts c ON c.id = cu.contract_id
         WHERE cu.unit_id = $1 AND c.status = 'ativo' AND c.id != $2 LIMIT 1`
      : `SELECT 1 FROM real_estate_sale_contract_units cu
         JOIN real_estate_sale_contracts c ON c.id = cu.contract_id
         WHERE cu.unit_id = $1 AND c.status = 'ativo' LIMIT 1`;
    const params = excludeContractId ? [unitId, excludeContractId] : [unitId];
    const r = await this.query(sql, params, false);
    return r.rows.length > 0;
  }

  async setUnitsSituacao(unitIds: string[], situacao: string): Promise<void> {
    if (unitIds.length === 0) return;
    await this.query(
      `UPDATE real_estate_units SET situacao = $1, updated_at = NOW()
       WHERE id = ANY($2::uuid[])`,
      [situacao, unitIds],
      false,
    );
  }

  async replaceInstallments(
    contractId: string,
    installments: Array<{ sequencia: number; vencimento: string; principal: number; fonte_pagadora?: string | null }>,
  ): Promise<void> {
    await this.query('DELETE FROM real_estate_sale_installments WHERE contract_id = $1', [contractId], false);
    for (const i of installments) {
      await this.query(
        `INSERT INTO real_estate_sale_installments
          (contract_id, sequencia, vencimento, principal, fonte_pagadora)
         VALUES ($1,$2,$3,$4,$5)`,
        [contractId, i.sequencia, i.vencimento, i.principal, i.fonte_pagadora ?? null],
        false,
      );
    }
  }

  async listInstallments(contractId: string): Promise<RealEstateSaleInstallment[]> {
    const r = await this.query<RealEstateSaleInstallment>(
      `SELECT i.*,
         COALESCE((SELECT SUM(principal) FROM real_estate_sale_receipts r WHERE r.installment_id = i.id), 0) AS recebido_principal
       FROM real_estate_sale_installments i
       WHERE i.contract_id = $1
       ORDER BY i.sequencia ASC`,
      [contractId],
      false,
    );
    return r.rows;
  }

  async getInstallment(id: string): Promise<RealEstateSaleInstallment | null> {
    const r = await this.query<RealEstateSaleInstallment>(
      'SELECT * FROM real_estate_sale_installments WHERE id = $1',
      [id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async updateInstallmentStatus(id: string, status: string): Promise<void> {
    await this.query(
      'UPDATE real_estate_sale_installments SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id],
      false,
    );
  }

  async createReceipt(installmentId: string, data: Record<string, unknown>): Promise<RealEstateSaleReceipt> {
    const r = await this.query<RealEstateSaleReceipt>(
      `INSERT INTO real_estate_sale_receipts
        (installment_id, data_pagamento, principal, correcao_monetaria, juros, multa, desconto, total_recebido, documento_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        installmentId, data.data_pagamento, data.principal,
        data.correcao_monetaria ?? 0, data.juros ?? 0, data.multa ?? 0, data.desconto ?? 0,
        data.total_recebido, data.documento_ref,
      ],
      false,
    );
    return r.rows[0];
  }

  async listReceiptsByContract(contractId: string): Promise<RealEstateSaleReceipt[]> {
    const r = await this.query<RealEstateSaleReceipt>(
      `SELECT r.* FROM real_estate_sale_receipts r
       JOIN real_estate_sale_installments i ON i.id = r.installment_id
       WHERE i.contract_id = $1
       ORDER BY r.data_pagamento ASC, r.created_at ASC`,
      [contractId],
      false,
    );
    return r.rows;
  }

  async getReceipt(id: string): Promise<RealEstateSaleReceipt | null> {
    const r = await this.query<RealEstateSaleReceipt>(
      'SELECT * FROM real_estate_sale_receipts WHERE id = $1',
      [id],
      false,
    );
    return r.rows[0] ?? null;
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.query('DELETE FROM real_estate_sale_receipts WHERE id = $1', [id], false);
  }

  async sumReceiptPrincipal(installmentId: string): Promise<number> {
    const r = await this.query<{ s: string }>(
      'SELECT COALESCE(SUM(principal), 0) AS s FROM real_estate_sale_receipts WHERE installment_id = $1',
      [installmentId],
      false,
    );
    return parseFloat(r.rows[0].s);
  }
}

import { BaseRepository } from '../../shared/repositories/base.repository';
import type {
  RealEstateDevelopment,
  RealEstateUnit,
  DevelopmentIntegrity,
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
}

import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Property, PropertyTransaction } from '@shared/core';
import type { AggregatedYear } from './calculations';

export interface CreatePropertyData {
  client_id: string;
  tipo_locacao: string;
  identificador: string;
  modo_entrada?: 'detalhado' | 'reduzido';
}

export interface UpdatePropertyData {
  client_id?: string;
  tipo_locacao?: string;
  identificador?: string;
  modo_entrada?: 'detalhado' | 'reduzido';
}

export interface CreateTransactionData {
  property_id: string;
  mes_referencia: string;
  tipo: string;
  categoria: string;
  valor: number;
  observacao?: string;
}

export interface PropertyWithClient extends Property {
  client_name?: string;
}

export class PropertyRepository extends BaseRepository {
  async findById(id: string): Promise<Property | null> {
    const result = await this.query<Property>(
      `SELECT id, client_id, tipo_locacao, identificador, COALESCE(modo_entrada, 'detalhado') as modo_entrada, created_at, updated_at
       FROM properties WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }

  async findByIdWithClient(id: string): Promise<PropertyWithClient | null> {
    const result = await this.query<PropertyWithClient>(
      `SELECT p.id, p.client_id, p.tipo_locacao, p.identificador, COALESCE(p.modo_entrada, 'detalhado') as modo_entrada, p.created_at, p.updated_at,
              c.name as client_name
       FROM properties p
       LEFT JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }

  async create(data: CreatePropertyData): Promise<Property> {
    const modo = data.modo_entrada ?? 'detalhado';
    const result = await this.query<Property>(
      `INSERT INTO properties (client_id, tipo_locacao, identificador, modo_entrada)
       VALUES ($1, $2, $3, $4)
       RETURNING id, client_id, tipo_locacao, identificador, modo_entrada, created_at, updated_at`,
      [data.client_id, data.tipo_locacao, data.identificador, modo],
      false
    );
    return result.rows[0];
  }

  async update(id: string, data: UpdatePropertyData): Promise<Property> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.client_id !== undefined) {
      updates.push(`client_id = $${idx++}`);
      params.push(data.client_id);
    }
    if (data.tipo_locacao !== undefined) {
      updates.push(`tipo_locacao = $${idx++}`);
      params.push(data.tipo_locacao);
    }
    if (data.identificador !== undefined) {
      updates.push(`identificador = $${idx++}`);
      params.push(data.identificador);
    }
    if (data.modo_entrada !== undefined) {
      updates.push(`modo_entrada = $${idx++}`);
      params.push(data.modo_entrada);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Property not found');
      return existing;
    }

    params.push(id);
    const result = await this.query<Property>(
      `UPDATE properties SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} 
       RETURNING id, client_id, tipo_locacao, identificador, COALESCE(modo_entrada, 'detalhado') as modo_entrada, created_at, updated_at`,
      params,
      false
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM properties WHERE id = $1', [id], false);
  }

  async findByClientAndIdentificador(
    clientId: string,
    identificador: string
  ): Promise<Property | null> {
    const result = await this.query<Property>(
      `SELECT id, client_id, tipo_locacao, identificador, COALESCE(modo_entrada, 'detalhado') as modo_entrada, created_at, updated_at
       FROM properties
       WHERE client_id = $1 AND TRIM(LOWER(identificador)) = TRIM(LOWER($2))
       LIMIT 1`,
      [clientId, identificador],
      false
    );
    return result.rows[0] || null;
  }

  async list(options: {
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ properties: PropertyWithClient[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options.client_id) {
      conditions.push(`p.client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM properties p ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const listResult = await this.query<PropertyWithClient>(
      `SELECT p.id, p.client_id, p.tipo_locacao, p.identificador, COALESCE(p.modo_entrada, 'detalhado') as modo_entrada, p.created_at, p.updated_at,
              c.name as client_name
       FROM properties p
       LEFT JOIN clients c ON c.id = p.client_id
       ${whereClause}
       ORDER BY p.identificador ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
      false
    );

    return { properties: listResult.rows, total };
  }

  // --- Transactions ---

  async createTransaction(data: CreateTransactionData): Promise<PropertyTransaction> {
    const result = await this.query<PropertyTransaction>(
      `INSERT INTO property_transactions (property_id, mes_referencia, tipo, categoria, valor, observacao)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, property_id, mes_referencia, tipo, categoria, valor, observacao, created_at, updated_at`,
      [
        data.property_id,
        data.mes_referencia,
        data.tipo,
        data.categoria,
        data.valor,
        data.observacao ?? null,
      ],
      false
    );
    return result.rows[0];
  }

  async createTransactionsBatch(
    propertyId: string,
    transactions: Array<{ mes_referencia: string; tipo: string; categoria: string; valor: number; observacao?: string }>
  ): Promise<PropertyTransaction[]> {
    const results: PropertyTransaction[] = [];
    for (const t of transactions) {
      const created = await this.createTransaction({
        property_id: propertyId,
        ...t,
      });
      results.push(created);
    }
    return results;
  }

  async getTransactionById(txId: string): Promise<PropertyTransaction | null> {
    const result = await this.query<PropertyTransaction>(
      `SELECT id, property_id, mes_referencia, tipo, categoria, valor, observacao, created_at, updated_at
       FROM property_transactions WHERE id = $1`,
      [txId],
      false
    );
    return result.rows[0] || null;
  }

  async deleteTransaction(txId: string): Promise<void> {
    await this.query(
      'DELETE FROM property_transactions WHERE id = $1',
      [txId],
      false
    );
  }

  async listTransactions(
    propertyId: string,
    options?: { ano?: number; mes?: string }
  ): Promise<PropertyTransaction[]> {
    const params: unknown[] = [propertyId];
    const conditions: string[] = ['property_id = $1'];

    if (options?.ano) {
      conditions.push(`mes_referencia LIKE $${params.length + 1}`);
      params.push(`${options.ano}-%`);
    }
    if (options?.mes) {
      conditions.push(`mes_referencia = $${params.length + 1}`);
      params.push(options.mes);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const result = await this.query<PropertyTransaction>(
      `SELECT id, property_id, mes_referencia, tipo, categoria, valor, observacao, created_at, updated_at
       FROM property_transactions ${whereClause}
       ORDER BY mes_referencia ASC`,
      params,
      false
    );
    return result.rows;
  }

  // --- Modo Reduzido: Totais Mensais ---

  async upsertMonthlyTotals(
    propertyId: string,
    _ano: number,
    meses: Array<{
      mes_referencia: string;
      receita_longa: number;
      receita_short: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }>
  ): Promise<void> {
    for (const m of meses) {
      await this.query(
        `INSERT INTO property_monthly_totals (property_id, mes_referencia, receita_longa, receita_short, despesas_dedutiveis, custos_operacionais)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (property_id, mes_referencia)
         DO UPDATE SET receita_longa = $3, receita_short = $4, despesas_dedutiveis = $5, custos_operacionais = $6, updated_at = NOW()`,
        [
          propertyId,
          m.mes_referencia,
          m.receita_longa,
          m.receita_short,
          m.despesas_dedutiveis,
          m.custos_operacionais,
        ],
        false
      );
    }
  }

  async getMonthlyTotals(
    propertyId: string,
    ano: number
  ): Promise<
    Array<{
      mes_referencia: string;
      receita_longa: number;
      receita_short: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }>
  > {
    const result = await this.query<{
      mes_referencia: string;
      receita_longa: string;
      receita_short: string;
      despesas_dedutiveis: string;
      custos_operacionais: string;
    }>(
      `SELECT mes_referencia, receita_longa, receita_short, despesas_dedutiveis, custos_operacionais
       FROM property_monthly_totals
       WHERE property_id = $1 AND mes_referencia LIKE $2
       ORDER BY mes_referencia`,
      [propertyId, `${ano}-%`],
      false
    );
    return result.rows.map((r) => ({
      mes_referencia: r.mes_referencia,
      receita_longa: parseFloat(r.receita_longa) || 0,
      receita_short: parseFloat(r.receita_short) || 0,
      despesas_dedutiveis: parseFloat(r.despesas_dedutiveis) || 0,
      custos_operacionais: parseFloat(r.custos_operacionais) || 0,
    }));
  }

  /**
   * Agrega transações ou totais mensais por propriedade e ano para os cálculos tributários.
   * Retorna receita, despesas_dedutiveis e custos_operacionais por mês (Jan-Dec).
   */
  async aggregateByPropertiesYear(
    propertyIds: string[],
    ano: number
  ): Promise<
    Map<
      string,
      {
        property_id: string;
        identificador: string;
        aggregated: AggregatedYear;
      }
    >
  > {
    const map = new Map<
      string,
      {
        property_id: string;
        identificador: string;
        aggregated: AggregatedYear;
      }
    >();

    if (propertyIds.length === 0) return map;

    const props = await Promise.all(
      propertyIds.map((id) => this.findByIdWithClient(id))
    );

    for (let i = 0; i < propertyIds.length; i++) {
      const prop = props[i];
      const pid = propertyIds[i]!;
      if (!prop) continue;

      const modoEntrada = prop.modo_entrada ?? 'detalhado';

      if (modoEntrada === 'reduzido') {
        const totals = await this.getMonthlyTotals(pid, ano);
        const mesesData: Record<string, { receita: number; despesas_dedutiveis: number; custos_operacionais: number }> = {};
        for (let m = 1; m <= 12; m++) {
          const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
          mesesData[mesStr] = {
            receita: 0,
            despesas_dedutiveis: 0,
            custos_operacionais: 0,
          };
        }
        for (const t of totals) {
          const d = mesesData[t.mes_referencia];
          if (d) {
            d.receita = t.receita_longa + t.receita_short;
            d.despesas_dedutiveis = t.despesas_dedutiveis;
            d.custos_operacionais = t.custos_operacionais;
          }
        }
        const meses: AggregatedYear['meses'] = [];
        for (let m = 1; m <= 12; m++) {
          const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
          const d = mesesData[mesStr]!;
          meses.push({
            mes: mesStr,
            receita: d.receita,
            despesas_dedutiveis: d.despesas_dedutiveis,
            custos_operacionais: d.custos_operacionais,
          });
        }
        const receita_total = meses.reduce((s, x) => s + x.receita, 0);
        const despesas_dedutiveis_total = meses.reduce((s, x) => s + x.despesas_dedutiveis, 0);
        const custos_operacionais_total = meses.reduce((s, x) => s + x.custos_operacionais, 0);
        map.set(pid, {
          property_id: pid,
          identificador: prop.identificador,
          aggregated: {
            ano,
            receita_total,
            despesas_dedutiveis_total,
            custos_operacionais_total,
            meses,
          },
        });
        continue;
      }

      const result = await this.query<{
        property_id: string;
        identificador: string;
        mes_referencia: string;
        tipo: string;
        total_valor: number;
      }>(
        `SELECT p.id as property_id, p.identificador,
                pt.mes_referencia, pt.tipo,
                SUM(pt.valor) as total_valor
         FROM properties p
         JOIN property_transactions pt ON pt.property_id = p.id
         WHERE p.id = $1 AND pt.mes_referencia LIKE $2
         GROUP BY p.id, p.identificador, pt.mes_referencia, pt.tipo`,
        [pid, `${ano}-%`],
        false
      );

      const rows = result.rows;
      const identificador = prop.identificador;

      const mesesData: Record<string, { receita: number; despesas_dedutiveis: number; custos_operacionais: number }> = {};
      for (let m = 1; m <= 12; m++) {
        const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
        mesesData[mesStr] = {
          receita: 0,
          despesas_dedutiveis: 0,
          custos_operacionais: 0,
        };
      }

      for (const row of rows) {
        const mes = row.mes_referencia;
        if (!mesesData[mes]) {
          mesesData[mes] = {
            receita: 0,
            despesas_dedutiveis: 0,
            custos_operacionais: 0,
          };
        }
        const val = Number(row.total_valor);
        if (row.tipo === 'receita') mesesData[mes].receita += val;
        else if (row.tipo === 'despesa_dedutivel')
          mesesData[mes].despesas_dedutiveis += val;
        else if (row.tipo === 'custo_operacional')
          mesesData[mes].custos_operacionais += val;
      }

      const meses: AggregatedYear['meses'] = [];
      for (let m = 1; m <= 12; m++) {
        const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
        const d = mesesData[mesStr] ?? {
          receita: 0,
          despesas_dedutiveis: 0,
          custos_operacionais: 0,
        };
        meses.push({
          mes: mesStr,
          receita: d.receita,
          despesas_dedutiveis: d.despesas_dedutiveis,
          custos_operacionais: d.custos_operacionais,
        });
      }

      const receita_total = meses.reduce((s, x) => s + x.receita, 0);
      const despesas_dedutiveis_total = meses.reduce(
        (s, x) => s + x.despesas_dedutiveis,
        0
      );
      const custos_operacionais_total = meses.reduce(
        (s, x) => s + x.custos_operacionais,
        0
      );

      map.set(pid, {
        property_id: pid,
        identificador,
        aggregated: {
          ano,
          receita_total,
          despesas_dedutiveis_total,
          custos_operacionais_total,
          meses,
        },
      });
    }

    return map;
  }
}

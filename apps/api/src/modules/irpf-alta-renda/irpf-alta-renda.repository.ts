import { BaseRepository } from '../../shared/repositories/base.repository';
import type { RendimentoIsentoDividendo } from '@shared/core';

export interface IrpfAltaRendaRecord {
  id: string;
  client_id: string | null;
  ano: number;
  contribuinte_nome: string;
  contribuinte_cpf: string;
  rendimentos_tributaveis: number;
  dados_dividendos: RendimentoIsentoDividendo[];
  base_calculo_combinada: number;
  resultado_simulacao: Record<string, unknown>;
  title: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIrpfAltaRendaData {
  client_id: string | null;
  ano: number;
  contribuinte_nome: string;
  contribuinte_cpf: string;
  rendimentos_tributaveis: number;
  dados_dividendos: RendimentoIsentoDividendo[];
  base_calculo_combinada: number;
  resultado_simulacao: Record<string, unknown>;
  title?: string | null;
  created_by?: string | null;
}

export class IrpfAltaRendaRepository extends BaseRepository {
  async findById(id: string): Promise<IrpfAltaRendaRecord | null> {
    const result = await this.query<IrpfAltaRendaRecord>(
      `SELECT id, client_id, ano, contribuinte_nome, contribuinte_cpf,
              rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
              resultado_simulacao, title, created_by, created_at, updated_at
       FROM irpf_alta_renda WHERE id = $1`,
      [id],
      false
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async create(data: CreateIrpfAltaRendaData): Promise<IrpfAltaRendaRecord> {
    const result = await this.query<IrpfAltaRendaRecord>(
      `INSERT INTO irpf_alta_renda (
         client_id, ano, contribuinte_nome, contribuinte_cpf,
         rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
         resultado_simulacao, title, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, client_id, ano, contribuinte_nome, contribuinte_cpf,
                 rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
                 resultado_simulacao, title, created_by, created_at, updated_at`,
      [
        data.client_id,
        data.ano,
        data.contribuinte_nome,
        data.contribuinte_cpf,
        data.rendimentos_tributaveis,
        JSON.stringify(data.dados_dividendos),
        data.base_calculo_combinada,
        JSON.stringify(data.resultado_simulacao),
        data.title ?? null,
        data.created_by ?? null,
      ],
      false
    );
    return this.mapRow(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM irpf_alta_renda WHERE id = $1', [id], false);
  }

  async list(options: {
    client_id?: string;
    ano?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: IrpfAltaRendaRecord[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options.client_id) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.ano != null) {
      conditions.push(`ano = $${params.length + 1}`);
      params.push(options.ano);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM irpf_alta_renda ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const listResult = await this.query<IrpfAltaRendaRecord>(
      `SELECT id, client_id, ano, contribuinte_nome, contribuinte_cpf,
              rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
              resultado_simulacao, title, created_by, created_at, updated_at
       FROM irpf_alta_renda ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );

    return {
      items: listResult.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  private mapRow(row: IrpfAltaRendaRecord): IrpfAltaRendaRecord {
    return {
      ...row,
      rendimentos_tributaveis: Number(row.rendimentos_tributaveis),
      base_calculo_combinada: Number(row.base_calculo_combinada),
      dados_dividendos: Array.isArray(row.dados_dividendos) ? row.dados_dividendos : [],
    };
  }
}

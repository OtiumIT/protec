import { BaseRepository } from '../../shared/repositories/base.repository';
import type { ComparativoRegimesSimulation } from '@shared/core';

export interface CreateComparativoSimulationData {
  client_id: string | null;
  ano: number;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title?: string | null;
  created_by?: string | null;
}

export class ComparativoRegimesRepository extends BaseRepository {
  async findById(id: string): Promise<ComparativoRegimesSimulation | null> {
    const result = await this.query<ComparativoRegimesSimulation>(
      `SELECT id, client_id, ano, title, input_data, result_data, created_by, created_at, updated_at
       FROM comparativo_regimes_simulations WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }

  async create(data: CreateComparativoSimulationData): Promise<ComparativoRegimesSimulation> {
    const result = await this.query<ComparativoRegimesSimulation>(
      `INSERT INTO comparativo_regimes_simulations (client_id, ano, input_data, result_data, title, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, client_id, ano, title, input_data, result_data, created_by, created_at, updated_at`,
      [
        data.client_id,
        data.ano,
        JSON.stringify(data.input_data),
        JSON.stringify(data.result_data),
        data.title ?? null,
        data.created_by ?? null,
      ],
      false
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.query(
      'DELETE FROM comparativo_regimes_simulations WHERE id = $1',
      [id],
      false
    );
  }

  async list(options: {
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ simulations: ComparativoRegimesSimulation[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options.client_id) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM comparativo_regimes_simulations ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const listResult = await this.query<ComparativoRegimesSimulation>(
      `SELECT id, client_id, ano, title, input_data, result_data, created_by, created_at, updated_at
       FROM comparativo_regimes_simulations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );

    return { simulations: listResult.rows, total };
  }
}

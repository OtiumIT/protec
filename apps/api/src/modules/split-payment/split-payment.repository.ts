import { BaseRepository } from '../../shared/repositories/base.repository';
import type { SplitPaymentSimulation } from '@shared/core';

export interface CreateSplitPaymentSimulationRow {
  client_id: string;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title?: string | null;
  created_by?: string | null;
}

function normalizeRow(row: SplitPaymentSimulation): SplitPaymentSimulation {
  return {
    ...row,
    input_data:
      typeof row.input_data === 'string' ? JSON.parse(row.input_data as string) : row.input_data,
    result_data:
      typeof row.result_data === 'string' ? JSON.parse(row.result_data as string) : row.result_data,
  };
}

export class SplitPaymentRepository extends BaseRepository {
  async findById(id: string): Promise<SplitPaymentSimulation | null> {
    const result = await this.query<SplitPaymentSimulation>(
      `SELECT id, client_id, input_data, result_data, title, created_by, created_at
       FROM split_payment_simulations WHERE id = $1`,
      [id],
      false
    );
    const row = result.rows[0];
    return row ? normalizeRow(row) : null;
  }

  async create(data: CreateSplitPaymentSimulationRow): Promise<SplitPaymentSimulation> {
    const result = await this.query<SplitPaymentSimulation>(
      `INSERT INTO split_payment_simulations (client_id, input_data, result_data, title, created_by)
       VALUES ($1, $2::jsonb, $3::jsonb, $4, $5)
       RETURNING id, client_id, input_data, result_data, title, created_by, created_at`,
      [
        data.client_id,
        JSON.stringify(data.input_data),
        JSON.stringify(data.result_data),
        data.title ?? null,
        data.created_by ?? null,
      ],
      false
    );
    return normalizeRow(result.rows[0]!);
  }

  async delete(id: string): Promise<void> {
    await this.query('DELETE FROM split_payment_simulations WHERE id = $1', [id], false);
  }

  async list(options: {
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ simulations: SplitPaymentSimulation[]; total: number }> {
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
      `SELECT COUNT(*) as count FROM split_payment_simulations ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const listResult = await this.query<SplitPaymentSimulation>(
      `SELECT id, client_id, input_data, result_data, title, created_by, created_at
       FROM split_payment_simulations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );

    return {
      simulations: listResult.rows.map((r) => normalizeRow(r)),
      total,
    };
  }
}

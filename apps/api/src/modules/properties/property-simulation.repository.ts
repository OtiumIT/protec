import { BaseRepository } from '../../shared/repositories/base.repository';
import type { PropertySimulation } from '@shared/core';

export interface CreatePropertySimulationData {
  client_id: string | null;
  ano: number;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title?: string | null;
  created_by?: string | null;
}

export interface UpdatePropertySimulationData {
  client_id?: string | null;
  ano: number;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title?: string | null;
}

export class PropertySimulationRepository extends BaseRepository {
  async findById(id: string): Promise<PropertySimulation | null> {
    const result = await this.query<PropertySimulation>(
      `SELECT id, client_id, ano, input_data, result_data, title, created_by, created_at, updated_at
       FROM property_simulations WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }

  async create(data: CreatePropertySimulationData): Promise<PropertySimulation> {
    const result = await this.query<PropertySimulation>(
      `INSERT INTO property_simulations (client_id, ano, input_data, result_data, title, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, client_id, ano, input_data, result_data, title, created_by, created_at, updated_at`,
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

  async update(id: string, data: UpdatePropertySimulationData): Promise<PropertySimulation> {
    const result = await this.query<PropertySimulation>(
      `UPDATE property_simulations
       SET client_id = COALESCE($2, client_id), ano = $3, input_data = $4, result_data = $5, title = COALESCE($6, title), updated_at = NOW()
       WHERE id = $1
       RETURNING id, client_id, ano, input_data, result_data, title, created_by, created_at, updated_at`,
      [
        id,
        data.client_id ?? null,
        data.ano,
        JSON.stringify(data.input_data),
        JSON.stringify(data.result_data),
        data.title ?? null,
      ],
      false
    );
    if (result.rows.length === 0) {
      throw new Error('Simulation not found');
    }
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.query(
      'DELETE FROM property_simulations WHERE id = $1',
      [id],
      false
    );
  }

  async list(options: {
    client_id?: string;
    ano?: number;
    page?: number;
    limit?: number;
  }): Promise<{ simulations: PropertySimulation[]; total: number }> {
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
      `SELECT COUNT(*) as count FROM property_simulations ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const listResult = await this.query<PropertySimulation>(
      `SELECT id, client_id, ano, input_data, result_data, title, created_by, created_at, updated_at
       FROM property_simulations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );

    return { simulations: listResult.rows, total };
  }
}

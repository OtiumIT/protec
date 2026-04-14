import { BaseRepository } from '../../shared/repositories/base.repository';
import type { PropertySimulation, SimulationKind } from '@shared/core';
import { SIMULATION_KIND_LOCACAO_PF_PJ } from '@shared/core';

export interface CreatePropertySimulationData {
  client_id: string | null;
  ano: number;
  simulation_kind?: SimulationKind;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title?: string | null;
  created_by?: string | null;
}

export interface UpdatePropertySimulationData {
  client_id?: string | null;
  ano: number;
  simulation_kind?: SimulationKind;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title?: string | null;
}

export class PropertySimulationRepository extends BaseRepository {
  async findById(id: string): Promise<PropertySimulation | null> {
    const result = await this.query<PropertySimulation>(
      `SELECT id, client_id, ano, simulation_kind, input_data, result_data, title, created_by, created_at, updated_at
       FROM property_simulations WHERE id = $1`,
      [id],
      false
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.normalizeRow(row);
  }

  private normalizeRow(row: PropertySimulation): PropertySimulation {
    return {
      ...row,
      simulation_kind: row.simulation_kind ?? SIMULATION_KIND_LOCACAO_PF_PJ,
    };
  }

  async create(data: CreatePropertySimulationData): Promise<PropertySimulation> {
    const kind = data.simulation_kind ?? SIMULATION_KIND_LOCACAO_PF_PJ;
    const result = await this.query<PropertySimulation>(
      `INSERT INTO property_simulations (client_id, ano, simulation_kind, input_data, result_data, title, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, client_id, ano, simulation_kind, input_data, result_data, title, created_by, created_at, updated_at`,
      [
        data.client_id,
        data.ano,
        kind,
        JSON.stringify(data.input_data),
        JSON.stringify(data.result_data),
        data.title ?? null,
        data.created_by ?? null,
      ],
      false
    );
    return this.normalizeRow(result.rows[0]);
  }

  async update(id: string, data: UpdatePropertySimulationData): Promise<PropertySimulation> {
    const result = await this.query<PropertySimulation>(
      `UPDATE property_simulations
       SET client_id = COALESCE($2, client_id),
           ano = $3,
           simulation_kind = COALESCE($4, simulation_kind),
           input_data = $5,
           result_data = $6,
           title = COALESCE($7, title),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, client_id, ano, simulation_kind, input_data, result_data, title, created_by, created_at, updated_at`,
      [
        id,
        data.client_id ?? null,
        data.ano,
        data.simulation_kind ?? null,
        JSON.stringify(data.input_data),
        JSON.stringify(data.result_data),
        data.title ?? null,
      ],
      false
    );
    if (result.rows.length === 0) {
      throw new Error('Simulation not found');
    }
    return this.normalizeRow(result.rows[0]);
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
    simulation_kind?: SimulationKind;
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
    if (options.simulation_kind) {
      conditions.push(`simulation_kind = $${params.length + 1}`);
      params.push(options.simulation_kind);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM property_simulations ${whereClause}`,
      params,
      false
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const listResult = await this.query<PropertySimulation>(
      `SELECT id, client_id, ano, simulation_kind, input_data, result_data, title, created_by, created_at, updated_at
       FROM property_simulations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
      false
    );

    return {
      simulations: listResult.rows.map((r) => this.normalizeRow(r)),
      total,
    };
  }
}

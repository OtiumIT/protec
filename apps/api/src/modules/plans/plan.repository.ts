import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Plan } from '@shared/core';

export interface CreatePlanData {
  name: string;
  maxUsers: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isCustom?: boolean;
  isManaged?: boolean;
}

export interface UpdatePlanData {
  name?: string;
  maxUsers?: number;
  price?: number;
  billingCycle?: 'monthly' | 'yearly';
  features?: string[];
  isCustom?: boolean;
  isManaged?: boolean;
  status?: 'active' | 'inactive';
}

export class PlanRepository extends BaseRepository {
  /**
   * Buscar plano por ID
   * Nota: Planos não requerem filtro de company_id (são globais)
   */
  async findById(id: string): Promise<Plan | null> {
    const result = await this.query<any>(
      'SELECT id, name, max_users, price, billing_cycle, features, is_custom, is_managed, created_at, updated_at FROM plans WHERE id = $1',
      [id],
      false // Planos não requerem filtro de tenant
    );
    if (result.rows.length === 0) return null;
    const plan = result.rows[0];
    // Converter features de JSONB para array
    plan.features = Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []);
    return plan as Plan;
  }

  /**
   * Listar todos os planos
   * Usa DISTINCT ON para evitar duplicatas por nome (mantém o mais antigo)
   */
  async findAll(): Promise<Plan[]> {
    const result = await this.query<any>(
      `SELECT DISTINCT ON (name) 
        id, name, max_users, price, billing_cycle, features, is_custom, is_managed, created_at, updated_at 
       FROM plans 
       ORDER BY name, created_at ASC`,
      [],
      false // Planos não requerem filtro de tenant
    );
    // Converter features de JSONB para array
    return result.rows.map((plan: any) => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []),
    })) as Plan[];
  }

  /**
   * Criar plano
   */
  async create(data: CreatePlanData): Promise<Plan> {
    // Converter array de features para objeto JSONB
    const featuresObj = data.features.reduce((acc, feature, index) => {
      acc[index] = feature;
      return acc;
    }, {} as Record<number, string>);

    const result = await this.query<any>(
      `INSERT INTO plans (name, max_users, price, billing_cycle, features, is_custom, is_managed) 
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) 
       RETURNING id, name, max_users, price, billing_cycle, features, is_custom, is_managed, created_at, updated_at`,
      [
        data.name, 
        data.maxUsers, 
        data.price, 
        data.billingCycle, 
        JSON.stringify(featuresObj),
        (data as any).isCustom || false,
        (data as any).isManaged || false,
      ],
      false
    );
    const plan = result.rows[0];
    plan.features = data.features; // Retornar como array
    return plan as Plan;
  }

  /**
   * Atualizar plano
   */
  async update(id: string, data: UpdatePlanData): Promise<Plan> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.maxUsers !== undefined) {
      updates.push(`max_users = $${paramIndex++}`);
      params.push(data.maxUsers);
    }
    if (data.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      params.push(data.price);
    }
    if (data.billingCycle !== undefined) {
      updates.push(`billing_cycle = $${paramIndex++}`);
      params.push(data.billingCycle);
    }
    if (data.features !== undefined) {
      // Converter array de features para objeto JSONB
      const featuresObj = data.features.reduce((acc, feature, index) => {
        acc[index] = feature;
        return acc;
      }, {} as Record<number, string>);
      updates.push(`features = $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(featuresObj));
    }
    if (data.isCustom !== undefined) {
      updates.push(`is_custom = $${paramIndex++}`);
      params.push(data.isCustom);
    }
    if (data.isManaged !== undefined) {
      updates.push(`is_managed = $${paramIndex++}`);
      params.push(data.isManaged);
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<Plan>;
    }

    params.push(id);
    const result = await this.query<any>(
      `UPDATE plans 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, max_users, price, billing_cycle, features, is_custom, is_managed, created_at, updated_at`,
      params,
      false
    );
    const plan = result.rows[0];
    // Converter features de JSONB para array
    plan.features = Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []);
    return plan as Plan;
  }

  /**
   * Deletar plano
   */
  async delete(id: string): Promise<void> {
    await this.query(
      'DELETE FROM plans WHERE id = $1',
      [id],
      false
    );
  }
}

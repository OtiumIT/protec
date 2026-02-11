import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Plan } from '@shared/core';

export class PlanRepository extends BaseRepository {
  async findById(id: string): Promise<Plan | null> {
    const result = await this.query<Plan>(
      'SELECT id, name, max_users, price, billing_cycle, features, created_at, updated_at FROM plans WHERE id = $1',
      [id],
      false
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<Plan[]> {
    const result = await this.query<Plan>(
      'SELECT id, name, max_users, price, billing_cycle, features, created_at, updated_at FROM plans ORDER BY price',
      [],
      false
    );
    return result.rows;
  }
}

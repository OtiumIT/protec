import { query } from '../../db/client';
import type { AccessListEntry } from '@shared/core';

export interface AccessListFilters {
  status?: 'pending' | 'active' | 'inactive';
  search?: string;
  page?: number;
  limit?: number;
}

export class AccessListRepository {
  async create(data: {
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    company_name?: string;
  }): Promise<AccessListEntry> {
    const result = await query<AccessListEntry>(
      `INSERT INTO access_list (name, email, phone, cpf, company_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.email, data.phone || null, data.cpf || null, data.company_name || null]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<AccessListEntry | null> {
    const result = await query<AccessListEntry>(
      'SELECT * FROM access_list WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<AccessListEntry | null> {
    const result = await query<AccessListEntry>(
      'SELECT * FROM access_list WHERE lower(trim(email)) = lower(trim($1))',
      [email]
    );
    return result.rows[0] || null;
  }

  async findAll(filters: AccessListFilters = {}): Promise<{ entries: AccessListEntry[]; total: number }> {
    const { status, search, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(lower(name) LIKE $${paramIdx} OR lower(email) LIKE $${paramIdx})`);
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM access_list ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<AccessListEntry>(
      `SELECT id, name, email, phone, cpf, company_name, user_id, tenant_id, status,
              activated_at, deactivated_at, created_at, updated_at
       FROM access_list ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return { entries: result.rows, total };
  }

  async getStats(): Promise<{ total: number; pending: number; active: number; inactive: number }> {
    const result = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM access_list GROUP BY status`
    );

    const stats = { total: 0, pending: 0, active: 0, inactive: 0 };
    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      stats.total += count;
      if (row.status === 'pending') stats.pending = count;
      else if (row.status === 'active') stats.active = count;
      else if (row.status === 'inactive') stats.inactive = count;
    }
    return stats;
  }

  async activate(id: string, userId: string, tenantId: string, tempPasswordEnc: string): Promise<void> {
    await query(
      `UPDATE access_list
       SET status = 'active', user_id = $2, tenant_id = $3, temp_password_enc = $4,
           activated_at = NOW(), deactivated_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id, userId, tenantId, tempPasswordEnc]
    );
  }

  async deactivate(id: string): Promise<void> {
    await query(
      `UPDATE access_list
       SET status = 'inactive', deactivated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async reactivate(id: string): Promise<void> {
    await query(
      `UPDATE access_list
       SET status = 'active', deactivated_at = NULL, activated_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async updateTempPassword(id: string, tempPasswordEnc: string): Promise<void> {
    await query(
      `UPDATE access_list SET temp_password_enc = $2, updated_at = NOW() WHERE id = $1`,
      [id, tempPasswordEnc]
    );
  }

  async clearTempPasswordByUserId(userId: string): Promise<void> {
    await query(
      `UPDATE access_list SET temp_password_enc = NULL, updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }

  async deletePending(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM access_list WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getTempPasswordEnc(id: string): Promise<string | null> {
    const result = await query<{ temp_password_enc: string | null }>(
      'SELECT temp_password_enc FROM access_list WHERE id = $1',
      [id]
    );
    return result.rows[0]?.temp_password_enc || null;
  }
}

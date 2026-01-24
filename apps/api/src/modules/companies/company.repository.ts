import { BaseRepository } from '../../shared/repositories/base.repository';
import { query } from '../../db/client';
import type { Company } from '@shared/core';

export interface CreateCompanyData {
  name: string;
  domain?: string;
}

export interface UpdateCompanyData {
  name?: string;
  domain?: string;
}

export class CompanyRepository extends BaseRepository {
  /**
   * Buscar empresa por ID
   * Nota: Companies não requerem filtro de company_id (são o próprio tenant)
   */
  async findById(id: string): Promise<Company | null> {
    const result = await query<Company>(
      'SELECT id, name, domain, created_at, updated_at FROM companies WHERE id = $1',
      [id],
      false // Companies não requerem filtro de tenant
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar empresa por domain
   */
  async findByDomain(domain: string): Promise<Company | null> {
    const result = await query<Company>(
      'SELECT id, name, domain, created_at, updated_at FROM companies WHERE domain = $1',
      [domain],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Criar empresa
   */
  async create(data: CreateCompanyData): Promise<Company> {
    const result = await query<Company>(
      `INSERT INTO companies (name, domain) 
       VALUES ($1, $2) 
       RETURNING id, name, domain, created_at, updated_at`,
      [data.name, data.domain || null],
      false
    );
    return result.rows[0];
  }

  /**
   * Atualizar empresa
   */
  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.domain !== undefined) {
      updates.push(`domain = $${paramIndex++}`);
      params.push(data.domain);
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<Company>;
    }

    params.push(id);
    const result = await query<Company>(
      `UPDATE companies 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, domain, created_at, updated_at`,
      params,
      false
    );
    return result.rows[0];
  }
}

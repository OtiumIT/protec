import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Client } from '@shared/core';

export interface CreateClientData {
  name: string;
  cnpj: string;
  email?: string;
}

export interface UpdateClientData {
  name?: string;
  cnpj?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

export class ClientRepository extends BaseRepository {
  /**
   * Buscar cliente por ID e company_id
   */
  async findById(id: string, companyId: string): Promise<Client | null> {
    const result = await this.query<Client>(
      'SELECT id, name, cnpj, email, company_id, status, created_at, updated_at FROM clients WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar cliente por CNPJ e company_id
   */
  async findByCnpj(cnpj: string, companyId: string): Promise<Client | null> {
    const result = await this.query<Client>(
      'SELECT id, name, cnpj, email, company_id, status, created_at, updated_at FROM clients WHERE cnpj = $1 AND company_id = $2',
      [cnpj, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Criar cliente
   */
  async create(companyId: string, data: CreateClientData): Promise<Client> {
    const result = await this.query<Client>(
      `INSERT INTO clients (name, cnpj, email, company_id, status) 
       VALUES ($1, $2, $3, $4, 'active') 
       RETURNING id, name, cnpj, email, company_id, status, created_at, updated_at`,
      [data.name, data.cnpj, data.email || null, companyId]
    );
    return result.rows[0];
  }

  /**
   * Atualizar cliente
   */
  async update(id: string, companyId: string, data: UpdateClientData): Promise<Client> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.cnpj !== undefined) {
      updates.push(`cnpj = $${paramIndex++}`);
      params.push(data.cnpj);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id, companyId) as Promise<Client>;
    }

    params.push(id, companyId);
    const result = await this.query<Client>(
      `UPDATE clients 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++} 
       RETURNING id, name, cnpj, email, company_id, status, created_at, updated_at`,
      params
    );
    return result.rows[0];
  }

  /**
   * Deletar cliente
   */
  async delete(id: string, companyId: string): Promise<void> {
    await this.query(
      'DELETE FROM clients WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
  }

  /**
   * Listar clientes por empresa (com paginação)
   */
  async findByCompany(
    companyId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ clients: Client[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [companyId];
    let whereClause = 'company_id = $1';

    if (options.status) {
      whereClause += ' AND status = $2';
      params.push(options.status);
    }

    // Buscar total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM clients WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Buscar clientes
    const clientsResult = await this.query<Client>(
      `SELECT id, name, cnpj, email, company_id, status, created_at, updated_at 
       FROM clients 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      clients: clientsResult.rows,
      total,
    };
  }
}

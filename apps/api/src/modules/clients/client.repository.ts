import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Client } from '@shared/core';

export interface CreateClientData {
  name: string;
  person_type?: 'pf' | 'pj';
  cnpj?: string;
  cpf?: string;
  email?: string;
  tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
  cnae?: string;
  state_registration?: string;
  municipal_registration?: string;
  notes?: string;
}

export interface UpdateClientData {
  name?: string;
  person_type?: 'pf' | 'pj';
  cnpj?: string;
  cpf?: string;
  email?: string;
  status?: 'active' | 'inactive';
  tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
  cnae?: string;
  state_registration?: string;
  municipal_registration?: string;
  notes?: string;
}

export class ClientRepository extends BaseRepository {
  /**
   * Buscar cliente por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id: string): Promise<Client | null> {
    const result = await this.query<Client>(
      `SELECT id, name, person_type, cnpj, cpf, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE id = $1`,
      [id],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar cliente por CNPJ
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByCnpj(cnpj: string): Promise<Client | null> {
    const result = await this.query<Client>(
      `SELECT id, name, person_type, cnpj, cpf, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE cnpj = $1`,
      [cnpj],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }

  /**
   * Criar cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByCpf(cpf: string): Promise<Client | null> {
    const result = await this.query<Client>(
      `SELECT id, name, person_type, cnpj, cpf, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE cpf = $1`,
      [cpf],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }

  async create(data: CreateClientData): Promise<Client> {
    const result = await this.query<Client>(
      `INSERT INTO clients (name, person_type, cnpj, cpf, email, tax_regime, cnae, 
                           state_registration, municipal_registration, notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active') 
       RETURNING id, name, person_type, cnpj, cpf, email, status, tax_regime, cnae, 
                 state_registration, municipal_registration, notes, 
                 created_at, updated_at`,
      [
        data.name,
        data.person_type || 'pj',
        data.cnpj || null,
        data.cpf || null,
        data.email || null,
        data.tax_regime || null,
        data.cnae || null,
        data.state_registration || null,
        data.municipal_registration || null,
        data.notes || null,
      ],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }

  /**
   * Atualizar cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async update(id: string, data: UpdateClientData): Promise<Client> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.person_type !== undefined) {
      updates.push(`person_type = $${paramIndex++}`);
      params.push(data.person_type);
    }
    if (data.cnpj !== undefined) {
      updates.push(`cnpj = $${paramIndex++}`);
      params.push(data.cnpj);
    }
    if (data.cpf !== undefined) {
      updates.push(`cpf = $${paramIndex++}`);
      params.push(data.cpf);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.tax_regime !== undefined) {
      updates.push(`tax_regime = $${paramIndex++}`);
      params.push(data.tax_regime);
    }
    if (data.cnae !== undefined) {
      updates.push(`cnae = $${paramIndex++}`);
      params.push(data.cnae);
    }
    if (data.state_registration !== undefined) {
      updates.push(`state_registration = $${paramIndex++}`);
      params.push(data.state_registration);
    }
    if (data.municipal_registration !== undefined) {
      updates.push(`municipal_registration = $${paramIndex++}`);
      params.push(data.municipal_registration);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(data.notes);
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<Client>;
    }

    params.push(id);
    const result = await this.query<Client>(
      `UPDATE clients 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, name, person_type, cnpj, cpf, email, status, tax_regime, cnae, 
                 state_registration, municipal_registration, notes, 
                 created_at, updated_at`,
      params,
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }

  /**
   * Deletar cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async delete(id: string): Promise<void> {
    await this.query(
      'DELETE FROM clients WHERE id = $1',
      [id],
      false // Não requer company_id (isolado por schema)
    );
  }

  /**
   * Listar clientes (com paginação)
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async list(
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ clients: Client[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let whereClause = '';

    if (options.status) {
      whereClause = 'WHERE status = $1';
      params.push(options.status);
    }

    // Buscar total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM clients ${whereClause}`,
      params,
      false // Não requer company_id (isolado por schema)
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Buscar clientes
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const clientsResult = await this.query<Client>(
      `SELECT id, name, person_type, cnpj, cpf, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false // Não requer company_id (isolado por schema)
    );

    return {
      clients: clientsResult.rows,
      total,
    };
  }

  /**
   * Contar clientes no tenant atual (schema já isolado por tenant)
   */
  async countAll(): Promise<number> {
    const result = await this.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM clients',
      [],
      false
    );
    return Number(result.rows[0]?.count || 0);
  }
}

import { BaseRepository } from '../../shared/repositories/base.repository';
import type { User } from '@shared/core';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

export class UserRepository extends BaseRepository {
  /**
   * Buscar usuário por ID e company_id
   */
  async findById(id: string, companyId: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT id, email, name, company_id, role, status, created_at, updated_at FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar usuário por email e company_id
   */
  async findByEmail(email: string, companyId: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT id, email, name, company_id, role, status, created_at, updated_at FROM users WHERE email = $1 AND company_id = $2',
      [email, companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar usuário por email globalmente (para verificar duplicatas de super_admin)
   */
  async findByEmailGlobal(email: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT id, email, name, company_id, role, status, created_at, updated_at FROM users WHERE email = $1',
      [email],
      false // Não requer filtro de tenant
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar todos os usuários com um email específico (para debug)
   */
  async findAllByEmail(email: string): Promise<User[]> {
    const result = await this.query<User>(
      'SELECT id, email, name, company_id, role, status, created_at, updated_at FROM users WHERE email = $1 ORDER BY created_at DESC',
      [email],
      false // Não requer filtro de tenant
    );
    return result.rows;
  }

  /**
   * Criar usuário
   */
  async create(companyId: string, data: CreateUserData): Promise<User> {
    // Garantir que o status seja sempre 'active' ao criar
    const result = await this.query<User>(
      `INSERT INTO users (email, name, password_hash, company_id, role, status) 
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'active')) 
       RETURNING id, email, name, company_id, role, COALESCE(status, 'active') as status, created_at, updated_at`,
      [data.email, data.name, data.password, companyId, data.role || 'user', 'active']
    );
    const createdUser = result.rows[0];
    
    // Garantir que o status seja 'active' (fallback caso haja algum problema)
    if (!createdUser.status || createdUser.status !== 'active') {
      console.warn(`[UserRepository.create] Usuário criado com status inesperado: ${createdUser.status || 'undefined'}, forçando 'active'`);
      // Atualizar no banco se necessário
      await this.query(
        'UPDATE users SET status = $1 WHERE id = $2',
        ['active', createdUser.id]
      );
      createdUser.status = 'active';
    }
    
    console.log(`[UserRepository.create] Usuário criado: ${createdUser.email}, status: ${createdUser.status}, company_id: ${companyId}`);
    return createdUser;
  }

  /**
   * Atualizar usuário
   */
  async update(id: string, companyId: string, data: UpdateUserData): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      params.push(data.role);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id, companyId) as Promise<User>;
    }

    params.push(id, companyId);
    const result = await this.query<User>(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++} 
       RETURNING id, email, name, company_id, role, status, created_at, updated_at`,
      params
    );
    return result.rows[0];
  }

  /**
   * Deletar usuário
   */
  async delete(id: string, companyId: string): Promise<void> {
    await this.query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
  }

  /**
   * Contar usuários por empresa (para validação de seats)
   */
  async countByCompany(companyId: string): Promise<number> {
    const result = await this.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
      [companyId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Listar usuários por empresa (com paginação)
   */
  async findByCompany(
    companyId: string,
    options: { page?: number; limit?: number; role?: string } = {}
  ): Promise<{ users: User[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [companyId];
    let whereClause = 'company_id = $1';

    if (options.role) {
      whereClause += ' AND role = $2';
      params.push(options.role);
    }

    // Buscar total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Buscar usuários
    const usersResult = await this.query<User>(
      `SELECT id, email, name, company_id, role, status, created_at, updated_at 
       FROM users 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      users: usersResult.rows,
      total,
    };
  }

  /**
   * Criar super_admin (sem company_id)
   */
  async createSuperAdmin(data: CreateUserData): Promise<User> {
    const result = await this.query<User>(
      `INSERT INTO users (email, name, password_hash, company_id, role, status) 
       VALUES ($1, $2, $3, NULL, 'super_admin', 'active') 
       RETURNING id, email, name, company_id, role, status, created_at, updated_at`,
      [data.email, data.name, data.password],
      false // Não requer filtro de tenant
    );
    return result.rows[0];
  }

  /**
   * Listar todos os super_admins
   */
  async findSuperAdmins(): Promise<User[]> {
    try {
      console.log('[UserRepository.findSuperAdmins] Executing query with requireCompanyId: false');
      const result = await this.query<User>(
        `SELECT 
          id, 
          email, 
          name, 
          company_id, 
          role, 
          COALESCE(status, 'active') as status, 
          created_at, 
          updated_at 
         FROM users 
         WHERE role = 'super_admin' AND company_id IS NULL 
         ORDER BY created_at DESC`,
        [],
        false // Não requer filtro de tenant
      );
      console.log('[UserRepository.findSuperAdmins] Query executed successfully, found', result.rows.length, 'users');
      return result.rows;
    } catch (error) {
      console.error('[UserRepository.findSuperAdmins] Error executing query:', error);
      console.error('[UserRepository.findSuperAdmins] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

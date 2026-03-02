"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class UserRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar usuário por ID e tenant_id
     */
    async findById(id, tenantId) {
        const result = await this.query('SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return result.rows[0] || null;
    }
    /**
     * Buscar usuário por email e tenant_id
     */
    async findByEmail(email, tenantId) {
        const result = await this.query('SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
        return result.rows[0] || null;
    }
    /**
     * Buscar usuário por email globalmente (para verificar duplicatas de super_admin)
     */
    async findByEmailGlobal(email) {
        const result = await this.query('SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE email = $1', [email], false // Não requer filtro de tenant
        );
        return result.rows[0] || null;
    }
    /**
     * Buscar todos os usuários com um email específico (para debug)
     */
    async findAllByEmail(email) {
        const result = await this.query('SELECT id, email, name, tenant_id, role, status, created_at, updated_at FROM users WHERE email = $1 ORDER BY created_at DESC', [email], false // Não requer filtro de tenant
        );
        return result.rows;
    }
    /**
     * Criar usuário
     */
    async create(tenantId, data) {
        // requireCompanyId: false — INSERT define tenant_id nos VALUES.
        const result = await this.query(`INSERT INTO users (email, name, password_hash, tenant_id, role, status) 
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'active')) 
       RETURNING id, email, name, tenant_id, role, COALESCE(status, 'active') as status, created_at, updated_at`, [data.email, data.name, data.password, tenantId, data.role || 'user', 'active'], false);
        const createdUser = result.rows[0];
        if (!createdUser.status || createdUser.status !== 'active') {
            console.warn(`[UserRepository.create] Usuário criado com status inesperado: ${createdUser.status || 'undefined'}, forçando 'active'`);
            await this.query('UPDATE users SET status = $1 WHERE id = $2 AND tenant_id = $3', ['active', createdUser.id, tenantId]);
            createdUser.status = 'active';
        }
        console.log(`[UserRepository.create] Usuário criado: ${createdUser.email}, status: ${createdUser.status}, tenant_id: ${tenantId}`);
        return createdUser;
    }
    /**
     * Atualizar usuário
     */
    async update(id, tenantId, data) {
        const updates = [];
        const params = [];
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
            return this.findById(id, tenantId);
        }
        params.push(id, tenantId);
        const result = await this.query(`UPDATE users 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} 
       RETURNING id, email, name, tenant_id, role, status, created_at, updated_at`, params);
        return result.rows[0];
    }
    /**
     * Deletar usuário
     */
    async delete(id, tenantId) {
        await this.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    }
    /**
     * Contar usuários por tenant (para validação de seats)
     */
    async countByCompany(tenantId) {
        const result = await this.query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [tenantId]);
        return parseInt(result.rows[0].count, 10);
    }
    /**
     * Listar usuários por tenant (com paginação)
     */
    async findByCompany(tenantId, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const offset = (page - 1) * limit;
        const params = [tenantId];
        let whereClause = 'tenant_id = $1';
        if (options.role) {
            whereClause += ' AND role = $2';
            params.push(options.role);
        }
        // Buscar total
        const countResult = await this.query(`SELECT COUNT(*) as count FROM users WHERE ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        // Buscar usuários
        const usersResult = await this.query(`SELECT id, email, name, tenant_id, role, status, created_at, updated_at 
       FROM users 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        return {
            users: usersResult.rows,
            total,
        };
    }
    /**
     * Criar super_admin (sem tenant_id)
     */
    async createSuperAdmin(data) {
        const result = await this.query(`INSERT INTO users (email, name, password_hash, tenant_id, role, status) 
       VALUES ($1, $2, $3, NULL, 'super_admin', 'active') 
       RETURNING id, email, name, tenant_id, role, status, created_at, updated_at`, [data.email, data.name, data.password], false // Não requer filtro de tenant
        );
        return result.rows[0];
    }
    /**
     * Listar todos os super_admins
     */
    async findSuperAdmins() {
        try {
            console.log('[UserRepository.findSuperAdmins] Executing query with requireCompanyId: false');
            const result = await this.query(`SELECT 
          id, 
          email, 
          name, 
          tenant_id, 
          role, 
          COALESCE(status, 'active') as status, 
          created_at, 
          updated_at 
         FROM users 
         WHERE role = 'super_admin' AND tenant_id IS NULL 
         ORDER BY created_at DESC`, [], false // Não requer filtro de tenant
            );
            console.log('[UserRepository.findSuperAdmins] Query executed successfully, found', result.rows.length, 'users');
            return result.rows;
        }
        catch (error) {
            console.error('[UserRepository.findSuperAdmins] Error executing query:', error);
            console.error('[UserRepository.findSuperAdmins] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
}
exports.UserRepository = UserRepository;

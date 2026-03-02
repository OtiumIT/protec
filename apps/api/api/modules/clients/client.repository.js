"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class ClientRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar cliente por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findById(id) {
        const result = await this.query(`SELECT id, name, cnpj, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE id = $1`, [id], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0] || null;
    }
    /**
     * Buscar cliente por CNPJ
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findByCnpj(cnpj) {
        const result = await this.query(`SELECT id, name, cnpj, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients WHERE cnpj = $1`, [cnpj], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0] || null;
    }
    /**
     * Criar cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async create(data) {
        const result = await this.query(`INSERT INTO clients (name, cnpj, email, tax_regime, cnae, 
                           state_registration, municipal_registration, notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') 
       RETURNING id, name, cnpj, email, status, tax_regime, cnae, 
                 state_registration, municipal_registration, notes, 
                 created_at, updated_at`, [
            data.name,
            data.cnpj,
            data.email || null,
            data.tax_regime || null,
            data.cnae || null,
            data.state_registration || null,
            data.municipal_registration || null,
            data.notes || null,
        ], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0];
    }
    /**
     * Atualizar cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async update(id, data) {
        const updates = [];
        const params = [];
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
            return this.findById(id);
        }
        params.push(id);
        const result = await this.query(`UPDATE clients 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, name, cnpj, email, status, tax_regime, cnae, 
                 state_registration, municipal_registration, notes, 
                 created_at, updated_at`, params, false // Não requer company_id (isolado por schema)
        );
        return result.rows[0];
    }
    /**
     * Deletar cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async delete(id) {
        await this.query('DELETE FROM clients WHERE id = $1', [id], false // Não requer company_id (isolado por schema)
        );
    }
    /**
     * Listar clientes (com paginação)
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async list(options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = '';
        if (options.status) {
            whereClause = 'WHERE status = $1';
            params.push(options.status);
        }
        // Buscar total
        const countResult = await this.query(`SELECT COUNT(*) as count FROM clients ${whereClause}`, params, false // Não requer company_id (isolado por schema)
        );
        const total = parseInt(countResult.rows[0].count, 10);
        // Buscar clientes
        const limitParam = params.length + 1;
        const offsetParam = params.length + 2;
        const clientsResult = await this.query(`SELECT id, name, cnpj, email, status, tax_regime, cnae, 
              state_registration, municipal_registration, notes, 
              created_at, updated_at 
       FROM clients 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`, [...params, limit, offset], false // Não requer company_id (isolado por schema)
        );
        return {
            clients: clientsResult.rows,
            total,
        };
    }
}
exports.ClientRepository = ClientRepository;

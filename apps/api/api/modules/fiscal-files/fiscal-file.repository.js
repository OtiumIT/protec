"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiscalFileRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class FiscalFileRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar arquivo por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findById(id) {
        const result = await this.query(`SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files WHERE id = $1`, [id], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0] || null;
    }
    /**
     * Criar registro de arquivo fiscal
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async create(data) {
        const result = await this.query(`INSERT INTO fiscal_files 
       (client_id, file_type, competence, file_name, file_path, file_size, mime_type, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded') 
       RETURNING id, client_id, file_type, competence, file_name, file_path, 
                 file_size, mime_type, status, processing_error, metadata, 
                 created_at, updated_at`, [
            data.client_id,
            data.file_type,
            data.competence,
            data.file_name,
            data.file_path,
            data.file_size,
            data.mime_type,
        ], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0];
    }
    /**
     * Atualizar arquivo fiscal
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async update(id, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            params.push(data.status);
        }
        if (data.processing_error !== undefined) {
            updates.push(`processing_error = $${paramIndex++}`);
            params.push(data.processing_error);
        }
        if (data.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            params.push(JSON.stringify(data.metadata));
        }
        if (updates.length === 0) {
            return this.findById(id);
        }
        params.push(id);
        const result = await this.query(`UPDATE fiscal_files 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, client_id, file_type, competence, file_name, file_path, 
                 file_size, mime_type, status, processing_error, metadata, 
                 created_at, updated_at`, params, false // Não requer company_id (isolado por schema)
        );
        return result.rows[0];
    }
    /**
     * Deletar arquivo fiscal
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async delete(id) {
        await this.query('DELETE FROM fiscal_files WHERE id = $1', [id], false // Não requer company_id (isolado por schema)
        );
    }
    /**
     * Listar arquivos por cliente e/ou competência
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async list(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const offset = (page - 1) * limit;
        const params = [];
        const conditions = [];
        if (options.client_id) {
            conditions.push(`client_id = $${params.length + 1}`);
            params.push(options.client_id);
        }
        if (options.competence) {
            conditions.push(`competence = $${params.length + 1}`);
            params.push(options.competence);
        }
        if (options.status) {
            conditions.push(`status = $${params.length + 1}`);
            params.push(options.status);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Buscar total
        const countResult = await this.query(`SELECT COUNT(*) as count FROM fiscal_files ${whereClause}`, params, false // Não requer company_id (isolado por schema)
        );
        const total = parseInt(countResult.rows[0].count, 10);
        // Buscar arquivos
        const limitParam = params.length + 1;
        const offsetParam = params.length + 2;
        const filesResult = await this.query(`SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`, [...params, limit, offset], false // Não requer company_id (isolado por schema)
        );
        return {
            files: filesResult.rows,
            total,
        };
    }
    /**
     * Buscar arquivos por cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findByClient(clientId) {
        const result = await this.query(`SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files 
       WHERE client_id = $1 
       ORDER BY competence DESC, created_at DESC`, [clientId], false // Não requer company_id (isolado por schema)
        );
        return result.rows;
    }
}
exports.FiscalFileRepository = FiscalFileRepository;

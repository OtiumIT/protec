"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingValidatorRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class RatingValidatorRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar validação por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findById(id) {
        const result = await this.query(`SELECT id, client_id, competence, fiscal_file_id, is_simulation,
              input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
              rating_estimado, rating_real, has_discrepancy, discrepancy_details,
              created_by, created_at, updated_at 
       FROM rating_validations WHERE id = $1`, [id], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0] || null;
    }
    /**
     * Criar validação
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async create(data) {
        const result = await this.query(`INSERT INTO rating_validations 
       (client_id, competence, fiscal_file_id, is_simulation, input_data, 
        calculated_values, liquidez_corrente, liquidez_geral, solvencia,
        rating_estimado, rating_real, has_discrepancy, discrepancy_details, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 created_by, created_at, updated_at`, [
            data.client_id,
            data.competence,
            data.fiscal_file_id || null,
            data.is_simulation,
            JSON.stringify(data.input_data),
            data.calculated_values ? JSON.stringify(data.calculated_values) : null,
            data.liquidez_corrente || null,
            data.liquidez_geral || null,
            data.solvencia || null,
            data.rating_estimado,
            data.rating_real || null,
            data.has_discrepancy,
            data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null,
            data.created_by || null,
        ], false // Não requer company_id (isolado por schema)
        );
        return result.rows[0];
    }
    /**
     * Atualizar validação
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async update(id, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.rating_real !== undefined) {
            updates.push(`rating_real = $${paramIndex++}`);
            params.push(data.rating_real);
        }
        if (data.has_discrepancy !== undefined) {
            updates.push(`has_discrepancy = $${paramIndex++}`);
            params.push(data.has_discrepancy);
        }
        if (data.discrepancy_details !== undefined) {
            updates.push(`discrepancy_details = $${paramIndex++}`);
            params.push(data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null);
        }
        if (updates.length === 0) {
            return this.findById(id);
        }
        params.push(id);
        const result = await this.query(`UPDATE rating_validations 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 created_by, created_at, updated_at`, params, false // Não requer company_id (isolado por schema)
        );
        return result.rows[0];
    }
    /**
     * Deletar validação
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async delete(id) {
        await this.query('DELETE FROM rating_validations WHERE id = $1', [id], false // Não requer company_id (isolado por schema)
        );
    }
    /**
     * Listar validações com filtros
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
        if (options.is_simulation !== undefined) {
            conditions.push(`is_simulation = $${params.length + 1}`);
            params.push(options.is_simulation);
        }
        if (options.rating_estimado) {
            conditions.push(`rating_estimado = $${params.length + 1}`);
            params.push(options.rating_estimado);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Buscar total
        const countResult = await this.query(`SELECT COUNT(*) as count FROM rating_validations ${whereClause}`, params, false // Não requer company_id (isolado por schema)
        );
        const total = parseInt(countResult.rows[0].count, 10);
        // Buscar validações
        const limitParam = params.length + 1;
        const offsetParam = params.length + 2;
        const validationsResult = await this.query(`SELECT id, client_id, competence, fiscal_file_id, is_simulation,
              input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
              rating_estimado, rating_real, has_discrepancy, discrepancy_details,
              created_by, created_at, updated_at 
       FROM rating_validations 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`, [...params, limit, offset], false // Não requer company_id (isolado por schema)
        );
        return {
            validations: validationsResult.rows,
            total,
        };
    }
    /**
     * Buscar dados extraídos de ECD (Balanço e DRE)
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findExtractedFiscalData(clientId, competence, dataTypes) {
        const placeholders = dataTypes.map((_, i) => `$${i + 2}`).join(', ');
        const result = await this.query(`SELECT data_type, data 
       FROM extracted_fiscal_data 
       WHERE client_id = $1 AND competence = $2 AND data_type IN (${placeholders})
       ORDER BY created_at DESC`, [clientId, competence, ...dataTypes], false // Não requer company_id (isolado por schema)
        );
        return result.rows;
    }
    /**
     * Buscar validações por cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    async findByClient(clientId) {
        const result = await this.query(`SELECT id, client_id, competence, fiscal_file_id, is_simulation,
              input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
              rating_estimado, rating_real, has_discrepancy, discrepancy_details,
              created_by, created_at, updated_at 
       FROM rating_validations 
       WHERE client_id = $1 
       ORDER BY competence DESC, created_at DESC`, [clientId], false // Não requer company_id (isolado por schema)
        );
        return result.rows;
    }
}
exports.RatingValidatorRepository = RatingValidatorRepository;

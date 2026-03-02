"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class EditalRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar edital por ID
     * NOTA: Editais são globais, não requerem company_id
     */
    async findById(id) {
        const result = await this.query(`SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais WHERE id = $1`, [id], false // Não requer company_id (dados globais)
        );
        return result.rows[0] || null;
    }
    /**
     * Buscar edital por código
     */
    async findByCode(code) {
        const result = await this.query(`SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais WHERE code = $1`, [code], false);
        return result.rows[0] || null;
    }
    /**
     * Listar editais (com filtros opcionais)
     */
    async list(options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.modality) {
            conditions.push(`modality = $${paramIndex}`);
            params.push(options.modality);
            paramIndex++;
        }
        if (options.active !== undefined) {
            conditions.push(`active = $${paramIndex}`);
            params.push(options.active);
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Buscar total
        const countResult = await this.query(`SELECT COUNT(*) as count FROM editais ${whereClause}`, params, false);
        const total = parseInt(countResult.rows[0].count, 10);
        // Buscar editais
        const limitParam = paramIndex;
        const offsetParam = paramIndex + 1;
        const editaisResult = await this.query(`SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais 
       ${whereClause}
       ORDER BY end_date DESC, created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`, [...params, limit, offset], false);
        return {
            editais: editaisResult.rows,
            total,
        };
    }
    /**
     * Criar novo edital
     */
    async create(data) {
        const result = await this.query(`INSERT INTO editais (
        code, name, description, start_date, end_date, extended,
        modality, payment_terms, discount_rules, eligibility,
        notes, official_link, active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING id, code, name, description, start_date, end_date, extended, 
                  modality, payment_terms, discount_rules, eligibility, 
                  notes, official_link, active, created_at, updated_at, created_by`, [
            data.code,
            data.name,
            data.description || null,
            data.start_date,
            data.end_date,
            data.extended || false,
            data.modality,
            JSON.stringify(data.payment_terms),
            JSON.stringify(data.discount_rules),
            JSON.stringify(data.eligibility),
            data.notes || null,
            data.official_link || null,
            data.active !== undefined ? data.active : true,
            data.created_by || null,
        ], false);
        return result.rows[0];
    }
    /**
     * Atualizar edital
     */
    async update(id, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            params.push(data.name);
            paramIndex++;
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            params.push(data.description);
            paramIndex++;
        }
        if (data.start_date !== undefined) {
            updates.push(`start_date = $${paramIndex}`);
            params.push(data.start_date);
            paramIndex++;
        }
        if (data.end_date !== undefined) {
            updates.push(`end_date = $${paramIndex}`);
            params.push(data.end_date);
            paramIndex++;
        }
        if (data.extended !== undefined) {
            updates.push(`extended = $${paramIndex}`);
            params.push(data.extended);
            paramIndex++;
        }
        if (data.modality !== undefined) {
            updates.push(`modality = $${paramIndex}`);
            params.push(data.modality);
            paramIndex++;
        }
        if (data.payment_terms !== undefined) {
            updates.push(`payment_terms = $${paramIndex}`);
            params.push(JSON.stringify(data.payment_terms));
            paramIndex++;
        }
        if (data.discount_rules !== undefined) {
            updates.push(`discount_rules = $${paramIndex}`);
            params.push(JSON.stringify(data.discount_rules));
            paramIndex++;
        }
        if (data.eligibility !== undefined) {
            updates.push(`eligibility = $${paramIndex}`);
            params.push(JSON.stringify(data.eligibility));
            paramIndex++;
        }
        if (data.notes !== undefined) {
            updates.push(`notes = $${paramIndex}`);
            params.push(data.notes);
            paramIndex++;
        }
        if (data.official_link !== undefined) {
            updates.push(`official_link = $${paramIndex}`);
            params.push(data.official_link);
            paramIndex++;
        }
        if (data.active !== undefined) {
            updates.push(`active = $${paramIndex}`);
            params.push(data.active);
            paramIndex++;
        }
        if (updates.length === 0) {
            return this.findById(id);
        }
        params.push(id);
        const result = await this.query(`UPDATE editais SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, code, name, description, start_date, end_date, extended, 
                  modality, payment_terms, discount_rules, eligibility, 
                  notes, official_link, active, created_at, updated_at, created_by`, params, false);
        return result.rows[0] || null;
    }
    /**
     * Deletar edital
     */
    async delete(id) {
        const result = await this.query('DELETE FROM editais WHERE id = $1 RETURNING id', [id], false);
        return result.rows.length > 0;
    }
    /**
     * Buscar editais ativos (dentro do prazo)
     */
    async findActive(date) {
        const checkDate = date || new Date().toISOString().split('T')[0];
        const result = await this.query(`SELECT id, code, name, description, start_date, end_date, extended, 
              modality, payment_terms, discount_rules, eligibility, 
              notes, official_link, active, created_at, updated_at, created_by
       FROM editais 
       WHERE active = true 
         AND start_date <= $1 
         AND end_date >= $1
       ORDER BY end_date ASC`, [checkDate], false);
        return result.rows;
    }
}
exports.EditalRepository = EditalRepository;

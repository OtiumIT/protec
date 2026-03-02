"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimuladorIN2306Repository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class SimuladorIN2306Repository extends base_repository_1.BaseRepository {
    async findById(id) {
        const result = await this.query(`SELECT id, client_id, competence, input_data, result_data, title, created_by, created_at, updated_at
       FROM in_2306_simulations WHERE id = $1`, [id], false);
        return result.rows[0] || null;
    }
    async create(data) {
        const result = await this.query(`INSERT INTO in_2306_simulations (client_id, competence, input_data, result_data, title, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, client_id, competence, input_data, result_data, title, created_by, created_at, updated_at`, [
            data.client_id,
            data.competence,
            JSON.stringify(data.input_data),
            JSON.stringify(data.result_data),
            data.title ?? null,
            data.created_by ?? null,
        ], false);
        return result.rows[0];
    }
    async delete(id) {
        await this.query('DELETE FROM in_2306_simulations WHERE id = $1', [id], false);
    }
    async list(options) {
        const page = options.page ?? 1;
        const limit = options.limit ?? 20;
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
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await this.query(`SELECT COUNT(*) as count FROM in_2306_simulations ${whereClause}`, params, false);
        const total = parseInt(countResult.rows[0].count, 10);
        const listResult = await this.query(`SELECT id, client_id, competence, input_data, result_data, title, created_by, created_at, updated_at
       FROM in_2306_simulations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset], false);
        return { simulations: listResult.rows, total };
    }
}
exports.SimuladorIN2306Repository = SimuladorIN2306Repository;

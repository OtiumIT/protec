"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class PlanRepository extends base_repository_1.BaseRepository {
    async findById(id) {
        const result = await this.query('SELECT id, name, max_users, price, billing_cycle, features, created_at, updated_at FROM plans WHERE id = $1', [id], false);
        return result.rows[0] || null;
    }
    async findAll() {
        const result = await this.query('SELECT id, name, max_users, price, billing_cycle, features, created_at, updated_at FROM plans ORDER BY price', [], false);
        return result.rows;
    }
}
exports.PlanRepository = PlanRepository;

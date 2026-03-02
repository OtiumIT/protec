"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class PlanRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar plano por ID
     * Nota: Planos não requerem filtro de company_id (são globais)
     */
    async findById(id) {
        const result = await this.query('SELECT id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at FROM plans WHERE id = $1', [id], false // Planos não requerem filtro de tenant
        );
        if (result.rows.length === 0)
            return null;
        const plan = result.rows[0];
        // Converter features de JSONB para array
        plan.features = Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []);
        return plan;
    }
    /**
     * Buscar plano por nome (ex.: 'Free' para plano padrão de novos tenants)
     * Nota: Planos não requerem filtro de company_id (são globais)
     */
    async findByName(name) {
        const result = await this.query(`SELECT id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at 
       FROM plans WHERE name = $1 LIMIT 1`, [name], false);
        if (result.rows.length === 0)
            return null;
        const plan = result.rows[0];
        plan.features = Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []);
        return plan;
    }
    /**
     * Listar todos os planos (apenas ativos - listagem pública)
     * Usa DISTINCT ON para evitar duplicatas por nome (mantém o mais antigo)
     */
    async findAll() {
        const result = await this.query(`SELECT DISTINCT ON (name) 
        id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at 
       FROM plans 
       WHERE (status IS NULL OR status = 'active')
       ORDER BY name, created_at ASC`, [], false // Planos não requerem filtro de tenant
        );
        // Converter features de JSONB para array
        return result.rows.map((plan) => ({
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []),
        }));
    }
    /**
     * Listar todos os planos para admin (ativos + inativos - gestão)
     */
    async findAllForAdmin() {
        const result = await this.query(`SELECT DISTINCT ON (name) 
        id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, stripe_price_id, created_at, updated_at 
       FROM plans 
       ORDER BY name, created_at ASC`, [], false);
        return result.rows.map((plan) => ({
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []),
        }));
    }
    /**
     * Criar plano
     */
    async create(data) {
        // Converter array de features para objeto JSONB
        const featuresObj = data.features.reduce((acc, feature, index) => {
            acc[index] = feature;
            return acc;
        }, {});
        const maxClients = data.maxClients ?? 0;
        const result = await this.query(`INSERT INTO plans (name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed) 
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) 
       RETURNING id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, created_at, updated_at`, [
            data.name,
            data.maxUsers,
            maxClients,
            data.price,
            data.billingCycle,
            JSON.stringify(featuresObj),
            data.isCustom || false,
            data.isManaged || false,
        ], false);
        const plan = result.rows[0];
        plan.features = data.features; // Retornar como array
        return plan;
    }
    /**
     * Atualizar plano
     */
    async update(id, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(data.name);
        }
        if (data.maxUsers !== undefined) {
            updates.push(`max_users = $${paramIndex++}`);
            params.push(data.maxUsers);
        }
        if (data.maxClients !== undefined) {
            updates.push(`max_clients = $${paramIndex++}`);
            params.push(data.maxClients);
        }
        if (data.price !== undefined) {
            updates.push(`price = $${paramIndex++}`);
            params.push(data.price);
        }
        if (data.billingCycle !== undefined) {
            updates.push(`billing_cycle = $${paramIndex++}`);
            params.push(data.billingCycle);
        }
        if (data.features !== undefined) {
            // Converter array de features para objeto JSONB
            const featuresObj = data.features.reduce((acc, feature, index) => {
                acc[index] = feature;
                return acc;
            }, {});
            updates.push(`features = $${paramIndex++}::jsonb`);
            params.push(JSON.stringify(featuresObj));
        }
        if (data.isCustom !== undefined) {
            updates.push(`is_custom = $${paramIndex++}`);
            params.push(data.isCustom);
        }
        if (data.isManaged !== undefined) {
            updates.push(`is_managed = $${paramIndex++}`);
            params.push(data.isManaged);
        }
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            params.push(data.status);
        }
        if (updates.length === 0) {
            return this.findById(id);
        }
        params.push(id);
        const result = await this.query(`UPDATE plans 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, max_users, max_clients, price, billing_cycle, features, is_custom, is_managed, status, created_at, updated_at`, params, false);
        const plan = result.rows[0];
        // Converter features de JSONB para array
        plan.features = Array.isArray(plan.features) ? plan.features : (plan.features ? Object.values(plan.features) : []);
        return plan;
    }
    /**
     * Deletar plano
     */
    async delete(id) {
        await this.query('DELETE FROM plans WHERE id = $1', [id], false);
    }
}
exports.PlanRepository = PlanRepository;

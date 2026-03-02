"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class SubscriptionRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar assinatura por company_id
     */
    async findByCompany(companyId) {
        const result = await this.query(`SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at
       FROM subscriptions 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`, [companyId]);
        return result.rows[0] || null;
    }
    /**
     * Buscar assinatura por Stripe subscription ID
     */
    async findByStripeId(stripeSubscriptionId) {
        const result = await this.query(`SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at
       FROM subscriptions 
       WHERE stripe_subscription_id = $1`, [stripeSubscriptionId], false // Não requer company_id nesta query específica
        );
        return result.rows[0] || null;
    }
    /**
     * Criar assinatura
     */
    async create(companyId, data) {
        const result = await this.query(`INSERT INTO subscriptions (company_id, plan_id, status, stripe_subscription_id, stripe_customer_id, free_plan_started_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at`, [
            companyId,
            data.planId,
            'active',
            data.stripeSubscriptionId || null,
            data.stripeCustomerId || null,
            data.freePlanStartedAt ?? null,
        ], false // INSERT define company_id nos VALUES; validação de filtro é para SELECT/UPDATE
        );
        return result.rows[0];
    }
    /**
     * Atualizar assinatura
     */
    async update(companyId, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (data.planId !== undefined) {
            updates.push(`plan_id = $${paramIndex++}`);
            params.push(data.planId);
        }
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            params.push(data.status);
        }
        if (data.currentPeriodStart !== undefined) {
            updates.push(`current_period_start = $${paramIndex++}`);
            params.push(data.currentPeriodStart);
        }
        if (data.currentPeriodEnd !== undefined) {
            updates.push(`current_period_end = $${paramIndex++}`);
            params.push(data.currentPeriodEnd);
        }
        if (data.stripeSubscriptionId !== undefined) {
            updates.push(`stripe_subscription_id = $${paramIndex++}`);
            params.push(data.stripeSubscriptionId);
        }
        if (data.stripeCustomerId !== undefined) {
            updates.push(`stripe_customer_id = $${paramIndex++}`);
            params.push(data.stripeCustomerId);
        }
        if (data.canceledAt !== undefined) {
            updates.push(`canceled_at = $${paramIndex++}`);
            params.push(data.canceledAt);
        }
        if (data.freePlanStartedAt !== undefined) {
            updates.push(`free_plan_started_at = $${paramIndex++}`);
            params.push(data.freePlanStartedAt);
        }
        if (updates.length === 0) {
            return this.findByCompany(companyId);
        }
        params.push(companyId);
        const result = await this.query(`UPDATE subscriptions 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE company_id = $${paramIndex++} 
       RETURNING id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, free_plan_started_at, created_at, updated_at`, params);
        return result.rows[0];
    }
    /**
     * Atualizar apenas status
     */
    async updateStatus(companyId, status) {
        return this.update(companyId, { status });
    }
}
exports.SubscriptionRepository = SubscriptionRepository;

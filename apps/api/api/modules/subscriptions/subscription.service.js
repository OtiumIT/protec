"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
class SubscriptionService {
    subscriptionRepo;
    planRepo;
    constructor(subscriptionRepo, planRepo) {
        this.subscriptionRepo = subscriptionRepo;
        this.planRepo = planRepo;
    }
    /**
     * Criar assinatura.
     * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
     */
    async create(companyId, data, options) {
        const plan = await this.planRepo.findById(data.planId);
        if (!plan) {
            throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
        }
        const isCustom = plan.is_custom === true || plan.isCustom === true;
        if (isCustom && !options?.allowCustomPlan) {
            throw new error_handler_1.AppError('Apenas o administrador geral pode associar o plano customizado.', 'CUSTOM_PLAN_FORBIDDEN', 403);
        }
        const existing = await this.subscriptionRepo.findByCompany(companyId);
        if (existing && ['active', 'trialing'].includes(existing.status)) {
            throw new error_handler_1.AppError('Active subscription already exists', 'SUBSCRIPTION_EXISTS', 409);
        }
        const createData = { ...data };
        if (plan.name === 'Free') {
            createData.freePlanStartedAt = new Date();
        }
        return this.subscriptionRepo.create(companyId, createData);
    }
    /**
     * Atualizar status da assinatura
     */
    async updateStatus(companyId, status) {
        return this.subscriptionRepo.updateStatus(companyId, status);
    }
    /**
     * Buscar assinatura por empresa
     */
    async getByCompany(companyId) {
        const subscription = await this.subscriptionRepo.findByCompany(companyId);
        if (!subscription) {
            throw new error_handler_1.AppError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', 404);
        }
        // Buscar plano associado
        const plan = await this.planRepo.findById(subscription.plan_id);
        if (!plan) {
            throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
        }
        return {
            ...subscription,
            plan,
        };
    }
    /**
     * Verificar limite de usuários (seats)
     */
    async checkSeatsLimit(companyId, currentUserCount) {
        const subscription = await this.subscriptionRepo.findByCompany(companyId);
        if (!subscription) {
            return false;
        }
        const plan = await this.planRepo.findById(subscription.plan_id);
        if (!plan) {
            return false;
        }
        return currentUserCount < plan.max_users;
    }
    /**
     * Verificar se assinatura está ativa
     */
    async isActive(companyId) {
        const subscription = await this.subscriptionRepo.findByCompany(companyId);
        if (!subscription) {
            return false;
        }
        return ['active', 'trialing'].includes(subscription.status);
    }
    /**
     * Atualizar assinatura.
     * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
     */
    async update(companyId, data, options) {
        const updateData = { ...data };
        if (data.planId) {
            const plan = await this.planRepo.findById(data.planId);
            if (!plan) {
                throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
            }
            const isCustom = plan.is_custom === true || plan.isCustom === true;
            if (isCustom && !options?.allowCustomPlan) {
                throw new error_handler_1.AppError('Apenas o administrador geral pode associar o plano customizado.', 'CUSTOM_PLAN_FORBIDDEN', 403);
            }
            if (plan.name === 'Free') {
                const existing = await this.subscriptionRepo.findByCompany(companyId);
                const started = existing?.free_plan_started_at;
                updateData.freePlanStartedAt = started ? new Date(started) : new Date();
            }
        }
        const subscription = await this.subscriptionRepo.update(companyId, updateData);
        const plan = await this.planRepo.findById(subscription.plan_id);
        if (!plan) {
            throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
        }
        return {
            ...subscription,
            plan,
        };
    }
}
exports.SubscriptionService = SubscriptionService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const subscription_service_1 = require("./subscription.service");
const subscription_repository_1 = require("./subscription.repository");
const plan_repository_1 = require("../plans/plan.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const subscriptionRoutes = new hono_1.Hono();
exports.subscriptionRoutes = subscriptionRoutes;
// Rotas que não precisam de tenant (super_admin pode buscar de qualquer tenant)
subscriptionRoutes.use('/admin/*', auth_middleware_1.authMiddleware);
// Rotas normais precisam de tenant
subscriptionRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
subscriptionRoutes.use('/*', auth_middleware_1.authMiddleware);
const subscriptionRepo = new subscription_repository_1.SubscriptionRepository();
const planRepo = new plan_repository_1.PlanRepository();
const subscriptionService = new subscription_service_1.SubscriptionService(subscriptionRepo, planRepo);
subscriptionRoutes.get('/', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const subscription = await subscriptionService.getByCompany(companyId);
        return c.json({ data: { subscription } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
subscriptionRoutes.post('/', (0, zod_validator_1.zValidator)('json', core_1.CreateSubscriptionSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const data = c.req.valid('json');
        const subscription = await subscriptionService.create(companyId, { planId: data.planId }, { allowCustomPlan: false });
        return c.json({ data: { subscription } }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
subscriptionRoutes.put('/', (0, zod_validator_1.zValidator)('json', core_1.UpdateSubscriptionSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const data = c.req.valid('json');
        const subscription = await subscriptionService.update(companyId, data, { allowCustomPlan: false });
        return c.json({ data: { subscription } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
subscriptionRoutes.post('/cancel', (0, zod_validator_1.zValidator)('json', core_1.CancelSubscriptionSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        await subscriptionService.updateStatus(companyId, 'canceled');
        return c.json({ data: { success: true } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /subscriptions/admin?companyId=xxx
 * Buscar assinatura de uma empresa específica (apenas super_admin)
 */
subscriptionRoutes.get('/admin', async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const companyId = c.req.query('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
        }
        try {
            const subscription = await subscriptionService.getByCompany(companyId);
            return c.json({ data: { subscription } });
        }
        catch (error) {
            // Se não encontrar subscription, retornar null ao invés de erro
            if (error.code === 'SUBSCRIPTION_NOT_FOUND' || error.message?.includes('Subscription not found')) {
                return c.json({ data: { subscription: null } });
            }
            throw error;
        }
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /subscriptions/admin?companyId=xxx
 * Criar assinatura para uma empresa específica (apenas super_admin)
 */
subscriptionRoutes.post('/admin', (0, zod_validator_1.zValidator)('json', core_1.CreateSubscriptionSchema), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const companyId = c.req.query('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
        }
        const data = c.req.valid('json');
        const subscription = await subscriptionService.create(companyId, data, { allowCustomPlan: true });
        return c.json({ data: { subscription } }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * PUT /subscriptions/admin?companyId=xxx
 * Atualizar assinatura de uma empresa específica (apenas super_admin)
 */
subscriptionRoutes.put('/admin', (0, zod_validator_1.zValidator)('json', core_1.UpdateSubscriptionSchema), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const companyId = c.req.query('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
        }
        const data = c.req.valid('json');
        // Buscar subscription existente
        const existing = await subscriptionService.getByCompany(companyId);
        if (!existing) {
            // Criar nova se não existir (requer planId)
            if (!data.planId) {
                return c.json({ error: { message: 'planId is required when creating new subscription', code: 'VALIDATION_ERROR' } }, 400);
            }
            const subscription = await subscriptionService.create(companyId, { planId: data.planId }, { allowCustomPlan: true });
            return c.json({ data: { subscription } });
        }
        // Atualizar subscription (super_admin pode colocar customizado)
        const subscription = await subscriptionService.update(companyId, data, { allowCustomPlan: true });
        return c.json({ data: { subscription } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});

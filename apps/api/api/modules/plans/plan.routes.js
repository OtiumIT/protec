"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const plan_service_1 = require("./plan.service");
const plan_repository_1 = require("./plan.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const planRoutes = new hono_1.Hono();
exports.planRoutes = planRoutes;
// Instanciar services
const planRepo = new plan_repository_1.PlanRepository();
const planService = new plan_service_1.PlanService(planRepo);
/**
 * GET /plans
 * Listar todos os planos (público)
 */
planRoutes.get('/', async (c) => {
    try {
        const plans = await planService.list();
        return c.json({
            data: { plans },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
// Rotas protegidas (apenas admin ou super_admin)
planRoutes.use('/admin/*', auth_middleware_1.authMiddleware);
function canManagePlans(c) {
    const user = c.get('user');
    const jwt = c.get('jwt');
    const role = (user?.role ?? jwt?.role ?? '').toString().trim().toLowerCase();
    return role === 'admin' || role === 'super_admin';
}
/**
 * GET /plans/admin
 * Listar todos os planos para gestão (ativos + inativos)
 */
planRoutes.get('/admin', async (c) => {
    try {
        if (!canManagePlans(c)) {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const plans = await planService.listForAdmin();
        return c.json({ data: { plans } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /plans/admin
 * Criar plano (apenas admin ou super_admin)
 */
planRoutes.post('/admin', (0, zod_validator_1.zValidator)('json', core_1.CreatePlanSchema), async (c) => {
    try {
        if (!canManagePlans(c)) {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const data = c.req.valid('json');
        const plan = await planService.create({
            name: data.name,
            maxUsers: data.maxUsers,
            maxClients: data.maxClients,
            price: data.price,
            billingCycle: data.billingCycle,
            features: data.features,
            isCustom: data.isCustom,
            isManaged: data.isManaged,
        });
        return c.json({
            data: { plan },
        }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * PUT /plans/admin/:id
 * Atualizar plano (apenas admin)
 */
planRoutes.put('/admin/:id', (0, zod_validator_1.zValidator)('json', core_1.UpdatePlanSchema), async (c) => {
    try {
        if (!canManagePlans(c)) {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const plan = await planService.update(id, {
            name: data.name,
            maxUsers: data.maxUsers,
            maxClients: data.maxClients,
            price: data.price,
            billingCycle: data.billingCycle,
            features: data.features,
            isCustom: data.isCustom,
            isManaged: data.isManaged,
            status: data.status,
        });
        return c.json({
            data: { plan },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * DELETE /plans/admin/:id
 * Deletar plano (apenas admin)
 */
planRoutes.delete('/admin/:id', async (c) => {
    try {
        if (!canManagePlans(c)) {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const id = c.req.param('id');
        await planService.delete(id);
        return c.json({
            data: { success: true },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /plans/:id
 * Buscar plano por ID (público) - deve vir depois de /admin para não capturar "admin" como id
 */
planRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const plan = await planService.getById(id);
        return c.json({
            data: { plan },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});

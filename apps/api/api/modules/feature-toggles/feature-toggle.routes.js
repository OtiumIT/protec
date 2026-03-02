"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureToggleRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const feature_toggle_service_1 = require("./feature-toggle.service");
const feature_toggle_repository_1 = require("./feature-toggle.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const featureToggleRoutes = new hono_1.Hono();
exports.featureToggleRoutes = featureToggleRoutes;
// Aplicar authMiddleware em todas as rotas
featureToggleRoutes.use('/*', auth_middleware_1.authMiddleware);
// Criar grupo de rotas que precisam de tenant
const tenantRoutes = new hono_1.Hono();
tenantRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
// Rotas admin (super_admin pode gerenciar módulos de qualquer tenant)
featureToggleRoutes.use('/admin/*', auth_middleware_1.authMiddleware);
// Instanciar services
const repo = new feature_toggle_repository_1.FeatureToggleRepository();
const service = new feature_toggle_service_1.FeatureToggleService(repo);
/**
 * GET /modules
 * Listar módulos disponíveis
 */
featureToggleRoutes.get('/', async (c) => {
    try {
        console.log('[GET /modules] Listando módulos disponíveis...');
        const modules = await service.listAvailable();
        console.log(`[GET /modules] Encontrados ${modules.length} módulos:`, modules.map(m => ({ id: m.id, name: m.name, key: m.key })));
        return c.json({
            data: {
                modules,
            },
        });
    }
    catch (error) {
        console.error('[GET /modules] Erro ao listar módulos:', error);
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /modules/active
 * Listar módulos ativos do tenant
 */
tenantRoutes.get('/active', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const modules = await service.listActive(companyId);
        const keys = modules.map((m) => m.key);
        if (process.env.NODE_ENV !== 'production') {
            console.log('[GET /modules/active] companyId=', companyId, 'count=', modules.length, 'keys=', keys);
        }
        return c.json({
            data: {
                modules,
                _debug: process.env.NODE_ENV !== 'production' ? { companyId, count: modules.length, keys } : undefined,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /modules/:id/activate
 * Ativar módulo para o tenant
 */
tenantRoutes.post('/:id/activate', (0, zod_validator_1.zValidator)('json', core_1.ActivateModuleSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const currentUser = c.get('user');
        const moduleId = c.req.param('id');
        const data = c.req.valid('json');
        // Apenas admin pode ativar módulos
        if (currentUser.role !== 'admin') {
            return c.json({
                error: {
                    message: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const tenantModule = await service.activate(companyId, data.moduleId || moduleId, data.enabledUntil);
        return c.json({
            data: {
                module: tenantModule,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /modules/:id/deactivate
 * Desativar módulo para o tenant
 */
tenantRoutes.post('/:id/deactivate', (0, zod_validator_1.zValidator)('param', zod_1.z.object({ id: zod_1.z.string().uuid() })), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const currentUser = c.get('user');
        const { id: moduleId } = c.req.valid('param');
        // Apenas admin pode desativar módulos
        if (currentUser.role !== 'admin') {
            return c.json({
                error: {
                    message: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        await service.deactivate(companyId, moduleId);
        return c.json({
            data: {
                success: true,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /modules/admin/active?companyId=xxx
 * Listar módulos ativos de um tenant específico (apenas super_admin)
 */
featureToggleRoutes.get('/admin/active', async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const companyId = c.req.query('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
        }
        const modules = await service.listActive(companyId);
        return c.json({ data: { modules } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /modules/admin/:id/activate?companyId=xxx
 * Ativar módulo para um tenant específico (apenas super_admin)
 */
featureToggleRoutes.post('/admin/:id/activate', (0, zod_validator_1.zValidator)('json', core_1.ActivateModuleSchema), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const companyId = c.req.query('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
        }
        const moduleId = c.req.param('id');
        const data = c.req.valid('json');
        const tenantModule = await service.activate(companyId, data.moduleId || moduleId, data.enabledUntil);
        return c.json({ data: { module: tenantModule } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /modules/admin/:id/deactivate?companyId=xxx
 * Desativar módulo de um tenant específico (apenas super_admin)
 */
featureToggleRoutes.post('/admin/:id/deactivate', (0, zod_validator_1.zValidator)('param', zod_1.z.object({ id: zod_1.z.string().uuid() })), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const companyId = c.req.query('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
        }
        const { id: moduleId } = c.req.valid('param');
        await service.deactivate(companyId, moduleId);
        return c.json({ data: { success: true } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /modules/plans/:planId
 * Listar módulos associados a um plano (apenas super_admin)
 */
featureToggleRoutes.get('/plans/:planId', (0, zod_validator_1.zValidator)('param', core_1.PlanIdParamSchema), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const { planId } = c.req.valid('param');
        const modules = await service.getModulesByPlan(planId);
        return c.json({ data: { modules } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /modules/plans/:planId
 * Associar módulo a um plano (apenas super_admin)
 */
featureToggleRoutes.post('/plans/:planId', (0, zod_validator_1.zValidator)('param', core_1.PlanIdParamSchema), (0, zod_validator_1.zValidator)('json', core_1.AddModuleToPlanSchema), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const { planId } = c.req.valid('param');
        const { moduleId, isDefault } = c.req.valid('json');
        await service.addModuleToPlan(planId, moduleId, isDefault);
        return c.json({ data: { success: true } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * DELETE /modules/plans/:planId/:moduleId
 * Remover módulo de um plano (apenas super_admin)
 */
featureToggleRoutes.delete('/plans/:planId/:moduleId', (0, zod_validator_1.zValidator)('param', zod_1.z.object({ planId: zod_1.z.string().uuid(), moduleId: zod_1.z.string().uuid() })), async (c) => {
    try {
        const currentUser = c.get('user');
        if (currentUser.role !== 'super_admin') {
            return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
        }
        const { planId, moduleId } = c.req.valid('param');
        await service.removeModuleFromPlan(planId, moduleId);
        return c.json({ data: { success: true } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
// Montar rotas de tenant no router principal
featureToggleRoutes.route('/', tenantRoutes);

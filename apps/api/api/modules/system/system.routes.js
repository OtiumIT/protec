"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRoutes = void 0;
const hono_1 = require("hono");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const system_service_1 = require("./system.service");
const error_handler_1 = require("../../shared/utils/error-handler");
const systemRoutes = new hono_1.Hono();
exports.systemRoutes = systemRoutes;
const systemService = new system_service_1.SystemService();
// Todas as rotas de sistema requerem autenticação
systemRoutes.use('/*', auth_middleware_1.authMiddleware);
/**
 * GET /system/stats
 * Obter estatísticas do sistema (apenas super_admin)
 */
systemRoutes.get('/stats', async (c) => {
    try {
        const currentUser = c.get('user');
        // Apenas super_admin pode ver estatísticas do sistema
        if (currentUser.role !== 'super_admin') {
            return c.json({
                error: {
                    message: 'Only super admin can access system statistics',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const stats = await systemService.getDatabaseStats();
        return c.json({
            data: {
                stats,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /system/tenants
 * Listar todos os tenants (apenas super_admin)
 */
systemRoutes.get('/tenants', async (c) => {
    try {
        const currentUser = c.get('user');
        // Apenas super_admin pode listar tenants
        if (currentUser.role !== 'super_admin') {
            return c.json({
                error: {
                    message: 'Only super admin can list tenants',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const tenants = await systemService.getTenantsList();
        return c.json({
            data: {
                tenants,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});

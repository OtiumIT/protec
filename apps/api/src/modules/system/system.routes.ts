import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware';
import { SystemService } from './system.service';
import { errorHandler } from '../../shared/utils/error-handler';

const systemRoutes = new Hono();
const systemService = new SystemService();

// Todas as rotas de sistema requerem autenticação
systemRoutes.use('/*', authMiddleware);

/**
 * GET /system/stats
 * Obter estatísticas do sistema (apenas super_admin)
 */
systemRoutes.get('/stats', async (c) => {
  try {
    const currentUser = c.get('user');
    
    // Apenas super_admin pode ver estatísticas do sistema
    if (currentUser.role !== 'super_admin') {
      return c.json(
        {
          error: {
            message: 'Only super admin can access system statistics',
            code: 'FORBIDDEN',
          },
        },
        403
      );
    }

    const stats = await systemService.getDatabaseStats();

    return c.json({
      data: {
        stats,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
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
      return c.json(
        {
          error: {
            message: 'Only super admin can list tenants',
            code: 'FORBIDDEN',
          },
        },
        403
      );
    }

    const tenants = await systemService.getTenantsList();

    return c.json({
      data: {
        tenants,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { systemRoutes };

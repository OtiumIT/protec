import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware';
import { SystemService } from './system.service';
import { errorHandler } from '../../shared/utils/error-handler';
import { query } from '../../db/client';

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

/**
 * POST /system/log-client-error
 * Recebe erros reportados pelo frontend para persistir em api_error_logs.
 * Fire-and-forget: sempre retorna 204.
 */
systemRoutes.post('/log-client-error', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.body(null, 204);
    }
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
    const status = typeof body.status === 'number' ? body.status : 0;
    const code = typeof body.code === 'string' ? body.code : null;
    const message = typeof body.message === 'string' ? body.message : null;
    const meta = body.meta && typeof body.meta === 'object' ? JSON.stringify(body.meta) : null;

    if (!endpoint) {
      return c.body(null, 204);
    }

    const user = c.get('user');
    const companyId = c.req.header('X-Tenant-ID') || null;

    await query(
      `INSERT INTO public.api_error_logs (endpoint, method, status_code, error_code, error_message, company_id, user_id, meta, source)
       VALUES ($1, 'POST', $2, $3, $4, $5, $6, $7, 'client')`,
      [endpoint, status, code, message, companyId || null, user?.id ?? null, meta]
    );
  } catch {
    // Silencioso: não falhar a requisição
  }
  return c.body(null, 204);
});

export { systemRoutes };

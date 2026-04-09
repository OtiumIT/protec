import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { SystemService } from './system.service';
import { errorHandler } from '../../shared/utils/error-handler';
import { query } from '../../db/client';

const systemRoutes = new Hono();
const systemService = new SystemService();

const UsageLogSchema = z.object({
  module_key: z.string().min(1).max(100),
  feature_key: z.string().min(1).max(255),
  action: z.string().min(1).max(100),
  route_path: z.string().max(500).optional(),
  method: z.string().max(10).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  company_id: z.string().uuid().optional(),
});

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

/**
 * POST /system/usage-log
 * Persistência de logs de uso do frontend (cliques, navegação etc).
 */
systemRoutes.post('/usage-log', async (c) => {
  try {
    const currentUser = c.get('user');
    const jwtPayload = c.get('jwt');
    const parsedBody = UsageLogSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsedBody.success) {
      return c.body(null, 204);
    }

    const body = parsedBody.data;
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const companyId = isSuperAdmin ? body.company_id ?? jwtPayload?.companyId ?? null : jwtPayload?.companyId ?? null;

    await systemService.createUsageLog({
      companyId,
      userId: currentUser?.id ?? null,
      moduleKey: body.module_key,
      featureKey: body.feature_key,
      action: body.action,
      source: 'frontend',
      routePath: body.route_path ?? null,
      method: body.method ?? null,
      statusCode: body.status_code ?? null,
      metadata: body.metadata ?? {},
    });
  } catch {
    // Fire-and-forget: não bloquear frontend por falha de log
  }
  return c.body(null, 204);
});

/**
 * GET /system/module-usage
 * Resumo de uso global ou por tenant, termômetro e ranking de simulações — apenas super_admin.
 */
systemRoutes.get('/module-usage', async (c) => {
  try {
    const currentUser = c.get('user');
    if (currentUser?.role !== 'super_admin') {
      return c.json(
        {
          error: {
            message: 'Only super admin can access module usage summary',
            code: 'FORBIDDEN',
          },
        },
        403
      );
    }

    const requestedDays = parseInt(c.req.query('days') || '30', 10);
    const companyId = c.req.query('companyId') || null;

    const usage = await systemService.getModuleUsageSummary(requestedDays, companyId);
    return c.json({ data: { usage } }, 200);
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /system/global-client-thermometer
 * Termômetro de engajamento dos últimos N cadastros de cliente (global), com filtros — apenas super_admin.
 */
systemRoutes.get('/global-client-thermometer', async (c) => {
  try {
    const currentUser = c.get('user');
    if (currentUser?.role !== 'super_admin') {
      return c.json(
        {
          error: {
            message: 'Only super admin can access global client thermometer',
            code: 'FORBIDDEN',
          },
        },
        403
      );
    }

    const days = parseInt(c.req.query('days') || '30', 10);
    const limit = parseInt(c.req.query('limit') || '30', 10);
    const clientSearch = c.req.query('clientSearch')?.trim() || null;
    const companySearch = c.req.query('companySearch')?.trim() || null;
    const companyIdRaw = c.req.query('companyId')?.trim() || '';

    let companyId: string | null = null;
    if (companyIdRaw) {
      const parsed = z.string().uuid().safeParse(companyIdRaw);
      if (!parsed.success) {
        return c.json(
          {
            error: {
              message: 'companyId must be a valid UUID',
              code: 'VALIDATION_ERROR',
            },
          },
          400
        );
      }
      companyId = parsed.data;
    }

    const thermometer = await systemService.getGlobalClientThermometer({
      days,
      limit,
      clientSearch,
      companySearch,
      companyId,
    });

    return c.json({ data: { thermometer } }, 200);
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { systemRoutes };

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { FeatureToggleService } from './feature-toggle.service';
import { FeatureToggleRepository } from './feature-toggle.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { ActivateModuleSchema, AddModuleToPlanSchema, PlanIdParamSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const featureToggleRoutes = new Hono();

// Aplicar authMiddleware em todas as rotas
featureToggleRoutes.use('/*', authMiddleware);

// Criar grupo de rotas que precisam de tenant
const tenantRoutes = new Hono();
tenantRoutes.use('/*', tenantMiddleware);

// Rotas admin (super_admin pode gerenciar módulos de qualquer tenant)
featureToggleRoutes.use('/admin/*', authMiddleware);

// Instanciar services
const repo = new FeatureToggleRepository();
const service = new FeatureToggleService(repo);

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
  } catch (error) {
    console.error('[GET /modules] Erro ao listar módulos:', error);
    return errorHandler(error, c);
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
    const keys = modules.map((m: { key?: string }) => m.key);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[GET /modules/active] companyId=', companyId, 'count=', modules.length, 'keys=', keys);
    }

    return c.json({
      data: {
        modules,
        _debug: process.env.NODE_ENV !== 'production' ? { companyId, count: modules.length, keys } : undefined,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /modules/:id/activate
 * Ativar módulo para o tenant
 */
tenantRoutes.post(
  '/:id/activate',
  zValidator('json', ActivateModuleSchema),
  async (c) => {
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
        return c.json(
          {
            error: {
              message: 'Insufficient permissions',
              code: 'FORBIDDEN',
            },
          },
          403
        );
      }

      const tenantModule = await service.activate(
        companyId,
        data.moduleId || moduleId,
        data.enabledUntil
      );

      return c.json({
        data: {
          module: tenantModule,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /modules/:id/deactivate
 * Desativar módulo para o tenant
 */
tenantRoutes.post(
  '/:id/deactivate',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      const currentUser = c.get('user');
      const { id: moduleId } = c.req.valid('param');

    // Apenas admin pode desativar módulos
    if (currentUser.role !== 'admin') {
      return c.json(
        {
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
          },
        },
        403
      );
    }

    await service.deactivate(companyId, moduleId);

      return c.json({
        data: {
          success: true,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

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
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /modules/admin/:id/activate?companyId=xxx
 * Ativar módulo para um tenant específico (apenas super_admin)
 */
featureToggleRoutes.post(
  '/admin/:id/activate',
  zValidator('json', ActivateModuleSchema),
  async (c) => {
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
      
      const tenantModule = await service.activate(
        companyId,
        data.moduleId || moduleId,
        data.enabledUntil
      );
      
      return c.json({ data: { module: tenantModule } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /modules/admin/:id/deactivate?companyId=xxx
 * Desativar módulo de um tenant específico (apenas super_admin)
 */
featureToggleRoutes.post(
  '/admin/:id/deactivate',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
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
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /modules/plans/:planId
 * Listar módulos associados a um plano (apenas super_admin)
 */
featureToggleRoutes.get(
  '/plans/:planId',
  zValidator('param', PlanIdParamSchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }

      const { planId } = c.req.valid('param');
      const modules = await service.getModulesByPlan(planId);

      return c.json({ data: { modules } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /modules/plans/:planId
 * Associar módulo a um plano (apenas super_admin)
 */
featureToggleRoutes.post(
  '/plans/:planId',
  zValidator('param', PlanIdParamSchema),
  zValidator('json', AddModuleToPlanSchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }

      const { planId } = c.req.valid('param');
      const { moduleId, isDefault } = c.req.valid('json');

      await service.addModuleToPlan(planId, moduleId, isDefault);

      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /modules/plans/:planId/:moduleId
 * Remover módulo de um plano (apenas super_admin)
 */
featureToggleRoutes.delete(
  '/plans/:planId/:moduleId',
  zValidator('param', z.object({ planId: z.string().uuid(), moduleId: z.string().uuid() })),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }

      const { planId, moduleId } = c.req.valid('param');
      await service.removeModuleFromPlan(planId, moduleId);

      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

// Montar rotas de tenant no router principal
featureToggleRoutes.route('/', tenantRoutes);

export { featureToggleRoutes };

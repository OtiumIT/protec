import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { FeatureToggleService } from './feature-toggle.service';
import { FeatureToggleRepository } from './feature-toggle.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { ActivateModuleSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const featureToggleRoutes = new Hono();

// Aplicar middlewares globais
featureToggleRoutes.use('/*', tenantMiddleware);
featureToggleRoutes.use('/*', authMiddleware);

// Instanciar services
const repo = new FeatureToggleRepository();
const service = new FeatureToggleService(repo);

/**
 * GET /modules
 * Listar módulos disponíveis
 */
featureToggleRoutes.get('/', async (c) => {
  try {
    const modules = await service.listAvailable();

    return c.json({
      data: {
        modules,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /modules/active
 * Listar módulos ativos do tenant
 */
featureToggleRoutes.get('/active', async (c) => {
  try {
    const companyId = c.get('companyId');
    const modules = await service.listActive(companyId);

    return c.json({
      data: {
        modules,
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
featureToggleRoutes.post(
  '/:id/activate',
  zValidator('json', ActivateModuleSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
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
featureToggleRoutes.post('/:id/deactivate', async (c) => {
  try {
    const companyId = c.get('companyId');
    const currentUser = c.get('user');
    const moduleId = c.req.param('id');

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
});

export { featureToggleRoutes };

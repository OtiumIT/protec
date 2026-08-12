import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ComparativoRegimesService } from './comparativo-regimes.service';
import { ComparativoRegimesRepository } from './comparativo-regimes.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  ComparativoRegimesInputSchema,
  ComparativoRegimesSimulationIdParamSchema,
  ListComparativoRegimesQuerySchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const comparativoRegimesRoutes = new Hono();

comparativoRegimesRoutes.use('/*', tenantMiddleware);
comparativoRegimesRoutes.use('/*', authMiddleware);
comparativoRegimesRoutes.use('/*', requireModule('COMPARATIVO_REGIMES'));

const repo = new ComparativoRegimesRepository();
const service = new ComparativoRegimesService(repo);

comparativoRegimesRoutes.post(
  '/simulate',
  zValidator('json', ComparativoRegimesInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const result = await service.simulate(input);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

comparativoRegimesRoutes.post(
  '/simulate-and-save',
  zValidator('json', ComparativoRegimesInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { simulation_id, result } = await service.simulateAndSave(input, userId);
      return c.json({ data: { simulation_id, ...result } }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

comparativoRegimesRoutes.get(
  '/simulations',
  zValidator('query', ListComparativoRegimesQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const result = await service.list({
        client_id: query.client_id,
        page: query.page,
        limit: query.limit,
      });
      return c.json({
        data: {
          simulations: result.simulations,
          total: result.total,
          page: query.page,
          limit: query.limit,
        },
      });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

comparativoRegimesRoutes.get(
  '/simulations/:id',
  zValidator('param', ComparativoRegimesSimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const simulation = await service.getById(id);
      return c.json({ data: { simulation } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

comparativoRegimesRoutes.delete(
  '/simulations/:id',
  zValidator('param', ComparativoRegimesSimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      await service.delete(id);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

export { comparativoRegimesRoutes };

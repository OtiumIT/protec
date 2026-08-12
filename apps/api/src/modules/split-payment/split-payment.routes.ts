import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import { ClientRepository } from '../clients/client.repository';
import { SplitPaymentRepository } from './split-payment.repository';
import { SplitPaymentService } from './split-payment.service';
import { errorHandler } from '../../shared/utils/error-handler';
import {
  SplitPaymentInputSchema,
  CreateSplitPaymentSimulationSchema,
  ListSplitPaymentSimulationsQuerySchema,
  SplitPaymentSimulationIdParamSchema,
} from '@shared/core';

const routes = new Hono();

routes.use('/*', tenantMiddleware);
routes.use('/*', authMiddleware);
routes.use('/*', requireModule('SPLIT_PAYMENT'));

const repo = new SplitPaymentRepository();
const clientRepo = new ClientRepository();
const service = new SplitPaymentService(repo, clientRepo);

routes.post('/simulate', zValidator('json', SplitPaymentInputSchema), async (c) => {
  try {
    const input = c.req.valid('json');
    const result = service.simulate(input);
    return c.json({ data: result });
  } catch (err) {
    return errorHandler(err, c);
  }
});

routes.post('/simulate-and-save', zValidator('json', CreateSplitPaymentSimulationSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const userId = c.get('user')?.id;
    const data = await service.simulateAndSave(body, userId);
    return c.json({ data }, 201);
  } catch (err) {
    return errorHandler(err, c);
  }
});

routes.get('/simulations', zValidator('query', ListSplitPaymentSimulationsQuerySchema), async (c) => {
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
});

routes.get('/simulations/:id', zValidator('param', SplitPaymentSimulationIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.getById(id);
    return c.json({ data });
  } catch (err) {
    return errorHandler(err, c);
  }
});

routes.delete('/simulations/:id', zValidator('param', SplitPaymentSimulationIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    await service.delete(id);
    return c.body(null, 204);
  } catch (err) {
    return errorHandler(err, c);
  }
});

export { routes as splitPaymentRoutes };

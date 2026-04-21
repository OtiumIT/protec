import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import { ClientRepository } from '../clients/client.repository';
import { DistribuicaoLucrosSimulationsRepository } from './distribuicao-lucros-simulations.repository';
import { DistribuicaoLucrosSimulationsService } from './distribuicao-lucros-simulations.service';
import { errorHandler } from '../../shared/utils/error-handler';
import {
  CreateDistribuicaoLucrosSimulationSchema,
  UpdateDistribuicaoLucrosSimulationSchema,
  ListDistribuicaoLucrosSimulationsQuerySchema,
  DistribuicaoLucrosSimulationIdParamSchema,
} from '@shared/core';

const routes = new Hono();

routes.use('/*', tenantMiddleware);
routes.use('/*', authMiddleware);
routes.use('/*', requireModule('IRPF_ALTA_RENDA'));

const repo = new DistribuicaoLucrosSimulationsRepository();
const clientRepo = new ClientRepository();
const service = new DistribuicaoLucrosSimulationsService(repo, clientRepo);

routes.post('/', zValidator('json', CreateDistribuicaoLucrosSimulationSchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const userId = c.get('user')?.id;
    const data = await service.create(body, userId);
    return c.json({ data }, 201);
  } catch (err) {
    return errorHandler(err, c);
  }
});

routes.get('/', zValidator('query', ListDistribuicaoLucrosSimulationsQuerySchema), async (c) => {
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

routes.get('/:id', zValidator('param', DistribuicaoLucrosSimulationIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = await service.getById(id);
    return c.json({ data });
  } catch (err) {
    return errorHandler(err, c);
  }
});

routes.patch(
  '/:id',
  zValidator('param', DistribuicaoLucrosSimulationIdParamSchema),
  zValidator('json', UpdateDistribuicaoLucrosSimulationSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const data = await service.update(id, body);
      return c.json({ data });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

routes.delete('/:id', zValidator('param', DistribuicaoLucrosSimulationIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    await service.delete(id);
    return c.body(null, 204);
  } catch (err) {
    return errorHandler(err, c);
  }
});

export { routes as distribuicaoLucrosSimulationsRoutes };

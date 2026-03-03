import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SimuladorIN2306Service } from './simulador-in-2306.service';
import { SimuladorIN2306Repository } from './simulador-in-2306.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  SimulateIN2306InputSchema,
  SimulateTributarioIN2306InputSchema,
  ListIN2306SimulationsQuerySchema,
  IN2306SimulationIdParamSchema,
  UpdateIN2306SimulationInputSchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const simuladorIN2306Routes = new Hono();

simuladorIN2306Routes.use('/*', tenantMiddleware);
simuladorIN2306Routes.use('/*', authMiddleware);
simuladorIN2306Routes.use('/*', requireModule('SIMULADOR_IN_2306'));

const simuladorRepo = new SimuladorIN2306Repository();
const clientRepo = new ClientRepository();
const simuladorService = new SimuladorIN2306Service(simuladorRepo, clientRepo);

/**
 * POST /simulador-in-2306/simulate-tributario
 * Simulação tributária comparativa: 2025 x 2026 (IN 2.306) x Equiparação Hospitalar
 */
simuladorIN2306Routes.post(
  '/simulate-tributario',
  zValidator('json', SimulateTributarioIN2306InputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const result = await simuladorService.simulateTributario(input, userId);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * POST /simulador-in-2306/simulate
 * Executar simulação IN 2.306/2026 (legado - parcelamento simples)
 */
simuladorIN2306Routes.post(
  '/simulate',
  zValidator('json', SimulateIN2306InputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const result = await simuladorService.simulate(input, userId);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * GET /simulador-in-2306
 * Listar simulações salvas
 */
simuladorIN2306Routes.get(
  '/',
  zValidator('query', ListIN2306SimulationsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const result = await simuladorService.list({
        client_id: query.client_id,
        competence: query.competence,
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

/**
 * GET /simulador-in-2306/:id
 * Buscar simulação por ID
 */
simuladorIN2306Routes.get(
  '/:id',
  zValidator('param', IN2306SimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const simulation = await simuladorService.getById(id);
      return c.json({ data: { simulation } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * PATCH /simulador-in-2306/:id
 * Atualiza simulação existente. Re-simula com os dados enviados.
 */
simuladorIN2306Routes.patch(
  '/:id',
  zValidator('param', IN2306SimulationIdParamSchema),
  zValidator('json', UpdateIN2306SimulationInputSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { simulation, result_data } = await simuladorService.update(id, input, userId);
      return c.json({ data: { simulation, result_data } }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * DELETE /simulador-in-2306/:id
 * Excluir simulação
 */
simuladorIN2306Routes.delete(
  '/:id',
  zValidator('param', IN2306SimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const userId = c.get('user')?.id;
      await simuladorService.delete(id, userId);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

export { simuladorIN2306Routes };

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { IrpfAltaRendaService } from './irpf-alta-renda.service';
import { IrpfAltaRendaRepository } from './irpf-alta-renda.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  SimulateIrpfAltaRendaInputSchema,
  SimulateAndSaveIrpfAltaRendaInputSchema,
  ListIrpfAltaRendaQuerySchema,
  IrpfAltaRendaIdParamSchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const irpfAltaRendaRoutes = new Hono();

irpfAltaRendaRoutes.use('/*', tenantMiddleware);
irpfAltaRendaRoutes.use('/*', authMiddleware);
irpfAltaRendaRoutes.use('/*', requireModule('IRPF_ALTA_RENDA'));

const repo = new IrpfAltaRendaRepository();
const clientRepo = new ClientRepository();
const service = new IrpfAltaRendaService(repo, clientRepo);

/**
 * POST /irpf-alta-renda/simulate
 * Simula impacto tributário Lei 15.270/2025 (não persiste).
 */
irpfAltaRendaRoutes.post(
  '/simulate',
  zValidator('json', SimulateIrpfAltaRendaInputSchema),
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

/**
 * POST /irpf-alta-renda/simulate-and-save
 * Simula e salva no tenant (client_id e title opcionais).
 */
irpfAltaRendaRoutes.post(
  '/simulate-and-save',
  zValidator('json', SimulateAndSaveIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { registro, resultado } = await service.simulateAndSave(input, userId);
      return c.json({ data: { registro, resultado } }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * GET /irpf-alta-renda
 * Lista simulações salvas (filtros: client_id, ano, page, limit).
 */
irpfAltaRendaRoutes.get(
  '/',
  zValidator('query', ListIrpfAltaRendaQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const { items, total } = await service.list({
        client_id: query.client_id,
        ano: query.ano,
        page: query.page,
        limit: query.limit,
      });
      return c.json({
        data: { items, total, page: query.page, limit: query.limit },
      });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * GET /irpf-alta-renda/:id
 * Busca simulação por ID.
 */
irpfAltaRendaRoutes.get(
  '/:id',
  zValidator('param', IrpfAltaRendaIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const registro = await service.getById(id);
      return c.json({ data: { registro } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * DELETE /irpf-alta-renda/:id
 * Exclui simulação.
 */
irpfAltaRendaRoutes.delete(
  '/:id',
  zValidator('param', IrpfAltaRendaIdParamSchema),
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

export { irpfAltaRendaRoutes };

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { JudicialProcessService } from './judicial-process.service';
import { JudicialProcessRepository } from './judicial-process.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateJudicialProcessSchema, UpdateJudicialProcessSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';
import { query } from '../../db/client';

const judicialProcessRoutes = new Hono();

// Aplicar middlewares
judicialProcessRoutes.use('/*', authMiddleware);
judicialProcessRoutes.use('/*', tenantMiddleware);

// Instanciar services
const processRepo = new JudicialProcessRepository();
const clientRepo = new ClientRepository();
const processService = new JudicialProcessService(processRepo, clientRepo);

/**
 * GET /judicial-processes/client/:clientId
 * Listar processos judiciais de um cliente
 */
judicialProcessRoutes.get('/client/:clientId', async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
    }

    // Setar search_path para o schema do tenant
    const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
    await query(`SET search_path TO "${schemaName}", public`);

    const clientId = c.req.param('clientId');
    const processes = await processService.findByClientId(clientId);

    return c.json({ data: { processes } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /judicial-processes/:id
 * Buscar processo por ID
 */
judicialProcessRoutes.get('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
    }

    // Setar search_path para o schema do tenant
    const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
    await query(`SET search_path TO "${schemaName}", public`);

    const id = c.req.param('id');
    const process = await processService.findById(id);

    return c.json({ data: { process } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /judicial-processes/client/:clientId/eligible-theses
 * Obter teses elegíveis para um cliente
 */
judicialProcessRoutes.get('/client/:clientId/eligible-theses', async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
    }

    // Setar search_path para o schema do tenant
    const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
    await query(`SET search_path TO "${schemaName}", public`);

    const clientId = c.req.param('clientId');
    const eligibleTheses = await processService.getEligibleTheses(clientId);

    return c.json({ data: { eligible_theses: eligibleTheses } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /judicial-processes
 * Criar processo judicial
 */
judicialProcessRoutes.post(
  '/',
  zValidator('json', CreateJudicialProcessSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
      }

      // Setar search_path para o schema do tenant
      const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
      await query(`SET search_path TO "${schemaName}", public`);

      const data = c.req.valid('json');
      const process = await processService.create(data);

      return c.json({ data: { process } }, 201);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /judicial-processes/:id
 * Atualizar processo judicial
 */
judicialProcessRoutes.put(
  '/:id',
  zValidator('json', UpdateJudicialProcessSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
      }

      // Setar search_path para o schema do tenant
      const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
      await query(`SET search_path TO "${schemaName}", public`);

      const id = c.req.param('id');
      const data = c.req.valid('json');
      const process = await processService.update(id, data);

      return c.json({ data: { process } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /judicial-processes/:id
 * Deletar processo judicial
 */
judicialProcessRoutes.delete('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
    }

    // Setar search_path para o schema do tenant
    const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
    await query(`SET search_path TO "${schemaName}", public`);

    const id = c.req.param('id');
    await processService.delete(id);

    return c.json({ data: { success: true } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { judicialProcessRoutes };

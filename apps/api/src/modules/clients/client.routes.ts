import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ClientService } from './client.service';
import { ClientRepository } from './client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateClientSchema, UpdateClientSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const clientRoutes = new Hono();

// Aplicar middlewares globais
clientRoutes.use('/*', tenantMiddleware);
clientRoutes.use('/*', authMiddleware);

// Instanciar services
const clientRepo = new ClientRepository();
const clientService = new ClientService(clientRepo);

/**
 * GET /clients
 * Listar clientes com paginação
 */
clientRoutes.get('/', async (c) => {
  try {
    const companyId = c.get('companyId');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const status = c.req.query('status');

    const result = await clientService.list(companyId, { page, limit, status });

    return c.json({
      data: result,
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /clients/:id
 * Buscar cliente por ID
 */
clientRoutes.get('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');

    const client = await clientService.getById(id, companyId);

    return c.json({
      data: {
        client: {
          id: client.id,
          name: client.name,
          cnpj: client.cnpj,
          email: client.email,
          status: client.status,
          company_id: client.company_id,
          created_at: client.created_at,
          updated_at: client.updated_at,
        },
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /clients
 * Criar cliente
 */
clientRoutes.post(
  '/',
  zValidator('json', CreateClientSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const data = c.req.valid('json');

      const client = await clientService.create(companyId, {
        name: data.name,
        cnpj: data.cnpj,
        email: data.email,
      });

      return c.json(
        {
          data: {
            client: {
              id: client.id,
              name: client.name,
              cnpj: client.cnpj,
              email: client.email,
              status: client.status,
              company_id: client.company_id,
            },
          },
        },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /clients/:id
 * Atualizar cliente
 */
clientRoutes.put(
  '/:id',
  zValidator('json', UpdateClientSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const id = c.req.param('id');
      const data = c.req.valid('json');

      const client = await clientService.update(id, companyId, data);

      return c.json({
        data: {
          client: {
            id: client.id,
            name: client.name,
            cnpj: client.cnpj,
            email: client.email,
            status: client.status,
            company_id: client.company_id,
            updated_at: client.updated_at,
          },
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /clients/:id
 * Deletar cliente
 */
clientRoutes.delete('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');

    await clientService.delete(id, companyId);

    return c.json({
      data: {
        success: true,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { clientRoutes };

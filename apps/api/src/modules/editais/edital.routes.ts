import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { EditalRepository } from './edital.repository';
import { EditalService } from './edital.service';
import { errorHandler } from '../../shared/utils/error-handler';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  CreateEditalSchema,
  UpdateEditalSchema,
  ListEditaisQuerySchema,
  EditalIdParamSchema,
} from '@shared/core';

const editalRoutes = new Hono();

// Rotas de escrita (POST, PUT, DELETE) requerem autenticação
const protectedRoutes = new Hono();
protectedRoutes.use('/*', authMiddleware);

// Instanciar services
const editalRepo = new EditalRepository();
const editalService = new EditalService(editalRepo);

/**
 * GET /editais
 * Listar editais com filtros
 */
editalRoutes.get(
  '/',
  zValidator('query', ListEditaisQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const result = await editalService.list(query);

      return c.json(
        {
          data: {
            editais: result.editais,
            total: result.total,
            page: query.page,
            limit: query.limit,
          },
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /editais/active
 * Buscar editais ativos (dentro do prazo)
 */
editalRoutes.get('/active', async (c) => {
  try {
    const date = c.req.query('date'); // Opcional: YYYY-MM-DD
    const editais = await editalService.findActive(date);

    return c.json(
      {
        data: { editais },
      },
      200
    );
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /editais/:id
 * Buscar edital por ID
 */
editalRoutes.get(
  '/:id',
  zValidator('param', EditalIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const edital = await editalService.findById(id);

      return c.json(
        {
          data: { edital },
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /editais
 * Criar novo edital (requer autenticação)
 */
protectedRoutes.post(
  '/',
  zValidator('json', CreateEditalSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const userId = c.get('user')?.id;

      const edital = await editalService.create(data, userId);

      return c.json(
        {
          data: { edital },
        },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /editais/:id
 * Atualizar edital (requer autenticação)
 */
protectedRoutes.put(
  '/:id',
  zValidator('param', EditalIdParamSchema),
  zValidator('json', UpdateEditalSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const edital = await editalService.update(id, data);

      return c.json(
        {
          data: { edital },
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /editais/:id
 * Deletar edital (requer autenticação)
 */
protectedRoutes.delete(
  '/:id',
  zValidator('param', EditalIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      await editalService.delete(id);

      return c.json(
        {
          data: { success: true },
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

// Aplicar rotas protegidas
editalRoutes.route('/', protectedRoutes);

export { editalRoutes };

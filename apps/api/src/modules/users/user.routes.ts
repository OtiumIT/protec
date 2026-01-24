import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateUserSchema, UpdateUserSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const userRoutes = new Hono();

// Aplicar middlewares globais
userRoutes.use('/*', tenantMiddleware);
userRoutes.use('/*', authMiddleware);

// Instanciar services
const userRepo = new UserRepository();
const subscriptionService = new SubscriptionService();
const userService = new UserService(userRepo, subscriptionService);

/**
 * GET /users
 * Listar usuários com paginação
 */
userRoutes.get('/', async (c) => {
  try {
    const companyId = c.get('companyId');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const role = c.req.query('role');

    const result = await userService.list(companyId, { page, limit, role });

    return c.json({
      data: result,
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /users/:id
 * Buscar usuário por ID
 */
userRoutes.get('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');

    const user = await userService.getById(id, companyId);

    return c.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company_id: user.company_id,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /users
 * Criar usuário
 */
userRoutes.post(
  '/',
  zValidator('json', CreateUserSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const data = c.req.valid('json');

      const user = await userService.create(companyId, {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      return c.json(
        {
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              company_id: user.company_id,
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
 * PUT /users/:id
 * Atualizar usuário
 */
userRoutes.put(
  '/:id',
  zValidator('json', UpdateUserSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const currentUser = c.get('user');

      const user = await userService.update(id, companyId, data, currentUser);

      return c.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
            updated_at: user.updated_at,
          },
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /users/:id
 * Deletar usuário
 */
userRoutes.delete('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const currentUser = c.get('user');

    await userService.delete(id, companyId, currentUser);

    return c.json({
      data: {
        success: true,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { userRoutes };

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PlanService } from './plan.service';
import { PlanRepository } from './plan.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { CreatePlanSchema, UpdatePlanSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const planRoutes = new Hono();

// Instanciar services
const planRepo = new PlanRepository();
const planService = new PlanService(planRepo);

/**
 * GET /plans
 * Listar todos os planos (público)
 */
planRoutes.get('/', async (c) => {
  try {
    const plans = await planService.list();
    return c.json({
      data: { plans },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /plans/:id
 * Buscar plano por ID (público)
 */
planRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const plan = await planService.getById(id);
    return c.json({
      data: { plan },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

// Rotas protegidas (apenas admin)
planRoutes.use('/admin/*', authMiddleware);

/**
 * POST /plans/admin
 * Criar plano (apenas admin)
 */
planRoutes.post(
  '/admin',
  zValidator('json', CreatePlanSchema),
  async (c) => {
    try {
      const user = c.get('user');
      if (user?.role !== 'admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }

      const data = c.req.valid('json');
      const plan = await planService.create({
        name: data.name,
        maxUsers: data.maxUsers,
        price: data.price,
        billingCycle: data.billingCycle,
        features: data.features,
      });

      return c.json(
        {
          data: { plan },
        },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /plans/admin/:id
 * Atualizar plano (apenas admin)
 */
planRoutes.put(
  '/admin/:id',
  zValidator('json', UpdatePlanSchema),
  async (c) => {
    try {
      const user = c.get('user');
      if (user?.role !== 'admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }

      const id = c.req.param('id');
      const data = c.req.valid('json');
      const plan = await planService.update(id, {
        name: data.name,
        maxUsers: data.maxUsers,
        price: data.price,
        billingCycle: data.billingCycle,
        features: data.features,
        status: data.status,
      });

      return c.json({
        data: { plan },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /plans/admin/:id
 * Deletar plano (apenas admin)
 */
planRoutes.delete('/admin/:id', async (c) => {
  try {
    const user = c.get('user');
    if (user?.role !== 'admin') {
      return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
    }

    const id = c.req.param('id');
    await planService.delete(id);

    return c.json({
      data: { success: true },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { planRoutes };

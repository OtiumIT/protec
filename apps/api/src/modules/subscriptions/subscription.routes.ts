import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateSubscriptionSchema, UpdateSubscriptionSchema, CancelSubscriptionSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const subscriptionRoutes = new Hono();

// Rotas que não precisam de tenant (super_admin pode buscar de qualquer tenant)
subscriptionRoutes.use('/admin/*', authMiddleware);
// Rotas normais precisam de tenant
subscriptionRoutes.use('/*', tenantMiddleware);
subscriptionRoutes.use('/*', authMiddleware);

const subscriptionRepo = new SubscriptionRepository();
const planRepo = new PlanRepository();
const subscriptionService = new SubscriptionService(subscriptionRepo, planRepo);

subscriptionRoutes.get('/', async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const subscription = await subscriptionService.getByCompany(companyId);
    return c.json({ data: { subscription } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

subscriptionRoutes.post(
  '/',
  zValidator('json', CreateSubscriptionSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      const data = c.req.valid('json');
      const subscription = await subscriptionService.create(companyId, { planId: data.planId }, { allowCustomPlan: false });
      return c.json({ data: { subscription } }, 201);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

subscriptionRoutes.put(
  '/',
  zValidator('json', UpdateSubscriptionSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      const data = c.req.valid('json');
      const subscription = await subscriptionService.update(companyId, data, { allowCustomPlan: false });
      return c.json({ data: { subscription } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

subscriptionRoutes.post(
  '/cancel',
  zValidator('json', CancelSubscriptionSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      await subscriptionService.updateStatus(companyId, 'canceled');
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /subscriptions/admin?companyId=xxx
 * Buscar assinatura de uma empresa específica (apenas super_admin)
 */
subscriptionRoutes.get('/admin', async (c) => {
  try {
    const currentUser = c.get('user');
    if (currentUser.role !== 'super_admin') {
      return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
    }
    
    const companyId = c.req.query('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
    }
    
    try {
      const subscription = await subscriptionService.getByCompany(companyId);
      return c.json({ data: { subscription } });
    } catch (error: any) {
      // Se não encontrar subscription, retornar null ao invés de erro
      if (error.code === 'SUBSCRIPTION_NOT_FOUND' || error.message?.includes('Subscription not found')) {
        return c.json({ data: { subscription: null } });
      }
      throw error;
    }
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /subscriptions/admin?companyId=xxx
 * Criar assinatura para uma empresa específica (apenas super_admin)
 */
subscriptionRoutes.post(
  '/admin',
  zValidator('json', CreateSubscriptionSchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }
      
      const companyId = c.req.query('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
      }
      
      const data = c.req.valid('json');
      
      const subscription = await subscriptionService.create(companyId, data, { allowCustomPlan: true });
      return c.json({ data: { subscription } }, 201);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /subscriptions/admin?companyId=xxx
 * Atualizar assinatura de uma empresa específica (apenas super_admin)
 */
subscriptionRoutes.put(
  '/admin',
  zValidator('json', UpdateSubscriptionSchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }
      
      const companyId = c.req.query('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
      }
      
      const data = c.req.valid('json');
      
      // Buscar subscription existente
      const existing = await subscriptionService.getByCompany(companyId);
      if (!existing) {
        // Criar nova se não existir (requer planId)
        if (!data.planId) {
          return c.json({ error: { message: 'planId is required when creating new subscription', code: 'VALIDATION_ERROR' } }, 400);
        }
        const subscription = await subscriptionService.create(companyId, { planId: data.planId }, { allowCustomPlan: true });
        return c.json({ data: { subscription } });
      }

      // Atualizar subscription (super_admin pode colocar customizado)
      const subscription = await subscriptionService.update(companyId, data, { allowCustomPlan: true });
      return c.json({ data: { subscription } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { subscriptionRoutes };

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { PlanRepository } from '../billing/plan.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateSubscriptionSchema, UpdateSubscriptionSchema, CancelSubscriptionSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const subscriptionRoutes = new Hono();

subscriptionRoutes.use('/*', tenantMiddleware);
subscriptionRoutes.use('/*', authMiddleware);

const subscriptionRepo = new SubscriptionRepository();
const planRepo = new PlanRepository();
const subscriptionService = new SubscriptionService(subscriptionRepo, planRepo);

subscriptionRoutes.get('/', async (c) => {
  try {
    const companyId = c.get('companyId');
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
      const data = c.req.valid('json');
      const subscription = await subscriptionService.create(companyId, { planId: data.planId });
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
      const data = c.req.valid('json');
      const subscription = await subscriptionService.update(companyId, data);
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
      await subscriptionService.updateStatus(companyId, 'canceled');
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { subscriptionRoutes };

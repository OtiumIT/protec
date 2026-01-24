import { Hono } from 'hono';
import { BillingService } from './billing.service';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from './plan.repository';
import { errorHandler } from '../../shared/utils/error-handler';

const billingRoutes = new Hono();

const subscriptionRepo = new SubscriptionRepository();
const planRepo = new PlanRepository();
const billingService = new BillingService(subscriptionRepo, planRepo);

billingRoutes.post('/webhooks/stripe', async (c) => {
  try {
    const event = await c.req.json();
    await billingService.handleWebhook(event);
    return c.json({ received: true });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { billingRoutes };

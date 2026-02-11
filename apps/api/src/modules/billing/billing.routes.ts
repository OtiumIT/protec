import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { BillingService } from './billing.service';
import { StripeWebhookSchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const billingRoutes = new Hono();

const billingService = new BillingService();

billingRoutes.post(
  '/webhooks/stripe',
  zValidator('json', StripeWebhookSchema),
  async (c) => {
    try {
      const event = c.req.valid('json');
      await billingService.handleWebhook(event);
      return c.json({ received: true });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { billingRoutes };

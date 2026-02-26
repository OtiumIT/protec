import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { BillingService } from './billing.service';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { CompanyRepository } from '../companies/company.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { z } from 'zod';

const BillingPortalSessionSchema = z.object({ returnUrl: z.string().url() });
const BillingCheckoutSessionSchema = z.object({
  planId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
import { errorHandler } from '../../shared/utils/error-handler';

const subscriptionRepo = new SubscriptionRepository();
const planRepo = new PlanRepository();
const companyRepo = new CompanyRepository();
const billingService = new BillingService(subscriptionRepo, planRepo, companyRepo);

// ---- Webhook (raw body para validação da assinatura Stripe) ----
const billingWebhookRoutes = new Hono();

billingWebhookRoutes.post('/stripe', async (c) => {
  try {
    const signature = c.req.header('Stripe-Signature') ?? null;
    const rawBody = await c.req.text();
    await billingService.handleWebhook(rawBody, signature);
    return c.json({ received: true });
  } catch (error) {
    return errorHandler(error, c);
  }
});

// ---- Rotas autenticadas (portal e checkout) ----
const billingApiRoutes = new Hono();
billingApiRoutes.use('/*', tenantMiddleware);
billingApiRoutes.use('/*', authMiddleware);

billingApiRoutes.get('/invoices', async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const limit = Math.min(parseInt(c.req.query('limit') || '24', 10), 100);
    const invoices = await billingService.listInvoices(companyId, limit);
    return c.json({ data: { invoices } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

billingApiRoutes.post('/portal-session', zValidator('json', BillingPortalSessionSchema), async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const body = c.req.valid('json');
    const { url } = await billingService.createBillingPortalSession(companyId, body.returnUrl);
    return c.json({ data: { url } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

billingApiRoutes.post('/checkout-session', zValidator('json', BillingCheckoutSessionSchema), async (c) => {
  try {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const body = c.req.valid('json');
    const { url } = await billingService.createCheckoutSession(
      companyId,
      body.planId,
      body.successUrl,
      body.cancelUrl
    );
    return c.json({ data: { url } });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { billingWebhookRoutes, billingApiRoutes };

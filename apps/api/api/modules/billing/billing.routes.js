"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingApiRoutes = exports.billingWebhookRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const billing_service_1 = require("./billing.service");
const subscription_repository_1 = require("../subscriptions/subscription.repository");
const plan_repository_1 = require("../plans/plan.repository");
const company_repository_1 = require("../companies/company.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const zod_1 = require("zod");
const BillingPortalSessionSchema = zod_1.z.object({ returnUrl: zod_1.z.string().url() });
const BillingCheckoutSessionSchema = zod_1.z.object({
    planId: zod_1.z.string().uuid(),
    successUrl: zod_1.z.string().url(),
    cancelUrl: zod_1.z.string().url(),
});
const error_handler_1 = require("../../shared/utils/error-handler");
const subscriptionRepo = new subscription_repository_1.SubscriptionRepository();
const planRepo = new plan_repository_1.PlanRepository();
const companyRepo = new company_repository_1.CompanyRepository();
const billingService = new billing_service_1.BillingService(subscriptionRepo, planRepo, companyRepo);
// ---- Webhook (raw body para validação da assinatura Stripe) ----
const billingWebhookRoutes = new hono_1.Hono();
exports.billingWebhookRoutes = billingWebhookRoutes;
billingWebhookRoutes.post('/stripe', async (c) => {
    try {
        const signature = c.req.header('Stripe-Signature') ?? null;
        const rawBody = await c.req.text();
        await billingService.handleWebhook(rawBody, signature);
        return c.json({ received: true });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
// ---- Rotas autenticadas (portal e checkout) ----
const billingApiRoutes = new hono_1.Hono();
exports.billingApiRoutes = billingApiRoutes;
billingApiRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
billingApiRoutes.use('/*', auth_middleware_1.authMiddleware);
billingApiRoutes.get('/invoices', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const limit = Math.min(parseInt(c.req.query('limit') || '24', 10), 100);
        const invoices = await billingService.listInvoices(companyId, limit);
        return c.json({ data: { invoices } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
billingApiRoutes.post('/portal-session', (0, zod_validator_1.zValidator)('json', BillingPortalSessionSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const body = c.req.valid('json');
        const { url } = await billingService.createBillingPortalSession(companyId, body.returnUrl);
        return c.json({ data: { url } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
billingApiRoutes.post('/checkout-session', (0, zod_validator_1.zValidator)('json', BillingCheckoutSessionSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
        }
        const body = c.req.valid('json');
        const { url } = await billingService.createCheckoutSession(companyId, body.planId, body.successUrl, body.cancelUrl);
        return c.json({ data: { url } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});

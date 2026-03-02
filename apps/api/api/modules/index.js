"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const auth_routes_1 = require("./auth/auth.routes");
const user_routes_1 = require("./users/user.routes");
const company_routes_1 = require("./companies/company.routes");
const client_routes_1 = require("./clients/client.routes");
const plan_routes_1 = require("./plans/plan.routes");
const feature_toggle_routes_1 = require("./feature-toggles/feature-toggle.routes");
const subscription_routes_1 = require("./subscriptions/subscription.routes");
const billing_routes_1 = require("./billing/billing.routes");
const fiscal_file_routes_1 = require("./fiscal-files/fiscal-file.routes");
const system_routes_1 = require("./system/system.routes");
const rating_validator_routes_1 = require("./rating-validator/rating-validator.routes");
const edital_routes_1 = require("./editais/edital.routes");
const judicial_process_routes_1 = require("./judicial-processes/judicial-process.routes");
const simulador_in_2306_routes_1 = require("./simulador-in-2306/simulador-in-2306.routes");
const irpf_alta_renda_routes_1 = require("./irpf-alta-renda/irpf-alta-renda.routes");
const property_routes_1 = require("./properties/property.routes");
const debug_routes_1 = require("./debug/debug.routes");
const error_handler_1 = require("../shared/utils/error-handler");
const app = new hono_1.Hono();
// CORS: lê env em tempo de requisição (Vercel injeta em runtime)
// CORS_ORIGIN: URLs exatas separadas por vírgula
// CORS_ORIGIN_DOMAINS: domínios (ex: iataxsistemas.com.br) – aceita qualquer subdomínio
function getCorsConfig() {
    const raw = process.env.CORS_ORIGIN ?? '';
    const domainsRaw = process.env.CORS_ORIGIN_DOMAINS ?? '';
    const origins = raw
        ? raw.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
        : [];
    const domains = domainsRaw
        ? domainsRaw.split(',').map((d) => d.trim().toLowerCase().replace(/^\./, '')).filter(Boolean)
        : [];
    return { origins, domains };
}
function isOriginAllowed(origin, origins, domains) {
    if (!origin)
        return null;
    const normalized = origin.replace(/\/+$/, '');
    if (origins.length === 0 && domains.length === 0)
        return origin;
    if (origins.includes(normalized))
        return origin;
    const originHost = normalized.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    const originBase = originHost.replace(/^www\./, '');
    for (const allowed of origins) {
        const allowedBase = allowed.replace(/^https?:\/\//, '').split('/')[0].toLowerCase().replace(/^www\./, '');
        if (originBase === allowedBase)
            return origin;
    }
    for (const domain of domains) {
        if (originBase === domain || originBase.endsWith('.' + domain))
            return origin;
    }
    return null;
}
app.use('/*', (0, cors_1.cors)({
    origin: (origin) => {
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin ?? ''))
            return origin ?? '*';
        const { origins, domains } = getCorsConfig();
        return isOriginAllowed(origin ?? undefined, origins, domains) ?? null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials: true,
    maxAge: 86400,
}));
// Error handler global
app.onError((error, c) => {
    return (0, error_handler_1.errorHandler)(error, c);
});
// Agregar rotas dos módulos
app.route('/api/v1/auth', auth_routes_1.authRoutes);
app.route('/api/v1/users', user_routes_1.userRoutes);
app.route('/api/v1/companies', company_routes_1.companyRoutes);
app.route('/api/v1/clients', client_routes_1.clientRoutes);
app.route('/api/v1/plans', plan_routes_1.planRoutes);
app.route('/api/v1/modules', feature_toggle_routes_1.featureToggleRoutes);
app.route('/api/v1/subscriptions', subscription_routes_1.subscriptionRoutes);
app.route('/api/v1/webhooks', billing_routes_1.billingWebhookRoutes);
app.route('/api/v1/billing', billing_routes_1.billingApiRoutes);
app.route('/api/v1/fiscal-files', fiscal_file_routes_1.fiscalFileRoutes);
app.route('/api/v1/system', system_routes_1.systemRoutes);
app.route('/api/v1/rating-validator', rating_validator_routes_1.ratingValidatorRoutes);
app.route('/api/v1/editais', edital_routes_1.editalRoutes);
app.route('/api/v1/judicial-processes', judicial_process_routes_1.judicialProcessRoutes);
app.route('/api/v1/simulador-in-2306', simulador_in_2306_routes_1.simuladorIN2306Routes);
app.route('/api/v1/irpf-alta-renda', irpf_alta_renda_routes_1.irpfAltaRendaRoutes);
app.route('/api/v1/properties', property_routes_1.propertyRoutes);
app.route('/api/v1/debug', debug_routes_1.debugRoutes);
// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 404 handler (rota não encontrada) - retorna JSON para facilitar debug
app.notFound((c) => {
    return c.json({
        error: {
            message: 'Route not found',
            code: 'NOT_FOUND',
            path: c.req.path,
            method: c.req.method,
        },
    }, 404);
});
exports.default = app;

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './users/user.routes';
import { companyRoutes } from './companies/company.routes';
import { clientRoutes } from './clients/client.routes';
import { planRoutes } from './plans/plan.routes';
import { featureToggleRoutes } from './feature-toggles/feature-toggle.routes';
import { subscriptionRoutes } from './subscriptions/subscription.routes';
import { billingWebhookRoutes, billingApiRoutes } from './billing/billing.routes';
import { fiscalFileRoutes } from './fiscal-files/fiscal-file.routes';
import { systemRoutes } from './system/system.routes';
import { ratingValidatorRoutes } from './rating-validator/rating-validator.routes';
import { editalRoutes } from './editais/edital.routes';
import { judicialProcessRoutes } from './judicial-processes/judicial-process.routes';
import { simuladorIN2306Routes } from './simulador-in-2306/simulador-in-2306.routes';
import { irpfAltaRendaRoutes } from './irpf-alta-renda/irpf-alta-renda.routes';
import { propertyRoutes } from './properties/property.routes';
import { debugRoutes } from './debug/debug.routes';
import { errorHandler } from '../shared/utils/error-handler';

const app = new Hono();

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

function isOriginAllowed(origin: string | undefined, origins: string[], domains: string[]): string | null {
  if (!origin) return null;
  const normalized = origin.replace(/\/+$/, '');
  if (origins.length === 0 && domains.length === 0) return origin;
  if (origins.includes(normalized)) return origin;
  const originHost = normalized.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  const originBase = originHost.replace(/^www\./, '');
  for (const allowed of origins) {
    const allowedBase = allowed.replace(/^https?:\/\//, '').split('/')[0].toLowerCase().replace(/^www\./, '');
    if (originBase === allowedBase) return origin;
  }
  for (const domain of domains) {
    if (originBase === domain || originBase.endsWith('.' + domain)) return origin;
  }
  return null;
}

app.use('/*', cors({
  origin: (origin) => {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '')) return origin ?? '*';
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
  return errorHandler(error, c);
});

// Agregar rotas dos módulos
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/companies', companyRoutes);
app.route('/api/v1/clients', clientRoutes);
app.route('/api/v1/plans', planRoutes);
app.route('/api/v1/modules', featureToggleRoutes);
app.route('/api/v1/subscriptions', subscriptionRoutes);
app.route('/api/v1/webhooks', billingWebhookRoutes);
app.route('/api/v1/billing', billingApiRoutes);
app.route('/api/v1/fiscal-files', fiscalFileRoutes);
app.route('/api/v1/system', systemRoutes);
app.route('/api/v1/rating-validator', ratingValidatorRoutes);
app.route('/api/v1/editais', editalRoutes);
app.route('/api/v1/judicial-processes', judicialProcessRoutes);
app.route('/api/v1/simulador-in-2306', simuladorIN2306Routes);
app.route('/api/v1/irpf-alta-renda', irpfAltaRendaRoutes);
app.route('/api/v1/properties', propertyRoutes);
app.route('/api/v1/debug', debugRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root e /api (rewrite envia tudo para /api; handler pode receber path original)
app.get('/', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler - inclui path e url para debug do rewrite
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
        path: c.req.path,
        url: c.req.url,
        method: c.req.method,
      },
    },
    404
  );
});

export default app;

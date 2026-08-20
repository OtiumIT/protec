import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
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
import { propertyRoutes, propertyPublicRoutes } from './properties/property.routes';
import { distribuicaoLucrosSimulationsRoutes } from './distribuicao-lucros-simulations/distribuicao-lucros-simulations.routes';
import { gestaoImobiliariaRoutes, gestaoImobiliariaPublicRoutes } from './gestao-imobiliaria/gestao-imobiliaria.routes';
import { mapeamentoDespesasPjRoutes } from './mapeamento-despesas-pj/mapeamento-despesas-pj.routes';
import { accessListRoutes } from './access-list/access-list.routes';
import { simulationSharesRoutes, simulationSharesPublicRoutes } from './simulation-shares/simulation-shares.routes';
import { comparativoRegimesRoutes } from './comparativo-regimes/comparativo-regimes.routes';
import { precificadorRoutes } from './precificador/precificador.routes';
import { splitPaymentRoutes } from './split-payment/split-payment.routes';
import { atividadeImobiliariaRoutes } from './atividade-imobiliaria/atividade-imobiliaria.routes';
import { feedbackRoutes } from './feedback/feedback.routes';
import { FeedbackService } from './feedback/feedback.service';
import { debugRoutes } from './debug/debug.routes';
import { authMiddleware } from '../middleware/auth.middleware';
import { errorHandler } from '../shared/utils/error-handler';
import { API_VERSION, API_UPDATED_AT } from '../version';
import { verifyAccessToken } from '../shared/utils/jwt';
import { query } from '../db/client';

const app = new Hono();
const API_DOCS_BASE = '/api/v1';

function normalizeRoutePath(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

const BUSINESS_USAGE_RULES: Array<{
  method: string;
  pathRegex: RegExp;
  moduleKey: string;
  featureKey: string;
  action: string;
}> = [
  { method: 'POST', pathRegex: /^\/api\/v1\/clients$/, moduleKey: 'clients', featureKey: 'create-client', action: 'create_client' },
  { method: 'POST', pathRegex: /^\/api\/v1\/fiscal-files\/upload$/, moduleKey: 'fiscal-files', featureKey: 'upload-fiscal-file', action: 'upload' },
  { method: 'POST', pathRegex: /^\/api\/v1\/simulador-in-2306\/simulate$/, moduleKey: 'simulador-in-2306', featureKey: 'simulate', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/simulador-in-2306\/simulate-tributario$/, moduleKey: 'simulador-in-2306', featureKey: 'simulate-tributario', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/irpf-alta-renda\/simulate$/, moduleKey: 'irpf-alta-renda', featureKey: 'simulate', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/irpf-alta-renda\/simulate-and-save$/, moduleKey: 'irpf-alta-renda', featureKey: 'simulate-and-save', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/rating-validator\/simulate$/, moduleKey: 'rating-validator', featureKey: 'simulate', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/rating-validator\/validate-by-competence$/, moduleKey: 'rating-validator', featureKey: 'validate-by-competence', action: 'validate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/rating-validator\/validate\/:id$/, moduleKey: 'rating-validator', featureKey: 'validate-by-file', action: 'validate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/properties\/simulate$/, moduleKey: 'properties', featureKey: 'simulate', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/properties\/simulate-and-save$/, moduleKey: 'properties', featureKey: 'simulate-and-save', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/properties\/simulate-standalone$/, moduleKey: 'properties', featureKey: 'simulate-standalone', action: 'simulate' },
  { method: 'POST', pathRegex: /^\/api\/v1\/properties\/simulate-standalone-and-save$/, moduleKey: 'properties', featureKey: 'simulate-standalone-and-save', action: 'simulate' },
];

function classifyUsage(method: string, path: string): { moduleKey: string; featureKey: string; action: string } | null {
  if (!path.startsWith('/api/v1/')) return null;

  const normalizedPath = normalizeRoutePath(path);
  const matchedRule = BUSINESS_USAGE_RULES.find(
    (rule) => rule.method === method && rule.pathRegex.test(normalizedPath)
  );

  if (!matchedRule) return null;

  return {
    moduleKey: matchedRule.moduleKey,
    featureKey: matchedRule.featureKey,
    action: matchedRule.action,
  };
}

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Protec API',
    version: API_VERSION,
    description: 'API principal da plataforma Protec.',
  },
  servers: [
    { url: API_DOCS_BASE, description: 'API v1 (relative)' },
    { url: 'http://localhost:3001/api/v1', description: 'Local dev' },
  ],
  tags: [
    { name: 'Fiscal Files', description: 'Upload, consulta e extração fiscal' },
    { name: 'System', description: 'Health e versão' },
  ],
  paths: {
    '/fiscal-files': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Listar arquivos fiscais',
      },
    },
    '/fiscal-files/upload': {
      post: {
        tags: ['Fiscal Files'],
        summary: 'Upload de arquivo fiscal',
      },
    },
    '/fiscal-files/inspect': {
      post: {
        tags: ['Fiscal Files'],
        summary: 'Inspecionar arquivo SPED para autoidentificação',
      },
    },
    '/fiscal-files/{id}': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Buscar arquivo fiscal por ID',
      },
      delete: {
        tags: ['Fiscal Files'],
        summary: 'Excluir arquivo fiscal',
      },
    },
    '/fiscal-files/{id}/summary': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Resumo consolidado de extração (rota principal)',
      },
    },
    '/fiscal-files/summary/{id}': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Resumo consolidado de extração (alias compatível)',
      },
    },
    '/fiscal-files/{id}/download': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Obter URL de download',
      },
    },
    '/fiscal-files/{id}/status': {
      put: {
        tags: ['Fiscal Files'],
        summary: 'Atualizar status do arquivo',
      },
    },
    '/fiscal-files/client/{client_id}': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Listar arquivos por cliente',
      },
    },
    '/fiscal-files/calibrator/rules': {
      get: {
        tags: ['Fiscal Files'],
        summary: 'Listar regras do calibrador',
      },
      post: {
        tags: ['Fiscal Files'],
        summary: 'Criar regra do calibrador',
      },
    },
    '/fiscal-files/calibrator/rules/{id}': {
      put: {
        tags: ['Fiscal Files'],
        summary: 'Atualizar regra do calibrador',
      },
      delete: {
        tags: ['Fiscal Files'],
        summary: 'Excluir regra do calibrador',
      },
    },
    '/version': {
      get: {
        tags: ['System'],
        summary: 'Versão da API',
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
      },
    },
  },
};

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

// Auditoria de uso: registra qualquer chamada de API (autenticada ou pública relevante)
app.use('/api/v1/*', async (c, next) => {
  const startedAt = Date.now();
  await next();

  try {
    const path = c.req.path;
    if (
      path === '/api/v1/system/usage-log' ||
      path === '/api/v1/swagger.json' ||
      path === '/api/v1/docs' ||
      path === '/api/v1/version'
    ) {
      return;
    }

    const classification = classifyUsage(c.req.method, path);
    if (!classification) return;

    const authHeader = c.req.header('Authorization');
    let userId: string | null = null;
    let companyId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(authHeader.substring(7));
        userId = payload.userId ?? null;
        companyId = payload.companyId ?? null;
      } catch {
        // Mantém log mesmo sem usuário válido para troubleshooting de uso
      }
    }

    const latencyMs = Date.now() - startedAt;

    await query(
      `INSERT INTO public.module_usage_logs
         (company_id, user_id, module_key, feature_key, action, method, route_path, status_code, source, metadata)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, 'api', $9::jsonb)`,
      [
        companyId,
        userId,
        classification.moduleKey,
        classification.featureKey,
        classification.action,
        c.req.method,
        normalizeRoutePath(path),
        c.res.status,
        JSON.stringify({ latency_ms: latencyMs }),
      ]
    );
  } catch {
    // O log de uso nunca deve derrubar a API.
  }
});

// Error handler global
app.onError((error, c) => {
  return errorHandler(error, c);
});

// Rotas
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
app.route('/api/v1/properties/public', propertyPublicRoutes);
app.route('/api/v1/properties', propertyRoutes);
app.route('/api/v1/distribuicao-lucros-simulations', distribuicaoLucrosSimulationsRoutes);
// Público (read-only) deve ser registrado ANTES da versão autenticada para não herdar middleware de auth/tenant.
app.route('/api/v1/gestao-imobiliaria/public', gestaoImobiliariaPublicRoutes);
app.route('/api/v1/gestao-imobiliaria', gestaoImobiliariaRoutes);
app.route('/api/v1/mapeamento-despesas-pj', mapeamentoDespesasPjRoutes);
app.route('/api/v1/comparativo-regimes', comparativoRegimesRoutes);
app.route('/api/v1/precificador', precificadorRoutes);
app.route('/api/v1/split-payment', splitPaymentRoutes);
app.route('/api/v1/simulation-shares/public', simulationSharesPublicRoutes);
app.route('/api/v1/simulation-shares', simulationSharesRoutes);
app.route('/api/v1/access-list', accessListRoutes);
app.route('/api/v1/atividade-imobiliaria', atividadeImobiliariaRoutes);

/** Thread de feedback no router raiz (evita 404 se o merge do sub-app não expuser GET /thread/:id). */
const feedbackThreadParamSchema = z.object({ id: z.string().uuid() });
const feedbackThreadService = new FeedbackService();
app.get(
  '/api/v1/feedback/thread/:id',
  authMiddleware,
  zValidator('param', feedbackThreadParamSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.valid('param');
      const data = await feedbackThreadService.getThread(user, id);
      return c.json({ data });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

app.route('/api/v1/feedback', feedbackRoutes);
app.route('/api/v1/debug', debugRoutes);

app.get('/api/v1/swagger.json', (c) => c.json(openApiSpec));
app.get('/api/v1/docs', (c) =>
  c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Protec API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/v1/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
      });
    </script>
  </body>
</html>`)
);

// Health
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Versão da API (para acompanhamento no frontend)
app.get('/api/v1/version', (c) =>
  c.json({
    version: API_VERSION,
    updatedAt: API_UPDATED_AT ?? undefined,
  })
);

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

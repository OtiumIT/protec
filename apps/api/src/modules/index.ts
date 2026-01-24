import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './auth/auth.routes';
import { userRoutes } from './users/user.routes';
import { companyRoutes } from './companies/company.routes';
import { clientRoutes } from './clients/client.routes';
import { planRoutes } from './plans/plan.routes';
import { featureToggleRoutes } from './feature-toggles/feature-toggle.routes';
import { subscriptionRoutes } from './subscriptions/subscription.routes';
import { billingRoutes } from './billing/billing.routes';
import { errorHandler } from '../shared/utils/error-handler';

const app = new Hono();

// CORS
app.use('/*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  credentials: true,
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
app.route('/api/v1/webhooks', billingRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

/**
 * Rotas de debug (somente leitura) para inspecionar módulos/tenant no banco.
 * Usar apenas em desenvolvimento. Em produção, desabilitar ou proteger.
 */

import { Hono } from 'hono';
import { query } from '../../db/client';

const debugRoutes = new Hono();

/**
 * GET /debug/cors?origin=https://iataxsistemas.com.br
 * Valida se CORS_ORIGIN e CORS_ORIGIN_DOMAINS estão sendo lidos do ambiente.
 * Não expõe os valores, só se estão configurados e se a origem seria aceita.
 */
debugRoutes.get('/cors', (c) => {
  const corsOriginRaw = process.env.CORS_ORIGIN ?? '';
  const corsDomainsRaw = process.env.CORS_ORIGIN_DOMAINS ?? '';
  const corsOrigins = corsOriginRaw
    ? corsOriginRaw.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
    : [];
  const corsDomains = corsDomainsRaw
    ? corsDomainsRaw.split(',').map((d) => d.trim().toLowerCase().replace(/^\./, '')).filter(Boolean)
    : [];

  const testOrigin = c.req.query('origin') ?? 'https://iataxsistemas.com.br';
  const normalized = testOrigin.replace(/\/+$/, '');
  let wouldAllow = false;

  if (corsOrigins.length === 0 && corsDomains.length === 0) {
    wouldAllow = true;
  } else if (corsOrigins.includes(normalized)) {
    wouldAllow = true;
  } else {
    const originHost = normalized.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    const originBase = originHost.replace(/^www\./, '');
    for (const allowed of corsOrigins) {
      const allowedBase = allowed.replace(/^https?:\/\//, '').split('/')[0].toLowerCase().replace(/^www\./, '');
      if (originBase === allowedBase) {
        wouldAllow = true;
        break;
      }
    }
    if (!wouldAllow) {
      for (const domain of corsDomains) {
        if (originBase === domain || originBase.endsWith('.' + domain)) {
          wouldAllow = true;
          break;
        }
      }
    }
  }

  return c.json({
    corsOrigin: {
      configured: corsOriginRaw.length > 0,
      rawLength: corsOriginRaw.length,
      originsCount: corsOrigins.length,
      firstChars: corsOriginRaw ? corsOriginRaw.substring(0, 50) + (corsOriginRaw.length > 50 ? '...' : '') : '(vazio)',
    },
    corsOriginDomains: {
      configured: corsDomainsRaw.length > 0,
      domainsCount: corsDomains.length,
      values: corsDomains,
    },
    testOrigin,
    wouldAllow,
    nodeEnv: process.env.NODE_ENV,
  });
});

/**
 * GET /debug/modules-db
 * Executa os SELECTs de diagnóstico (modules, companies, tenant_modules, simulador ativo).
 */
debugRoutes.get('/modules-db', async (c) => {
  try {
    const [modulesRes, companiesRes, tenantModulesRes, simuladorRes] = await Promise.all([
      query<{ id: string; name: string; key: string; description: string | null }>(
        'SELECT id, name, key, description FROM modules ORDER BY name'
      ),
      query<{ id: string; name: string; domain: string | null }>(
        'SELECT id, name, domain FROM companies ORDER BY name'
      ),
      query<{ tenant_id: string; module_id: string; enabled_until: Date | null; module_key: string; module_name: string }>(
        `SELECT tm.tenant_id, tm.module_id, tm.enabled_until, m.key AS module_key, m.name AS module_name
         FROM tenant_modules tm
         JOIN modules m ON m.id = tm.module_id
         ORDER BY tm.tenant_id, m.key`
      ),
      query<{ tenant_id: string; company_name: string | null; enabled_until: Date | null }>(
        `SELECT tm.tenant_id, c.name AS company_name, tm.enabled_until
         FROM tenant_modules tm
         JOIN modules m ON m.id = tm.module_id
         LEFT JOIN companies c ON c.id = tm.tenant_id
         WHERE m.key = 'SIMULADOR_IN_2306'
         ORDER BY tm.tenant_id`
      ),
    ]);

    return c.json({
      modules: modulesRes.rows,
      companies: companiesRes.rows,
      tenant_modules: tenantModulesRes.rows,
      simulador_in_2306_active_for: simuladorRes.rows,
      now: new Date().toISOString(),
    });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      500
    );
  }
});

export { debugRoutes };

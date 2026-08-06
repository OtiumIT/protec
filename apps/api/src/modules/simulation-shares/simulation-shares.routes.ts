import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createHash } from 'crypto';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { errorHandler } from '../../shared/utils/error-handler';
import { query, runWithTenantClient } from '../../db/client';
import { SimulationSharesService } from './simulation-shares.service';

const service = new SimulationSharesService();

// ---- Authenticated routes ----
const simulationSharesRoutes = new Hono();
simulationSharesRoutes.use('/*', tenantMiddleware);
simulationSharesRoutes.use('/*', authMiddleware);

const CreateShareSchema = z.object({
  simulation_type: z.enum(['in_2306', 'irpf_alta_renda', 'distribuicao_lucros', 'locacao_pf_pj', 'ganho_capital_imovel']),
  simulation_id: z.string().uuid(),
  title: z.string().max(255).optional(),
  expires_in_days: z.number().int().min(1).max(365).default(30),
});

simulationSharesRoutes.post('/', zValidator('json', CreateShareSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const companyId = c.get('companyId');
    const userId = c.get('user')?.id;
    const result = await service.createShare(data, companyId, userId);
    return c.json({ data: result }, 201);
  } catch (err) {
    return errorHandler(err, c);
  }
});

// ---- Public routes (no auth) ----
const simulationSharesPublicRoutes = new Hono();

simulationSharesPublicRoutes.get('/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const reg = await query<{ company_id: string; expires_at: Date; revoked_at: Date | null }>(
      `SELECT company_id, expires_at, revoked_at FROM public.simulation_share_tokens_generic WHERE token_hash = $1`,
      [tokenHash]
    );
    const row = reg.rows[0];
    if (!row) return c.json({ error: { message: 'Link inválido', code: 'SHARE_NOT_FOUND' } }, 404);
    if (row.revoked_at) return c.json({ error: { message: 'Este link foi revogado', code: 'SHARE_REVOKED' } }, 403);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return c.json({ error: { message: 'Este link expirou', code: 'SHARE_EXPIRED' } }, 403);
    }

    const data = await runWithTenantClient(row.company_id, () =>
      service.getPublicShare(tokenHash)
    );

    const companyResult = await query<{ report_brand_name: string | null; report_logo_url: string | null }>(
      `SELECT report_brand_name, report_logo_url FROM public.companies WHERE id = $1`,
      [row.company_id]
    );
    const branding = companyResult.rows[0] ?? { report_brand_name: null, report_logo_url: null };

    return c.json({ data: { ...data, branding } });
  } catch (err) {
    return errorHandler(err, c);
  }
});

export { simulationSharesRoutes, simulationSharesPublicRoutes };

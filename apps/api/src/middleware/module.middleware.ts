import { Context, Next } from 'hono';
import { query } from '../db/client';

const FREE_PLAN_GRACE_DAYS = 7;

/**
 * Middleware para verificar se módulo está ativo.
 * Retorna 402 Payment Required se módulo não estiver ativo.
 * No plano Free, após 7 dias da primeira entrada, bloqueia acesso a todas as funcionalidades.
 *
 * Com FORCE_ALL_MODULES_ACTIVE=true no .env, a verificação é ignorada (útil para demo/apresentação).
 */
export function requireModule(moduleKey: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const companyId = c.get('companyId');
    const isCalibratorRoute = c.req.path.includes('/api/v1/fiscal-files/calibrator');

    if (!companyId) {
      return c.json(
        {
          error: {
            message: 'Tenant not identified',
            code: 'TENANT_REQUIRED',
          },
        },
        400
      );
    }

    if (process.env.FORCE_ALL_MODULES_ACTIVE === 'true' || process.env.FORCE_ALL_MODULES_ACTIVE === '1') {
      await next();
      return;
    }

    // Plano Free: após 7 dias da primeira entrada, bloquear todas as funcionalidades
    const subResult = await query<{ plan_name: string; free_plan_started_at: Date | null }>(
      `SELECT p.name AS plan_name, s.free_plan_started_at
       FROM public.subscriptions s
       JOIN public.plans p ON p.id = s.plan_id
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [companyId]
    );
    const sub = subResult.rows[0];
    if (sub?.plan_name === 'Free' && sub.free_plan_started_at) {
      const started = new Date(sub.free_plan_started_at).getTime();
      const now = Date.now();
      const sevenDaysMs = FREE_PLAN_GRACE_DAYS * 24 * 60 * 60 * 1000;
      if (now - started > sevenDaysMs) {
        return c.json(
          {
            error: {
              message:
                'O período de uso do plano Free encerrou. Assine um plano pago em "Meu plano" para continuar acessando as funcionalidades.',
              code: 'FREE_PLAN_EXPIRED',
            },
          },
          402
        );
      }
    }

    // Verificar se módulo está ativo (public.* para não depender do search_path após setTenantSchema)
    const result = await query<{ id: string }>(
      `SELECT tm.id 
       FROM public.tenant_modules tm
       JOIN public.modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`,
      [companyId, moduleKey]
    );

    if (isCalibratorRoute) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/281573c4-5f2f-4955-859d-61c0fbe4e1f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5323ff'},body:JSON.stringify({sessionId:'5323ff',runId:'pre-fix',hypothesisId:'H6',location:'apps/api/src/middleware/module.middleware.ts:module-check',message:'Module middleware evaluated calibrator request',data:{path:c.req.path,moduleKey,hasActiveModule:result.rows.length>0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

    if (result.rows.length === 0) {
      return c.json(
        {
          error: {
            message: `Module ${moduleKey} is not active`,
            code: 'MODULE_NOT_ACTIVE',
          },
        },
        402
      );
    }

    await next();
  };
}

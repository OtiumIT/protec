import { Context, Next } from 'hono';
import { query } from '../db/client';

/**
 * Acesso aos módulos no plano Free: válido até 31/05/2026 (inclusive).
 * A partir de 01/06/2026 00:00 (America/Sao_Paulo) o tenant no Free perde acesso às funcionalidades cobertas por requireModule.
 */
const FREE_PLAN_MODULE_ACCESS_END_MS = new Date('2026-06-01T00:00:00-03:00').getTime();

function isFreePlanModuleAccessExpired(): boolean {
  return Date.now() >= FREE_PLAN_MODULE_ACCESS_END_MS;
}

/** E-mails (separados por vírgula) que ignoram o corte do plano Free (31/05/2026). Ex.: FREE_PLAN_BYPASS_EMAILS=a@x.com,b@y.com */
function isFreePlanBypassEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.FREE_PLAN_BYPASS_EMAILS;
  if (!raw?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

/**
 * Middleware para verificar se módulo está ativo.
 * Retorna 402 Payment Required se módulo não estiver ativo.
 * No plano Free, após 31/05/2026 bloqueia acesso às funcionalidades dos módulos (a partir de 01/06/2026).
 *
 * Com FORCE_ALL_MODULES_ACTIVE=true no .env, a verificação é ignorada (útil para demo/apresentação).
 * Com FREE_PLAN_BYPASS_EMAILS (lista separada por vírgulas), esses usuários não são bloqueados pelo fim do período Free.
 */
export function requireModule(moduleKey: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const companyId = c.get('companyId');
    const user = c.get('user') as { email?: string } | undefined;

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

    if (!isFreePlanBypassEmail(user?.email)) {
      const subResult = await query<{ plan_name: string }>(
        `SELECT p.name AS plan_name
         FROM public.subscriptions s
         JOIN public.plans p ON p.id = s.plan_id
         WHERE s.company_id = $1
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [companyId]
      );
      const sub = subResult.rows[0];
      if (sub?.plan_name === 'Free' && isFreePlanModuleAccessExpired()) {
        return c.json(
          {
            error: {
              message:
                'O período de uso do plano Free encerrou em 31 de maio de 2026. Assine um plano pago em "Meu plano" para continuar acessando as funcionalidades.',
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

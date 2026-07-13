import { Context, Next } from 'hono';
import { query } from '../db/client';

/** Dias de trial do plano Free, contados a partir de `free_plan_started_at` (por cliente). */
const FREE_TRIAL_DAYS = 30;

/** E-mails (separados por vírgula) que ignoram o corte do plano Free. Ex.: FREE_PLAN_BYPASS_EMAILS=a@x.com,b@y.com */
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

function isFreeTrialExpired(freePlanStartedAt: Date | string | null | undefined): boolean {
  if (!freePlanStartedAt) return true;
  const started = new Date(freePlanStartedAt);
  if (Number.isNaN(started.getTime())) return true;
  const trialEnd = new Date(started);
  trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
  return Date.now() >= trialEnd.getTime();
}

/**
 * Middleware para verificar se módulo está ativo.
 * Retorna 402 Payment Required se módulo não estiver ativo.
 *
 * Plano Free: trial de 30 dias por cliente a partir de `free_plan_started_at`.
 * Após o trial, bloqueia acesso aos módulos (402 FREE_PLAN_EXPIRED) até assinar um plano pago.
 * A checagem do Free ocorre antes do atalho `enabled_until = NULL` (os módulos do Free
 * são gravados com NULL no cadastro).
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
      if (sub?.plan_name === 'Free') {
        if (isFreeTrialExpired(sub.free_plan_started_at)) {
          return c.json(
            {
              error: {
                message:
                  'O período de teste de 30 dias do plano Free encerrou. Assine um plano pago em "Meu plano" para continuar acessando as funcionalidades.',
                code: 'FREE_PLAN_EXPIRED',
              },
            },
            402
          );
        }
        // Trial ativo: libera acesso aos módulos cobertos pelo requireModule
        await next();
        return;
      }
    }

    // Planos não-Free (ou bypass): lógica padrão de tenant_modules
    const result = await query<{ id: string; enabled_until: Date | null }>(
      `SELECT tm.id, tm.enabled_until
       FROM public.tenant_modules tm
       JOIN public.modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`,
      [companyId, moduleKey]
    );

    // Módulo com enabled_until = NULL = ativação explícita e ilimitada
    // (ex.: EPS, planos pagos, ativações manuais).
    const hasUnlimitedAccess = result.rows.some((r) => r.enabled_until === null);
    if (hasUnlimitedAccess) {
      await next();
      return;
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

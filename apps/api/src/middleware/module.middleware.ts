import { Context, Next } from 'hono';
import { query } from '../db/client';

/**
 * Middleware para verificar se módulo está ativo
 * Retorna 402 Payment Required se módulo não estiver ativo.
 *
 * Com FORCE_ALL_MODULES_ACTIVE=true no .env, a verificação é ignorada (útil para demo/apresentação).
 */
export function requireModule(moduleKey: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const companyId = c.get('companyId');

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

    // Verificar se módulo está ativo (public.* para não depender do search_path após setTenantSchema)
    const result = await query<{ id: string }>(
      `SELECT tm.id 
       FROM public.tenant_modules tm
       JOIN public.modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`,
      [companyId, moduleKey]
    );

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'module.middleware.ts:requireModule',message:'module check',data:{companyId,moduleKey,found:result.rows.length>0},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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

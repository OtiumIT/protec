import { Context, Next } from 'hono';
import { query } from '../db/client';

/**
 * Middleware para verificar se módulo está ativo
 * Retorna 402 Payment Required se módulo não estiver ativo
 * 
 * Nota: Será atualizado quando FeatureToggleService for criado
 */
export function requireModule(moduleKey: string) {
  return async (c: Context, next: Next) => {
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

    // Verificar se módulo está ativo
    const result = await query<{ id: string }>(
      `SELECT tm.id 
       FROM tenant_modules tm
       JOIN modules m ON m.id = tm.module_id
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

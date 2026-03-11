import type { Context } from 'hono';
import { query } from '../../db/client';

/**
 * Persiste erro da API em api_error_logs para diagnóstico e suporte.
 * Não bloqueia a resposta (fire-and-forget).
 */
export async function logApiError(
  c: Context,
  statusCode: number,
  errorCode: string,
  errorMessage: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const endpoint = c.req.path;
    const method = c.req.method;
    let companyId: string | null = null;
    let userId: string | null = null;
    try {
      companyId = c.get('companyId') ?? null;
      const user = c.get('user');
      userId = user?.id ?? null;
    } catch {
      // user/companyId podem não estar definidos (ex: middleware retornou antes)
    }

    await query(
      `INSERT INTO public.api_error_logs (endpoint, method, status_code, error_code, error_message, company_id, user_id, meta, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'api')`,
      [endpoint, method, statusCode, errorCode, errorMessage, companyId, userId, meta ? JSON.stringify(meta) : null]
    );
  } catch (e) {
    console.error('[logApiError] Falha ao gravar log:', e);
  }
}

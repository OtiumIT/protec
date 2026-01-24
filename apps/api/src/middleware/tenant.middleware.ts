import { Context, Next } from 'hono';
import { query } from '../db/client';

/**
 * Middleware de Tenant
 * Extrai e valida company_id de:
 * 1. Subdomínio (ex: empresa.dominio.com)
 * 2. Header X-Tenant-ID
 * 3. Payload do JWT (preferencial para rotas autenticadas)
 */
export async function tenantMiddleware(c: Context, next: Next) {
  let companyId: string | undefined;

  // 1. Tentar extrair do header X-Tenant-ID
  companyId = c.req.header('X-Tenant-ID');

  // 2. Tentar extrair do subdomínio
  if (!companyId) {
    const host = c.req.header('host') || '';
    const subdomain = extractSubdomain(host);
    if (subdomain) {
      // Buscar company por domain
      const result = await query<{ id: string }>(
        'SELECT id FROM companies WHERE domain = $1',
        [subdomain]
      );
      if (result.rows.length > 0) {
        companyId = result.rows[0].id;
      }
    }
  }

  // 3. Tentar extrair do JWT (se já autenticado)
  if (!companyId) {
    const jwt = c.get('jwt');
    if (jwt?.companyId) {
      companyId = jwt.companyId;
    }
  }

  // Validar que companyId foi encontrado
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

  // Validar que tenant existe no banco
  const company = await query<{ id: string }>(
    'SELECT id FROM companies WHERE id = $1',
    [companyId]
  );

  if (company.rows.length === 0) {
    return c.json(
      {
        error: {
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
        },
      },
      404
    );
  }

  // Setar companyId no context
  c.set('companyId', companyId);

  // Se usar schema dinâmico, setar search_path
  // Descomente se usar múltiplos schemas:
  // await setTenantSchema(companyId);

  await next();
}

/**
 * Extrair subdomínio do host
 * Ex: empresa.dominio.com -> empresa
 */
function extractSubdomain(host: string): string | null {
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

import { Context, Next } from 'hono';
import { query, setTenantSchema } from '../db/client';

/**
 * Middleware de Tenant
 * Extrai e valida company_id de:
 * 1. Subdomínio (ex: empresa.dominio.com)
 * 2. Header X-Tenant-ID
 * 3. Payload do JWT (preferencial para rotas autenticadas)
 */
export async function tenantMiddleware(c: Context, next: Next): Promise<Response | void> {
  let companyId: string | undefined;

  // 1. Tentar extrair do header X-Tenant-ID
  companyId = c.req.header('X-Tenant-ID');
  console.log('[tenantMiddleware] 1. Header X-Tenant-ID:', companyId);

  // 2. Tentar extrair do query parameter companyId (para rotas admin)
  if (!companyId) {
    companyId = c.req.query('companyId');
    console.log('[tenantMiddleware] 2. Query param companyId:', companyId);
  }

  // 3. Tentar extrair do subdomínio
  if (!companyId) {
    const host = c.req.header('host') || '';
    const subdomain = extractSubdomain(host);
    console.log('[tenantMiddleware] 3. Subdomain:', subdomain);
    if (subdomain) {
      // Buscar company por domain
      const result = await query<{ id: string }>(
        'SELECT id FROM companies WHERE domain = $1',
        [subdomain]
      );
      if (result.rows.length > 0) {
        companyId = result.rows[0].id;
        console.log('[tenantMiddleware] 3. CompanyId from subdomain:', companyId);
      }
    }
  }

  // 4. Tentar extrair do JWT (se já autenticado)
  if (!companyId) {
    const jwt = c.get('jwt');
    if (jwt?.companyId) {
      companyId = jwt.companyId;
      console.log('[tenantMiddleware] 4. CompanyId from JWT:', companyId);
    }
  }

  // 5. Verificar se é super_admin (não precisa de tenant obrigatório)
  const user = c.get('user');
  const path = c.req.path;
  const url = c.req.url;
  const rawPath = (c.req.raw as any)?.path || '';
  const isAdminRoute = path.includes('/admin') || url.includes('/admin') || rawPath.includes('/admin');
  
  console.log('[tenantMiddleware] Verificando:', { path, url, rawPath, isAdminRoute, userRole: user?.role, hasCompanyId: !!companyId });
  
  // Se for super_admin, sempre permitir (mas tentar usar companyId se disponível)
  if (user?.role === 'super_admin') {
    // Super admin não precisa de tenant obrigatório
    // Mas se houver companyId (do query param ou header), usar ele
    // Isso permite que super_admin trabalhe com tenants específicos
    console.log('[tenantMiddleware] Super admin detectado, permitindo:', { path, url, isAdminRoute, companyId });
    c.set('companyId', companyId || null);
    await next();
    return;
  }

  // Validar que companyId foi encontrado
  if (!companyId) {
    console.log('[tenantMiddleware] Tenant não identificado:', { path, url, rawPath, userRole: user?.role, isAdminRoute });
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

  // Setar search_path para o schema do tenant (schema-per-tenant)
  // Super admin não precisa setar schema (usa public)
  if (user?.role !== 'super_admin') {
    await setTenantSchema(companyId);
  }

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

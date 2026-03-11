import { Context, Next } from 'hono';
import { query, runWithTenantClient } from '../db/client';
import { verifyAccessToken } from '../shared/utils/jwt';

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
        'SELECT id FROM public.companies WHERE domain = $1',
        [subdomain]
      );
      if (result.rows.length > 0) {
        companyId = result.rows[0].id;
        console.log('[tenantMiddleware] 3. CompanyId from subdomain:', companyId);
      }
    }
  }

  // 4. Tentar extrair do JWT (decodifica diretamente — tenantMiddleware roda antes do authMiddleware)
  if (!companyId) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(authHeader.substring(7));
        if (payload?.companyId) {
          companyId = payload.companyId;
          console.log('[tenantMiddleware] 4. CompanyId from JWT decode:', companyId);
        }
      } catch {
        // Token inválido ou expirado — authMiddleware tratará depois
      }
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
          message: 'Não foi possível identificar a empresa. Verifique se está logado e tente novamente.',
          code: 'TENANT_REQUIRED',
        },
      },
      400
    );
  }

  // Validar que tenant existe no banco
  const company = await query<{ id: string }>(
    'SELECT id FROM public.companies WHERE id = $1',
    [companyId]
  );

  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hypothesisId:'H1',location:'tenant.middleware.ts:company-check',message:'Company lookup result',data:{companyId,found:company.rows.length>0,path:c.req.path},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (company.rows.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hypothesisId:'H1',location:'tenant.middleware.ts:return-404',message:'Returning 404 TENANT_NOT_FOUND',data:{companyId,path:c.req.path},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return c.json(
      {
        error: {
          message: 'Tenant not found. Verifique se o company_id (X-Tenant-ID ou JWT) existe em companies.',
          code: 'TENANT_NOT_FOUND',
          path: c.req.path,
        },
      },
      404
    );
  }

  // Setar companyId no context
  c.set('companyId', companyId);

  // Usar uma conexão por requisição com search_path do tenant (evita "tabela não encontrada")
  if (user?.role !== 'super_admin') {
    return runWithTenantClient(companyId, () => next());
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

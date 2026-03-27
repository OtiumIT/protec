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
  const isCalibratorRoute = c.req.path.includes('/api/v1/fiscal-files/calibrator');
  let companyId: string | undefined;
  let companyIdFromJwt: string | undefined;
  let roleFromJwt: string | undefined;

  // 1. Tentar extrair do header X-Tenant-ID
  companyId = c.req.header('X-Tenant-ID');

  // 2. Tentar extrair do query parameter companyId (para rotas admin)
  if (!companyId) {
    companyId = c.req.query('companyId');
  }

  // 3. Tentar extrair do subdomínio
  if (!companyId) {
    const host = c.req.header('host') || '';
    const subdomain = extractSubdomain(host);
    if (subdomain) {
      // Buscar company por domain
      const result = await query<{ id: string }>(
        'SELECT id FROM public.companies WHERE domain = $1',
        [subdomain]
      );
      if (result.rows.length > 0) {
        companyId = result.rows[0].id;
      }
    }
  }

  // 4. Tentar extrair do JWT (decodifica diretamente — tenantMiddleware roda antes do authMiddleware)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.substring(7));
      roleFromJwt = payload?.role;
      if (payload?.companyId) {
        companyIdFromJwt = payload.companyId;
      }
    } catch {
      // Token inválido ou expirado — authMiddleware tratará depois
    }
  }

  // 5. Segurança anti-tenant-spoofing: em rotas autenticadas, JWT é a fonte de verdade
  if (companyIdFromJwt && companyId && companyId !== companyIdFromJwt) {
    return c.json(
      {
        error: {
          message: 'Tenant inválido para o usuário autenticado.',
          code: 'TENANT_FORBIDDEN',
        },
      },
      403
    );
  }

  if (!companyId && companyIdFromJwt) {
    companyId = companyIdFromJwt;
  }

  // 6. Verificar se é super_admin (não precisa de tenant obrigatório)
  if (roleFromJwt === 'super_admin') {
    c.set('companyId', companyId || null);
    await next();
    return;
  }

  // Validar que companyId foi encontrado
  if (!companyId) {
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

  // Usuário autenticado não-admin sempre deve operar no próprio tenant do token
  if (companyIdFromJwt && companyId !== companyIdFromJwt) {
    return c.json(
      {
        error: {
          message: 'Acesso negado ao tenant informado.',
          code: 'TENANT_FORBIDDEN',
        },
      },
      403
    );
  }

  // Validar que tenant existe no banco
  const company = await query<{ id: string }>(
    'SELECT id FROM public.companies WHERE id = $1',
    [companyId]
  );

  if (company.rows.length === 0) {
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
  return runWithTenantClient(companyId, () => next());
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

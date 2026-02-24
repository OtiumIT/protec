import { Context, Next } from 'hono';
import { verifyAccessToken } from '../shared/utils/jwt';
import { query } from '../db/client';
import type { User } from '@shared/core';

/**
 * Middleware de Autenticação
 * Verifica JWT token e adiciona usuário ao context
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        error: {
          message: 'Authorization header missing or invalid',
          code: 'UNAUTHORIZED',
        },
      },
      401
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    // Verificar e decodificar token
    const payload = verifyAccessToken(token);

    // Buscar usuário no banco (sempre public.users; com search_path do tenant evita resolver para tabela do tenant)
    let result;
    if (payload.companyId === null || payload.companyId === undefined) {
      result = await query<User>(
        'SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE id = $1 AND tenant_id IS NULL',
        [payload.userId]
      );
    } else {
      result = await query<User>(
        'SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE id = $1 AND tenant_id = $2',
        [payload.userId, payload.companyId]
      );
    }

    if (result.rows.length === 0) {
      return c.json(
        {
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        },
        401
      );
    }

    const user = result.rows[0];

    // Adicionar ao context
    c.set('user', user);
    c.set('jwt', payload);

    await next();
  } catch (error) {
    if (error instanceof Error && error.message === 'Token expired') {
      return c.json(
        {
          error: {
            message: 'Token expired',
            code: 'TOKEN_EXPIRED',
          },
        },
        401
      );
    }

    return c.json(
      {
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
      },
      401
    );
  }
}

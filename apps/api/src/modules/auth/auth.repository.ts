import { BaseRepository } from '../../shared/repositories/base.repository';
import { query } from '../../db/client';
import type { User, RefreshToken } from '@shared/core';

export class AuthRepository extends BaseRepository {
  /**
   * Buscar usuário por email e tenant_id
   */
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const result = await this.query<User>(
      'SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar usuário por email (sem filtro de tenant - usado no login antes de identificar tenant)
   */
  async findByEmailOnly(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar senha hash do usuário
   */
  async findPasswordHash(userId: string, tenantId: string | null): Promise<string | null> {
    if (tenantId === null) {
      const result = await query<{ password_hash: string }>(
        'SELECT password_hash FROM public.users WHERE id = $1 AND tenant_id IS NULL',
        [userId]
      );
      return result.rows[0]?.password_hash || null;
    }
    const result = await this.query<{ password_hash: string }>(
      'SELECT password_hash FROM public.users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    return result.rows[0]?.password_hash || null;
  }

  /**
   * Criar refresh token
   */
  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<RefreshToken> {
    const result = await this.query<RefreshToken>(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, token, expires_at, created_at',
      [userId, token, expiresAt],
      false // refresh_tokens não requer company_id diretamente
    );
    return result.rows[0];
  }

  /**
   * Buscar refresh token
   */
  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const result = await this.query<RefreshToken>(
      'SELECT id, user_id, token, expires_at, created_at FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Deletar refresh token
   */
  async deleteRefreshToken(token: string): Promise<void> {
    await this.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [token],
      false
    );
  }

  /**
   * Deletar todos os refresh tokens de um usuário
   */
  async deleteRefreshTokensByUser(userId: string): Promise<void> {
    await this.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId],
      false
    );
  }
}

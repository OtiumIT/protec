import { BaseRepository } from '../../shared/repositories/base.repository';
import { query } from '../../db/client';
import type { User, RefreshToken } from '@shared/core';

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export class AuthRepository extends BaseRepository {
  /**
   * Buscar usuário por email e tenant_id
   */
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const result = await this.query<User>(
      `SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users
       WHERE lower(trim(email)) = $1 AND tenant_id = $2`,
      [email, tenantId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar usuário por email (sem filtro de tenant - login).
   * Parâmetro deve ser e-mail já normalizado (trim + lower).
   */
  async findByEmailOnly(email: string): Promise<User | null> {
    const result = await query<User>(
      `SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users
       WHERE lower(trim(email)) = $1 LIMIT 1`,
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

  // ──────────────────────────────────────────────────────────────
  // Password Reset
  // ──────────────────────────────────────────────────────────────

  /**
   * Criar token de recuperação de senha (expira em 1h).
   * Remove tokens anteriores não usados do mesmo usuário antes de criar.
   */
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await query(
      'DELETE FROM public.password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );
    await query(
      `INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  }

  /**
   * Buscar token de recuperação válido (não expirado e não usado).
   */
  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const result = await query<PasswordResetToken>(
      `SELECT id, user_id, token, expires_at, used_at, created_at
       FROM public.password_reset_tokens
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Marcar token como utilizado (uso único).
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await query(
      'UPDATE public.password_reset_tokens SET used_at = NOW() WHERE token = $1',
      [token]
    );
  }

  /**
   * Atualizar hash da senha do usuário.
   */
  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await query(
      'UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );
  }
}

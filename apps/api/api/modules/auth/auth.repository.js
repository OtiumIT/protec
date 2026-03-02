"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
const client_1 = require("../../db/client");
class AuthRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar usuário por email e tenant_id
     */
    async findByEmail(email, tenantId) {
        const result = await this.query('SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
        return result.rows[0] || null;
    }
    /**
     * Buscar usuário por email (sem filtro de tenant - usado no login antes de identificar tenant)
     */
    async findByEmailOnly(email) {
        const result = await (0, client_1.query)('SELECT id, email, name, tenant_id, role, created_at, updated_at FROM public.users WHERE email = $1', [email]);
        return result.rows[0] || null;
    }
    /**
     * Buscar senha hash do usuário
     */
    async findPasswordHash(userId, tenantId) {
        if (tenantId === null) {
            const result = await (0, client_1.query)('SELECT password_hash FROM public.users WHERE id = $1 AND tenant_id IS NULL', [userId]);
            return result.rows[0]?.password_hash || null;
        }
        const result = await this.query('SELECT password_hash FROM public.users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
        return result.rows[0]?.password_hash || null;
    }
    /**
     * Criar refresh token
     */
    async createRefreshToken(userId, token, expiresAt) {
        const result = await this.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, token, expires_at, created_at', [userId, token, expiresAt], false // refresh_tokens não requer company_id diretamente
        );
        return result.rows[0];
    }
    /**
     * Buscar refresh token
     */
    async findRefreshToken(token) {
        const result = await this.query('SELECT id, user_id, token, expires_at, created_at FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [token], false);
        return result.rows[0] || null;
    }
    /**
     * Deletar refresh token
     */
    async deleteRefreshToken(token) {
        await this.query('DELETE FROM refresh_tokens WHERE token = $1', [token], false);
    }
    /**
     * Deletar todos os refresh tokens de um usuário
     */
    async deleteRefreshTokensByUser(userId) {
        await this.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId], false);
    }
}
exports.AuthRepository = AuthRepository;

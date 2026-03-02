import { BaseRepository } from '../../shared/repositories/base.repository';
import type { User, RefreshToken } from '@shared/core';
export declare class AuthRepository extends BaseRepository {
    /**
     * Buscar usuário por email e tenant_id
     */
    findByEmail(email: string, tenantId: string): Promise<User | null>;
    /**
     * Buscar usuário por email (sem filtro de tenant - usado no login antes de identificar tenant)
     */
    findByEmailOnly(email: string): Promise<User | null>;
    /**
     * Buscar senha hash do usuário
     */
    findPasswordHash(userId: string, tenantId: string | null): Promise<string | null>;
    /**
     * Criar refresh token
     */
    createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
    /**
     * Buscar refresh token
     */
    findRefreshToken(token: string): Promise<RefreshToken | null>;
    /**
     * Deletar refresh token
     */
    deleteRefreshToken(token: string): Promise<void>;
    /**
     * Deletar todos os refresh tokens de um usuário
     */
    deleteRefreshTokensByUser(userId: string): Promise<void>;
}
//# sourceMappingURL=auth.repository.d.ts.map
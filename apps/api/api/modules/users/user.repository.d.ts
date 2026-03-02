import { BaseRepository } from '../../shared/repositories/base.repository';
import type { User } from '@shared/core';
export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role?: string;
}
export interface UpdateUserData {
    name?: string;
    email?: string;
    role?: string;
    status?: 'active' | 'inactive';
}
export declare class UserRepository extends BaseRepository {
    /**
     * Buscar usuário por ID e tenant_id
     */
    findById(id: string, tenantId: string): Promise<User | null>;
    /**
     * Buscar usuário por email e tenant_id
     */
    findByEmail(email: string, tenantId: string): Promise<User | null>;
    /**
     * Buscar usuário por email globalmente (para verificar duplicatas de super_admin)
     */
    findByEmailGlobal(email: string): Promise<User | null>;
    /**
     * Buscar todos os usuários com um email específico (para debug)
     */
    findAllByEmail(email: string): Promise<User[]>;
    /**
     * Criar usuário
     */
    create(tenantId: string, data: CreateUserData): Promise<User>;
    /**
     * Atualizar usuário
     */
    update(id: string, tenantId: string, data: UpdateUserData): Promise<User>;
    /**
     * Deletar usuário
     */
    delete(id: string, tenantId: string): Promise<void>;
    /**
     * Contar usuários por tenant (para validação de seats)
     */
    countByCompany(tenantId: string): Promise<number>;
    /**
     * Listar usuários por tenant (com paginação)
     */
    findByCompany(tenantId: string, options?: {
        page?: number;
        limit?: number;
        role?: string;
    }): Promise<{
        users: User[];
        total: number;
    }>;
    /**
     * Criar super_admin (sem tenant_id)
     */
    createSuperAdmin(data: CreateUserData): Promise<User>;
    /**
     * Listar todos os super_admins
     */
    findSuperAdmins(): Promise<User[]>;
}
//# sourceMappingURL=user.repository.d.ts.map
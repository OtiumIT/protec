import { UserRepository, CreateUserData, UpdateUserData } from './user.repository';
import { SubscriptionService } from '../subscriptions/subscription.service';
import type { User } from '@shared/core';
export declare class UserService {
    private userRepo;
    private subscriptionService;
    constructor(userRepo: UserRepository, subscriptionService: SubscriptionService);
    /**
     * Criar usuário com validação de seats
     */
    create(companyId: string, data: CreateUserData): Promise<User>;
    /**
     * Atualizar usuário com validação de permissões
     */
    update(id: string, companyId: string, data: UpdateUserData, currentUser: User): Promise<User>;
    /**
     * Deletar usuário
     */
    delete(id: string, companyId: string, currentUser: User): Promise<void>;
    /**
     * Listar usuários com paginação
     */
    list(companyId: string, options?: {
        page?: number;
        limit?: number;
        role?: string;
    }): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
    }>;
    /**
     * Buscar usuário por ID
     */
    getById(id: string, companyId: string): Promise<User>;
    /**
     * Criar super_admin (sem company_id)
     */
    createSuperAdmin(data: CreateUserData): Promise<User>;
    /**
     * Listar todos os super_admins
     */
    listSuperAdmins(): Promise<User[]>;
}
//# sourceMappingURL=user.service.d.ts.map
import { AuthRepository } from './auth.repository';
import { CompanyService } from '../companies/company.service';
import { UserRepository } from '../users/user.repository';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { JWTPayload } from '../../shared/utils/jwt';
import type { User, Company } from '@shared/core';
export interface AuthTokens {
    access: string;
    refresh: string;
}
/** Dados para cadastro de escritório de contabilidade (tenant) + usuário responsável */
export interface RegisterData {
    company: {
        legal_name: string;
        trade_name?: string;
        cnpj: string;
        phone?: string;
    };
    user: {
        name: string;
        email: string;
        password: string;
    };
}
export interface LoginData {
    email: string;
    password: string;
}
export declare class AuthService {
    private authRepo;
    private companyService;
    private userRepo;
    private subscriptionRepo;
    private planRepo;
    constructor(authRepo: AuthRepository, companyService: CompanyService, userRepo: UserRepository, subscriptionRepo: SubscriptionRepository, planRepo: PlanRepository);
    /**
     * Cadastrar escritório de contabilidade (tenant) e usuário responsável (admin).
     * Cria: company (com schema tenant), assinatura no plano Free, primeiro usuário admin.
     */
    register(data: RegisterData): Promise<{
        user: User;
        company: Company;
        tokens: AuthTokens;
    }>;
    /**
     * Login
     */
    login(email: string, password: string, companyId?: string): Promise<{
        user: User;
        tokens: AuthTokens;
    }>;
    /**
     * Renovar access token usando refresh token
     */
    refreshToken(token: string): Promise<{
        accessToken: string;
    }>;
    /**
     * Logout - invalidar refresh token
     */
    logout(token: string): Promise<void>;
    /**
     * Validar token JWT
     */
    validateToken(token: string): JWTPayload;
    /**
     * Gerar tokens (access + refresh)
     */
    private generateTokens;
}
//# sourceMappingURL=auth.service.d.ts.map
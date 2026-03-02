import { SubscriptionRepository, CreateSubscriptionData, UpdateSubscriptionData } from './subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import type { Subscription, Plan } from '@shared/core';
export declare class SubscriptionService {
    private subscriptionRepo;
    private planRepo;
    constructor(subscriptionRepo: SubscriptionRepository, planRepo: PlanRepository);
    /**
     * Criar assinatura.
     * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
     */
    create(companyId: string, data: CreateSubscriptionData, options?: {
        allowCustomPlan?: boolean;
    }): Promise<Subscription>;
    /**
     * Atualizar status da assinatura
     */
    updateStatus(companyId: string, status: 'active' | 'past_due' | 'canceled' | 'trialing'): Promise<Subscription>;
    /**
     * Buscar assinatura por empresa
     */
    getByCompany(companyId: string): Promise<Subscription & {
        plan: Plan;
    }>;
    /**
     * Verificar limite de usuários (seats)
     */
    checkSeatsLimit(companyId: string, currentUserCount: number): Promise<boolean>;
    /**
     * Verificar se assinatura está ativa
     */
    isActive(companyId: string): Promise<boolean>;
    /**
     * Atualizar assinatura.
     * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
     */
    update(companyId: string, data: UpdateSubscriptionData, options?: {
        allowCustomPlan?: boolean;
    }): Promise<Subscription & {
        plan: Plan;
    }>;
}
//# sourceMappingURL=subscription.service.d.ts.map
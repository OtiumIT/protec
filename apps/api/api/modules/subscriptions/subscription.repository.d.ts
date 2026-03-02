import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Subscription } from '@shared/core';
export interface CreateSubscriptionData {
    planId: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    freePlanStartedAt?: Date;
}
export interface UpdateSubscriptionData {
    planId?: string;
    status?: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    canceledAt?: Date;
    freePlanStartedAt?: Date;
}
export declare class SubscriptionRepository extends BaseRepository {
    /**
     * Buscar assinatura por company_id
     */
    findByCompany(companyId: string): Promise<Subscription | null>;
    /**
     * Buscar assinatura por Stripe subscription ID
     */
    findByStripeId(stripeSubscriptionId: string): Promise<Subscription | null>;
    /**
     * Criar assinatura
     */
    create(companyId: string, data: CreateSubscriptionData): Promise<Subscription>;
    /**
     * Atualizar assinatura
     */
    update(companyId: string, data: UpdateSubscriptionData): Promise<Subscription>;
    /**
     * Atualizar apenas status
     */
    updateStatus(companyId: string, status: 'active' | 'past_due' | 'canceled' | 'trialing'): Promise<Subscription>;
}
//# sourceMappingURL=subscription.repository.d.ts.map
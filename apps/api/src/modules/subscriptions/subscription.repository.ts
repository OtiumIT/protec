import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Subscription } from '@shared/core';

export interface CreateSubscriptionData {
  planId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface UpdateSubscriptionData {
  planId?: string;
  status?: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  canceledAt?: Date;
}

export class SubscriptionRepository extends BaseRepository {
  /**
   * Buscar assinatura por company_id
   */
  async findByCompany(companyId: string): Promise<Subscription | null> {
    const result = await this.query<Subscription>(
      `SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, created_at, updated_at
       FROM subscriptions 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [companyId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar assinatura por Stripe subscription ID
   */
  async findByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
    const result = await this.query<Subscription>(
      `SELECT id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, created_at, updated_at
       FROM subscriptions 
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId],
      false // Não requer company_id nesta query específica
    );
    return result.rows[0] || null;
  }

  /**
   * Criar assinatura
   */
  async create(companyId: string, data: CreateSubscriptionData): Promise<Subscription> {
    const result = await this.query<Subscription>(
      `INSERT INTO subscriptions (company_id, plan_id, status, stripe_subscription_id, stripe_customer_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, created_at, updated_at`,
      [
        companyId,
        data.planId,
        'active',
        data.stripeSubscriptionId || null,
        data.stripeCustomerId || null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Atualizar assinatura
   */
  async update(companyId: string, data: UpdateSubscriptionData): Promise<Subscription> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.planId !== undefined) {
      updates.push(`plan_id = $${paramIndex++}`);
      params.push(data.planId);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.currentPeriodStart !== undefined) {
      updates.push(`current_period_start = $${paramIndex++}`);
      params.push(data.currentPeriodStart);
    }
    if (data.currentPeriodEnd !== undefined) {
      updates.push(`current_period_end = $${paramIndex++}`);
      params.push(data.currentPeriodEnd);
    }
    if (data.stripeSubscriptionId !== undefined) {
      updates.push(`stripe_subscription_id = $${paramIndex++}`);
      params.push(data.stripeSubscriptionId);
    }
    if (data.stripeCustomerId !== undefined) {
      updates.push(`stripe_customer_id = $${paramIndex++}`);
      params.push(data.stripeCustomerId);
    }
    if (data.canceledAt !== undefined) {
      updates.push(`canceled_at = $${paramIndex++}`);
      params.push(data.canceledAt);
    }

    if (updates.length === 0) {
      return this.findByCompany(companyId) as Promise<Subscription>;
    }

    params.push(companyId);
    const result = await this.query<Subscription>(
      `UPDATE subscriptions 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE company_id = $${paramIndex++} 
       RETURNING id, company_id, plan_id, status, current_period_start, 
       current_period_end, stripe_subscription_id, stripe_customer_id, 
       canceled_at, created_at, updated_at`,
      params
    );
    return result.rows[0];
  }

  /**
   * Atualizar apenas status
   */
  async updateStatus(
    companyId: string,
    status: 'active' | 'past_due' | 'canceled' | 'trialing'
  ): Promise<Subscription> {
    return this.update(companyId, { status });
  }
}

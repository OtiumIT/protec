import { SubscriptionRepository, CreateSubscriptionData, UpdateSubscriptionData } from './subscription.repository';
import { PlanRepository } from '../billing/plan.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Subscription, Plan } from '@shared/core';

export class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private planRepo: PlanRepository
  ) {}

  /**
   * Criar assinatura
   */
  async create(companyId: string, data: CreateSubscriptionData): Promise<Subscription> {
    // Verificar se plano existe
    const plan = await this.planRepo.findById(data.planId);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }

    // Verificar se já existe assinatura ativa
    const existing = await this.subscriptionRepo.findByCompany(companyId);
    if (existing && ['active', 'trialing'].includes(existing.status)) {
      throw new AppError('Active subscription already exists', 'SUBSCRIPTION_EXISTS', 409);
    }

    return this.subscriptionRepo.create(companyId, data);
  }

  /**
   * Atualizar status da assinatura
   */
  async updateStatus(
    companyId: string,
    status: 'active' | 'past_due' | 'canceled' | 'trialing'
  ): Promise<Subscription> {
    return this.subscriptionRepo.updateStatus(companyId, status);
  }

  /**
   * Buscar assinatura por empresa
   */
  async getByCompany(companyId: string): Promise<Subscription & { plan: Plan }> {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription) {
      throw new AppError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', 404);
    }

    // Buscar plano associado
    const plan = await this.planRepo.findById(subscription.plan_id);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }

    return {
      ...subscription,
      plan,
    };
  }

  /**
   * Verificar limite de usuários (seats)
   */
  async checkSeatsLimit(companyId: string, currentUserCount: number): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription) {
      return false;
    }

    const plan = await this.planRepo.findById(subscription.plan_id);
    if (!plan) {
      return false;
    }

    return currentUserCount < plan.max_users;
  }

  /**
   * Verificar se assinatura está ativa
   */
  async isActive(companyId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findByCompany(companyId);
    if (!subscription) {
      return false;
    }

    return ['active', 'trialing'].includes(subscription.status);
  }

  /**
   * Atualizar assinatura
   */
  async update(companyId: string, data: UpdateSubscriptionData): Promise<Subscription> {
    return this.subscriptionRepo.update(companyId, data);
  }
}

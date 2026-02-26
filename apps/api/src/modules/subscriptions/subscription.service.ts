import { SubscriptionRepository, CreateSubscriptionData, UpdateSubscriptionData } from './subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Subscription, Plan } from '@shared/core';

export class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepository,
    private planRepo: PlanRepository
  ) {}

  /**
   * Criar assinatura.
   * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
   */
  async create(
    companyId: string,
    data: CreateSubscriptionData,
    options?: { allowCustomPlan?: boolean }
  ): Promise<Subscription> {
    const plan = await this.planRepo.findById(data.planId);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }
    const isCustom = (plan as any).is_custom === true || (plan as any).isCustom === true;
    if (isCustom && !options?.allowCustomPlan) {
      throw new AppError(
        'Apenas o administrador geral pode associar o plano customizado.',
        'CUSTOM_PLAN_FORBIDDEN',
        403
      );
    }

    const existing = await this.subscriptionRepo.findByCompany(companyId);
    if (existing && ['active', 'trialing'].includes(existing.status)) {
      throw new AppError('Active subscription already exists', 'SUBSCRIPTION_EXISTS', 409);
    }

    const createData: CreateSubscriptionData = { ...data };
    if ((plan as any).name === 'Free') {
      createData.freePlanStartedAt = new Date();
    }
    return this.subscriptionRepo.create(companyId, createData);
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
   * Atualizar assinatura.
   * @param options.allowCustomPlan - Se false (padrão), impede plano customizado (apenas super_admin pode).
   */
  async update(
    companyId: string,
    data: UpdateSubscriptionData,
    options?: { allowCustomPlan?: boolean }
  ): Promise<Subscription & { plan: Plan }> {
    const updateData: UpdateSubscriptionData = { ...data };
    if (data.planId) {
      const plan = await this.planRepo.findById(data.planId);
      if (!plan) {
        throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
      }
      const isCustom = (plan as any).is_custom === true || (plan as any).isCustom === true;
      if (isCustom && !options?.allowCustomPlan) {
        throw new AppError(
          'Apenas o administrador geral pode associar o plano customizado.',
          'CUSTOM_PLAN_FORBIDDEN',
          403
        );
      }
      if ((plan as any).name === 'Free') {
        const existing = await this.subscriptionRepo.findByCompany(companyId);
        const started = (existing as any)?.free_plan_started_at;
        updateData.freePlanStartedAt = started ? new Date(started) : new Date();
      }
    }

    const subscription = await this.subscriptionRepo.update(companyId, updateData);

    const plan = await this.planRepo.findById(subscription.plan_id);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }

    return {
      ...subscription,
      plan,
    };
  }
}

import apiRequest from '../../../shared/services/api';
import type { Plan } from '../../plans/services/plan.service';
function normalizeSubscription(sub: SubscriptionResponse['data']['subscription']): Subscription | null {
  if (!sub) return null;
  const plan = sub.plan as unknown as Record<string, unknown>;
  const normalizedPlan: Plan = {
    id: (plan?.id as string) ?? '',
    name: (plan?.name as string) ?? '',
    maxUsers: (plan?.max_users ?? plan?.maxUsers) as number ?? 0,
    maxClients: (plan?.max_clients ?? plan?.maxClients) as number ?? 0,
    price: typeof plan?.price === 'string' ? parseFloat(plan.price as string) : ((plan?.price as number) ?? 0),
    originalPrice: plan?.original_price != null
      ? (typeof plan.original_price === 'string' ? parseFloat(plan.original_price as string) : (plan.original_price as number))
      : (plan?.originalPrice as number | null | undefined) ?? null,
    billingCycle: ((plan?.billing_cycle ?? plan?.billingCycle) as Plan['billingCycle']) ?? 'monthly',
    features: Array.isArray(plan?.features) ? (plan.features as string[]) : [],
    isCustom: (plan?.is_custom ?? plan?.isCustom) as boolean | undefined,
    isManaged: (plan?.is_managed ?? plan?.isManaged) as boolean | undefined,
    status: (plan?.status as Plan['status']) ?? 'active',
  };
  return { ...sub, plan: normalizedPlan } as Subscription;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start?: string;
  current_period_end?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  canceled_at?: string;
  plan: Plan;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionResponse {
  data: {
    subscription: Subscription | null;
  };
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId: tenantId || null };
}

export const subscriptionService = {
  /**
   * Buscar assinatura da empresa do usuário logado (tenant)
   */
  async getMySubscription(): Promise<Subscription | null> {
    try {
      const { token, tenantId } = getAuthHeaders();
      const response = await apiRequest<SubscriptionResponse>('/api/v1/subscriptions', {
        method: 'GET',
        token,
        tenantId: tenantId ?? undefined,
      });
      return normalizeSubscription(response.data.subscription);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('SUBSCRIPTION_NOT_FOUND')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Criar assinatura (escolher primeiro plano quando ainda não tem)
   */
  async createMySubscription(planId: string): Promise<Subscription> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<SubscriptionResponse>('/api/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId }),
      token,
      tenantId: tenantId ?? undefined,
    });
    if (!response.data.subscription) {
      throw new Error('Resposta inválida da API');
    }
    return normalizeSubscription(response.data.subscription)!;
  },

  /**
   * Atualizar plano da assinatura (trocar de plano, ex.: Free → Standard)
   */
  async updatePlan(planId: string): Promise<Subscription> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<SubscriptionResponse>('/api/v1/subscriptions', {
      method: 'PUT',
      body: JSON.stringify({ planId }),
      token,
      tenantId: tenantId ?? undefined,
    });
    if (!response.data.subscription) {
      throw new Error('Resposta inválida da API');
    }
    return normalizeSubscription(response.data.subscription)!;
  },

  /**
   * Buscar assinatura de uma empresa (para super_admin)
   */
  async getByCompany(companyId: string): Promise<Subscription | null> {
    try {
      const { token } = getAuthHeaders();
      const response = await apiRequest<SubscriptionResponse>(
        `/api/v1/subscriptions/admin?companyId=${companyId}`,
        {
          method: 'GET',
          token,
        }
      );
      return normalizeSubscription(response.data.subscription);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }
  },
};

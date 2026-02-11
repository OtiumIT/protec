import apiRequest from '../../../shared/services/api';
import type { Plan } from '../../plans/services/plan.service';

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
      return response.data.subscription || null;
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }
  },
};

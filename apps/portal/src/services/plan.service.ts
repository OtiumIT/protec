import apiRequest from './api';

// Tipos
export interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  status?: 'active' | 'inactive';
}

export interface CreatePlanData {
  name: string;
  maxUsers: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
}

export interface UpdatePlanData {
  name?: string;
  maxUsers?: number;
  price?: number;
  billingCycle?: 'monthly' | 'yearly';
  features?: string[];
  status?: 'active' | 'inactive';
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId };
}

// Helper para converter formato da API
function convertPlan(plan: any): Plan {
  return {
    id: plan.id,
    name: plan.name,
    maxUsers: plan.max_users || plan.maxUsers,
    price: plan.price,
    billingCycle: plan.billing_cycle || plan.billingCycle,
    features: Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? JSON.parse(plan.features) : []),
    status: plan.status || 'active',
  };
}

export const planService = {
  async list(): Promise<Plan[]> {
    // Planos são públicos, não requerem autenticação
    const response = await apiRequest<{ data: { plans: any[] } }>(
      '/api/v1/plans',
      {}
    );
    return response.data.plans.map(convertPlan);
  },

  async getById(id: string): Promise<Plan | null> {
    try {
      const response = await apiRequest<{ data: { plan: any } }>(
        `/api/v1/plans/${id}`,
        {}
      );
      return convertPlan(response.data.plan);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }
  },

  async create(data: CreatePlanData): Promise<Plan> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { plan: any } }>(
      '/api/v1/plans/admin',
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          maxUsers: data.maxUsers,
          price: data.price,
          billingCycle: data.billingCycle,
          features: data.features,
        }),
        token,
        tenantId,
      }
    );
    return convertPlan(response.data.plan);
  },

  async update(id: string, data: UpdatePlanData): Promise<Plan> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { plan: any } }>(
      `/api/v1/plans/admin/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          maxUsers: data.maxUsers,
          price: data.price,
          billingCycle: data.billingCycle,
          features: data.features,
          status: data.status,
        }),
        token,
        tenantId,
      }
    );
    return convertPlan(response.data.plan);
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/plans/admin/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

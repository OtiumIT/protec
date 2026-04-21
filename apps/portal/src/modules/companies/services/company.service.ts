import apiRequest from '../../../shared/services/api';
import type { Company } from '@shared/core';

export interface CreateCompanyData {
  name: string;
  domain?: string;
}

export const companyService = {
  /**
   * Listar todas as empresas (apenas super_admin)
   */
  async list(): Promise<Company[]> {
    const { token } = getAuthHeaders();
    const response = await apiRequest<{ data: { companies: Company[]; total?: number } }>(
      '/api/v1/companies',
      {
        method: 'GET',
        token,
      }
    );
    return response.data.companies || [];
  },

  /**
   * Lista empresas com último plano (super_admin / Base de Entidades) — uma requisição, sem N+1.
   */
  async listWithSubscriptions(): Promise<
    Array<
      Company & {
        plan?: { id: string; name: string; isCustom?: boolean; isManaged?: boolean } | null;
        subscriptionStatus?: string | null;
      }
    >
  > {
    const { token } = getAuthHeaders();
    const response = await apiRequest<{
      data: {
        companies: Array<
          Company & {
            plan?: { id: string; name: string; isCustom?: boolean; isManaged?: boolean } | null;
            subscriptionStatus?: string | null;
          }
        >;
        total?: number;
      };
    }>('/api/v1/companies?includeSubscription=true', {
      method: 'GET',
      token,
    });
    return response.data.companies || [];
  },

  /**
   * Criar nova empresa
   */
  async create(data: CreateCompanyData): Promise<Company> {
    const { token } = getAuthHeaders();
    const response = await apiRequest<{ data: { company: Company } }>(
      '/api/v1/companies',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
      }
    );
    return response.data.company;
  },

  /**
   * Buscar empresa por ID
   */
  async getById(id: string): Promise<Company> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { company: Company } }>(
      `/api/v1/companies/${id}`,
      {
        method: 'GET',
        token,
        tenantId,
      }
    );
    return response.data.company;
  },

  /**
   * Atualizar empresa
   */
  async update(id: string, data: Partial<CreateCompanyData>): Promise<Company> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { company: Company } }>(
      `/api/v1/companies/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.company;
  },
};

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  return { token: token || undefined, tenantId: tenantId || undefined };
}

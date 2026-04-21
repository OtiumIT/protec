import apiRequest from '../../../shared/services/api';
import type {
  DistribuicaoLucrosSimulation,
  CreateDistribuicaoLucrosSimulationInput,
  UpdateDistribuicaoLucrosSimulationInput,
} from '@shared/core';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const distribuicaoLucrosSimulationsService = {
  async create(body: CreateDistribuicaoLucrosSimulationInput): Promise<DistribuicaoLucrosSimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: DistribuicaoLucrosSimulation }>(
      '/api/v1/distribuicao-lucros-simulations',
      { method: 'POST', body: JSON.stringify(body), token, tenantId }
    );
    return response.data;
  },

  async list(options: { client_id?: string; page?: number; limit?: number } = {}): Promise<{
    simulations: DistribuicaoLucrosSimulation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    const q = params.toString();
    const response = await apiRequest<{
      data: { simulations: DistribuicaoLucrosSimulation[]; total: number; page: number; limit: number };
    }>(`/api/v1/distribuicao-lucros-simulations${q ? `?${q}` : ''}`, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<DistribuicaoLucrosSimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: DistribuicaoLucrosSimulation }>(
      `/api/v1/distribuicao-lucros-simulations/${id}`,
      { token, tenantId }
    );
    return response.data;
  },

  async update(id: string, body: UpdateDistribuicaoLucrosSimulationInput): Promise<DistribuicaoLucrosSimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: DistribuicaoLucrosSimulation }>(
      `/api/v1/distribuicao-lucros-simulations/${id}`,
      { method: 'PATCH', body: JSON.stringify(body), token, tenantId }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/distribuicao-lucros-simulations/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

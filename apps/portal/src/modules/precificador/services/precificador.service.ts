import apiRequest from '../../../shared/services/api';
import type {
  PrecificadorInput,
  PrecificadorResult,
  PrecificadorSimulation,
  CreatePrecificadorSimulationInput,
} from '@shared/core';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const precificadorService = {
  async simulate(input: PrecificadorInput): Promise<PrecificadorResult> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PrecificadorResult }>(
      '/api/v1/precificador/simulate',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },

  async simulateAndSave(body: CreatePrecificadorSimulationInput): Promise<PrecificadorSimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PrecificadorSimulation }>(
      '/api/v1/precificador/simulate-and-save',
      { method: 'POST', body: JSON.stringify(body), token, tenantId }
    );
    return response.data;
  },

  async list(options: { client_id?: string; page?: number; limit?: number } = {}): Promise<{
    simulations: PrecificadorSimulation[];
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
      data: { simulations: PrecificadorSimulation[]; total: number; page: number; limit: number };
    }>(`/api/v1/precificador/simulations${q ? `?${q}` : ''}`, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<PrecificadorSimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PrecificadorSimulation }>(
      `/api/v1/precificador/simulations/${id}`,
      { token, tenantId }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/precificador/simulations/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

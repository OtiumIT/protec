import apiRequest from '../../../shared/services/api';
import type { ComparativoRegimesResult, ComparativoRegimesSimulation } from '@shared/core';

export interface ComparativoRegimesInput {
  faturamento_mensal: number[];
  folha_mensal: number[];
  custos_dedutiveis_mensal: number;
  cnae?: string;
  iss_aliquota: number;
  regime_atual?: 'lucro_presumido' | 'lucro_real' | 'simples_nacional';
  ano: number;
  client_id?: string;
  title?: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const comparativoRegimesService = {
  async simulate(input: ComparativoRegimesInput): Promise<ComparativoRegimesResult> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: ComparativoRegimesResult }>(
      '/api/v1/comparativo-regimes/simulate',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },

  async simulateAndSave(input: ComparativoRegimesInput): Promise<ComparativoRegimesResult & { simulation_id: string }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: ComparativoRegimesResult & { simulation_id: string } }>(
      '/api/v1/comparativo-regimes/simulate-and-save',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },

  async list(options: {
    client_id?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ simulations: ComparativoRegimesSimulation[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    const response = await apiRequest<{
      data: { simulations: ComparativoRegimesSimulation[]; total: number; page: number; limit: number };
    }>(`/api/v1/comparativo-regimes/simulations?${params.toString()}`, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<ComparativoRegimesSimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { simulation: ComparativoRegimesSimulation } }>(
      `/api/v1/comparativo-regimes/simulations/${id}`,
      { token, tenantId }
    );
    return response.data.simulation;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/comparativo-regimes/simulations/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

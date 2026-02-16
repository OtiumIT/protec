import apiRequest from '../../../shared/services/api';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
} from '@shared/core';

export interface IrpfAltaRendaRecord {
  id: string;
  client_id: string | null;
  ano: number;
  contribuinte_nome: string;
  contribuinte_cpf: string;
  rendimentos_tributaveis: number;
  dados_dividendos: { cnpj_fonte?: string; nome_fonte?: string; valor: number; codigo?: string }[];
  base_calculo_combinada: number;
  resultado_simulacao: IrpfAltaRendaSimulacaoResponse;
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const irpfAltaRendaService = {
  async simulate(input: SimulateIrpfAltaRendaInput): Promise<IrpfAltaRendaSimulacaoResponse> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: IrpfAltaRendaSimulacaoResponse }>(
      '/api/v1/irpf-alta-renda/simulate',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },

  async simulateAndSave(input: SimulateAndSaveIrpfAltaRendaInput): Promise<{
    registro: IrpfAltaRendaRecord;
    resultado: IrpfAltaRendaSimulacaoResponse;
  }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { registro: IrpfAltaRendaRecord; resultado: IrpfAltaRendaSimulacaoResponse };
    }>('/api/v1/irpf-alta-renda/simulate-and-save', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
      tenantId,
    });
    return response.data;
  },

  async list(options: {
    client_id?: string;
    ano?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: IrpfAltaRendaRecord[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.ano != null) params.append('ano', String(options.ano));
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    const response = await apiRequest<{
      data: { items: IrpfAltaRendaRecord[]; total: number; page: number; limit: number };
    }>(`/api/v1/irpf-alta-renda?${params.toString()}`, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<IrpfAltaRendaRecord> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { registro: IrpfAltaRendaRecord } }>(
      `/api/v1/irpf-alta-renda/${id}`,
      { token, tenantId }
    );
    return response.data.registro;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/irpf-alta-renda/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

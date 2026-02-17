import apiRequest, { getApiUrl } from '../../../shared/services/api';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
  DadosIrpfAltaRenda,
} from '@shared/core';

export interface ExtractFromPdfResult {
  ano: number;
  dados: DadosIrpfAltaRenda;
}

export interface IrpfAltaRendaRecord {
  id: string;
  company_id: string | null;
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
    company_id?: string;
    ano?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: IrpfAltaRendaRecord[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.company_id) params.append('company_id', options.company_id);
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

  /**
   * Envia um PDF (ex.: DAA) para extração de dados via OpenAI e retorna ano + dados para preencher o formulário.
   */
  async extractFromPdf(file: File): Promise<ExtractFromPdfResult> {
    const { token, tenantId } = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/irpf-alta-renda/extract-from-pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId ?? '',
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Falha na extração do PDF' } }));
      throw new Error(err.error?.message || 'Falha na extração do PDF');
    }
    const result = await response.json();
    return result.data;
  },
};

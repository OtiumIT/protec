import apiRequest from '../../../shared/services/api';
import type { IN2306Simulation } from '@shared/core';

export interface ReceitasTrimestre {
  produtos_mercadorias?: number;
  servicos?: number;
  servicos_favorecida?: number;
  servicos_hospitalares?: number;
  demais_receitas?: number;
}

export interface SimulateTributarioInput {
  ano: number;
  trimestres: ReceitasTrimestre[];
  deducoes_trimestrais?: { pis_cofins_zero?: number; icms_destacado?: number }[];
  retencoes_trimestrais?: { irrf?: number; orgaos_publicos?: number }[];
  aplicar_equiparacao_hospitalar?: boolean;
  client_id?: string;
  save_simulation?: boolean;
  title?: string;
}

export interface SimuladorTributarioResponse {
  ano: number;
  cenario_2025: CenarioAnualRef;
  cenario_2026: CenarioAnualRef;
  cenario_equiparacao?: CenarioAnualRef;
  comparativo: {
    imposto_a_maior_2026_vs_2025: number;
    imposto_a_maior_2026_vs_equiparacao?: number;
    economia_equiparacao_vs_2026?: number;
  };
  memoria_calculo?: Record<string, unknown>;
}

export interface TrimestreCenario {
  trimestre: number;
  receita_bruta: number;
  receita_excedente_limite?: number;
  base_calculo_irpj: number;
  base_calculo_csll: number;
  irpj: number;
  irpj_adicional?: number;
  csll: number;
  irpj_a_rec: number;
  csll_a_rec: number;
  pis_a_rec?: number;
  cofins_a_rec?: number;
}

interface CenarioAnualRef {
  receita_bruta_total: number;
  irpj_total: number;
  irpj_adicional_total?: number;
  csll_total: number;
  irpj_a_rec_total: number;
  csll_a_rec_total: number;
  pis_a_rec_total?: number;
  cofins_a_rec_total?: number;
  trimestres: TrimestreCenario[];
}

export interface SimulateIN2306Input {
  competence: string;
  client_id?: string;
  save_simulation?: boolean;
  title?: string;
  valor_total?: number;
  valor_entrada?: number;
  numero_parcelas?: number;
  tipo_calculo?: 'parcelamento' | 'refinanciamento' | 'simulacao';
  opcoes?: Record<string, unknown>;
}

export interface IN2306SimulationResult {
  simulation_id?: string;
  input_data: Record<string, unknown>;
  result_data: {
    valor_total: number;
    valor_entrada: number;
    valor_financiado: number;
    numero_parcelas: number;
    valor_parcela?: number;
    parcelas?: Array<{ numero: number; valor: number; vencimento?: string }>;
    resumo?: Record<string, unknown>;
  };
  is_simulation: boolean;
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const simuladorIN2306Service = {
  async simulateTributario(input: SimulateTributarioInput): Promise<SimuladorTributarioResponse & { simulation_id?: string }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: SimuladorTributarioResponse & { simulation_id?: string } }>(
      '/api/v1/simulador-in-2306/simulate-tributario',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },

  async simulate(input: SimulateIN2306Input): Promise<IN2306SimulationResult> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: IN2306SimulationResult }>(
      '/api/v1/simulador-in-2306/simulate',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },

  async list(options: {
    client_id?: string;
    competence?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ simulations: IN2306Simulation[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.competence) params.append('competence', options.competence);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    const response = await apiRequest<{
      data: { simulations: IN2306Simulation[]; total: number; page: number; limit: number };
    }>(`/api/v1/simulador-in-2306?${params.toString()}`, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<IN2306Simulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { simulation: IN2306Simulation } }>(
      `/api/v1/simulador-in-2306/${id}`,
      { token, tenantId }
    );
    return response.data.simulation;
  },

  async update(
    id: string,
    input: SimulateTributarioInput | SimulateIN2306Input
  ): Promise<{ simulation: IN2306Simulation; result_data: Record<string, unknown> }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: IN2306Simulation; result_data: Record<string, unknown> };
    }>(`/api/v1/simulador-in-2306/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      token,
      tenantId,
    });
    return response.data;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/simulador-in-2306/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

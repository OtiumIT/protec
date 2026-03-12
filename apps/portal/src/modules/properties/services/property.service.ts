import apiRequest from '../../../shared/services/api';
import type { Property, PropertyTransaction, PropertySimulation } from '@shared/core';
import type { PropertyTaxSimulationResponse, SimulateStandaloneInput } from '@shared/core';

export interface PropertyWithClient extends Property {
  client_name?: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const tenantId = localStorage.getItem('tenantId');

  if (!token) throw new Error('Not authenticated');
  if (user?.role === 'super_admin') {
    return { token, tenantId: undefined };
  }
  if (!tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const propertyService = {
  async list(params?: {
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ properties: PropertyWithClient[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.client_id) query.set('client_id', params.client_id);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = `/api/v1/properties${qs ? `?${qs}` : ''}`;
    const response = await apiRequest<{
      data: { properties: PropertyWithClient[]; total: number; page: number; limit: number };
    }>(url, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<PropertyWithClient | null> {
    const { token, tenantId } = getAuthHeaders();
    try {
      const response = await apiRequest<{ data: { property: PropertyWithClient } }>(
        `/api/v1/properties/${id}`,
        { token, tenantId }
      );
      return response.data.property;
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes('404')) return null;
      throw err;
    }
  },

  async create(data: {
    client_id: string;
    tipo_locacao: 'fixa' | 'flexivel';
    identificador: string;
    modo_entrada?: 'detalhado' | 'reduzido';
  }): Promise<Property> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { property: Property } }>(
      '/api/v1/properties',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.property;
  },

  async update(
    id: string,
    data: Partial<{ client_id: string; tipo_locacao: 'fixa' | 'flexivel'; identificador: string; modo_entrada: 'detalhado' | 'reduzido' }>
  ): Promise<Property> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { property: Property } }>(
      `/api/v1/properties/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.property;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/properties/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  async listTransactions(
    propertyId: string,
    params?: { ano?: number; mes?: string }
  ): Promise<PropertyTransaction[]> {
    const { token, tenantId } = getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.ano) query.set('ano', String(params.ano));
    if (params?.mes) query.set('mes', params.mes);
    const qs = query.toString();
    const response = await apiRequest<{ data: { transactions: PropertyTransaction[] } }>(
      `/api/v1/properties/${propertyId}/transactions${qs ? `?${qs}` : ''}`,
      { token, tenantId }
    );
    return response.data.transactions;
  },

  async addTransaction(
    propertyId: string,
    data: {
      mes_referencia: string;
      tipo: 'receita' | 'despesa_dedutivel' | 'custo_operacional';
      categoria: string;
      valor: number;
      observacao?: string;
    }
  ): Promise<PropertyTransaction> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { transaction: PropertyTransaction } }>(
      `/api/v1/properties/${propertyId}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.transaction;
  },

  async addTransactionsBatch(
    propertyId: string,
    transactions: Array<{
      mes_referencia: string;
      tipo: 'receita' | 'despesa_dedutivel' | 'custo_operacional';
      categoria: string;
      valor: number;
      observacao?: string;
    }>
  ): Promise<PropertyTransaction[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { transactions: PropertyTransaction[] } }>(
      `/api/v1/properties/${propertyId}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify(transactions),
        token,
        tenantId,
      }
    );
    return response.data.transactions;
  },

  async deleteTransaction(propertyId: string, txId: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(
      `/api/v1/properties/${propertyId}/transactions/${txId}`,
      {
        method: 'DELETE',
        token,
        tenantId,
      }
    );
  },

  async upsertMonthlyTotals(
    propertyId: string,
    params: { ano: number; meses: Array<{
      mes_referencia: string;
      receita_longa: number;
      receita_short: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }> }
  ): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/properties/${propertyId}/monthly-totals`, {
      method: 'PUT',
      body: JSON.stringify(params),
      token,
      tenantId,
    });
  },

  async getMonthlyTotals(
    propertyId: string,
    ano: number
  ): Promise<Array<{
    mes_referencia: string;
    receita_longa: number;
    receita_short: number;
    despesas_dedutiveis: number;
    custos_operacionais: number;
  }>> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { totals: unknown[] } }>(
      `/api/v1/properties/${propertyId}/monthly-totals?ano=${ano}`,
      { token, tenantId }
    );
    return response.data.totals as Array<{
      mes_referencia: string;
      receita_longa: number;
      receita_short: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }>;
  },

  async simulateStandaloneAndSave(params: {
    ano: number;
    meses: Array<{
      mes_referencia: string;
      receita_aluguel_tradicional?: number;
      receita_aluguel_curto?: number;
      receita_garagem?: number;
      receita_outras?: number;
      iptu?: number;
      condominio?: number;
      seguro_imovel?: number;
      juros_financiamento?: number;
      manutencao_conservacao?: number;
      outras_dedutiveis?: number;
      reformas_melhorias?: number;
      mobilia_equipamentos?: number;
      limpeza_higienizacao?: number;
      comissao_corretagem?: number;
      taxa_plataforma?: number;
      outros_custos?: number;
    }>;
    opcoes_reforma?: {
      aliquota_ibs_cbs_estimada?: number;
      aliquota_ibs_plena?: number;
      aliquota_cbs_estimada?: number;
      redutor_locacao_pct?: number;
      redutor_short_stay_pct?: number;
      contrato_antes_16012025?: boolean;
      perfil_locacao?: 'residencial_comum' | 'hospedagem_temporada';
    };
    client_id: string;
    title?: string;
  }): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation; result: PropertyTaxSimulationResponse };
    }>('/api/v1/properties/simulate-standalone-and-save', {
      method: 'POST',
      body: JSON.stringify({ ...params, save_simulation: true }),
      token,
      tenantId,
    });
    return response.data;
  },

  async listSimulations(options: {
    client_id?: string;
    ano?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<{ simulations: PropertySimulation[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.ano != null) params.append('ano', String(options.ano));
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    const response = await apiRequest<{
      data: { simulations: PropertySimulation[]; total: number; page: number; limit: number };
    }>(`/api/v1/properties/simulations?${params.toString()}`, { token, tenantId });
    return response.data;
  },

  async getSimulationById(id: string): Promise<PropertySimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { simulation: PropertySimulation } }>(
      `/api/v1/properties/simulations/${id}`,
      { token, tenantId }
    );
    return response.data.simulation;
  },

  async updateSimulation(
    id: string,
    input: SimulateStandaloneInput
  ): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation; result: PropertyTaxSimulationResponse };
    }>(`/api/v1/properties/simulations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      token,
      tenantId,
    });
    return response.data;
  },

  async deleteSimulation(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/properties/simulations/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  async simulateStandalone(params: {
    ano: number;
    meses: Array<{
      mes_referencia: string;
      receita_aluguel_tradicional?: number;
      receita_aluguel_curto?: number;
      receita_garagem?: number;
      receita_outras?: number;
      iptu?: number;
      condominio?: number;
      seguro_imovel?: number;
      juros_financiamento?: number;
      manutencao_conservacao?: number;
      outras_dedutiveis?: number;
      reformas_melhorias?: number;
      mobilia_equipamentos?: number;
      limpeza_higienizacao?: number;
      comissao_corretagem?: number;
      taxa_plataforma?: number;
      outros_custos?: number;
    }>;
    opcoes_reforma?: {
      aliquota_ibs_cbs_estimada?: number;
      aliquota_ibs_plena?: number;
      aliquota_cbs_estimada?: number;
      redutor_locacao_pct?: number;
      redutor_short_stay_pct?: number;
      contrato_antes_16012025?: boolean;
      perfil_locacao?: 'residencial_comum' | 'hospedagem_temporada';
    };
  }): Promise<PropertyTaxSimulationResponse> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PropertyTaxSimulationResponse }>(
      '/api/v1/properties/simulate-standalone',
      {
        method: 'POST',
        body: JSON.stringify(params),
        token,
        tenantId,
      }
    );
    return response.data;
  },

  async simulate(params: {
    ano: number;
    property_ids: string[];
    aliquota_efetiva_dirpf?: number;
    aplicar_presuncao_16_servicos?: boolean;
    opcoes_reforma?: {
      aliquota_ibs_cbs_estimada?: number;
      aliquota_ibs_plena?: number;
      aliquota_cbs_estimada?: number;
      redutor_locacao_pct?: number;
      contrato_antes_16012025?: boolean;
      perfil_locacao?: 'residencial_comum' | 'hospedagem_temporada';
    };
  }): Promise<PropertyTaxSimulationResponse> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PropertyTaxSimulationResponse }>(
      '/api/v1/properties/simulate',
      {
        method: 'POST',
        body: JSON.stringify(params),
        token,
        tenantId,
      }
    );
    return response.data;
  },
};

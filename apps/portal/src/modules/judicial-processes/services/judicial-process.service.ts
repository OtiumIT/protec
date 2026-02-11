import apiRequest from '../../../shared/services/api';
import type { JudicialProcess, LegalThesis } from '@shared/core';

// Helper para obter token e tenantId do localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId };
}

export const judicialProcessService = {
  /**
   * Listar processos judiciais de um cliente
   */
  async listByClient(clientId: string): Promise<JudicialProcess[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { processes: JudicialProcess[] } }>(
      `/api/v1/judicial-processes/client/${clientId}`,
      {
        method: 'GET',
        token,
        tenantId,
      }
    );
    return response.data.processes;
  },

  /**
   * Buscar processo por ID
   */
  async getById(id: string): Promise<JudicialProcess> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { process: JudicialProcess } }>(
      `/api/v1/judicial-processes/${id}`,
      {
        method: 'GET',
        token,
        tenantId,
      }
    );
    return response.data.process;
  },

  /**
   * Obter teses elegíveis para um cliente
   * Retorna array de strings (chaves das teses) ao invés de objetos LegalThesis
   */
  async getEligibleTheses(clientId: string): Promise<string[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { eligible_theses: string[] } }>(
      `/api/v1/judicial-processes/client/${clientId}/eligible-theses`,
      {
        method: 'GET',
        token,
        tenantId,
      }
    );
    return response.data.eligible_theses || [];
  },

  /**
   * Criar processo judicial
   */
  async create(data: {
    client_id: string;
    process_number: string;
    court?: string;
    legal_thesis: LegalThesis;
    case_value?: number;
    start_date?: string;
    status?: 'active' | 'suspended' | 'closed';
    notes?: string;
  }): Promise<JudicialProcess> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { process: JudicialProcess } }>(
      '/api/v1/judicial-processes',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.process;
  },

  /**
   * Atualizar processo judicial
   */
  async update(
    id: string,
    data: {
      process_number?: string;
      court?: string;
      legal_thesis?: LegalThesis;
      case_value?: number;
      start_date?: string;
      status?: 'active' | 'suspended' | 'closed';
      notes?: string;
    }
  ): Promise<JudicialProcess> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { process: JudicialProcess } }>(
      `/api/v1/judicial-processes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.process;
  },

  /**
   * Deletar processo judicial
   */
  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(
      `/api/v1/judicial-processes/${id}`,
      {
        method: 'DELETE',
        token,
        tenantId,
      }
    );
  },
};

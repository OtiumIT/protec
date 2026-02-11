import apiRequest from '../../../shared/services/api';

export interface Edital {
  id: string;
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  extended: boolean;
  modality: 'CAPAG' | 'PEQUENO_VALOR' | 'CONTENCIOSO' | 'IRRECUPERAVEIS' | 'DESENROLA_RURAL' | 'PTI';
  payment_terms: {
    entryPercent: number;
    entryInstallments: number;
    maxInstallments: number;
    minInstallmentAmount?: number;
  };
  discount_rules: {
    A?: any;
    B?: any;
    C?: any;
    D?: any;
  };
  eligibility: {
    maxAmount?: number;
    minAmount?: number;
    requiresRating?: boolean;
    allowedRatings?: ('A' | 'B' | 'C' | 'D')[];
    allowedCompanyTypes?: string[];
    minYearsInscribed?: number;
    requiresJudicialProcess?: boolean;
    legalThesis?: string;
  };
  notes?: string;
  official_link?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateEditalInput {
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  extended?: boolean;
  modality: string;
  payment_terms: any;
  discount_rules: any;
  eligibility: any;
  notes?: string;
  official_link?: string;
  active?: boolean;
}

function getAuthHeaders(requireTenant: boolean = false) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  if (!token) {
    throw new Error('Not authenticated - Token não encontrado');
  }
  
  // Editais são dados globais, não requerem tenantId obrigatoriamente
  // Mas se requireTenant for true, validar
  if (requireTenant && !tenantId) {
    throw new Error('Tenant ID required');
  }
  
  return { token, tenantId: tenantId || undefined };
}

export const editalService = {
  /**
   * Listar editais
   */
  async list(options: {
    modality?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ editais: Edital[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders(false); // Não requer tenantId (dados globais)

    const params = new URLSearchParams();
    if (options.modality) params.append('modality', options.modality);
    if (options.active !== undefined) params.append('active', options.active.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiRequest<{
      data: {
        editais: Edital[];
        total: number;
        page: number;
        limit: number;
      };
    }>(`/api/v1/editais?${params.toString()}`, { token, tenantId });

    return response.data;
  },

  /**
   * Buscar editais ativos
   */
  async getActive(date?: string): Promise<Edital[]> {
    const { token, tenantId } = getAuthHeaders(false); // Não requer tenantId

    const params = date ? `?date=${date}` : '';
    const response = await apiRequest<{ data: { editais: Edital[] } }>(
      `/api/v1/editais/active${params}`,
      { token, tenantId }
    );

    return response.data.editais;
  },

  /**
   * Buscar edital por ID
   */
  async getById(id: string): Promise<Edital> {
    const { token, tenantId } = getAuthHeaders(false); // Não requer tenantId
    const response = await apiRequest<{ data: { edital: Edital } }>(`/api/v1/editais/${id}`, {
      token,
      tenantId,
    });
    return response.data.edital;
  },

  /**
   * Criar edital
   */
  async create(data: CreateEditalInput): Promise<Edital> {
    const { token, tenantId } = getAuthHeaders(false); // Não requer tenantId
    const response = await apiRequest<{ data: { edital: Edital } }>('/api/v1/editais', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
      tenantId,
    });
    return response.data.edital;
  },

  /**
   * Atualizar edital
   */
  async update(id: string, data: Partial<CreateEditalInput>): Promise<Edital> {
    const { token, tenantId } = getAuthHeaders(false); // Não requer tenantId
    const response = await apiRequest<{ data: { edital: Edital } }>(`/api/v1/editais/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
      tenantId,
    });
    return response.data.edital;
  },

  /**
   * Deletar edital
   */
  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders(false); // Não requer tenantId
    await apiRequest(`/api/v1/editais/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

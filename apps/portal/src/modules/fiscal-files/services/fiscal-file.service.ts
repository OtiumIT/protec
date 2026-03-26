import apiRequest, { getApiUrl } from '../../../shared/services/api';

export interface FiscalFile {
  id: string;
  client_id: string;
  file_type: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
  competence: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  processing_error: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UploadFiscalFileData {
  client_id: string;
  competence?: string;
  file_type?: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
  file: File;
}

export class FiscalFileApiError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'FiscalFileApiError';
  }
}

export interface InspectSpedResult {
  inspection: {
    header: {
      type: 'ecd' | 'ecf' | 'unknown';
      layout_code?: string;
      period_start?: string;
      period_end?: string;
      company_name?: string;
      company_cnpj?: string;
    };
    register_counts: Record<string, number>;
    cadastro?: {
      cnae?: string;
      email?: string;
      uf?: string;
      municipio_ibge?: string;
    };
    socios_remuneracao?: Array<{
      cpf_cnpj?: string;
      nome?: string;
      qualificacao?: string;
      participacao_percentual?: number;
      valores_declarados: number[];
    }>;
    balance_sheet_lines?: Array<{ codigo: string; descricao: string; valor_final: number }>;
    dre_lines?: Array<{ codigo: string; descricao: string; valor_final: number }>;
    ecf_tax_signals?: {
      trimestres: Array<{
        inicio?: string;
        fim?: string;
        receitas_possiveis: number;
        despesas_possiveis: number;
        resultado_aproximado: number;
        linhas_analisadas: number;
      }>;
      receita_bruta_anual_estimada: number;
    };
    prefill_catalog?: Array<{
      modulo: 'rating_validator' | 'simulador_in2306' | 'irpf_alta_renda';
      campo_destino: string;
      origem_sped: string;
      transformacao: string;
      confianca: number;
    }>;
    balance_sheet?: Record<string, number>;
    dre?: Record<string, number>;
    module_prefill?: Record<string, any>;
  };
  matched_client: {
    id: string;
    name: string;
    cnpj?: string | null;
    cpf?: string | null;
  } | null;
  requires_client_registration: boolean;
}

export interface FiscalFileExtractionSummary {
  fiscal_file: Pick<FiscalFile, 'id' | 'file_name' | 'file_type' | 'competence' | 'status' | 'metadata'>;
  extracted_data_types: string[];
  extracted_data: Array<{
    data_type: string;
    data: Record<string, any>;
    created_at: string;
  }>;
  prefill_confidence: {
    rating_validator: number;
    simulador_in2306: number;
    irpf_alta_renda: number;
  };
}

export interface SpedCalibratorRule {
  id: string;
  client_id: string | null;
  pattern: string;
  target_module: 'simulador_in2306';
  target_kind: 'receita' | 'deducao' | 'retencao';
  target_field: string;
  confidence_override: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSpedCalibratorRuleInput {
  client_id?: string | null;
  pattern: string;
  target_kind: 'receita' | 'deducao' | 'retencao';
  target_field: string;
  confidence_override?: number | null;
  active?: boolean;
  notes?: string | null;
}

export interface UpdateSpedCalibratorRuleInput {
  pattern?: string;
  target_kind?: 'receita' | 'deducao' | 'retencao';
  target_field?: string;
  confidence_override?: number | null;
  active?: boolean;
  notes?: string | null;
}

// Helper para obter token e tenantId do localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId };
}

export const fiscalFileService = {
  /**
   * Upload de arquivo fiscal
   */
  async upload(data: UploadFiscalFileData): Promise<FiscalFile> {
    const { token, tenantId } = getAuthHeaders();

    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('client_id', data.client_id);
    if (data.competence) {
      formData.append('competence', data.competence);
    }
    if (data.file_type) {
      formData.append('file_type', data.file_type);
    }

    const baseUrl = getApiUrl().replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/fiscal-files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        // Não definir Content-Type para FormData (browser faz automaticamente)
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new FiscalFileApiError(error.error?.message || 'Upload failed', error.error?.code);
    }

    const result = await response.json();
    return result.data.fiscal_file;
  },

  /**
   * Inspecionar arquivo SPED para identificar cliente por CNPJ/CPF
   */
  async inspectSped(file: File, clientId?: string): Promise<InspectSpedResult> {
    const { token, tenantId } = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    if (clientId) {
      formData.append('client_id', clientId);
    }

    const baseUrl = getApiUrl().replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/fiscal-files/inspect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || 'Inspection failed');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Listar arquivos fiscais
   */
  async list(options: {
    client_id?: string;
    competence?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ files: FiscalFile[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();

    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.competence) params.append('competence', options.competence);
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiRequest<{ data: { files: FiscalFile[]; total: number; page: number; limit: number } }>(
      `/api/v1/fiscal-files?${params.toString()}`,
      { token, tenantId }
    );

    return response.data;
  },

  /**
   * Buscar arquivo por ID
   */
  async getById(id: string): Promise<FiscalFile> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { fiscal_file: FiscalFile } }>(
      `/api/v1/fiscal-files/${id}`,
      { token, tenantId }
    );
    return response.data.fiscal_file;
  },

  /**
   * Buscar resumo consolidado da extração do arquivo.
   */
  async getSummary(id: string): Promise<FiscalFileExtractionSummary> {
    const { token, tenantId } = getAuthHeaders();
    try {
      const response = await apiRequest<{ data: FiscalFileExtractionSummary }>(
        `/api/v1/fiscal-files/${id}/summary`,
        { token, tenantId }
      );
      return response.data;
    } catch (error: any) {
      const message = String(error?.message || '');
      if (!message.includes('404')) {
        throw error;
      }
      const fallbackResponse = await apiRequest<{ data: FiscalFileExtractionSummary }>(
        `/api/v1/fiscal-files/summary/${id}`,
        { token, tenantId }
      );
      return fallbackResponse.data;
    }
  },

  /**
   * Obter URL de download
   */
  async getDownloadUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { download_url: string; expires_in: number } }>(
      `/api/v1/fiscal-files/${id}/download?expires_in=${expiresIn}`,
      { token, tenantId }
    );
    return response.data.download_url;
  },

  /**
   * Deletar arquivo
   */
  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/fiscal-files/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  /**
   * Listar arquivos de um cliente
   */
  async listByClient(clientId: string): Promise<FiscalFile[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { files: FiscalFile[] } }>(
      `/api/v1/fiscal-files/client/${clientId}`,
      { token, tenantId }
    );
    return response.data.files;
  },

  async listCalibratorRules(clientId?: string): Promise<SpedCalibratorRule[]> {
    const { token, tenantId } = getAuthHeaders();
    const query = clientId
      ? `?${new URLSearchParams({ client_id: clientId }).toString()}`
      : '';
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/281573c4-5f2f-4955-859d-61c0fbe4e1f6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5323ff'},body:JSON.stringify({sessionId:'5323ff',runId:'pre-fix',hypothesisId:'H1',location:'apps/portal/src/modules/fiscal-files/services/fiscal-file.service.ts:listCalibratorRules',message:'Requesting calibrator rules from frontend service',data:{apiPath:`/api/v1/fiscal-files/calibrator/rules${query}`,hasTenantId:Boolean(tenantId),hasToken:Boolean(token),clientId:clientId||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const response = await apiRequest<{ data: { rules: SpedCalibratorRule[] } }>(
      `/api/v1/fiscal-files/calibrator/rules${query}`,
      { token, tenantId }
    );
    return response.data.rules;
  },

  async createCalibratorRule(data: CreateSpedCalibratorRuleInput): Promise<SpedCalibratorRule> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { rule: SpedCalibratorRule } }>(
      '/api/v1/fiscal-files/calibrator/rules',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.rule;
  },

  async updateCalibratorRule(id: string, data: UpdateSpedCalibratorRuleInput): Promise<SpedCalibratorRule> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { rule: SpedCalibratorRule } }>(
      `/api/v1/fiscal-files/calibrator/rules/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.rule;
  },

  async deleteCalibratorRule(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/fiscal-files/calibrator/rules/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

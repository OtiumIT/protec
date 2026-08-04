import apiRequest, { getApiUrl } from '../../../shared/services/api';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  UpdateIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
  DadosIrpfAltaRenda,
  DeclaracaoIrpfCompleta,
  ReportSummaryIrpfAltaRendaInput,
  ReportSummaryIrpfAltaRendaResponse,
} from '@shared/core';

export interface ExtractFromPdfResult {
  declaracao_completa: DeclaracaoIrpfCompleta;
  ano: number;
  dados: DadosIrpfAltaRenda;
  arquivo_nome?: string;
  diagnostico?: {
    fonte: string;
    completude: 'alta' | 'media' | 'baixa';
    avisos: string[];
  };
}

export interface IrpfAltaRendaPayloadJson {
  tipo_importacao: 'pdf' | 'dec_dbk' | 'manual';
  arquivo_nome?: string | null;
  ano: number;
  dados: DadosIrpfAltaRenda;
  resultado_simulacao: IrpfAltaRendaSimulacaoResponse;
  declaracao_completa?: Record<string, unknown> | null;
  diagnostico?: { completude?: string; avisos?: string[] } | null;
  parser_version?: number;
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
  payload_json?: IrpfAltaRendaPayloadJson | null;
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

  async update(
    id: string,
    input: UpdateIrpfAltaRendaInput
  ): Promise<{ registro: IrpfAltaRendaRecord; resultado: IrpfAltaRendaSimulacaoResponse }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { registro: IrpfAltaRendaRecord; resultado: IrpfAltaRendaSimulacaoResponse };
    }>(`/api/v1/irpf-alta-renda/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      token,
      tenantId,
    });
    return response.data;
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
   * Importa arquivo .dec ou .dbk (PGD IRPF / e-CAC) e retorna ano + dados para preencher o formulário.
   */
  async importDeclaration(file: File): Promise<ExtractFromPdfResult> {
    const { token, tenantId } = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/irpf-alta-renda/import-declaration`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId ?? '',
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Falha na importação' } }));
      throw new Error(err.error?.message || 'Falha na importação do arquivo .dec/.dbk');
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * Envia um PDF (ex.: DAA) para extração de dados via OpenAI e retorna ano + dados para preencher o formulário.
   * PDFs são enviados via Supabase Storage + padrão async (job_id + polling) para contornar
   * o limite de 6MB do Lambda e o timeout de 29s do API Gateway.
   */
  async extractFromPdf(file: File): Promise<ExtractFromPdfResult> {
    const { token, tenantId } = getAuthHeaders();
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId ?? '',
    };

    // Upload to Supabase Storage via signed URL
    const uploadUrlRes = await fetch(`${baseUrl}/api/v1/irpf-alta-renda/upload-url`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content_type: file.type }),
    });
    if (!uploadUrlRes.ok) {
      const err = await uploadUrlRes.json().catch(() => ({ error: { message: 'Falha ao gerar URL de upload' } }));
      throw new Error(err.error?.message || 'Falha ao gerar URL de upload');
    }
    const { data: uploadData } = await uploadUrlRes.json();

    const uploadRes = await fetch(uploadData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/pdf' },
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error('Falha ao enviar arquivo para o storage');
    }

    // Start async extraction — returns job_id
    const extractRes = await fetch(`${baseUrl}/api/v1/irpf-alta-renda/extract-from-pdf`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ storage_path: uploadData.storage_path, filename: file.name }),
    });
    if (!extractRes.ok) {
      const err = await extractRes.json().catch(() => ({ error: { message: 'Falha na extração do PDF' } }));
      throw new Error(err.error?.message || 'Falha na extração do PDF');
    }
    const extractBody = await extractRes.json();

    // If response has job_id, poll for result (async pattern)
    if (extractBody.data?.job_id) {
      const jobId = extractBody.data.job_id;
      const MAX_POLLS = 60; // 60 * 5s = 300s max
      const POLL_INTERVAL = 5000;

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        const pollRes = await fetch(`${baseUrl}/api/v1/irpf-alta-renda/extract-job/${jobId}`, {
          headers,
        });

        if (!pollRes.ok) {
          const err = await pollRes.json().catch(() => ({ error: { message: 'Falha ao verificar status da extração' } }));
          throw new Error(err.error?.message || 'Falha na extração do PDF');
        }

        const pollBody = await pollRes.json();

        if (pollBody.data?.status === 'processing') continue;

        // Result is ready
        return pollBody.data;
      }

      throw new Error('A extração demorou mais do que o esperado. Tente novamente.');
    }

    // Synchronous response (legacy fallback)
    return extractBody.data;
  },

  async reportSummary(input: ReportSummaryIrpfAltaRendaInput): Promise<ReportSummaryIrpfAltaRendaResponse> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: ReportSummaryIrpfAltaRendaResponse }>(
      '/api/v1/irpf-alta-renda/report-summary',
      { method: 'POST', body: JSON.stringify(input), token, tenantId }
    );
    return response.data;
  },
};

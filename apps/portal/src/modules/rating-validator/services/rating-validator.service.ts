import apiRequest, { getApiUrl } from '../../../shared/services/api';
import type { RatingValidation } from '@shared/core';

// Helper para obter token e tenantId do localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId };
}

/** Resultado da extração do PDF da ECD (SPED Contábil) */
export interface ExtractEcdPdfResult {
  ecd: {
    documento_info?: { periodo_escrituracao?: { inicio?: string; fim?: string }; [key: string]: unknown };
    entidade?: { nome?: string; cnpj?: string; [key: string]: unknown };
    demonstrativo_contabil?: unknown;
  };
  simulação_prefill: Omit<SimulateRatingInput, 'client_id' | 'rating_real' | 'save_simulation'>;
}

// Tipos para simulação
export interface SimulateRatingInput {
  ativo_circulante: {
    caixa_equivalentes: number;
    aplicacoes_financeiras: number;
    contas_receber: number;
    estoques: number;
    tributos_recuperar: number;
    despesas_antecipadas: number;
    outros_ativos_circulantes: number;
  };
  ativo_nao_circulante: {
    realizavel_longo_prazo: {
      contas_receber_lp: number;
      emprestimos_concedidos: number;
      outros_creditos_lp: number;
    };
    investimentos: number;
    imobilizado: number;
    intangivel: number;
    outros_ativos_nao_circulantes: number;
  };
  passivo_circulante: {
    fornecedores: number;
    emprestimos_financiamentos: number;
    obrigacoes_trabalhistas: number;
    tributos_pagar: number;
    contas_pagar: number;
    provisoes: number;
    outros_passivos_circulantes: number;
  };
  passivo_nao_circulante: {
    emprestimos_financiamentos_lp: number;
    obrigacoes_trabalhistas_lp: number;
    tributos_pagar_lp: number;
    provisoes_lp: number;
    outros_passivos_nao_circulantes: number;
  };
  patrimonio_liquido: {
    capital_social: number;
    reservas_capital: number;
    reservas_lucros: number;
    lucros_prejuizos_acumulados: number;
    outros_ajustes: number;
  };
  // Totais diretos (opcionais - quando o sistema já possui o valor calculado)
  ativo_circulante_total?: number;
  realizavel_longo_prazo_total?: number;
  passivo_circulante_total?: number;
  passivo_nao_circulante_total?: number;
  patrimonio_liquido_total?: number;
  dre?: {
    receita_bruta: number;
    deducoes_vendas: number;
    receita_liquida?: number;
    custos_vendas: number;
    despesas_operacionais: number;
    resultado_financeiro: number;
    outros_resultados: number;
  };
  competencia: string;
  client_id: string;
  rating_real?: 'A' | 'B' | 'C' | 'D';
  save_simulation?: boolean;
}

export interface IndicatorAnalysisItem {
  id: string;
  name: string;
  formula: string;
  value: number;
  value_formatted: string;
  score: number;
  max_score: number;
  level: 'A' | 'B' | 'C' | 'D';
  /** Limiares por nível para colunas dinâmicas (conforme rating informado vs calculado) */
  thresholds_by_level: { D: string; C: string; B: string; A: string };
  gap_message: string;
}

export interface RatingSimulationResult {
  calculated_values: {
    ativo_circulante_total: number;
    realizavel_longo_prazo_total: number;
    passivo_circulante_total: number;
    passivo_nao_circulante_total: number;
    patrimonio_liquido_total: number;
    ativo_total: number;
    passivo_total: number;
  };
  indicators: {
    liquidez_corrente: number;
    liquidez_geral: number;
    solvencia: number;
  };
  indicator_analysis?: IndicatorAnalysisItem[];
  rating_estimado: 'A' | 'B' | 'C' | 'D';
  rating_real?: 'A' | 'B' | 'C' | 'D';
  has_discrepancy: boolean;
  discrepancy_details?: {
    rating_estimado: 'A' | 'B' | 'C' | 'D';
    rating_real: 'A' | 'B' | 'C' | 'D';
    message: string;
  };
  validation_id?: string;
  is_simulation: boolean;
}

export const ratingValidatorService = {
  /**
   * Simular validação de rating com dados inputados
   */
  async simulate(input: SimulateRatingInput): Promise<RatingSimulationResult> {
    const { token, tenantId } = getAuthHeaders();

    const response = await apiRequest<{ data: RatingSimulationResult }>(
      '/api/v1/rating-validator/simulate',
      {
        method: 'POST',
        body: JSON.stringify(input),
        token,
        tenantId,
      }
    );

    return response.data;
  },

  /**
   * Listar validações
   */
  async list(options: {
    client_id?: string;
    competence?: string;
    is_simulation?: boolean;
    rating_estimado?: 'A' | 'B' | 'C' | 'D';
    page?: number;
    limit?: number;
  } = {}): Promise<{
    validations: RatingValidation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { token, tenantId } = getAuthHeaders();

    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.competence) params.append('competence', options.competence);
    if (options.is_simulation !== undefined)
      params.append('is_simulation', options.is_simulation.toString());
    if (options.rating_estimado) params.append('rating_estimado', options.rating_estimado);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiRequest<{
      data: {
        validations: RatingValidation[];
        total: number;
        page: number;
        limit: number;
      };
    }>(`/api/v1/rating-validator?${params.toString()}`, { token, tenantId });

    return response.data;
  },

  /**
   * Buscar validação por ID
   */
  async getById(id: string): Promise<RatingValidation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { validation: RatingValidation } }>(
      `/api/v1/rating-validator/${id}`,
      { token, tenantId }
    );
    return response.data.validation;
  },

  /**
   * Deletar validação
   */
  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/rating-validator/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  /**
   * Extrai dados do PDF da ECD (SPED Contábil) via OCR e retorna dados para preencher a simulação.
   */
  async extractFromEcdPdf(file: File): Promise<ExtractEcdPdfResult> {
    const { token, tenantId } = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/rating-validator/extract-from-ecd-pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId ?? '',
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Falha na extração do PDF da ECD' } }));
      throw new Error(err.error?.message ?? 'Falha na extração do PDF da ECD');
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * Validar rating a partir de arquivo ECD
   */
  async validateFromFiscalFile(
    fiscalFileId: string,
    ratingReal?: 'A' | 'B' | 'C' | 'D'
  ): Promise<RatingSimulationResult> {
    const { token, tenantId } = getAuthHeaders();

    const response = await apiRequest<{ data: RatingSimulationResult }>(
      `/api/v1/rating-validator/validate/${fiscalFileId}`,
      {
        method: 'POST',
        body: JSON.stringify({ rating_real: ratingReal }),
        token,
        tenantId,
      }
    );

    return response.data;
  },
};

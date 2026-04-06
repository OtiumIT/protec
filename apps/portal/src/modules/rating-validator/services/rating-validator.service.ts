import apiRequest, { getApiUrl } from '../../../shared/services/api';
import { logClientError } from '../../../shared/services/error-logger';
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

/** Perfil de extração no backend (ECD, balancete ou PDF escaneado com regras duplas). */
export type ExtracaoPdfContabilPerfil = 'ecd' | 'balancete' | 'pdf_escaneado_duplo';

/** Resultado da extração do PDF (ECD/SPED ou balancete) */
export interface ExtractEcdPdfResult {
  ecd: {
    documento_info?: { periodo_escrituracao?: { inicio?: string; fim?: string }; [key: string]: unknown };
    entidade?: { nome?: string; cnpj?: string; [key: string]: unknown };
    demonstrativo_contabil?: unknown;
  };
  simulação_prefill: Omit<SimulateRatingInput, 'client_id' | 'rating_real' | 'save_simulation'>;
  extracao_perfil?: ExtracaoPdfContabilPerfil;
}

/** Dados de dívida negociada extraídos do recibo PGFN */
export interface DividaNegociada {
  numero_divida: string;
  devedor_cnpj?: string;
  codigo_receita?: string;
  data_consolidacao?: string;
  principal: number;
  multa: number;
  juros: number;
  encargo_legal: number;
  total: number;
}

/** Dados do parcelamento PGFN extraídos do recibo de adesão */
export interface ParcelamentoPGFN {
  numero_conta?: string;
  cnpj: string;
  razao_social: string;
  negociacao: string;
  modalidade: string;
  data_adesao: string;
  dividas: DividaNegociada[];
  capacidade_pagamento: {
    valor_divida_adesao: number;
    capacidade_60_meses: number;
    permite_desconto: boolean;
    desconto_maximo_pct: number;
  };
  consolidacao: {
    principal: number;
    multa: number;
    juros: number;
    encargo_legal: number;
    total_sem_desconto: number;
    entrada_total: number;
    desconto_total: number;
    creditos_utilizados?: number;
    total_a_pagar: number;
  };
  pagamento: {
    entrada_qtd: number;
    entrada_valor: number;
    parcelas_qtd: number;
    parcelas_valor: number;
  };
  rating_inferido?: 'A' | 'B' | 'C' | 'D';
}

/** Resultado da extração do PDF do recibo PGFN */
export interface ExtractPGFNPdfResult {
  parcelamento: ParcelamentoPGFN;
  confianca_extracao?: number;
  campos_incertos?: string[];
}

/** Comparativo entre rating calculado e parcelamento PGFN */
export interface ComparativoParcelamento {
  rating_calculado: 'A' | 'B' | 'C' | 'D';
  rating_pgfn: 'A' | 'B' | 'C' | 'D';
  divergencia: boolean;
  cenario_calculado: {
    desconto_maximo_multa_juros_pct: number;
    prazo_maximo_meses: number;
    entrada_minima_pct: number;
  };
  cenario_pgfn: {
    valor_total_divida: number;
    entrada_total: number;
    entrada_pct: number;
    parcelas_qtd: number;
    parcelas_valor: number;
    desconto_aplicado_pct: number;
    total_a_pagar: number;
  };
  diferenca_financeira: {
    economia_potencial: number;
    parcelas_extras_disponiveis: number;
    valor_excedente_entrada: number;
  };
  fundamentacao_juridica: string;
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
  parcelamento_pgfn?: ParcelamentoPGFN;
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
  comparativo_parcelamento?: ComparativoParcelamento;
}

export interface ProcessedEcdFiscalFile {
  id: string;
  client_id: string;
  competence: string;
  file_name: string;
  created_at: string;
}

export interface RealValidationOverrides {
  ativo_circulante_total?: number;
  realizavel_longo_prazo_total?: number;
  outros_ativos_nao_circulantes?: number;
  passivo_circulante_total?: number;
  passivo_nao_circulante_total?: number;
  patrimonio_liquido_total?: number;
  dre?: {
    receita_bruta?: number;
    deducoes_vendas?: number;
    receita_liquida?: number;
    custos_vendas?: number;
    despesas_operacionais?: number;
    resultado_financeiro?: number;
    outros_resultados?: number;
  };
}

export interface RealValidationPrefill {
  /** Arquivo “canônico” (mais recente entre os tipos) ou modo legado por arquivo único */
  fiscal_file?: {
    id: string;
    client_id: string;
    competence: string;
    file_name: string;
  } | null;
  /** Presente no fluxo por competência */
  client_id?: string;
  competence?: string;
  source_by_data_type?: Record<
    string,
    { fiscal_file_id: string; file_name: string; created_at: string }
  >;
  source_fiscal_file_ids?: string[];
  multiple_sources_warning?: boolean;
  source_conflicts?: Array<{
    data_type: string;
    fiscal_files: Array<{ id: string; file_name: string }>;
  }>;
  prefill: {
    competencia: string;
    client_id: string;
    ativo_circulante_total?: number;
    realizavel_longo_prazo_total?: number;
    outros_ativos_nao_circulantes?: number;
    passivo_circulante_total?: number;
    passivo_nao_circulante_total?: number;
    patrimonio_liquido_total?: number;
    dre?: {
      receita_bruta?: number;
      deducoes_vendas?: number;
      receita_liquida?: number;
      custos_vendas?: number;
      despesas_operacionais?: number;
      resultado_financeiro?: number;
      outros_resultados?: number;
    };
  };
  prefilled_fields: string[];
  source_data_types: string[];
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
   * Atualizar validação existente (re-simula com novos dados)
   */
  async update(id: string, input: SimulateRatingInput): Promise<{
    validation: RatingValidation;
    result: RatingSimulationResult;
  }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: {
        validation: RatingValidation;
        calculated_values: RatingSimulationResult['calculated_values'];
        indicators: RatingSimulationResult['indicators'];
        indicator_analysis: RatingSimulationResult['indicator_analysis'];
        rating_estimado: RatingSimulationResult['rating_estimado'];
        rating_real?: RatingSimulationResult['rating_real'];
        has_discrepancy: RatingSimulationResult['has_discrepancy'];
        discrepancy_details?: RatingSimulationResult['discrepancy_details'];
        comparativo_parcelamento?: RatingSimulationResult['comparativo_parcelamento'];
      };
    }>(`/api/v1/rating-validator/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      token,
      tenantId,
    });
    
    const d = response.data;
    return {
      validation: d.validation,
      result: {
        calculated_values: d.calculated_values,
        indicators: d.indicators,
        indicator_analysis: d.indicator_analysis,
        rating_estimado: d.rating_estimado,
        rating_real: d.rating_real,
        has_discrepancy: d.has_discrepancy,
        discrepancy_details: d.discrepancy_details,
        is_simulation: true,
        comparativo_parcelamento: d.comparativo_parcelamento,
      },
    };
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
      const err = await response.json().catch(() => ({ error: { message: 'Falha na extração do PDF da ECD', code: 'UNKNOWN' } }));
      const code = err.error?.code;
      const msg = err.error?.message ?? 'Falha na extração do PDF da ECD';

      logClientError({
        endpoint: '/api/v1/rating-validator/extract-from-ecd-pdf',
        status: response.status,
        code,
        message: msg,
        meta: { fileName: file.name, fileSize: file.size },
      });

      const friendlyMessage =
        code === 'FILE_REQUIRED'
          ? 'Nenhum arquivo foi enviado. Selecione o PDF da ECD e tente novamente.'
          : code === 'INVALID_FILE_TYPE'
            ? 'O arquivo deve ser um PDF. Verifique o formato e tente novamente.'
            : code === 'TENANT_REQUIRED'
              ? 'Sessão inválida. Faça login novamente.'
              : code === 'FILE_TOO_LARGE'
                ? 'O arquivo é muito grande. O limite é 15 MB.'
                : msg;

      throw new Error(friendlyMessage);
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * Extrai dados do PDF do Recibo de Adesão PGFN via OCR.
   */
  async extractFromPgfnPdf(file: File): Promise<ExtractPGFNPdfResult> {
    const { token, tenantId } = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/rating-validator/extract-from-pgfn-pdf`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId ?? '',
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Falha na extração do PDF PGFN', code: 'UNKNOWN' } }));
      const code = err.error?.code;
      const msg = err.error?.message ?? 'Falha na extração do PDF PGFN';

      logClientError({
        endpoint: '/api/v1/rating-validator/extract-from-pgfn-pdf',
        status: response.status,
        code,
        message: msg,
        meta: { fileName: file.name, fileSize: file.size },
      });

      const friendlyMessage =
        code === 'FILE_REQUIRED'
          ? 'Nenhum arquivo foi enviado. Selecione o PDF do Recibo PGFN e tente novamente.'
          : code === 'INVALID_FILE_TYPE'
            ? 'O arquivo deve ser um PDF. Verifique o formato e tente novamente.'
            : code === 'TENANT_REQUIRED'
              ? 'Sessão inválida. Faça login novamente.'
              : code === 'FILE_TOO_LARGE'
                ? 'O arquivo é muito grande. O limite é 15 MB.'
                : msg;

      throw new Error(friendlyMessage);
    }
    const result = await response.json();
    return result.data;
  },

  /**
   * Validar rating a partir de arquivo ECD
   */
  async getRealValidationPrefill(fiscalFileId: string): Promise<RealValidationPrefill> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: RealValidationPrefill }>(
      `/api/v1/rating-validator/prefill/${fiscalFileId}`,
      {
        token,
        tenantId,
      }
    );
    return response.data;
  },

  async getRealValidationPrefillByCompetence(
    clientId: string,
    competence: string
  ): Promise<RealValidationPrefill> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams({ client_id: clientId, competence });
    const response = await apiRequest<{ data: RealValidationPrefill }>(
      `/api/v1/rating-validator/prefill-by-competence?${params.toString()}`,
      { token, tenantId }
    );
    return response.data;
  },

  async validateFromFiscalFile(
    fiscalFileId: string,
    options?: {
      ratingReal?: 'A' | 'B' | 'C' | 'D';
      overrides?: RealValidationOverrides;
    }
  ): Promise<RatingSimulationResult> {
    const { token, tenantId } = getAuthHeaders();

    const response = await apiRequest<{ data: RatingSimulationResult }>(
      `/api/v1/rating-validator/validate/${fiscalFileId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          rating_real: options?.ratingReal,
          overrides: options?.overrides,
        }),
        token,
        tenantId,
      }
    );

    return response.data;
  },

  async validateByCompetence(
    clientId: string,
    competence: string,
    options?: {
      ratingReal?: 'A' | 'B' | 'C' | 'D';
      overrides?: RealValidationOverrides;
    }
  ): Promise<RatingSimulationResult> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: RatingSimulationResult }>(
      '/api/v1/rating-validator/validate-by-competence',
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          competence,
          rating_real: options?.ratingReal,
          overrides: options?.overrides,
        }),
        token,
        tenantId,
      }
    );
    return response.data;
  },

  async listProcessedEcdFiles(options: {
    client_id?: string;
    competence?: string;
    limit?: number;
  } = {}): Promise<ProcessedEcdFiscalFile[]> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.competence) params.append('competence', options.competence);
    if (options.limit) params.append('limit', String(options.limit));

    const response = await apiRequest<{ data: { files: ProcessedEcdFiscalFile[] } }>(
      `/api/v1/rating-validator/processed-ecd-files?${params.toString()}`,
      {
        token,
        tenantId,
      }
    );
    return response.data.files;
  },

  /** Competências YYYY-MM distintas com ECD processado (sem depender de LIMIT na listagem de arquivos). */
  async listProcessedEcdCompetences(clientId: string): Promise<string[]> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams({ client_id: clientId });
    const response = await apiRequest<{ data: { competences: string[] } }>(
      `/api/v1/rating-validator/processed-ecd-competences?${params.toString()}`,
      { token, tenantId }
    );
    return response.data.competences;
  },
};

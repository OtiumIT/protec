import {
  RatingValidatorRepository,
  CreateRatingValidationData,
  FullUpdateRatingValidationData,
} from './rating-validator.repository';
import { AppError } from '../../shared/utils/error-handler';
import { ClientRepository } from '../clients/client.repository';
import { FiscalFileRepository } from '../fiscal-files/fiscal-file.repository';
import { SimulateRatingSchema, ParcelamentoPGFNSchema } from '@shared/core';
import type { z } from 'zod';

type SimulateRatingInput = z.infer<typeof SimulateRatingSchema>;
type ParcelamentoPGFN = z.infer<typeof ParcelamentoPGFNSchema>;

/**
 * Benefícios por Rating conforme Portaria PGFN nº 6.757/2022
 * Define os limites de desconto, prazo máximo e entrada mínima para cada classificação
 */
export const BENEFICIOS_POR_RATING = {
  A: {
    descricao: 'Excelente capacidade de pagamento',
    desconto_maximo_multa_juros_pct: 0,
    prazo_maximo_meses: 60,
    entrada_minima_pct: 6,
    permite_reducao_principal: false,
  },
  B: {
    descricao: 'Boa capacidade de pagamento',
    desconto_maximo_multa_juros_pct: 50,
    prazo_maximo_meses: 84,
    entrada_minima_pct: 5,
    permite_reducao_principal: false,
  },
  C: {
    descricao: 'Capacidade de pagamento regular',
    desconto_maximo_multa_juros_pct: 65,
    prazo_maximo_meses: 108,
    entrada_minima_pct: 4,
    permite_reducao_principal: false,
  },
  D: {
    descricao: 'Capacidade de pagamento insuficiente',
    desconto_maximo_multa_juros_pct: 70,
    prazo_maximo_meses: 120,
    entrada_minima_pct: 3,
    permite_reducao_principal: true,
  },
} as const;

export interface ComparativoParcelamento {
  rating_calculado: Rating;
  rating_pgfn: Rating;
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

interface CalculatedValues {
  ativo_circulante_total: number;
  realizavel_longo_prazo_total: number;
  passivo_circulante_total: number;
  passivo_nao_circulante_total: number;
  patrimonio_liquido_total: number;
  ativo_total: number;
  passivo_total: number;
}

interface Indicators {
  liquidez_corrente: number;
  liquidez_geral: number;
  solvencia: number;
}

type Rating = 'A' | 'B' | 'C' | 'D';

export class RatingValidatorService {
  constructor(
    private ratingValidatorRepo: RatingValidatorRepository,
    private clientRepo: ClientRepository,
    private fiscalFileRepo: FiscalFileRepository
  ) {}

  /**
   * Calcular valores agregados a partir de campos granulares
   */
  private calculateAggregatedValues(input: SimulateRatingInput): CalculatedValues {
    // Ativo Circulante Total - usar total direto se fornecido, senão calcular
    const ativoCirculanteTotal = input.ativo_circulante_total !== undefined
      ? input.ativo_circulante_total
      : (input.ativo_circulante.caixa_equivalentes || 0) +
        (input.ativo_circulante.aplicacoes_financeiras || 0) +
        (input.ativo_circulante.contas_receber || 0) +
        (input.ativo_circulante.estoques || 0) +
        (input.ativo_circulante.tributos_recuperar || 0) +
        (input.ativo_circulante.despesas_antecipadas || 0) +
        (input.ativo_circulante.outros_ativos_circulantes || 0);

    // Realizável a Longo Prazo Total - usar total direto se fornecido, senão calcular
    const realizavelLongoPrazoTotal = input.realizavel_longo_prazo_total !== undefined
      ? input.realizavel_longo_prazo_total
      : (input.ativo_nao_circulante.realizavel_longo_prazo?.contas_receber_lp || 0) +
        (input.ativo_nao_circulante.realizavel_longo_prazo?.emprestimos_concedidos || 0) +
        (input.ativo_nao_circulante.realizavel_longo_prazo?.outros_creditos_lp || 0);

    // Passivo Circulante Total - usar total direto se fornecido, senão calcular
    const passivoCirculanteTotal = input.passivo_circulante_total !== undefined
      ? input.passivo_circulante_total
      : (input.passivo_circulante.fornecedores || 0) +
        (input.passivo_circulante.emprestimos_financiamentos || 0) +
        (input.passivo_circulante.obrigacoes_trabalhistas || 0) +
        (input.passivo_circulante.tributos_pagar || 0) +
        (input.passivo_circulante.contas_pagar || 0) +
        (input.passivo_circulante.provisoes || 0) +
        (input.passivo_circulante.outros_passivos_circulantes || 0);

    // Passivo Não Circulante Total - usar total direto se fornecido, senão calcular
    const passivoNaoCirculanteTotal = input.passivo_nao_circulante_total !== undefined
      ? input.passivo_nao_circulante_total
      : (input.passivo_nao_circulante.emprestimos_financiamentos_lp || 0) +
        (input.passivo_nao_circulante.obrigacoes_trabalhistas_lp || 0) +
        (input.passivo_nao_circulante.tributos_pagar_lp || 0) +
        (input.passivo_nao_circulante.provisoes_lp || 0) +
        (input.passivo_nao_circulante.outros_passivos_nao_circulantes || 0);

    // Patrimônio Líquido Total - usar total direto se fornecido, senão calcular
    const patrimonioLiquidoTotal = input.patrimonio_liquido_total !== undefined
      ? input.patrimonio_liquido_total
      : (input.patrimonio_liquido.capital_social || 0) +
        (input.patrimonio_liquido.reservas_capital || 0) +
        (input.patrimonio_liquido.reservas_lucros || 0) +
        (input.patrimonio_liquido.lucros_prejuizos_acumulados || 0) +
        (input.patrimonio_liquido.outros_ajustes || 0);

    // Ativo Total
    const ativoTotal =
      ativoCirculanteTotal +
      realizavelLongoPrazoTotal +
      (input.ativo_nao_circulante.investimentos || 0) +
      (input.ativo_nao_circulante.imobilizado || 0) +
      (input.ativo_nao_circulante.intangivel || 0) +
      (input.ativo_nao_circulante.outros_ativos_nao_circulantes || 0);

    // Passivo Total
    const passivoTotal = passivoCirculanteTotal + passivoNaoCirculanteTotal;

    return {
      ativo_circulante_total: ativoCirculanteTotal,
      realizavel_longo_prazo_total: realizavelLongoPrazoTotal,
      passivo_circulante_total: passivoCirculanteTotal,
      passivo_nao_circulante_total: passivoNaoCirculanteTotal,
      patrimonio_liquido_total: patrimonioLiquidoTotal,
      ativo_total: ativoTotal,
      passivo_total: passivoTotal,
    };
  }

  /**
   * Calcular indicadores financeiros
   */
  private calculateIndicators(values: CalculatedValues): Indicators {
    // Liquidez Corrente = Ativo Circulante / Passivo Circulante
    if (values.passivo_circulante_total === 0) {
      throw new AppError(
        'Passivo Circulante não pode ser zero para calcular Liquidez Corrente',
        'INVALID_CALCULATION',
        400
      );
    }
    const liquidezCorrente = values.ativo_circulante_total / values.passivo_circulante_total;

    // Liquidez Geral = (Ativo Circulante + Realizável a Longo Prazo) / (Passivo Circulante + Passivo Não Circulante)
    const passivoTotal = values.passivo_circulante_total + values.passivo_nao_circulante_total;
    if (passivoTotal === 0) {
      throw new AppError(
        'Passivo Total não pode ser zero para calcular Liquidez Geral',
        'INVALID_CALCULATION',
        400
      );
    }
    const liquidezGeral =
      (values.ativo_circulante_total + values.realizavel_longo_prazo_total) / passivoTotal;

    // Solvência = Patrimônio Líquido / Ativo Total
    if (values.ativo_total === 0) {
      throw new AppError(
        'Ativo Total não pode ser zero para calcular Solvência',
        'INVALID_CALCULATION',
        400
      );
    }
    const solvencia = values.patrimonio_liquido_total / values.ativo_total;

    return {
      liquidez_corrente: Number(liquidezCorrente.toFixed(4)),
      liquidez_geral: Number(liquidezGeral.toFixed(4)),
      solvencia: Number(solvencia.toFixed(4)),
    };
  }

  /**
   * Classificar Rating baseado nos indicadores
   * Critérios baseados em análise financeira padrão (será ajustado conforme Portaria específica)
   */
  private classifyRating(indicators: Indicators): Rating {
    const { liquidez_corrente, liquidez_geral, solvencia } = indicators;

    // Critérios de classificação (valores podem ser ajustados conforme Portaria específica)
    // Rating A: Excelente
    // Rating B: Bom
    // Rating C: Regular
    // Rating D: Insuficiente

    let score = 0;

    // Avaliar Liquidez Corrente
    if (liquidez_corrente >= 2.0) score += 3;
    else if (liquidez_corrente >= 1.5) score += 2;
    else if (liquidez_corrente >= 1.0) score += 1;
    // score 0 se < 1.0

    // Avaliar Liquidez Geral
    if (liquidez_geral >= 1.5) score += 3;
    else if (liquidez_geral >= 1.2) score += 2;
    else if (liquidez_geral >= 1.0) score += 1;
    // score 0 se < 1.0

    // Avaliar Solvência
    if (solvencia >= 0.5) score += 3;
    else if (solvencia >= 0.3) score += 2;
    else if (solvencia >= 0.1) score += 1;
    // score 0 se < 0.1

    // Classificação baseada no score total (0-9)
    if (score >= 7) return 'A';
    if (score >= 5) return 'B';
    if (score >= 3) return 'C';
    return 'D';
  }

  /**
   * Comparar Rating Estimado com Rating Real
   */
  private compareRatings(
    ratingEstimado: Rating,
    ratingReal?: Rating
  ): { has_discrepancy: boolean; discrepancy_details?: Record<string, any> } {
    if (!ratingReal) {
      return { has_discrepancy: false };
    }

    const hasDiscrepancy = ratingEstimado !== ratingReal;

    if (!hasDiscrepancy) {
      return { has_discrepancy: false };
    }

    return {
      has_discrepancy: true,
      discrepancy_details: {
        rating_estimado: ratingEstimado,
        rating_real: ratingReal,
        message: `Discrepância detectada: Rating Estimado (${ratingEstimado}) diferente do Rating Real (${ratingReal})`,
      },
    };
  }

  /** Limiares por indicador (pontos: 0, 1, 2, 3) para uso no demonstrativo */
  private static readonly THRESHOLDS = {
    liquidez_corrente: [
      { min: 2.0, points: 3, level: 'A' as const },
      { min: 1.5, points: 2, level: 'B' as const },
      { min: 1.0, points: 1, level: 'C' as const },
      { min: 0, points: 0, level: 'D' as const },
    ],
    liquidez_geral: [
      { min: 1.5, points: 3, level: 'A' as const },
      { min: 1.2, points: 2, level: 'B' as const },
      { min: 1.0, points: 1, level: 'C' as const },
      { min: 0, points: 0, level: 'D' as const },
    ],
    solvencia: [
      { min: 0.5, points: 3, level: 'A' as const },
      { min: 0.3, points: 2, level: 'B' as const },
      { min: 0.1, points: 1, level: 'C' as const },
      { min: 0, points: 0, level: 'D' as const },
    ],
  };

  private static readonly EPSILON = 1e-9;

  /** Formata limite do indicador (número ou %) */
  private static formatThreshold(min: number, isPercent: boolean): string {
    if (isPercent) return `≥ ${(min * 100).toFixed(0)}%`;
    return `≥ ${min.toFixed(2).replace('.', ',')}`;
  }

  /**
   * Gera análise por indicador para demonstrativo da discrepância (uso jurídico).
   * Retorna limiares por nível (D, C, B, A) para o frontend montar colunas dinâmicas.
   */
  private getIndicatorAnalysis(
    indicators: Indicators,
    ratingReal?: Rating,
    _ratingEstimado?: Rating
  ): Array<{
    id: string;
    name: string;
    formula: string;
    value: number;
    value_formatted: string;
    score: number;
    max_score: number;
    level: 'A' | 'B' | 'C' | 'D';
    thresholds_by_level: { D: string; C: string; B: string; A: string };
    gap_message: string;
  }> {
    const items: Array<{
      id: string;
      name: string;
      formula: string;
      value: number;
      value_formatted: string;
      score: number;
      max_score: number;
      level: 'A' | 'B' | 'C' | 'D';
      thresholds_by_level: { D: string; C: string; B: string; A: string };
      gap_message: string;
    }> = [];

    const configs: Array<{
      id: keyof Indicators;
      name: string;
      formula: string;
      value: number;
      thresholds: typeof RatingValidatorService.THRESHOLDS.liquidez_corrente;
      isPercent: boolean;
    }> = [
      {
        id: 'liquidez_corrente',
        name: 'Liquidez Corrente',
        formula: 'Ativo Circulante ÷ Passivo Circulante',
        value: indicators.liquidez_corrente,
        thresholds: RatingValidatorService.THRESHOLDS.liquidez_corrente,
        isPercent: false,
      },
      {
        id: 'liquidez_geral',
        name: 'Liquidez Geral',
        formula: '(AC + Realizável LP) ÷ (PC + PNC)',
        value: indicators.liquidez_geral,
        thresholds: RatingValidatorService.THRESHOLDS.liquidez_geral,
        isPercent: false,
      },
      {
        id: 'solvencia',
        name: 'Solvência',
        formula: 'Patrimônio Líquido ÷ Ativo Total',
        value: indicators.solvencia,
        thresholds: RatingValidatorService.THRESHOLDS.solvencia,
        isPercent: true,
      },
    ];

    for (const c of configs) {
      const eps = RatingValidatorService.EPSILON;
      let score = 0;
      let level: 'A' | 'B' | 'C' | 'D' = 'D';
      for (const t of c.thresholds) {
        const meets = c.value >= t.min - eps;
        if (meets) {
          score = t.points;
          level = t.level;
        }
      }
      const valueFormatted = c.isPercent
        ? `${(c.value * 100).toFixed(2).replace('.', ',')}%`
        : c.value.toFixed(2).replace('.', ',');
      const fmt = (m: number) => RatingValidatorService.formatThreshold(m, c.isPercent);
      const threshD = c.thresholds.find((t) => t.level === 'D');
      const threshC = c.thresholds.find((t) => t.level === 'C');
      const threshB = c.thresholds.find((t) => t.level === 'B');
      const threshA = c.thresholds.find((t) => t.level === 'A');
      const thresholds_by_level = {
        D: threshD ? fmt(threshD.min) : '-',
        C: threshC ? fmt(threshC.min) : '-',
        B: threshB ? fmt(threshB.min) : '-',
        A: threshA ? fmt(threshA.min) : '-',
      };

      const minC = threshC?.min ?? 0;
      const belowC = c.value < minC - eps;

      // Mensagem sempre em relação ao rating informado (selecionado), quando existir
      let gapMessage: string;
      if (ratingReal != null) {
        const nivelInformado = ratingReal;
        const limiteC = thresholds_by_level.C;
        // D = abaixo de C; C/B/A = têm mínimo definido
        const textoVsInformado =
          nivelInformado === 'D'
            ? `O rating informado (D) corresponde a valores abaixo do mínimo para C (${limiteC}).`
            : `O rating informado (${nivelInformado}) exige neste indicador pelo menos ${thresholds_by_level[nivelInformado]}.`;
        if (level === 'D') {
          gapMessage = belowC
            ? `Valor ${valueFormatted} está abaixo do mínimo para C. ${textoVsInformado} Para atingir C: ${limiteC}.`
            : `Valor ${valueFormatted} no limite para C. ${textoVsInformado} Para B: ${thresholds_by_level.B}.`;
        } else if (level === 'C') {
          gapMessage = `Valor ${valueFormatted} atende ao mínimo para C (calculado). ${textoVsInformado} Para atingir B: ${thresholds_by_level.B}.`;
        } else if (level === 'B') {
          gapMessage = `Valor ${valueFormatted} atende ao mínimo para B. ${textoVsInformado} Para A: ${thresholds_by_level.A}.`;
        } else {
          gapMessage = `Valor ${valueFormatted} atende ao mínimo para A. ${textoVsInformado}`;
        }
      } else {
        // Sem rating informado: mensagem genérica por nível do indicador
        if (level === 'D') {
          gapMessage = belowC
            ? `Valor ${valueFormatted} está abaixo do mínimo para C (${thresholds_by_level.C}). Para atingir C: ${thresholds_by_level.C}; B: ${thresholds_by_level.B}.`
            : `Valor ${valueFormatted} no limite para C. Para B: ${thresholds_by_level.B}.`;
        } else if (level === 'C') {
          gapMessage = `Valor ${valueFormatted} atende ao mínimo para C (1 ponto). Para atingir B: ${thresholds_by_level.B}; A: ${thresholds_by_level.A}.`;
        } else if (level === 'B') {
          gapMessage = `Valor ${valueFormatted} atende ao mínimo para B (${score} pontos). Para atingir A: ${thresholds_by_level.A}.`;
        } else {
          gapMessage = `Valor ${valueFormatted} atende ao mínimo para A (máximo para este indicador).`;
        }
      }

      items.push({
        id: c.id,
        name: c.name,
        formula: c.formula,
        value: c.value,
        value_formatted: valueFormatted,
        score,
        max_score: 3,
        level,
        thresholds_by_level,
        gap_message: gapMessage,
      });
    }
    return items;
  }

  /**
   * Simular validação de rating com dados inputados
   */
  async simulate(
    input: SimulateRatingInput,
    userId?: string
  ): Promise<{
    calculated_values: CalculatedValues;
    indicators: Indicators;
    indicator_analysis: Array<{
      id: string;
      name: string;
      formula: string;
      value: number;
      value_formatted: string;
      score: number;
      max_score: number;
      level: 'A' | 'B' | 'C' | 'D';
      thresholds_by_level: { D: string; C: string; B: string; A: string };
      gap_message: string;
    }>;
    rating_estimado: Rating;
    rating_real?: Rating;
    has_discrepancy: boolean;
    discrepancy_details?: Record<string, any>;
    validation_id?: string;
    comparativo_parcelamento?: ComparativoParcelamento;
  }> {
    // Validar que cliente existe apenas se fornecido e se for salvar simulação
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
      }
    } else if (input.save_simulation) {
      // Se for salvar, cliente é obrigatório
      throw new AppError('Client ID is required when saving simulation', 'CLIENT_REQUIRED', 400);
    }

    // Calcular valores agregados
    const calculatedValues = this.calculateAggregatedValues(input);

    // Calcular indicadores
    const indicators = this.calculateIndicators(calculatedValues);

    // Classificar rating
    const ratingEstimado = this.classifyRating(indicators);

    // Comparar com rating real (se fornecido)
    const comparison = this.compareRatings(ratingEstimado, input.rating_real);

    // Análise por indicador para demonstrativo da discrepância (uso jurídico)
    const indicator_analysis = this.getIndicatorAnalysis(
      indicators,
      input.rating_real,
      ratingEstimado
    );

    // Gerar comparativo se parcelamento PGFN foi fornecido
    let comparativoParcelamento: ComparativoParcelamento | undefined;
    if (input.parcelamento_pgfn) {
      comparativoParcelamento = this.generateComparativoParcelamento(
        ratingEstimado,
        input.parcelamento_pgfn
      );
    }

    // Salvar simulação se solicitado (requer client_id)
    let validationId: string | undefined;
    if (input.save_simulation) {
      if (!input.client_id) {
        throw new AppError('Client ID is required when saving simulation', 'CLIENT_REQUIRED', 400);
      }
      
      const validationData: CreateRatingValidationData = {
        client_id: input.client_id,
        competence: input.competencia,
        fiscal_file_id: null,
        is_simulation: true,
        input_data: input as any,
        calculated_values: calculatedValues,
        liquidez_corrente: indicators.liquidez_corrente,
        liquidez_geral: indicators.liquidez_geral,
        solvencia: indicators.solvencia,
        rating_estimado: ratingEstimado,
        rating_real: input.rating_real || null,
        has_discrepancy: comparison.has_discrepancy,
        discrepancy_details: comparison.discrepancy_details || null,
        parcelamento_pgfn: input.parcelamento_pgfn || null,
        comparativo_parcelamento: comparativoParcelamento || null,
        created_by: userId || null,
      };

      const validation = await this.ratingValidatorRepo.create(validationData);
      validationId = validation.id;
    }

    return {
      calculated_values: calculatedValues,
      indicators,
      indicator_analysis,
      rating_estimado: ratingEstimado,
      rating_real: input.rating_real,
      has_discrepancy: comparison.has_discrepancy,
      discrepancy_details: comparison.discrepancy_details,
      validation_id: validationId,
      comparativo_parcelamento: comparativoParcelamento,
    };
  }

  /**
   * Validar rating a partir de arquivo ECD processado
   * NOTA: Implementação preparada, aguarda exemplos de dados ECD
   */
  async validateFromFiscalFile(
    fiscalFileId: string,
    _ratingReal?: Rating,
    _userId?: string
  ): Promise<{
    calculated_values: CalculatedValues;
    indicators: Indicators;
    rating_estimado: Rating;
    rating_real?: Rating;
    has_discrepancy: boolean;
    discrepancy_details?: Record<string, any>;
    validation_id: string;
  }> {
    // Buscar arquivo fiscal
    const fiscalFile = await this.fiscalFileRepo.findById(fiscalFileId);
    if (!fiscalFile) {
      throw new AppError('Fiscal file not found', 'FISCAL_FILE_NOT_FOUND', 404);
    }

    if (fiscalFile.file_type !== 'ecd') {
      throw new AppError('File must be of type ECD', 'INVALID_FILE_TYPE', 400);
    }

    if (fiscalFile.status !== 'processed') {
      throw new AppError(
        'Fiscal file must be processed before validation',
        'FILE_NOT_PROCESSED',
        400
      );
    }

    // Buscar dados extraídos
    const extractedData = await this.ratingValidatorRepo.findExtractedFiscalData(
      fiscalFile.client_id,
      fiscalFile.competence,
      ['balance_sheet', 'dre']
    );

    if (extractedData.length === 0) {
      throw new AppError(
        'No extracted data found for this fiscal file',
        'NO_EXTRACTED_DATA',
        404
      );
    }

    // TODO: Mapear dados extraídos para estrutura esperada
    // Isso será implementado quando tivermos exemplos de dados ECD
    throw new AppError(
      'ECD data parsing not yet implemented. Waiting for ECD file examples.',
      'NOT_IMPLEMENTED',
      501
    );
  }

  /**
   * Buscar validação por ID
   */
  async getById(id: string) {
    const validation = await this.ratingValidatorRepo.findById(id);
    if (!validation) {
      throw new AppError('Rating validation not found', 'VALIDATION_NOT_FOUND', 404);
    }
    return validation;
  }

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
  }) {
    return this.ratingValidatorRepo.list(options);
  }

  /**
   * Deletar validação
   */
  async delete(id: string, _userId?: string) {
    await this.getById(id); // Validar que existe
    await this.ratingValidatorRepo.delete(id);
  }

  /**
   * Atualizar validação existente (re-simula com novos dados)
   */
  async update(
    id: string,
    input: SimulateRatingInput,
    _userId?: string
  ): Promise<{
    validation: Awaited<ReturnType<RatingValidatorRepository['fullUpdate']>>;
    result: {
      calculated_values: CalculatedValues;
      indicators: Indicators;
      indicator_analysis: Array<{
        id: string;
        name: string;
        formula: string;
        value: number;
        value_formatted: string;
        score: number;
        max_score: number;
        level: 'A' | 'B' | 'C' | 'D';
        thresholds_by_level: { D: string; C: string; B: string; A: string };
        gap_message: string;
      }>;
      rating_estimado: Rating;
      rating_real?: Rating;
      has_discrepancy: boolean;
      discrepancy_details?: Record<string, any>;
      comparativo_parcelamento?: ComparativoParcelamento;
    };
  }> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new AppError('Rating validation not found', 'VALIDATION_NOT_FOUND', 404);
    }

    // Validar cliente se fornecido
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
      }
    }

    // Calcular valores agregados
    const calculatedValues = this.calculateAggregatedValues(input);

    // Calcular indicadores
    const indicators = this.calculateIndicators(calculatedValues);

    // Classificar rating
    const ratingEstimado = this.classifyRating(indicators);

    // Comparar com rating real (se fornecido)
    const comparison = this.compareRatings(ratingEstimado, input.rating_real);

    // Análise por indicador para demonstrativo
    const indicator_analysis = this.getIndicatorAnalysis(
      indicators,
      input.rating_real,
      ratingEstimado
    );

    // Gerar comparativo se parcelamento PGFN foi fornecido
    let comparativoParcelamento: ComparativoParcelamento | undefined;
    if (input.parcelamento_pgfn) {
      comparativoParcelamento = this.generateComparativoParcelamento(
        ratingEstimado,
        input.parcelamento_pgfn
      );
    }

    // Atualizar no banco
    const updateData: FullUpdateRatingValidationData = {
      client_id: input.client_id || existing.client_id,
      competence: input.competencia,
      input_data: input as any,
      calculated_values: calculatedValues,
      liquidez_corrente: indicators.liquidez_corrente,
      liquidez_geral: indicators.liquidez_geral,
      solvencia: indicators.solvencia,
      rating_estimado: ratingEstimado,
      rating_real: input.rating_real || null,
      has_discrepancy: comparison.has_discrepancy,
      discrepancy_details: comparison.discrepancy_details || null,
      parcelamento_pgfn: input.parcelamento_pgfn || null,
      comparativo_parcelamento: comparativoParcelamento || null,
    };

    const validation = await this.ratingValidatorRepo.fullUpdate(id, updateData);

    return {
      validation,
      result: {
        calculated_values: calculatedValues,
        indicators,
        indicator_analysis,
        rating_estimado: ratingEstimado,
        rating_real: input.rating_real,
        has_discrepancy: comparison.has_discrepancy,
        discrepancy_details: comparison.discrepancy_details,
        comparativo_parcelamento: comparativoParcelamento,
      },
    };
  }

  /**
   * Gera comparativo entre o rating calculado e o parcelamento PGFN
   */
  generateComparativoParcelamento(
    ratingCalculado: Rating,
    parcelamentoPgfn: ParcelamentoPGFN
  ): ComparativoParcelamento {
    const ratingPgfn = parcelamentoPgfn.rating_inferido || 'A';
    const beneficiosCalculado = BENEFICIOS_POR_RATING[ratingCalculado];
    const beneficiosPgfn = BENEFICIOS_POR_RATING[ratingPgfn];

    const valorTotalDivida = parcelamentoPgfn.consolidacao.total_sem_desconto;
    const entradaTotal = parcelamentoPgfn.consolidacao.entrada_total;
    const entradaPct = valorTotalDivida > 0 ? (entradaTotal / valorTotalDivida) * 100 : 0;
    const descontoAplicadoPct = valorTotalDivida > 0 
      ? ((valorTotalDivida - parcelamentoPgfn.consolidacao.total_a_pagar) / valorTotalDivida) * 100 
      : 0;

    const entradaMinimaCalculada = (valorTotalDivida * beneficiosCalculado.entrada_minima_pct) / 100;
    const valorExcedenteEntrada = Math.max(0, entradaTotal - entradaMinimaCalculada);

    const descontoMaximoCalculado = (
      (parcelamentoPgfn.consolidacao.multa + parcelamentoPgfn.consolidacao.juros) * 
      beneficiosCalculado.desconto_maximo_multa_juros_pct / 100
    );
    const economiaPotencial = Math.max(0, descontoMaximoCalculado - parcelamentoPgfn.consolidacao.desconto_total);

    const parcelasExtrasDisponiveis = Math.max(0, 
      beneficiosCalculado.prazo_maximo_meses - parcelamentoPgfn.pagamento.parcelas_qtd
    );

    const divergencia = ratingCalculado !== ratingPgfn;

    let fundamentacao = '';
    if (divergencia) {
      const ordemRating = { A: 1, B: 2, C: 3, D: 4 };
      const calculadoMelhor = ordemRating[ratingCalculado] > ordemRating[ratingPgfn];
      
      if (calculadoMelhor) {
        fundamentacao = `ATENÇÃO: O rating calculado (${ratingCalculado}) indica PIOR capacidade de pagamento que o rating concedido pela PGFN (${ratingPgfn}). `;
        fundamentacao += `Isso sugere que o contribuinte pode ter sido prejudicado na concessão do parcelamento. `;
        fundamentacao += `\n\nCom o rating ${ratingCalculado}, o contribuinte teria direito a:\n`;
        fundamentacao += `- Desconto de até ${beneficiosCalculado.desconto_maximo_multa_juros_pct}% sobre multa e juros (vs. ${beneficiosPgfn.desconto_maximo_multa_juros_pct}% concedido)\n`;
        fundamentacao += `- Prazo de até ${beneficiosCalculado.prazo_maximo_meses} meses (vs. ${parcelamentoPgfn.pagamento.parcelas_qtd + parcelamentoPgfn.pagamento.entrada_qtd} meses concedido)\n`;
        fundamentacao += `- Entrada mínima de ${beneficiosCalculado.entrada_minima_pct}% (vs. ${entradaPct.toFixed(2)}% cobrado)\n`;
        if (beneficiosCalculado.permite_reducao_principal) {
          fundamentacao += `- Possibilidade de redução do valor principal\n`;
        }
        fundamentacao += `\nBase legal: Portaria PGFN nº 6.757/2022, arts. 30 a 35 (Capag Efetiva) e Lei nº 13.988/2020, art. 3º.`;
        fundamentacao += `\n\nRecomendação: Avaliar pedido de revisão do enquadramento junto à PGFN, apresentando o Balanço Patrimonial e demonstrando os indicadores de capacidade de pagamento.`;
      } else {
        fundamentacao = `O rating calculado (${ratingCalculado}) indica MELHOR capacidade de pagamento que o rating concedido pela PGFN (${ratingPgfn}). `;
        fundamentacao += `Isso pode indicar inconsistência nos dados do balanço ou critérios diferentes utilizados pela PGFN.`;
        fundamentacao += `\n\nBase legal: Portaria PGFN nº 6.757/2022.`;
      }
    } else {
      fundamentacao = `O rating calculado (${ratingCalculado}) coincide com o rating do parcelamento PGFN. `;
      fundamentacao += `Não há divergência a ser questionada.\n\nBase legal: Portaria PGFN nº 6.757/2022.`;
    }

    return {
      rating_calculado: ratingCalculado,
      rating_pgfn: ratingPgfn,
      divergencia,
      
      cenario_calculado: {
        desconto_maximo_multa_juros_pct: beneficiosCalculado.desconto_maximo_multa_juros_pct,
        prazo_maximo_meses: beneficiosCalculado.prazo_maximo_meses,
        entrada_minima_pct: beneficiosCalculado.entrada_minima_pct,
      },
      
      cenario_pgfn: {
        valor_total_divida: valorTotalDivida,
        entrada_total: entradaTotal,
        entrada_pct: Number(entradaPct.toFixed(2)),
        parcelas_qtd: parcelamentoPgfn.pagamento.parcelas_qtd,
        parcelas_valor: parcelamentoPgfn.pagamento.parcelas_valor,
        desconto_aplicado_pct: Number(descontoAplicadoPct.toFixed(2)),
        total_a_pagar: parcelamentoPgfn.consolidacao.total_a_pagar,
      },
      
      diferenca_financeira: {
        economia_potencial: Number(economiaPotencial.toFixed(2)),
        parcelas_extras_disponiveis: parcelasExtrasDisponiveis,
        valor_excedente_entrada: Number(valorExcedenteEntrada.toFixed(2)),
      },
      
      fundamentacao_juridica: fundamentacao,
    };
  }
}

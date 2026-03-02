"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingValidatorService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
class RatingValidatorService {
    ratingValidatorRepo;
    clientRepo;
    fiscalFileRepo;
    constructor(ratingValidatorRepo, clientRepo, fiscalFileRepo) {
        this.ratingValidatorRepo = ratingValidatorRepo;
        this.clientRepo = clientRepo;
        this.fiscalFileRepo = fiscalFileRepo;
    }
    /**
     * Calcular valores agregados a partir de campos granulares
     */
    calculateAggregatedValues(input) {
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
        const ativoTotal = ativoCirculanteTotal +
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
    calculateIndicators(values) {
        // Liquidez Corrente = Ativo Circulante / Passivo Circulante
        if (values.passivo_circulante_total === 0) {
            throw new error_handler_1.AppError('Passivo Circulante não pode ser zero para calcular Liquidez Corrente', 'INVALID_CALCULATION', 400);
        }
        const liquidezCorrente = values.ativo_circulante_total / values.passivo_circulante_total;
        // Liquidez Geral = (Ativo Circulante + Realizável a Longo Prazo) / (Passivo Circulante + Passivo Não Circulante)
        const passivoTotal = values.passivo_circulante_total + values.passivo_nao_circulante_total;
        if (passivoTotal === 0) {
            throw new error_handler_1.AppError('Passivo Total não pode ser zero para calcular Liquidez Geral', 'INVALID_CALCULATION', 400);
        }
        const liquidezGeral = (values.ativo_circulante_total + values.realizavel_longo_prazo_total) / passivoTotal;
        // Solvência = Patrimônio Líquido / Ativo Total
        if (values.ativo_total === 0) {
            throw new error_handler_1.AppError('Ativo Total não pode ser zero para calcular Solvência', 'INVALID_CALCULATION', 400);
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
    classifyRating(indicators) {
        const { liquidez_corrente, liquidez_geral, solvencia } = indicators;
        // Critérios de classificação (valores podem ser ajustados conforme Portaria específica)
        // Rating A: Excelente
        // Rating B: Bom
        // Rating C: Regular
        // Rating D: Insuficiente
        let score = 0;
        // Avaliar Liquidez Corrente
        if (liquidez_corrente >= 2.0)
            score += 3;
        else if (liquidez_corrente >= 1.5)
            score += 2;
        else if (liquidez_corrente >= 1.0)
            score += 1;
        // score 0 se < 1.0
        // Avaliar Liquidez Geral
        if (liquidez_geral >= 1.5)
            score += 3;
        else if (liquidez_geral >= 1.2)
            score += 2;
        else if (liquidez_geral >= 1.0)
            score += 1;
        // score 0 se < 1.0
        // Avaliar Solvência
        if (solvencia >= 0.5)
            score += 3;
        else if (solvencia >= 0.3)
            score += 2;
        else if (solvencia >= 0.1)
            score += 1;
        // score 0 se < 0.1
        // Classificação baseada no score total (0-9)
        if (score >= 7)
            return 'A';
        if (score >= 5)
            return 'B';
        if (score >= 3)
            return 'C';
        return 'D';
    }
    /**
     * Comparar Rating Estimado com Rating Real
     */
    compareRatings(ratingEstimado, ratingReal) {
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
    static THRESHOLDS = {
        liquidez_corrente: [
            { min: 2.0, points: 3, level: 'A' },
            { min: 1.5, points: 2, level: 'B' },
            { min: 1.0, points: 1, level: 'C' },
            { min: 0, points: 0, level: 'D' },
        ],
        liquidez_geral: [
            { min: 1.5, points: 3, level: 'A' },
            { min: 1.2, points: 2, level: 'B' },
            { min: 1.0, points: 1, level: 'C' },
            { min: 0, points: 0, level: 'D' },
        ],
        solvencia: [
            { min: 0.5, points: 3, level: 'A' },
            { min: 0.3, points: 2, level: 'B' },
            { min: 0.1, points: 1, level: 'C' },
            { min: 0, points: 0, level: 'D' },
        ],
    };
    static EPSILON = 1e-9;
    /** Formata limite do indicador (número ou %) */
    static formatThreshold(min, isPercent) {
        if (isPercent)
            return `≥ ${(min * 100).toFixed(0)}%`;
        return `≥ ${min.toFixed(2).replace('.', ',')}`;
    }
    /**
     * Gera análise por indicador para demonstrativo da discrepância (uso jurídico).
     * Retorna limiares por nível (D, C, B, A) para o frontend montar colunas dinâmicas.
     */
    getIndicatorAnalysis(indicators, ratingReal, _ratingEstimado) {
        const items = [];
        const configs = [
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
            let level = 'D';
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
            const fmt = (m) => RatingValidatorService.formatThreshold(m, c.isPercent);
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
            let gapMessage;
            if (ratingReal != null) {
                const nivelInformado = ratingReal;
                const limiteC = thresholds_by_level.C;
                // D = abaixo de C; C/B/A = têm mínimo definido
                const textoVsInformado = nivelInformado === 'D'
                    ? `O rating informado (D) corresponde a valores abaixo do mínimo para C (${limiteC}).`
                    : `O rating informado (${nivelInformado}) exige neste indicador pelo menos ${thresholds_by_level[nivelInformado]}.`;
                if (level === 'D') {
                    gapMessage = belowC
                        ? `Valor ${valueFormatted} está abaixo do mínimo para C. ${textoVsInformado} Para atingir C: ${limiteC}.`
                        : `Valor ${valueFormatted} no limite para C. ${textoVsInformado} Para B: ${thresholds_by_level.B}.`;
                }
                else if (level === 'C') {
                    gapMessage = `Valor ${valueFormatted} atende ao mínimo para C (calculado). ${textoVsInformado} Para atingir B: ${thresholds_by_level.B}.`;
                }
                else if (level === 'B') {
                    gapMessage = `Valor ${valueFormatted} atende ao mínimo para B. ${textoVsInformado} Para A: ${thresholds_by_level.A}.`;
                }
                else {
                    gapMessage = `Valor ${valueFormatted} atende ao mínimo para A. ${textoVsInformado}`;
                }
            }
            else {
                // Sem rating informado: mensagem genérica por nível do indicador
                if (level === 'D') {
                    gapMessage = belowC
                        ? `Valor ${valueFormatted} está abaixo do mínimo para C (${thresholds_by_level.C}). Para atingir C: ${thresholds_by_level.C}; B: ${thresholds_by_level.B}.`
                        : `Valor ${valueFormatted} no limite para C. Para B: ${thresholds_by_level.B}.`;
                }
                else if (level === 'C') {
                    gapMessage = `Valor ${valueFormatted} atende ao mínimo para C (1 ponto). Para atingir B: ${thresholds_by_level.B}; A: ${thresholds_by_level.A}.`;
                }
                else if (level === 'B') {
                    gapMessage = `Valor ${valueFormatted} atende ao mínimo para B (${score} pontos). Para atingir A: ${thresholds_by_level.A}.`;
                }
                else {
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
    async simulate(input, userId) {
        // Validar que cliente existe apenas se fornecido e se for salvar simulação
        if (input.client_id) {
            const client = await this.clientRepo.findById(input.client_id);
            if (!client) {
                throw new error_handler_1.AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
            }
        }
        else if (input.save_simulation) {
            // Se for salvar, cliente é obrigatório
            throw new error_handler_1.AppError('Client ID is required when saving simulation', 'CLIENT_REQUIRED', 400);
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
        const indicator_analysis = this.getIndicatorAnalysis(indicators, input.rating_real, ratingEstimado);
        // Salvar simulação se solicitado (requer client_id)
        let validationId;
        if (input.save_simulation) {
            if (!input.client_id) {
                throw new error_handler_1.AppError('Client ID is required when saving simulation', 'CLIENT_REQUIRED', 400);
            }
            const validationData = {
                client_id: input.client_id,
                competence: input.competencia,
                fiscal_file_id: null,
                is_simulation: true,
                input_data: input,
                calculated_values: calculatedValues,
                liquidez_corrente: indicators.liquidez_corrente,
                liquidez_geral: indicators.liquidez_geral,
                solvencia: indicators.solvencia,
                rating_estimado: ratingEstimado,
                rating_real: input.rating_real || null,
                has_discrepancy: comparison.has_discrepancy,
                discrepancy_details: comparison.discrepancy_details || null,
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
        };
    }
    /**
     * Validar rating a partir de arquivo ECD processado
     * NOTA: Implementação preparada, aguarda exemplos de dados ECD
     */
    async validateFromFiscalFile(fiscalFileId, _ratingReal, _userId) {
        // Buscar arquivo fiscal
        const fiscalFile = await this.fiscalFileRepo.findById(fiscalFileId);
        if (!fiscalFile) {
            throw new error_handler_1.AppError('Fiscal file not found', 'FISCAL_FILE_NOT_FOUND', 404);
        }
        if (fiscalFile.file_type !== 'ecd') {
            throw new error_handler_1.AppError('File must be of type ECD', 'INVALID_FILE_TYPE', 400);
        }
        if (fiscalFile.status !== 'processed') {
            throw new error_handler_1.AppError('Fiscal file must be processed before validation', 'FILE_NOT_PROCESSED', 400);
        }
        // Buscar dados extraídos
        const extractedData = await this.ratingValidatorRepo.findExtractedFiscalData(fiscalFile.client_id, fiscalFile.competence, ['balance_sheet', 'dre']);
        if (extractedData.length === 0) {
            throw new error_handler_1.AppError('No extracted data found for this fiscal file', 'NO_EXTRACTED_DATA', 404);
        }
        // TODO: Mapear dados extraídos para estrutura esperada
        // Isso será implementado quando tivermos exemplos de dados ECD
        throw new error_handler_1.AppError('ECD data parsing not yet implemented. Waiting for ECD file examples.', 'NOT_IMPLEMENTED', 501);
    }
    /**
     * Buscar validação por ID
     */
    async getById(id) {
        const validation = await this.ratingValidatorRepo.findById(id);
        if (!validation) {
            throw new error_handler_1.AppError('Rating validation not found', 'VALIDATION_NOT_FOUND', 404);
        }
        return validation;
    }
    /**
     * Listar validações
     */
    async list(options) {
        return this.ratingValidatorRepo.list(options);
    }
    /**
     * Deletar validação
     */
    async delete(id, _userId) {
        await this.getById(id); // Validar que existe
        await this.ratingValidatorRepo.delete(id);
    }
}
exports.RatingValidatorService = RatingValidatorService;

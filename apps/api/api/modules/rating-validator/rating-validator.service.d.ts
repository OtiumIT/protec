import { RatingValidatorRepository } from './rating-validator.repository';
import { ClientRepository } from '../clients/client.repository';
import { FiscalFileRepository } from '../fiscal-files/fiscal-file.repository';
import { SimulateRatingSchema } from '@shared/core';
import type { z } from 'zod';
type SimulateRatingInput = z.infer<typeof SimulateRatingSchema>;
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
export declare class RatingValidatorService {
    private ratingValidatorRepo;
    private clientRepo;
    private fiscalFileRepo;
    constructor(ratingValidatorRepo: RatingValidatorRepository, clientRepo: ClientRepository, fiscalFileRepo: FiscalFileRepository);
    /**
     * Calcular valores agregados a partir de campos granulares
     */
    private calculateAggregatedValues;
    /**
     * Calcular indicadores financeiros
     */
    private calculateIndicators;
    /**
     * Classificar Rating baseado nos indicadores
     * Critérios baseados em análise financeira padrão (será ajustado conforme Portaria específica)
     */
    private classifyRating;
    /**
     * Comparar Rating Estimado com Rating Real
     */
    private compareRatings;
    /** Limiares por indicador (pontos: 0, 1, 2, 3) para uso no demonstrativo */
    private static readonly THRESHOLDS;
    private static readonly EPSILON;
    /** Formata limite do indicador (número ou %) */
    private static formatThreshold;
    /**
     * Gera análise por indicador para demonstrativo da discrepância (uso jurídico).
     * Retorna limiares por nível (D, C, B, A) para o frontend montar colunas dinâmicas.
     */
    private getIndicatorAnalysis;
    /**
     * Simular validação de rating com dados inputados
     */
    simulate(input: SimulateRatingInput, userId?: string): Promise<{
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
            thresholds_by_level: {
                D: string;
                C: string;
                B: string;
                A: string;
            };
            gap_message: string;
        }>;
        rating_estimado: Rating;
        rating_real?: Rating;
        has_discrepancy: boolean;
        discrepancy_details?: Record<string, any>;
        validation_id?: string;
    }>;
    /**
     * Validar rating a partir de arquivo ECD processado
     * NOTA: Implementação preparada, aguarda exemplos de dados ECD
     */
    validateFromFiscalFile(fiscalFileId: string, _ratingReal?: Rating, _userId?: string): Promise<{
        calculated_values: CalculatedValues;
        indicators: Indicators;
        rating_estimado: Rating;
        rating_real?: Rating;
        has_discrepancy: boolean;
        discrepancy_details?: Record<string, any>;
        validation_id: string;
    }>;
    /**
     * Buscar validação por ID
     */
    getById(id: string): Promise<import("@shared/core").RatingValidation>;
    /**
     * Listar validações
     */
    list(options: {
        client_id?: string;
        competence?: string;
        is_simulation?: boolean;
        rating_estimado?: 'A' | 'B' | 'C' | 'D';
        page?: number;
        limit?: number;
    }): Promise<{
        validations: import("@shared/core").RatingValidation[];
        total: number;
    }>;
    /**
     * Deletar validação
     */
    delete(id: string, _userId?: string): Promise<void>;
}
export {};
//# sourceMappingURL=rating-validator.service.d.ts.map
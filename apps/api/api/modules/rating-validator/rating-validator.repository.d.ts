import { BaseRepository } from '../../shared/repositories/base.repository';
import type { RatingValidation } from '@shared/core';
export interface CreateRatingValidationData {
    client_id: string;
    competence: string;
    fiscal_file_id?: string | null;
    is_simulation: boolean;
    input_data: Record<string, any>;
    calculated_values?: Record<string, any> | null;
    liquidez_corrente?: number | null;
    liquidez_geral?: number | null;
    solvencia?: number | null;
    rating_estimado: 'A' | 'B' | 'C' | 'D';
    rating_real?: 'A' | 'B' | 'C' | 'D' | null;
    has_discrepancy: boolean;
    discrepancy_details?: Record<string, any> | null;
    created_by?: string | null;
}
export interface UpdateRatingValidationData {
    rating_real?: 'A' | 'B' | 'C' | 'D' | null;
    has_discrepancy?: boolean;
    discrepancy_details?: Record<string, any> | null;
}
export declare class RatingValidatorRepository extends BaseRepository {
    /**
     * Buscar validação por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findById(id: string): Promise<RatingValidation | null>;
    /**
     * Criar validação
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    create(data: CreateRatingValidationData): Promise<RatingValidation>;
    /**
     * Atualizar validação
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    update(id: string, data: UpdateRatingValidationData): Promise<RatingValidation>;
    /**
     * Deletar validação
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    delete(id: string): Promise<void>;
    /**
     * Listar validações com filtros
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    list(options: {
        client_id?: string;
        competence?: string;
        is_simulation?: boolean;
        rating_estimado?: 'A' | 'B' | 'C' | 'D';
        page?: number;
        limit?: number;
    }): Promise<{
        validations: RatingValidation[];
        total: number;
    }>;
    /**
     * Buscar dados extraídos de ECD (Balanço e DRE)
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findExtractedFiscalData(clientId: string, competence: string, dataTypes: string[]): Promise<Array<{
        data_type: string;
        data: Record<string, any>;
    }>>;
    /**
     * Buscar validações por cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findByClient(clientId: string): Promise<RatingValidation[]>;
}
//# sourceMappingURL=rating-validator.repository.d.ts.map
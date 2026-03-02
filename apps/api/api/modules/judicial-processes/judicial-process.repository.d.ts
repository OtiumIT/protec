import { BaseRepository } from '../../shared/repositories/base.repository';
import type { JudicialProcess, LegalThesis } from '@shared/core';
export interface CreateJudicialProcessData {
    client_id: string;
    process_number: string;
    court?: string;
    legal_thesis: LegalThesis;
    case_value?: number;
    start_date?: string;
    status?: 'active' | 'suspended' | 'closed';
    notes?: string;
}
export interface UpdateJudicialProcessData {
    process_number?: string;
    court?: string;
    legal_thesis?: LegalThesis;
    case_value?: number;
    start_date?: string;
    status?: 'active' | 'suspended' | 'closed';
    notes?: string;
}
export declare class JudicialProcessRepository extends BaseRepository {
    /**
     * Buscar processo por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findById(id: string): Promise<JudicialProcess | null>;
    /**
     * Listar processos de um cliente
     */
    findByClientId(clientId: string): Promise<JudicialProcess[]>;
    /**
     * Buscar processos ativos por cliente e tese
     */
    findActiveByClientAndThesis(clientId: string, legalThesis: LegalThesis): Promise<JudicialProcess[]>;
    /**
     * Verificar se cliente tem processos ativos para uma tese específica
     */
    hasActiveProcessForThesis(clientId: string, legalThesis: LegalThesis): Promise<boolean>;
    /**
     * Criar processo judicial
     */
    create(data: CreateJudicialProcessData): Promise<JudicialProcess>;
    /**
     * Atualizar processo judicial
     */
    update(id: string, data: UpdateJudicialProcessData): Promise<JudicialProcess>;
    /**
     * Deletar processo judicial
     */
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=judicial-process.repository.d.ts.map
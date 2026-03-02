import { JudicialProcessRepository, type CreateJudicialProcessData, type UpdateJudicialProcessData } from './judicial-process.repository';
import { ClientRepository } from '../clients/client.repository';
import type { JudicialProcess, LegalThesis } from '@shared/core';
export declare class JudicialProcessService {
    private processRepo;
    private clientRepo;
    constructor(processRepo: JudicialProcessRepository, clientRepo: ClientRepository);
    /**
     * Listar processos de um cliente
     */
    findByClientId(clientId: string): Promise<JudicialProcess[]>;
    /**
     * Buscar processo por ID
     */
    findById(id: string): Promise<JudicialProcess>;
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
    /**
     * Verificar se cliente é elegível para um edital de contencioso baseado na tese
     */
    isEligibleForThesis(clientId: string, legalThesis: LegalThesis): Promise<boolean>;
    /**
     * Obter todas as teses elegíveis para um cliente
     */
    getEligibleTheses(clientId: string): Promise<LegalThesis[]>;
}
//# sourceMappingURL=judicial-process.service.d.ts.map
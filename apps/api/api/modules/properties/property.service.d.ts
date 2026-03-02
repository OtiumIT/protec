import { PropertyRepository } from './property.repository';
import { ClientRepository } from '../clients/client.repository';
import type { CreatePropertyInput, UpdatePropertyInput, PropertyTransactionInput, SimulatePropertyTaxInput, SimulateStandaloneInput, PropertyTaxSimulationResponse, UpsertMonthlyTotalsInput } from '@shared/core';
export declare class PropertyService {
    private repo;
    private clientRepo;
    constructor(repo: PropertyRepository, clientRepo: ClientRepository);
    create(data: CreatePropertyInput): Promise<import("@shared/core").Property>;
    getById(id: string): Promise<import("./property.repository").PropertyWithClient>;
    update(id: string, data: UpdatePropertyInput): Promise<import("@shared/core").Property>;
    delete(id: string): Promise<void>;
    list(options: {
        client_id?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        properties: import("./property.repository").PropertyWithClient[];
        total: number;
    }>;
    addTransaction(propertyId: string, data: PropertyTransactionInput): Promise<import("@shared/core").PropertyTransaction>;
    addTransactionsBatch(propertyId: string, transactions: PropertyTransactionInput[]): Promise<import("@shared/core").PropertyTransaction[]>;
    deleteTransaction(propertyId: string, txId: string): Promise<void>;
    upsertMonthlyTotals(input: UpsertMonthlyTotalsInput): Promise<void>;
    getMonthlyTotals(propertyId: string, ano: number): Promise<{
        mes_referencia: string;
        receita_longa: number;
        receita_short: number;
        despesas_dedutiveis: number;
        custos_operacionais: number;
    }[]>;
    listTransactions(propertyId: string, options?: {
        ano?: number;
        mes?: string;
    }): Promise<import("@shared/core").PropertyTransaction[]>;
    simulate(input: SimulatePropertyTaxInput): Promise<PropertyTaxSimulationResponse>;
    /** Simulação standalone: dados diretos por mês, sem cadastro de imóveis */
    simulateStandalone(input: SimulateStandaloneInput): Promise<PropertyTaxSimulationResponse>;
}
//# sourceMappingURL=property.service.d.ts.map
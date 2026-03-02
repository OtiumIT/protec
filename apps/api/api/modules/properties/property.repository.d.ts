import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Property, PropertyTransaction } from '@shared/core';
import type { AggregatedYear } from './calculations';
export interface CreatePropertyData {
    client_id: string;
    tipo_locacao: string;
    identificador: string;
    modo_entrada?: 'detalhado' | 'reduzido';
}
export interface UpdatePropertyData {
    client_id?: string;
    tipo_locacao?: string;
    identificador?: string;
    modo_entrada?: 'detalhado' | 'reduzido';
}
export interface CreateTransactionData {
    property_id: string;
    mes_referencia: string;
    tipo: string;
    categoria: string;
    valor: number;
    observacao?: string;
}
export interface PropertyWithClient extends Property {
    client_name?: string;
}
export declare class PropertyRepository extends BaseRepository {
    findById(id: string): Promise<Property | null>;
    findByIdWithClient(id: string): Promise<PropertyWithClient | null>;
    create(data: CreatePropertyData): Promise<Property>;
    update(id: string, data: UpdatePropertyData): Promise<Property>;
    delete(id: string): Promise<void>;
    list(options: {
        client_id?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        properties: PropertyWithClient[];
        total: number;
    }>;
    createTransaction(data: CreateTransactionData): Promise<PropertyTransaction>;
    createTransactionsBatch(propertyId: string, transactions: Array<{
        mes_referencia: string;
        tipo: string;
        categoria: string;
        valor: number;
        observacao?: string;
    }>): Promise<PropertyTransaction[]>;
    getTransactionById(txId: string): Promise<PropertyTransaction | null>;
    deleteTransaction(txId: string): Promise<void>;
    listTransactions(propertyId: string, options?: {
        ano?: number;
        mes?: string;
    }): Promise<PropertyTransaction[]>;
    upsertMonthlyTotals(propertyId: string, _ano: number, meses: Array<{
        mes_referencia: string;
        receita_longa: number;
        receita_short: number;
        despesas_dedutiveis: number;
        custos_operacionais: number;
    }>): Promise<void>;
    getMonthlyTotals(propertyId: string, ano: number): Promise<Array<{
        mes_referencia: string;
        receita_longa: number;
        receita_short: number;
        despesas_dedutiveis: number;
        custos_operacionais: number;
    }>>;
    /**
     * Agrega transações ou totais mensais por propriedade e ano para os cálculos tributários.
     * Retorna receita, despesas_dedutiveis e custos_operacionais por mês (Jan-Dec).
     */
    aggregateByPropertiesYear(propertyIds: string[], ano: number): Promise<Map<string, {
        property_id: string;
        identificador: string;
        aggregated: AggregatedYear;
    }>>;
}
//# sourceMappingURL=property.repository.d.ts.map
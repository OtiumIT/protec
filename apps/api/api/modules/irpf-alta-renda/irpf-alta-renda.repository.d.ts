import { BaseRepository } from '../../shared/repositories/base.repository';
import type { RendimentoIsentoDividendo } from '@shared/core';
export interface IrpfAltaRendaRecord {
    id: string;
    company_id: string | null;
    ano: number;
    contribuinte_nome: string;
    contribuinte_cpf: string;
    rendimentos_tributaveis: number;
    dados_dividendos: RendimentoIsentoDividendo[];
    base_calculo_combinada: number;
    resultado_simulacao: Record<string, unknown>;
    payload_json: Record<string, unknown> | null;
    title: string | null;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
}
export interface CreateIrpfAltaRendaData {
    company_id: string | null;
    ano: number;
    contribuinte_nome: string;
    contribuinte_cpf: string;
    rendimentos_tributaveis: number;
    dados_dividendos: RendimentoIsentoDividendo[];
    base_calculo_combinada: number;
    resultado_simulacao: Record<string, unknown>;
    payload_json?: Record<string, unknown> | null;
    title?: string | null;
    created_by?: string | null;
}
export interface UpdateIrpfAltaRendaData {
    company_id?: string | null;
    ano: number;
    contribuinte_nome: string;
    contribuinte_cpf: string;
    rendimentos_tributaveis: number;
    dados_dividendos: RendimentoIsentoDividendo[];
    base_calculo_combinada: number;
    resultado_simulacao: Record<string, unknown>;
    payload_json: Record<string, unknown>;
    title?: string | null;
}
export declare class IrpfAltaRendaRepository extends BaseRepository {
    findById(id: string): Promise<IrpfAltaRendaRecord | null>;
    create(data: CreateIrpfAltaRendaData): Promise<IrpfAltaRendaRecord>;
    update(id: string, data: UpdateIrpfAltaRendaData): Promise<IrpfAltaRendaRecord>;
    delete(id: string): Promise<void>;
    list(options: {
        company_id?: string;
        ano?: number;
        page?: number;
        limit?: number;
    }): Promise<{
        items: IrpfAltaRendaRecord[];
        total: number;
    }>;
    private mapRow;
}
//# sourceMappingURL=irpf-alta-renda.repository.d.ts.map
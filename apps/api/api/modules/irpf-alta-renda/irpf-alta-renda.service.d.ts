import { IrpfAltaRendaRepository, type IrpfAltaRendaRecord } from './irpf-alta-renda.repository';
import { CompanyRepository } from '../companies/company.repository';
import type { SimulateIrpfAltaRendaInput, SimulateAndSaveIrpfAltaRendaInput, UpdateIrpfAltaRendaInput, IrpfAltaRendaSimulacaoResponse, ReportSummaryIrpfAltaRendaInput, ReportSummaryIrpfAltaRendaResponse } from '@shared/core';
export declare class IrpfAltaRendaService {
    private repo;
    private companyRepo;
    constructor(repo: IrpfAltaRendaRepository, companyRepo: CompanyRepository);
    /**
     * Simula impacto tributário (Lei 15.270/2025) sem persistir.
     */
    simulate(input: SimulateIrpfAltaRendaInput): Promise<IrpfAltaRendaSimulacaoResponse>;
    /**
     * Simula e persiste no tenant. Valida company_id se informado.
     */
    simulateAndSave(input: SimulateAndSaveIrpfAltaRendaInput, userId?: string): Promise<{
        registro: IrpfAltaRendaRecord;
        resultado: IrpfAltaRendaSimulacaoResponse;
    }>;
    /**
     * Atualiza simulação existente. Re-simula com os dados enviados.
     */
    update(id: string, input: UpdateIrpfAltaRendaInput, _userId?: string): Promise<{
        registro: IrpfAltaRendaRecord;
        resultado: IrpfAltaRendaSimulacaoResponse;
    }>;
    getById(id: string): Promise<IrpfAltaRendaRecord>;
    private buildLegacyPayload;
    list(options: {
        company_id?: string;
        ano?: number;
        page?: number;
        limit?: number;
    }): Promise<{
        items: IrpfAltaRendaRecord[];
        total: number;
    }>;
    delete(id: string): Promise<void>;
    buildReportSummary(input: ReportSummaryIrpfAltaRendaInput): Promise<ReportSummaryIrpfAltaRendaResponse>;
}
//# sourceMappingURL=irpf-alta-renda.service.d.ts.map
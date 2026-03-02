import { SimuladorIN2306Repository } from './simulador-in-2306.repository';
import { ClientRepository } from '../clients/client.repository';
import type { SimulateIN2306Input, SimulateTributarioIN2306Input, SimuladorTributarioResponse } from '@shared/core';
import type { IN2306Simulation } from '@shared/core';
export declare class SimuladorIN2306Service {
    private repo;
    private clientRepo;
    constructor(repo: SimuladorIN2306Repository, clientRepo: ClientRepository);
    /**
     * Executa simulação conforme parâmetros da IN 2.306/2026
     * Cálculo inicial: valor financiado, parcela, resumo
     */
    simulate(input: SimulateIN2306Input, userId?: string): Promise<{
        simulation_id?: string;
        input_data: Record<string, unknown>;
        result_data: {
            valor_total: number;
            valor_entrada: number;
            valor_financiado: number;
            numero_parcelas: number;
            valor_parcela?: number;
            parcelas?: Array<{
                numero: number;
                valor: number;
                vencimento?: string;
            }>;
            resumo?: Record<string, unknown>;
        };
        is_simulation: boolean;
    }>;
    getById(id: string): Promise<IN2306Simulation>;
    list(options: {
        client_id?: string;
        competence?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        simulations: IN2306Simulation[];
        total: number;
    }>;
    delete(id: string, _userId?: string): Promise<void>;
    /**
     * Simulação tributária comparativa: Cálculo 2025 x Projeção 2026 (IN 2.306) x Cenário Equiparação Hospitalar
     */
    simulateTributario(input: SimulateTributarioIN2306Input, userId?: string): Promise<SimuladorTributarioResponse & {
        simulation_id?: string;
    }>;
}
//# sourceMappingURL=simulador-in-2306.service.d.ts.map
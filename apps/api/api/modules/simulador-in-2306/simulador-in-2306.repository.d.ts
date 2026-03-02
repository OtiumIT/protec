import { BaseRepository } from '../../shared/repositories/base.repository';
import type { IN2306Simulation } from '@shared/core';
export interface CreateIN2306SimulationData {
    client_id: string | null;
    competence: string;
    input_data: Record<string, unknown>;
    result_data: Record<string, unknown>;
    title?: string | null;
    created_by?: string | null;
}
export declare class SimuladorIN2306Repository extends BaseRepository {
    findById(id: string): Promise<IN2306Simulation | null>;
    create(data: CreateIN2306SimulationData): Promise<IN2306Simulation>;
    delete(id: string): Promise<void>;
    list(options: {
        client_id?: string;
        competence?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        simulations: IN2306Simulation[];
        total: number;
    }>;
}
//# sourceMappingURL=simulador-in-2306.repository.d.ts.map
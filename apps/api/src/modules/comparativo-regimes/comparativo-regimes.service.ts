import { ComparativoRegimesRepository, type CreateComparativoSimulationData } from './comparativo-regimes.repository';
import { AppError } from '../../shared/utils/error-handler';
import { simularComparativoRegimes } from '@shared/core';
import type { ComparativoRegimesInput, ComparativoRegimesResult, ComparativoRegimesSimulation } from '@shared/core';

export class ComparativoRegimesService {
  constructor(private repo: ComparativoRegimesRepository) {}

  async simulate(input: ComparativoRegimesInput): Promise<ComparativoRegimesResult> {
    return simularComparativoRegimes(input);
  }

  async simulateAndSave(
    input: ComparativoRegimesInput,
    userId?: string
  ): Promise<{ simulation_id: string; result: ComparativoRegimesResult }> {
    const result = simularComparativoRegimes(input);

    const createData: CreateComparativoSimulationData = {
      client_id: input.client_id ?? null,
      ano: input.ano,
      input_data: input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: input.title ?? null,
      created_by: userId ?? null,
    };

    const simulation = await this.repo.create(createData);
    return { simulation_id: simulation.id, result };
  }

  async getById(id: string): Promise<ComparativoRegimesSimulation> {
    const simulation = await this.repo.findById(id);
    if (!simulation) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    return simulation;
  }

  async list(options: {
    client_id?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repo.list(options);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }
}

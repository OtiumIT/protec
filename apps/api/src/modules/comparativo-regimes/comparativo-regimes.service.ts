import { ComparativoRegimesRepository, type CreateComparativoSimulationData } from './comparativo-regimes.repository';
import { AppError } from '../../shared/utils/error-handler';
import { simularComparativoRegimes, simularSimplesIbsCbs } from '@shared/core';
import type {
  ComparativoRegimesInput,
  ComparativoRegimesResult,
  ComparativoRegimesSimulation,
  SimplesIbsCbsInput,
  SimplesIbsCbsResult,
  SimulacaoKind,
} from '@shared/core';

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
      kind: 'regimes',
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

  async simulateSimples(input: SimplesIbsCbsInput): Promise<SimplesIbsCbsResult> {
    return simularSimplesIbsCbs(input);
  }

  async simulateSimplesAndSave(
    input: SimplesIbsCbsInput,
    userId?: string
  ): Promise<{ simulation_id: string; result: SimplesIbsCbsResult }> {
    const result = simularSimplesIbsCbs(input);

    const simulation = await this.repo.create({
      kind: 'simples_ibs_cbs',
      client_id: input.client_id ?? null,
      ano: input.ano,
      input_data: input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: input.title ?? null,
      created_by: userId ?? null,
    });
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
    kind?: SimulacaoKind;
    page?: number;
    limit?: number;
  }) {
    return this.repo.list(options);
  }

  async delete(id: string, actor: { userId?: string; companyId?: string | null }): Promise<void> {
    const existing = await this.getById(id);
    await this.repo.delete(id);
    console.log(
      JSON.stringify({
        event: 'AUDIT_COMPARATIVO_REGIMES_DELETE',
        timestamp: new Date().toISOString(),
        user_id: actor.userId ?? null,
        company_id: actor.companyId ?? null,
        simulation_id: id,
        kind: existing.kind,
      })
    );
  }
}

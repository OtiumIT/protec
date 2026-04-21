import type {
  CreateDistribuicaoLucrosSimulationInput,
  DistribuicaoLucrosSimulation,
  DistribuicaoLucrosSimulationParams,
  UpdateDistribuicaoLucrosSimulationInput,
} from '@shared/core';
import { runDistribuicaoLucrosSimulation } from '@shared/core';
import { ClientRepository } from '../clients/client.repository';
import { DistribuicaoLucrosSimulationsRepository } from './distribuicao-lucros-simulations.repository';
import { AppError } from '../../shared/utils/error-handler';

export class DistribuicaoLucrosSimulationsService {
  constructor(
    private readonly repo: DistribuicaoLucrosSimulationsRepository,
    private readonly clientRepo: ClientRepository
  ) {}

  private async assertClientExists(clientId: string): Promise<void> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }
  }

  private paramsFromStored(input: Record<string, unknown>): DistribuicaoLucrosSimulationParams {
    const v = input as Record<string, unknown>;
    return {
      valor: Number(v.valor),
      meses: Number(v.meses),
      irpjRate: Number(v.irpjRate),
      appKey: v.appKey as DistribuicaoLucrosSimulationParams['appKey'],
    };
  }

  async create(
    body: CreateDistribuicaoLucrosSimulationInput,
    userId?: string | null
  ): Promise<DistribuicaoLucrosSimulation> {
    await this.assertClientExists(body.client_id);
    const result = runDistribuicaoLucrosSimulation(body.input);
    return this.repo.create({
      client_id: body.client_id,
      input_data: body.input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: body.title ?? null,
      created_by: userId ?? null,
    });
  }

  async getById(id: string): Promise<DistribuicaoLucrosSimulation> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    return row;
  }

  async list(params: { client_id?: string; page: number; limit: number }) {
    return this.repo.list(params);
  }

  async update(id: string, patch: UpdateDistribuicaoLucrosSimulationInput): Promise<DistribuicaoLucrosSimulation> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }

    let clientId = patch.client_id ?? existing.client_id;
    if (patch.client_id) {
      await this.assertClientExists(patch.client_id);
    }

    let inputData = this.paramsFromStored(existing.input_data);
    if (patch.input) {
      inputData = patch.input;
    }

    const title =
      patch.title !== undefined ? patch.title : existing.title;

    const result = runDistribuicaoLucrosSimulation(inputData);

    return this.repo.update(id, {
      client_id: clientId,
      input_data: inputData as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: title ?? null,
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    await this.repo.delete(id);
  }
}

import type { PrecificadorInput, PrecificadorResult } from '@shared/core';
import { simularPrecificador } from '@shared/core';
import type { PrecificadorSimulation } from '@shared/core';
import { ClientRepository } from '../clients/client.repository';
import { PrecificadorRepository } from './precificador.repository';
import { AppError } from '../../shared/utils/error-handler';

export class PrecificadorService {
  constructor(
    private readonly repo: PrecificadorRepository,
    private readonly clientRepo: ClientRepository
  ) {}

  private async assertClientExists(clientId: string): Promise<void> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }
  }

  simulate(input: PrecificadorInput): PrecificadorResult {
    return simularPrecificador(input);
  }

  async simulateAndSave(
    body: { client_id: string; title?: string | null; input: PrecificadorInput },
    userId?: string | null
  ): Promise<PrecificadorSimulation> {
    await this.assertClientExists(body.client_id);
    const result = simularPrecificador(body.input);
    return this.repo.create({
      client_id: body.client_id,
      input_data: body.input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: body.title ?? null,
      created_by: userId ?? null,
    });
  }

  async getById(id: string): Promise<PrecificadorSimulation> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    return row;
  }

  async list(params: { client_id?: string; page: number; limit: number }) {
    return this.repo.list(params);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    await this.repo.delete(id);
  }
}

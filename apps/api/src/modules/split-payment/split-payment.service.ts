import type {
  CreateSplitPaymentSimulationInput,
  SplitPaymentSimulation,
  SplitPaymentInput,
} from '@shared/core';
import { simularSplitPayment } from '@shared/core';
import { ClientRepository } from '../clients/client.repository';
import { SplitPaymentRepository } from './split-payment.repository';
import { AppError } from '../../shared/utils/error-handler';

export class SplitPaymentService {
  constructor(
    private readonly repo: SplitPaymentRepository,
    private readonly clientRepo: ClientRepository
  ) {}

  private async assertClientExists(clientId: string): Promise<void> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }
  }

  simulate(input: SplitPaymentInput) {
    return simularSplitPayment(input);
  }

  async simulateAndSave(
    body: CreateSplitPaymentSimulationInput,
    userId?: string | null
  ): Promise<SplitPaymentSimulation> {
    await this.assertClientExists(body.client_id);
    const result = simularSplitPayment(body.input);
    return this.repo.create({
      client_id: body.client_id,
      input_data: body.input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: body.title ?? null,
      created_by: userId ?? null,
    });
  }

  async getById(id: string): Promise<SplitPaymentSimulation> {
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

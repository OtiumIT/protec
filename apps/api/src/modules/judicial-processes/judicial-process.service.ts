import { JudicialProcessRepository, type CreateJudicialProcessData, type UpdateJudicialProcessData } from './judicial-process.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { JudicialProcess, LegalThesis } from '@shared/core';

export class JudicialProcessService {
  constructor(
    private processRepo: JudicialProcessRepository,
    private clientRepo: ClientRepository
  ) {}

  /**
   * Listar processos de um cliente
   */
  async findByClientId(clientId: string): Promise<JudicialProcess[]> {
    // Verificar se cliente existe
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    return this.processRepo.findByClientId(clientId);
  }

  /**
   * Buscar processo por ID
   */
  async findById(id: string): Promise<JudicialProcess> {
    const process = await this.processRepo.findById(id);
    if (!process) {
      throw new AppError('Judicial process not found', 'PROCESS_NOT_FOUND', 404);
    }
    return process;
  }

  /**
   * Criar processo judicial
   */
  async create(data: CreateJudicialProcessData): Promise<JudicialProcess> {
    // Verificar se cliente existe
    const client = await this.clientRepo.findById(data.client_id);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    return this.processRepo.create(data);
  }

  /**
   * Atualizar processo judicial
   */
  async update(id: string, data: UpdateJudicialProcessData): Promise<JudicialProcess> {
    const process = await this.processRepo.findById(id);
    if (!process) {
      throw new AppError('Judicial process not found', 'PROCESS_NOT_FOUND', 404);
    }

    return this.processRepo.update(id, data);
  }

  /**
   * Deletar processo judicial
   */
  async delete(id: string): Promise<void> {
    const process = await this.processRepo.findById(id);
    if (!process) {
      throw new AppError('Judicial process not found', 'PROCESS_NOT_FOUND', 404);
    }

    await this.processRepo.delete(id);
  }

  /**
   * Verificar se cliente é elegível para um edital de contencioso baseado na tese
   */
  async isEligibleForThesis(
    clientId: string,
    legalThesis: LegalThesis
  ): Promise<boolean> {
    return this.processRepo.hasActiveProcessForThesis(clientId, legalThesis);
  }

  /**
   * Obter todas as teses elegíveis para um cliente
   */
  async getEligibleTheses(clientId: string): Promise<LegalThesis[]> {
    const theses: LegalThesis[] = ['IPI_PRACA', 'PRL', 'IRPJ_CSLL_DESMUTUALIZACAO'];
    const eligible: LegalThesis[] = [];

    for (const thesis of theses) {
      const hasProcess = await this.processRepo.hasActiveProcessForThesis(clientId, thesis);
      if (hasProcess) {
        eligible.push(thesis);
      }
    }

    return eligible;
  }
}

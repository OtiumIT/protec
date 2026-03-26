import { ClientRepository, CreateClientData, UpdateClientData } from './client.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Client } from '@shared/core';
import { SubscriptionService } from '../subscriptions/subscription.service';

export class ClientService {
  constructor(
    private clientRepo: ClientRepository,
    private subscriptionService: SubscriptionService
  ) {}

  /**
   * Criar cliente com validação de CNPJ/CPF único
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async create(companyId: string, data: CreateClientData): Promise<Client> {
    const subscription = await this.subscriptionService.getByCompany(companyId);
    const maxClients = subscription.plan.max_clients ?? 0;
    if (maxClients > 0) {
      const currentClients = await this.clientRepo.countAll();
      if (currentClients >= maxClients) {
        throw new AppError(
          'Client limit reached for current plan',
          'CLIENT_LIMIT_REACHED',
          409
        );
      }
    }

    const personType = data.person_type || 'pj';
    const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
    const cpfDigits = (data.cpf || '').replace(/\D/g, '');

    if (personType === 'pj' && cnpjDigits) {
      const existing = await this.clientRepo.findByCnpj(cnpjDigits);
      if (existing) {
        throw new AppError('CNPJ já cadastrado', 'CNPJ_ALREADY_EXISTS', 409);
      }
    }
    if (personType === 'pf' && cpfDigits) {
      const existing = await this.clientRepo.findByCpf(cpfDigits);
      if (existing) {
        throw new AppError('CPF já cadastrado', 'CPF_ALREADY_EXISTS', 409);
      }
    }

    const normalized = {
      ...data,
      cnpj: cnpjDigits || undefined,
      cpf: cpfDigits || undefined,
    };
    return this.clientRepo.create(normalized);
  }

  /**
   * Atualizar cliente
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async update(id: string, data: UpdateClientData): Promise<Client> {
    // Verificar se cliente existe (schema já isola)
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
    const cpfDigits = (data.cpf || '').replace(/\D/g, '');
    if (cnpjDigits && cnpjDigits !== (client.cnpj || '').replace(/\D/g, '')) {
      const existing = await this.clientRepo.findByCnpj(cnpjDigits);
      if (existing) {
        throw new AppError('CNPJ já cadastrado', 'CNPJ_ALREADY_EXISTS', 409);
      }
    }
    if (cpfDigits && cpfDigits !== (client.cpf || '').replace(/\D/g, '')) {
      const existing = await this.clientRepo.findByCpf(cpfDigits);
      if (existing) {
        throw new AppError('CPF já cadastrado', 'CPF_ALREADY_EXISTS', 409);
      }
    }

    const normalized: UpdateClientData = { ...data };
    if (data.cnpj !== undefined) normalized.cnpj = cnpjDigits || undefined;
    if (data.cpf !== undefined) normalized.cpf = cpfDigits || undefined;
    return this.clientRepo.update(id, normalized);
  }

  /**
   * Deletar cliente
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async delete(id: string): Promise<void> {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    await this.clientRepo.delete(id);
  }

  /**
   * Listar clientes com paginação
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async list(
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ clients: Client[]; total: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const result = await this.clientRepo.list({
      page,
      limit,
      status: options.status,
    });

    return {
      clients: result.clients,
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * Buscar cliente por ID
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async getById(id: string): Promise<Client> {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }
    return client;
  }
}

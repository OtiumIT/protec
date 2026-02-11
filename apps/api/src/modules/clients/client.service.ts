import { ClientRepository, CreateClientData, UpdateClientData } from './client.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Client } from '@shared/core';

export class ClientService {
  constructor(private clientRepo: ClientRepository) {}

  /**
   * Criar cliente com validação de CNPJ único
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async create(data: CreateClientData): Promise<Client> {
    // Verificar se CNPJ já existe no tenant (schema já isola)
    const existing = await this.clientRepo.findByCnpj(data.cnpj);
    if (existing) {
      throw new AppError('CNPJ already exists', 'CNPJ_ALREADY_EXISTS', 409);
    }

    return this.clientRepo.create(data);
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

    // Se CNPJ está sendo alterado, verificar se já existe
    if (data.cnpj && data.cnpj !== client.cnpj) {
      const existing = await this.clientRepo.findByCnpj(data.cnpj);
      if (existing) {
        throw new AppError('CNPJ already exists', 'CNPJ_ALREADY_EXISTS', 409);
      }
    }

    return this.clientRepo.update(id, data);
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

import { ClientRepository, CreateClientData, UpdateClientData } from './client.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Client } from '@shared/core';

export class ClientService {
  constructor(private clientRepo: ClientRepository) {}

  /**
   * Criar cliente com validação de CNPJ único
   */
  async create(companyId: string, data: CreateClientData): Promise<Client> {
    // Verificar se CNPJ já existe no tenant
    const existing = await this.clientRepo.findByCnpj(data.cnpj, companyId);
    if (existing) {
      throw new AppError('CNPJ already exists', 'CNPJ_ALREADY_EXISTS', 409);
    }

    return this.clientRepo.create(companyId, data);
  }

  /**
   * Atualizar cliente
   */
  async update(id: string, companyId: string, data: UpdateClientData): Promise<Client> {
    // Verificar se cliente existe e pertence ao tenant
    const client = await this.clientRepo.findById(id, companyId);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    // Se CNPJ está sendo alterado, verificar se já existe
    if (data.cnpj && data.cnpj !== client.cnpj) {
      const existing = await this.clientRepo.findByCnpj(data.cnpj, companyId);
      if (existing) {
        throw new AppError('CNPJ already exists', 'CNPJ_ALREADY_EXISTS', 409);
      }
    }

    return this.clientRepo.update(id, companyId, data);
  }

  /**
   * Deletar cliente
   */
  async delete(id: string, companyId: string): Promise<void> {
    const client = await this.clientRepo.findById(id, companyId);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    await this.clientRepo.delete(id, companyId);
  }

  /**
   * Listar clientes com paginação
   */
  async list(
    companyId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{ clients: Client[]; total: number; page: number; limit: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const result = await this.clientRepo.findByCompany(companyId, {
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
   */
  async getById(id: string, companyId: string): Promise<Client> {
    const client = await this.clientRepo.findById(id, companyId);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }
    return client;
  }
}

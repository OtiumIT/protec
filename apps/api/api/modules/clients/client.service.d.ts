import { ClientRepository, CreateClientData, UpdateClientData } from './client.repository';
import type { Client } from '@shared/core';
export declare class ClientService {
    private clientRepo;
    constructor(clientRepo: ClientRepository);
    /**
     * Criar cliente com validação de CNPJ único
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    create(data: CreateClientData): Promise<Client>;
    /**
     * Atualizar cliente
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    update(id: string, data: UpdateClientData): Promise<Client>;
    /**
     * Deletar cliente
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    delete(id: string): Promise<void>;
    /**
     * Listar clientes com paginação
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    list(options?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        clients: Client[];
        total: number;
        page: number;
        limit: number;
    }>;
    /**
     * Buscar cliente por ID
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    getById(id: string): Promise<Client>;
}
//# sourceMappingURL=client.service.d.ts.map
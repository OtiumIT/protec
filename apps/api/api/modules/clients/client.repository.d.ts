import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Client } from '@shared/core';
export interface CreateClientData {
    name: string;
    cnpj: string;
    email?: string;
    tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
    cnae?: string;
    state_registration?: string;
    municipal_registration?: string;
    notes?: string;
}
export interface UpdateClientData {
    name?: string;
    cnpj?: string;
    email?: string;
    status?: 'active' | 'inactive';
    tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
    cnae?: string;
    state_registration?: string;
    municipal_registration?: string;
    notes?: string;
}
export declare class ClientRepository extends BaseRepository {
    /**
     * Buscar cliente por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findById(id: string): Promise<Client | null>;
    /**
     * Buscar cliente por CNPJ
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findByCnpj(cnpj: string): Promise<Client | null>;
    /**
     * Criar cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    create(data: CreateClientData): Promise<Client>;
    /**
     * Atualizar cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    update(id: string, data: UpdateClientData): Promise<Client>;
    /**
     * Deletar cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    delete(id: string): Promise<void>;
    /**
     * Listar clientes (com paginação)
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    list(options?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        clients: Client[];
        total: number;
    }>;
}
//# sourceMappingURL=client.repository.d.ts.map
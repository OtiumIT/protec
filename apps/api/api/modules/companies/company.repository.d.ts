import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Company } from '@shared/core';
import type { PoolClient } from 'pg';
export interface CreateCompanyData {
    name: string;
    domain?: string;
    cnpj?: string;
    legal_name?: string;
    trade_name?: string;
    email?: string;
    phone?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
    state_registration?: string;
    municipal_registration?: string;
    cnae?: string;
    zip_code?: string;
    address_street?: string;
    address_number?: string;
    address_complement?: string;
    address_neighborhood?: string;
    address_city?: string;
    address_state?: string;
    notes?: string;
}
export interface UpdateCompanyData extends Partial<CreateCompanyData> {
}
export declare class CompanyRepository extends BaseRepository {
    /**
     * Buscar empresa por ID
     * Nota: Companies não requerem filtro de company_id (são o próprio tenant)
     */
    findById(id: string): Promise<Company | null>;
    /**
     * Buscar empresa por domain
     */
    findByDomain(domain: string): Promise<Company | null>;
    /**
     * Buscar empresa por CNPJ
     */
    findByCnpj(cnpj: string): Promise<Company | null>;
    /**
     * Criar empresa
     * @param data - Dados da empresa
     * @param client - Client opcional para usar em transação
     */
    create(data: CreateCompanyData, client?: PoolClient): Promise<Company>;
    /**
     * Listar todas as empresas (para super_admin)
     */
    findAll(): Promise<Company[]>;
    /**
     * Atualizar empresa
     */
    update(id: string, data: UpdateCompanyData): Promise<Company>;
}
//# sourceMappingURL=company.repository.d.ts.map
import { CompanyRepository, CreateCompanyData, UpdateCompanyData } from './company.repository';
import type { Company } from '@shared/core';
export declare class CompanyService {
    private companyRepo;
    constructor(companyRepo: CompanyRepository);
    /**
     * Criar empresa e seu schema de tenant
     */
    create(data: CreateCompanyData): Promise<Company>;
    /**
     * Atualizar empresa
     */
    update(id: string, data: UpdateCompanyData): Promise<Company>;
    /**
     * Buscar empresa por ID
     */
    getById(id: string): Promise<Company>;
    /**
     * Buscar empresa por domain
     */
    getByDomain(domain: string): Promise<Company>;
}
//# sourceMappingURL=company.service.d.ts.map
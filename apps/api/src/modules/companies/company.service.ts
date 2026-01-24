import { CompanyRepository, CreateCompanyData, UpdateCompanyData } from './company.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Company } from '@shared/core';

export class CompanyService {
  constructor(private companyRepo: CompanyRepository) {}

  /**
   * Criar empresa
   */
  async create(data: CreateCompanyData): Promise<Company> {
    // Verificar se domain já existe (se fornecido)
    if (data.domain) {
      const existing = await this.companyRepo.findByDomain(data.domain);
      if (existing) {
        throw new AppError('Domain already exists', 'DOMAIN_ALREADY_EXISTS', 409);
      }
    }

    return this.companyRepo.create(data);
  }

  /**
   * Atualizar empresa
   */
  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    // Verificar se empresa existe
    const company = await this.companyRepo.findById(id);
    if (!company) {
      throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
    }

    // Verificar se domain já existe (se alterado)
    if (data.domain && data.domain !== company.domain) {
      const existing = await this.companyRepo.findByDomain(data.domain);
      if (existing) {
        throw new AppError('Domain already exists', 'DOMAIN_ALREADY_EXISTS', 409);
      }
    }

    return this.companyRepo.update(id, data);
  }

  /**
   * Buscar empresa por ID
   */
  async getById(id: string): Promise<Company> {
    const company = await this.companyRepo.findById(id);
    if (!company) {
      throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
    }
    return company;
  }

  /**
   * Buscar empresa por domain
   */
  async getByDomain(domain: string): Promise<Company> {
    const company = await this.companyRepo.findByDomain(domain);
    if (!company) {
      throw new AppError('Company not found', 'COMPANY_NOT_FOUND', 404);
    }
    return company;
  }
}

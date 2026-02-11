import { CompanyRepository, CreateCompanyData, UpdateCompanyData } from './company.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Company } from '@shared/core';
import { createTenantSchema, applyTenantMigrations } from '../../db/schema-manager';
import { getClient } from '../../db/client';

export class CompanyService {
  constructor(private companyRepo: CompanyRepository) {}

  /**
   * Criar empresa e seu schema de tenant
   */
  async create(data: CreateCompanyData): Promise<Company> {
    // Criar empresa em transação com lock para evitar race conditions
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Usar SELECT FOR UPDATE para lock e verificar duplicatas DENTRO da transação
      // Isso previne race conditions mesmo com requisições simultâneas
      if (data.domain) {
        const existingDomain = await client.query<Company>(
          'SELECT id FROM companies WHERE domain = $1 FOR UPDATE',
          [data.domain]
        );
        if (existingDomain.rows.length > 0) {
          await client.query('ROLLBACK');
          throw new AppError('Domain already exists', 'DOMAIN_ALREADY_EXISTS', 409);
        }
      }
      
      if (data.cnpj) {
        const existingCnpj = await client.query<Company>(
          'SELECT id FROM companies WHERE cnpj = $1 FOR UPDATE',
          [data.cnpj]
        );
        if (existingCnpj.rows.length > 0) {
          await client.query('ROLLBACK');
          throw new AppError('CNPJ already exists', 'CNPJ_ALREADY_EXISTS', 409);
        }
      } else {
        // Se não há CNPJ, usar advisory lock baseado no nome+email para prevenir race conditions
        // Isso garante que apenas uma requisição por vez possa criar empresa com mesmo nome+email
        const lockKey = `company_${data.name}_${data.email || ''}`.substring(0, 100);
        await client.query(`SELECT pg_advisory_lock(hashtext($1))`, [lockKey]);
        
        try {
          // Verificar se já existe empresa com mesmo nome e email (sem CNPJ)
          const existingByName = await client.query<Company>(
            'SELECT id FROM companies WHERE name = $1 AND (email = $2 OR ($2 IS NULL AND email IS NULL)) AND (cnpj IS NULL OR cnpj = \'\') FOR UPDATE',
            [data.name, data.email || null]
          );
          if (existingByName.rows.length > 0) {
            await client.query('ROLLBACK');
            throw new AppError('Company with same name and email already exists', 'COMPANY_ALREADY_EXISTS', 409);
          }
        } finally {
          // Liberar advisory lock
          await client.query(`SELECT pg_advisory_unlock(hashtext($1))`, [lockKey]);
        }
      }

      // Criar empresa (usando mesmo client da transação)
      const company = await this.companyRepo.create(data, client);

      // Verificar se schema já existe antes de criar (proteção adicional)
      const schemaName = `tenant_${company.id.replace(/-/g, '_')}`;
      const schemaExists = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schemaName]
      );
      
      if (schemaExists.rows.length === 0) {
        // Criar schema do tenant (usando mesmo client da transação)
        await createTenantSchema(company.id, client);

        // Aplicar migrations de tenant no novo schema (usando mesmo client da transação)
        await applyTenantMigrations(company.id, client);
      } else {
        console.warn(`⚠️ Schema ${schemaName} já existe, pulando criação`);
      }

      await client.query('COMMIT');
      
      console.log(`✅ Company ${company.id} criada com schema tenant_${company.id}`);
      return company;
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Erro ao criar company:', error);
      
      // Se for erro de constraint única, retornar erro mais amigável
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.constraint?.includes('cnpj')) {
          throw new AppError('CNPJ already exists', 'CNPJ_ALREADY_EXISTS', 409);
        }
        if (error.constraint?.includes('domain')) {
          throw new AppError('Domain already exists', 'DOMAIN_ALREADY_EXISTS', 409);
        }
      }
      
      throw error;
    } finally {
      client.release();
    }
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

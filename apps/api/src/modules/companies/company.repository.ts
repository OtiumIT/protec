import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Company } from '@shared/core';
import type { PoolClient } from 'pg';

export interface CreateCompanyData {
  name: string;
  domain?: string;
  person_type?: 'pf' | 'pj';
  cnpj?: string;
  cpf?: string;
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
  source?: string;
  report_logo_url?: string;
  report_brand_name?: string;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

export class CompanyRepository extends BaseRepository {
  /**
   * Buscar empresa por ID
   * Nota: Companies não requerem filtro de company_id (são o próprio tenant)
   */
  async findById(id: string): Promise<Company | null> {
    const result = await this.query<Company>(
      `SELECT id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes, source,
              report_logo_url, report_brand_name,
              created_at, updated_at 
       FROM companies WHERE id = $1`,
      [id],
      false // Companies não requerem filtro de tenant
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar empresa por domain
   */
  async findByDomain(domain: string): Promise<Company | null> {
    const result = await this.query<Company>(
      `SELECT id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes, source,
              report_logo_url, report_brand_name,
              created_at, updated_at 
       FROM companies WHERE domain = $1`,
      [domain],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar empresa por CNPJ
   */
  async findByCnpj(cnpj: string): Promise<Company | null> {
    const result = await this.query<Company>(
      `SELECT id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes, source,
              report_logo_url, report_brand_name,
              created_at, updated_at 
       FROM companies WHERE cnpj = $1`,
      [cnpj],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar empresa por CPF
   */
  async findByCpf(cpf: string): Promise<Company | null> {
    const result = await this.query<Company>(
      `SELECT id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes, source,
              report_logo_url, report_brand_name,
              created_at, updated_at 
       FROM companies WHERE cpf = $1`,
      [cpf],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Criar empresa
   * @param data - Dados da empresa
   * @param client - Client opcional para usar em transação
   */
  async create(data: CreateCompanyData, client?: PoolClient): Promise<Company> {
    const sql = `INSERT INTO companies (
                   name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
                   contact_name, contact_email, contact_phone, tax_regime,
                   state_registration, municipal_registration, cnae,
                   zip_code, address_street, address_number, address_complement,
                   address_neighborhood, address_city, address_state, notes, source,
                   report_logo_url, report_brand_name
                 ) 
                 VALUES (
                   $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                   $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
                 ) 
                 RETURNING id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
                           contact_name, contact_email, contact_phone, tax_regime,
                           state_registration, municipal_registration, cnae,
                           zip_code, address_street, address_number, address_complement,
                           address_neighborhood, address_city, address_state, notes, source,
                           report_logo_url, report_brand_name,
                           created_at, updated_at`;
    const params = [
      data.name,
      data.domain || null,
      data.person_type || 'pj',
      data.cnpj || null,
      data.cpf || null,
      data.legal_name || null,
      data.trade_name || null,
      data.email || null,
      data.phone || null,
      data.contact_name || null,
      data.contact_email || null,
      data.contact_phone || null,
      data.tax_regime || null,
      data.state_registration || null,
      data.municipal_registration || null,
      data.cnae || null,
      data.zip_code || null,
      data.address_street || null,
      data.address_number || null,
      data.address_complement || null,
      data.address_neighborhood || null,
      data.address_city || null,
      data.address_state || null,
      data.notes || null,
      data.source || null,
      data.report_logo_url || null,
      data.report_brand_name || null,
    ];
    
    if (client) {
      const result = await client.query<Company>(sql, params);
      return result.rows[0];
    } else {
      const result = await this.query<Company>(sql, params, false);
      return result.rows[0];
    }
  }

  /**
   * Listar todas as empresas (para super_admin)
   */
  async findAll(): Promise<Company[]> {
    const result = await this.query<Company>(
      `SELECT id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes, source,
              report_logo_url, report_brand_name,
              created_at, updated_at 
       FROM companies ORDER BY created_at DESC`,
      [],
      false
    );
    return result.rows;
  }

  /**
   * Listar empresas com última assinatura + plano (uma query; super_admin / Base de Entidades).
   */
  async findAllWithLatestSubscriptionPlan(): Promise<
    Array<
      Company & {
        latest_subscription_status: string | null;
        resolved_plan_id: string | null;
        resolved_plan_name: string | null;
        resolved_plan_is_custom: boolean | null;
        resolved_plan_is_managed: boolean | null;
      }
    >
  > {
    const result = await this.query<
      Company & {
        latest_subscription_status: string | null;
        resolved_plan_id: string | null;
        resolved_plan_name: string | null;
        resolved_plan_is_custom: boolean | null;
        resolved_plan_is_managed: boolean | null;
      }
    >(
      `SELECT c.id, c.name, c.domain, c.person_type, c.cnpj, c.cpf, c.legal_name, c.trade_name, c.email, c.phone,
              c.contact_name, c.contact_email, c.contact_phone, c.tax_regime,
              c.state_registration, c.municipal_registration, c.cnae,
              c.zip_code, c.address_street, c.address_number, c.address_complement,
              c.address_neighborhood, c.address_city, c.address_state, c.notes, c.source,
              c.report_logo_url, c.report_brand_name,
              c.created_at, c.updated_at,
              s.status AS latest_subscription_status,
              p.id AS resolved_plan_id,
              p.name AS resolved_plan_name,
              p.is_custom AS resolved_plan_is_custom,
              p.is_managed AS resolved_plan_is_managed
       FROM companies c
       LEFT JOIN LATERAL (
         SELECT company_id, plan_id, status
         FROM subscriptions
         WHERE subscriptions.company_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) s ON true
       LEFT JOIN plans p ON p.id = s.plan_id
       ORDER BY c.created_at DESC`,
      [],
      false
    );
    return result.rows;
  }

  /**
   * Atualizar empresa
   */
  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const fields: Array<keyof UpdateCompanyData> = [
      'name', 'domain', 'person_type', 'cnpj', 'cpf', 'legal_name', 'trade_name', 'email', 'phone',
      'contact_name', 'contact_email', 'contact_phone', 'tax_regime',
      'state_registration', 'municipal_registration', 'cnae',
      'zip_code', 'address_street', 'address_number', 'address_complement',
      'address_neighborhood', 'address_city', 'address_state', 'notes', 'source',
      'report_logo_url', 'report_brand_name'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<Company>;
    }

    params.push(id);
    const result = await this.query<Company>(
      `UPDATE companies 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, domain, person_type, cnpj, cpf, legal_name, trade_name, email, phone,
                 contact_name, contact_email, contact_phone, tax_regime,
                 state_registration, municipal_registration, cnae,
                 zip_code, address_street, address_number, address_complement,
                 address_neighborhood, address_city, address_state, notes, source,
                 report_logo_url, report_brand_name,
                 created_at, updated_at`,
      params,
      false
    );
    return result.rows[0];
  }

  /**
   * Buscar apenas dados de branding da empresa
   */
  async findBranding(id: string): Promise<{ report_logo_url: string | null; report_brand_name: string | null } | null> {
    const result = await this.query<{ report_logo_url: string | null; report_brand_name: string | null }>(
      `SELECT report_logo_url, report_brand_name FROM companies WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }
}

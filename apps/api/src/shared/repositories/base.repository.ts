import { query as dbQuery, type QueryResult } from '../../db/client';

/**
 * Base Repository
 * Classe base para todos os repositories
 * Garante que todas as queries incluem filtro de company_id quando necessário
 */
export abstract class BaseRepository {
  /**
   * Executar query com validação de company_id
   * @param sql - Query SQL
   * @param params - Parâmetros da query (companyId deve estar incluído quando necessário)
   * @param requireCompanyId - Se true, valida que companyId está nos params
   */
  protected async query<T = any>(
    sql: string,
    params: any[] = [],
    requireCompanyId: boolean = true
  ): Promise<QueryResult<T>> {
    const lowerSql = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    const isInsertSettingTenantOrCompany =
      lowerSql.startsWith('insert') && (lowerSql.includes('company_id') || lowerSql.includes('tenant_id'));

    // Validação: queries que acessam dados de tenant devem incluir company_id ou tenant_id (users)
    if (requireCompanyId && !isInsertSettingTenantOrCompany) {
      const requiresValidation = this.requiresCompanyId(sql);
      if (requiresValidation) {
        const hasCompanyIdInWhere = (lowerSql.includes('company_id =') ||
                                      lowerSql.includes('company_id is null') ||
                                      lowerSql.includes('company_id is not null'));
        const hasTenantIdInWhere = (lowerSql.includes('tenant_id =') ||
                                    lowerSql.includes('tenant_id is null') ||
                                    lowerSql.includes('tenant_id is not null'));
        const hasCompanyIdFilter = hasCompanyIdInWhere || hasTenantIdInWhere ||
          (lowerSql.startsWith('insert') && (lowerSql.includes('company_id') || lowerSql.includes('tenant_id')));

        if (!hasCompanyIdFilter) {
          const error = new Error(
            'Query must include company_id or tenant_id filter for tenant isolation. ' +
            'Add "AND company_id = $X" (ou tenant_id para users) or use requireCompanyId: false.'
          );
          console.error('[BaseRepository.query] Validation failed:', {
            sql: sql.substring(0, 150),
            requireCompanyId,
            requiresValidation,
            hasCompanyIdFilter,
          });
          throw error;
        }
      }
    }

    try {
      return await dbQuery<T>(sql, params);
    } catch (error) {
      console.error('[BaseRepository.query] Database error:', {
        sql: sql.substring(0, 200), // Primeiros 200 caracteres para não poluir logs
        params: params.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verificar se a query requer filtro de company_id
   * 
   * Tabelas do schema 'public' que requerem company_id:
   * - users (usuários pertencem a uma company)
   * - subscriptions (assinaturas pertencem a uma company)
   * - tenant_modules (módulos ativos por tenant)
   * 
   * Tabelas do schema 'tenant_{id}' que NÃO requerem company_id (isoladas por schema):
   * - clients, fiscal_files, extracted_fiscal_data, rating_validations,
   *   tax_simulations, edicts, opportunities
   */
  private requiresCompanyId(sql: string): boolean {
    const lowerSql = sql.toLowerCase();
    
    // Tabelas do schema public que requerem company_id
    const publicTablesRequiringCompanyId = ['users', 'subscriptions', 'tenant_modules'];
    
    // Tabelas de tenant (isoladas por schema) - NÃO requerem company_id
const tenantTables = ['clients', 'fiscal_files', 'extracted_fiscal_data',
                         'rating_validations', 'tax_simulations', 'edicts', 'opportunities',
                         'in_2306_simulations', 'irpf_alta_renda', 'properties', 'property_transactions', 'property_monthly_totals', 'property_simulations',
                         'distribuicao_lucros_simulations',
                         // Gestão Imobiliária Contábil (069)
                         'property_tenants', 'property_leases', 'property_lease_amendments', 'property_guarantees',
                         'property_ledger_entries', 'property_recurring_rules', 'property_documents',
                         'property_statement_shares', 'property_ownership_shares', 'property_vendors',
                         'property_maintenance_tickets', 'property_inspections', 'property_inventory_items',
                         'property_payment_charges', 'property_bank_import_batches', 'property_bank_import_lines',
                         'property_communications',
                         // Mapeamento de Despesas PF->PJ (071)
                         'expense_mapping_catalog_versions', 'expense_mapping_diagnoses', 'expense_mapping_answers',
                         'expense_mapping_items', 'expense_mapping_pendencies', 'expense_mapping_action_steps',
                         'expense_mapping_evidence', 'expense_mapping_audit_events', 'expense_mapping_import_batches'];
    
    // Se a query acessa tabelas de tenant (isoladas por schema), NÃO requer company_id
    if (tenantTables.some(table => lowerSql.includes(table))) {
      return false;
    }
    
    // Se a query acessa tabelas do schema public que requerem company_id
    return publicTablesRequiringCompanyId.some(table => lowerSql.includes(table));
  }

  /**
   * Helper para construir WHERE clause com company_id
   */
  protected buildWhereClause(
    baseWhere: string = '',
    companyId?: string
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (baseWhere) {
      conditions.push(baseWhere);
    }

    if (companyId) {
      conditions.push(`company_id = $${paramIndex}`);
      params.push(companyId);
      paramIndex++;
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }
}

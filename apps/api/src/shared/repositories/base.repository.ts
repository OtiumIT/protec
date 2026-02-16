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
    // Validação: queries que acessam dados de tenant devem incluir company_id
    // Mas apenas se requireCompanyId for true E a query realmente requerer
    if (requireCompanyId) {
      const requiresValidation = this.requiresCompanyId(sql);
      if (requiresValidation) {
        const lowerSql = sql.toLowerCase();
        // Verificar se a query já inclui filtro de company_id (incluindo IS NULL para super_admins)
        const hasCompanyIdFilter = (lowerSql.includes('company_id =') || 
                                    lowerSql.includes('company_id is null') ||
                                    lowerSql.includes('company_id is not null'));
        
        if (!hasCompanyIdFilter) {
          const error = new Error(
            'Query must include company_id filter for tenant isolation. ' +
            'Add "AND company_id = $X" to your query or pass companyId in params. ' +
            'If querying super_admins (company_id IS NULL), use requireCompanyId: false.'
          );
          console.error('[BaseRepository.query] Validation failed:', {
            sql,
            requireCompanyId,
            requiresValidation,
            hasCompanyIdFilter,
          });
          throw error;
        }
      }
    }
    // Se requireCompanyId é false, não validar - permite queries sem filtro de tenant
    // (útil para super_admins, queries globais, etc.)

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
                         'in_2306_simulations', 'irpf_alta_renda'];
    
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

import { query as dbQuery, QueryResult } from '../db/client';

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
    if (requireCompanyId && this.requiresCompanyId(sql)) {
      const hasCompanyId = sql.toLowerCase().includes('company_id') || 
                          params.some((p, i) => {
                            const paramIndex = sql.toLowerCase().indexOf('$' + (i + 1));
                            return paramIndex > -1 && params[i] && typeof params[i] === 'string';
                          });
      
      if (!hasCompanyId) {
        throw new Error(
          'Query must include company_id filter for tenant isolation. ' +
          'Add "AND company_id = $X" to your query or pass companyId in params.'
        );
      }
    }

    return dbQuery<T>(sql, params);
  }

  /**
   * Verificar se a query requer filtro de company_id
   */
  private requiresCompanyId(sql: string): boolean {
    const lowerSql = sql.toLowerCase();
    const tenantTables = ['users', 'companies', 'subscriptions', 'tenant_modules'];
    
    // Se a query acessa tabelas de tenant, requer company_id
    return tenantTables.some(table => lowerSql.includes(table));
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

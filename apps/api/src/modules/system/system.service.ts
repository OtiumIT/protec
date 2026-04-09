import { query } from '../../db/client';

export interface DatabaseStats {
  databaseSize: string;
  databaseSizeBytes: number;
  totalTables: number;
  totalSchemas: number;
  activeConnections: number;
  maxConnections: number;
  connectionUsagePercent: number;
  cacheHitRatio: number;
  indexUsage: number;
  diskUsage?: string;
  diskUsageBytes?: number;
  diskUsagePercent?: number;
}

export interface CreateUsageLogInput {
  companyId: string | null;
  userId: string | null;
  moduleKey: string;
  featureKey: string;
  action: string;
  source?: 'frontend' | 'api';
  routePath?: string | null;
  method?: string | null;
  statusCode?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ModuleUsageSummary {
  periodDays: number;
  totalEvents: number;
  uniqueUsers: number;
  totalSimulations: number;
  modules: Array<{
    module_key: string;
    total_events: number;
    unique_users: number;
    simulation_events: number;
  }>;
  topSimulationUsers: Array<{
    user_id: string | null;
    user_name: string;
    module_key: string;
    simulations: number;
  }>;
}

export class SystemService {
  async createUsageLog(input: CreateUsageLogInput): Promise<void> {
    await query(
      `INSERT INTO public.module_usage_logs
         (company_id, user_id, module_key, feature_key, action, source, route_path, method, status_code, metadata)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        input.companyId,
        input.userId,
        input.moduleKey,
        input.featureKey,
        input.action,
        input.source ?? 'frontend',
        input.routePath ?? null,
        input.method ?? null,
        input.statusCode ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  }

  async getModuleUsageSummary(days = 30, companyId: string | null = null): Promise<ModuleUsageSummary> {
    const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(365, Math.floor(days))) : 30;

    const aggregateResult = await query<{
      total_events: string;
      unique_users: string;
      total_simulations: string;
    }>(
      `SELECT
         COUNT(*)::text as total_events,
         COUNT(DISTINCT user_id)::text as unique_users,
         COUNT(*) FILTER (WHERE action = 'simulate')::text as total_simulations
       FROM public.module_usage_logs
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
         AND ($2::uuid IS NULL OR company_id = $2::uuid)`,
      [safeDays, companyId]
    );

    const modulesResult = await query<{
      module_key: string;
      total_events: string;
      unique_users: string;
      simulation_events: string;
    }>(
      `SELECT
         module_key,
         COUNT(*)::text as total_events,
         COUNT(DISTINCT user_id)::text as unique_users,
         COUNT(*) FILTER (WHERE action = 'simulate')::text as simulation_events
       FROM public.module_usage_logs
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
         AND ($2::uuid IS NULL OR company_id = $2::uuid)
       GROUP BY module_key
       ORDER BY COUNT(*) DESC`,
      [safeDays, companyId]
    );

    const topSimulationUsersResult = await query<{
      user_id: string | null;
      user_name: string | null;
      module_key: string;
      simulations: string;
    }>(
      `SELECT
         l.user_id,
         COALESCE(u.name, 'Usuário sem nome') as user_name,
         l.module_key,
         COUNT(*)::text as simulations
       FROM public.module_usage_logs l
       LEFT JOIN public.users u ON u.id = l.user_id
       WHERE l.created_at >= NOW() - ($1::int * INTERVAL '1 day')
         AND l.action = 'simulate'
         AND ($2::uuid IS NULL OR l.company_id = $2::uuid)
       GROUP BY l.user_id, u.name, l.module_key
       ORDER BY COUNT(*) DESC
       LIMIT 20`,
      [safeDays, companyId]
    );

    const totals = aggregateResult.rows[0] ?? {
      total_events: '0',
      unique_users: '0',
      total_simulations: '0',
    };

    return {
      periodDays: safeDays,
      totalEvents: parseInt(totals.total_events || '0', 10),
      uniqueUsers: parseInt(totals.unique_users || '0', 10),
      totalSimulations: parseInt(totals.total_simulations || '0', 10),
      modules: modulesResult.rows.map((row) => ({
        module_key: row.module_key,
        total_events: parseInt(row.total_events || '0', 10),
        unique_users: parseInt(row.unique_users || '0', 10),
        simulation_events: parseInt(row.simulation_events || '0', 10),
      })),
      topSimulationUsers: topSimulationUsersResult.rows.map((row) => ({
        user_id: row.user_id,
        user_name: row.user_name || 'Usuário sem nome',
        module_key: row.module_key,
        simulations: parseInt(row.simulations || '0', 10),
      })),
    };
  }

  /**
   * Obter estatísticas do banco de dados PostgreSQL
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    // Tamanho do banco de dados
    const dbSizeResult = await query<{ size: string; size_bytes: number }>(
      `SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes`
    );

    // Número de tabelas
    const tablesResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int as count
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`
    );

    // Número de schemas (excluindo system schemas)
    const schemasResult = await query<{ count: string }>(
      `SELECT COUNT(*)::int as count
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`
    );

    // Conexões ativas
    const connectionsResult = await query<{ active: string; max: string }>(
      `SELECT 
        COUNT(*)::text as active,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max
       FROM pg_stat_activity
       WHERE datname = current_database()`
    );

    // Cache hit ratio
    const cacheResult = await query<{ hit_ratio: string | number }>(
      `SELECT 
        CASE 
          WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
          ELSE round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
        END::numeric as hit_ratio
       FROM pg_statio_user_tables`
    );

    // Uso de índices
    const indexResult = await query<{ index_usage: string | number }>(
      `SELECT 
        CASE 
          WHEN sum(idx_scan) + sum(seq_scan) = 0 THEN 0
          ELSE round(100.0 * sum(idx_scan) / (sum(idx_scan) + sum(seq_scan)), 2)
        END::numeric as index_usage
       FROM pg_stat_user_tables`
    );

    // Uso de disco (tamanho total de todos os databases no cluster)
    // Nota: Em Supabase/cloud, isso pode retornar apenas o tamanho do database atual
    const diskResult = await query<{ total_size: string; total_size_bytes: number }>(
      `SELECT 
        pg_size_pretty(sum(pg_database_size(datname))) as total_size,
        sum(pg_database_size(datname)) as total_size_bytes
       FROM pg_database
       WHERE datistemplate = false`
    );

    const dbSize = dbSizeResult.rows[0];
    const tables = parseInt(tablesResult.rows[0]?.count || '0', 10);
    const schemas = parseInt(schemasResult.rows[0]?.count || '0', 10);
    const connections = connectionsResult.rows[0];
    const activeConnections = parseInt(connections?.active || '0', 10);
    const maxConnections = parseInt(connections?.max || '100', 10);
    const connectionUsagePercent = maxConnections > 0 
      ? Math.round((activeConnections / maxConnections) * 100) 
      : 0;

    // Para Supabase, geralmente há um limite de disco (ex: 500MB no plano free)
    // Vamos usar o tamanho do database atual como referência
    const diskSize = diskResult.rows[0];
    const diskUsageBytes = diskSize?.total_size_bytes || dbSize?.size_bytes || 0;
    // Assumindo um limite padrão (pode ser configurável via env)
    const diskLimitBytes = 500 * 1024 * 1024; // 500MB como exemplo
    const diskUsagePercent = diskLimitBytes > 0 
      ? Math.round((diskUsageBytes / diskLimitBytes) * 100) 
      : 0;

    return {
      databaseSize: dbSize?.size || '0 bytes',
      databaseSizeBytes: dbSize?.size_bytes || 0,
      totalTables: tables,
      totalSchemas: schemas,
      activeConnections: activeConnections,
      maxConnections: maxConnections,
      connectionUsagePercent: connectionUsagePercent,
      cacheHitRatio: typeof cacheResult.rows[0]?.hit_ratio === 'string' 
        ? parseFloat(cacheResult.rows[0].hit_ratio) 
        : (cacheResult.rows[0]?.hit_ratio || 0),
      indexUsage: typeof indexResult.rows[0]?.index_usage === 'string'
        ? parseFloat(indexResult.rows[0].index_usage)
        : (indexResult.rows[0]?.index_usage || 0),
      diskUsage: diskSize?.total_size || dbSize?.size || '0 bytes',
      diskUsageBytes: diskUsageBytes,
      diskUsagePercent: diskUsagePercent > 100 ? 100 : diskUsagePercent,
    };
  }

  /**
   * Obter lista de tenants (schemas)
   */
  async getTenantsList(): Promise<Array<{ schema_name: string; table_count: number }>> {
    const result = await query<{ schema_name: string; table_count: string }>(
      `SELECT 
        schema_name,
        COUNT(table_name)::int as table_count
       FROM information_schema.tables
       WHERE table_schema LIKE 'tenant_%'
       GROUP BY schema_name
       ORDER BY schema_name`
    );

    return result.rows.map(row => ({
      schema_name: row.schema_name,
      table_count: parseInt(row.table_count || '0', 10),
    }));
  }
}

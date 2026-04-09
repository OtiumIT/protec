import { query, runWithTenantClient } from '../../db/client';

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
  dailyClients: Array<{
    date: string;
    total: number;
  }>;
  moduleRealUsage: Array<{
    module_key: string;
    total_events: number;
  }>;
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

export type ClientEngagementLevel = 'hot' | 'warm' | 'cold' | 'none';

export interface GlobalClientThermometerRow {
  company_id: string;
  company_name: string;
  client_id: string;
  name: string;
  created_at: string;
  score: number;
  level: ClientEngagementLevel;
}

export interface GlobalClientThermometerSummary {
  periodDays: number;
  /** Limite efetivo da resposta (pedido, capped). */
  limit: number;
  /** Quantos escritórios foram consultados (teto configurável). */
  tenantsScanned: number;
  /** Clientes na janela após ordenar por cadastro (global). */
  windowSize: number;
  averageScoreAmongActive: number;
  counts: {
    hot: number;
    warm: number;
    cold: number;
    none: number;
  };
  rows: GlobalClientThermometerRow[];
}

const REAL_USAGE_MODULES = [
  'simulador-in-2306',
  'irpf-alta-renda',
  'rating-validator',
  'properties',
  'fiscal-files',
  'clients',
] as const;

const REAL_USAGE_ACTIONS = ['simulate', 'validate', 'upload', 'create_client'] as const;

function classifyClientEngagement(score: number, avgAmongActive: number, clientsWithUsage: number): ClientEngagementLevel {
  if (score <= 0) return 'none';
  if (clientsWithUsage <= 0) return 'warm';
  if (score > avgAmongActive) return 'hot';
  if (score < avgAmongActive) return 'cold';
  return 'warm';
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
         AND source = 'api'
         AND module_key = ANY($2::text[])
         AND action = ANY($3::text[])
         AND ($4::uuid IS NULL OR company_id = $4::uuid)`,
      [safeDays, REAL_USAGE_MODULES, REAL_USAGE_ACTIONS, companyId]
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
         AND source = 'api'
         AND module_key = ANY($2::text[])
         AND action = ANY($3::text[])
         AND ($4::uuid IS NULL OR company_id = $4::uuid)
       GROUP BY module_key
       ORDER BY COUNT(*) DESC`,
      [safeDays, REAL_USAGE_MODULES, REAL_USAGE_ACTIONS, companyId]
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
         AND l.source = 'api'
         AND l.module_key = ANY($2::text[])
         AND ($3::uuid IS NULL OR l.company_id = $3::uuid)
       GROUP BY l.user_id, u.name, l.module_key
       ORDER BY COUNT(*) DESC
       LIMIT 20`,
      [safeDays, REAL_USAGE_MODULES, companyId]
    );

    const moduleRealUsageResult = await query<{
      module_key: string;
      total_events: string;
    }>(
      `SELECT
         module_key,
         COUNT(*)::text as total_events
       FROM public.module_usage_logs
       WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
         AND source = 'api'
         AND module_key = ANY($2::text[])
         AND action = ANY($3::text[])
         AND ($4::uuid IS NULL OR company_id = $4::uuid)
       GROUP BY module_key
       ORDER BY COUNT(*) DESC`,
      [safeDays, REAL_USAGE_MODULES, REAL_USAGE_ACTIONS, companyId]
    );

    const rawDailyClients = companyId
      ? await runWithTenantClient(companyId, () =>
          query<{ day: string; total: string }>(
            `SELECT
               to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
               COUNT(*)::text as total
             FROM clients
             WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
             GROUP BY date_trunc('day', created_at)
             ORDER BY date_trunc('day', created_at)`,
            [safeDays]
          )
        )
      : await query<{ day: string; total: string }>(
          `SELECT
             to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
             COUNT(*)::text as total
           FROM public.companies
           WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
           GROUP BY date_trunc('day', created_at)
           ORDER BY date_trunc('day', created_at)`,
          [safeDays]
        );

    const dailyMap = new Map<string, number>(
      rawDailyClients.rows.map((row) => [row.day, parseInt(row.total || '0', 10)])
    );
    const dailyClients: Array<{ date: string; total: number }> = [];
    const end = new Date();
    for (let i = safeDays - 1; i >= 0; i -= 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      dailyClients.push({ date: key, total: dailyMap.get(key) || 0 });
    }

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
      dailyClients,
      moduleRealUsage: moduleRealUsageResult.rows.map((row) => ({
        module_key: row.module_key,
        total_events: parseInt(row.total_events || '0', 10),
      })),
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
   * Termômetro global (super_admin): últimos N cadastros de cliente (por `created_at`) entre tenants,
   * com pontuação de uso no período. Evita varrer todos os tenants com teto de escritórios consultados.
   */
  async getGlobalClientThermometer(input: {
    days?: number;
    limit?: number;
    clientSearch?: string | null;
    companySearch?: string | null;
    companyId?: string | null;
  }): Promise<GlobalClientThermometerSummary> {
    const rawDays = input.days ?? 30;
    const rawLimit = input.limit ?? 30;
    const safeDays = Number.isFinite(rawDays) ? Math.max(1, Math.min(365, Math.floor(rawDays))) : 30;
    const safeLimit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 30;

    const maxTenantsRaw = parseInt(process.env.GLOBAL_THERMOMETER_MAX_TENANTS || '100', 10);
    const maxTenants = Number.isFinite(maxTenantsRaw)
      ? Math.max(10, Math.min(250, maxTenantsRaw))
      : 100;

    const clientSearch =
      typeof input.clientSearch === 'string' && input.clientSearch.trim().length > 0
        ? input.clientSearch.trim()
        : null;
    const companySearch =
      typeof input.companySearch === 'string' && input.companySearch.trim().length > 0
        ? input.companySearch.trim()
        : null;
    const companyIdFilter =
      typeof input.companyId === 'string' && input.companyId.trim().length > 0 ? input.companyId.trim() : null;

    const companiesResult = await query<{ id: string; name: string }>(
      `SELECT id, name
       FROM public.companies
       WHERE ($1::uuid IS NULL OR id = $1::uuid)
         AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')
       ORDER BY created_at DESC
       LIMIT $3`,
      [companyIdFilter, companySearch, maxTenants]
    );

    const companies = companiesResult.rows;
    type Cand = {
      company_id: string;
      company_name: string;
      client_id: string;
      name: string;
      created_at: string;
    };
    const candidates: Cand[] = [];

    for (const co of companies) {
      try {
        const recent = await runWithTenantClient(co.id, () =>
          query<{ id: string; name: string; created_at: string }>(
            `SELECT id, name, created_at::text
             FROM clients
             WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
             ORDER BY created_at DESC
             LIMIT $2`,
            [clientSearch, safeLimit]
          )
        );
        for (const r of recent.rows) {
          candidates.push({
            company_id: co.id,
            company_name: co.name,
            client_id: r.id,
            name: r.name,
            created_at: r.created_at,
          });
        }
      } catch {
        // Schema inexistente ou erro transitório: ignora o tenant
      }
    }

    candidates.sort((a, b) => {
      const tb = new Date(b.created_at).getTime();
      const ta = new Date(a.created_at).getTime();
      return tb - ta;
    });

    const seen = new Set<string>();
    const picked: Cand[] = [];
    for (const c of candidates) {
      const key = `${c.company_id}:${c.client_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(c);
      if (picked.length >= safeLimit) break;
    }

    const byCompany = new Map<string, Cand[]>();
    for (const p of picked) {
      if (!byCompany.has(p.company_id)) byCompany.set(p.company_id, []);
      byCompany.get(p.company_id)!.push(p);
    }

    const scores = new Map<string, number>();
    for (const [cid, group] of byCompany) {
      const ids = group.map((g) => g.client_id);
      const map = await this.fetchEngagementScoresForClientIds(cid, safeDays, ids);
      for (const [clientId, score] of map) {
        scores.set(`${cid}:${clientId}`, score);
      }
    }

    const scoredRows = picked.map((p) => {
      const score = scores.get(`${p.company_id}:${p.client_id}`) ?? 0;
      return { ...p, score };
    });

    const withUsage = scoredRows.filter((r) => r.score > 0);
    const clientsWithUsage = withUsage.length;
    const sumScores = withUsage.reduce((acc, r) => acc + r.score, 0);
    const averageScoreAmongActive =
      clientsWithUsage > 0 ? Math.round((sumScores / clientsWithUsage) * 100) / 100 : 0;

    const counts = { hot: 0, warm: 0, cold: 0, none: 0 };
    const rows: GlobalClientThermometerRow[] = scoredRows.map((r) => {
      const level = classifyClientEngagement(r.score, averageScoreAmongActive, clientsWithUsage);
      counts[level] += 1;
      return {
        company_id: r.company_id,
        company_name: r.company_name,
        client_id: r.client_id,
        name: r.name,
        created_at: r.created_at,
        score: r.score,
        level,
      };
    });

    return {
      periodDays: safeDays,
      limit: safeLimit,
      tenantsScanned: companies.length,
      windowSize: rows.length,
      averageScoreAmongActive,
      counts,
      rows,
    };
  }

  private async fetchEngagementScoresForClientIds(
    companyId: string,
    safeDays: number,
    clientIds: string[]
  ): Promise<Map<string, number>> {
    if (clientIds.length === 0) return new Map();
    return runWithTenantClient(companyId, async () => {
      const rows = await query<{ id: string; score: string }>(
        `SELECT
           c.id,
           (
             COALESCE(ff.n, 0) + COALESCE(ps.n, 0) + COALESCE(in2306.n, 0) + COALESCE(rv.n, 0) + COALESCE(jp.n, 0)
           )::text AS score
         FROM clients c
         LEFT JOIN (
           SELECT client_id, COUNT(*)::int AS n
           FROM fiscal_files
           WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
           GROUP BY client_id
         ) ff ON ff.client_id = c.id
         LEFT JOIN (
           SELECT client_id, COUNT(*)::int AS n
           FROM property_simulations
           WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
             AND client_id IS NOT NULL
           GROUP BY client_id
         ) ps ON ps.client_id = c.id
         LEFT JOIN (
           SELECT client_id, COUNT(*)::int AS n
           FROM in_2306_simulations
           WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
             AND client_id IS NOT NULL
           GROUP BY client_id
         ) in2306 ON in2306.client_id = c.id
         LEFT JOIN (
           SELECT client_id, COUNT(*)::int AS n
           FROM rating_validations
           WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
           GROUP BY client_id
         ) rv ON rv.client_id = c.id
         LEFT JOIN (
           SELECT client_id, COUNT(*)::int AS n
           FROM judicial_processes
           WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
           GROUP BY client_id
         ) jp ON jp.client_id = c.id
         WHERE c.id = ANY($2::uuid[])`,
        [safeDays, clientIds]
      );
      const m = new Map<string, number>();
      for (const row of rows.rows) {
        m.set(row.id, parseInt(row.score || '0', 10));
      }
      return m;
    });
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

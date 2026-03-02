"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const client_1 = require("../../db/client");
class SystemService {
    /**
     * Obter estatísticas do banco de dados PostgreSQL
     */
    async getDatabaseStats() {
        // Tamanho do banco de dados
        const dbSizeResult = await (0, client_1.query)(`SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes`);
        // Número de tabelas
        const tablesResult = await (0, client_1.query)(`SELECT COUNT(*)::int as count
       FROM information_schema.tables
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')`);
        // Número de schemas (excluindo system schemas)
        const schemasResult = await (0, client_1.query)(`SELECT COUNT(*)::int as count
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`);
        // Conexões ativas
        const connectionsResult = await (0, client_1.query)(`SELECT 
        COUNT(*)::text as active,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max
       FROM pg_stat_activity
       WHERE datname = current_database()`);
        // Cache hit ratio
        const cacheResult = await (0, client_1.query)(`SELECT 
        CASE 
          WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
          ELSE round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
        END::numeric as hit_ratio
       FROM pg_statio_user_tables`);
        // Uso de índices
        const indexResult = await (0, client_1.query)(`SELECT 
        CASE 
          WHEN sum(idx_scan) + sum(seq_scan) = 0 THEN 0
          ELSE round(100.0 * sum(idx_scan) / (sum(idx_scan) + sum(seq_scan)), 2)
        END::numeric as index_usage
       FROM pg_stat_user_tables`);
        // Uso de disco (tamanho total de todos os databases no cluster)
        // Nota: Em Supabase/cloud, isso pode retornar apenas o tamanho do database atual
        const diskResult = await (0, client_1.query)(`SELECT 
        pg_size_pretty(sum(pg_database_size(datname))) as total_size,
        sum(pg_database_size(datname)) as total_size_bytes
       FROM pg_database
       WHERE datistemplate = false`);
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
    async getTenantsList() {
        const result = await (0, client_1.query)(`SELECT 
        schema_name,
        COUNT(table_name)::int as table_count
       FROM information_schema.tables
       WHERE table_schema LIKE 'tenant_%'
       GROUP BY schema_name
       ORDER BY schema_name`);
        return result.rows.map(row => ({
            schema_name: row.schema_name,
            table_count: parseInt(row.table_count || '0', 10),
        }));
    }
}
exports.SystemService = SystemService;

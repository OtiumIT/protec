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
export declare class SystemService {
    /**
     * Obter estatísticas do banco de dados PostgreSQL
     */
    getDatabaseStats(): Promise<DatabaseStats>;
    /**
     * Obter lista de tenants (schemas)
     */
    getTenantsList(): Promise<Array<{
        schema_name: string;
        table_count: number;
    }>>;
}
//# sourceMappingURL=system.service.d.ts.map
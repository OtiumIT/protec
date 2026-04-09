import apiRequest from '../../../shared/services/api';

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

export interface SystemStatsResponse {
  data: {
    stats: DatabaseStats;
  };
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

interface ModuleUsageResponse {
  data: {
    usage: ModuleUsageSummary;
  };
}

export const systemService = {
  async getStats(): Promise<DatabaseStats> {
    const token = localStorage.getItem('accessToken');
    const response = await apiRequest<SystemStatsResponse>('/api/v1/system/stats', {
      method: 'GET',
      token: token || undefined,
    });
    return response.data.stats;
  },

  async getModuleUsage(days = 30): Promise<ModuleUsageSummary> {
    const token = localStorage.getItem('accessToken');
    const response = await apiRequest<ModuleUsageResponse>(`/api/v1/system/module-usage?days=${days}`, {
      method: 'GET',
      token: token || undefined,
    });
    return response.data.usage;
  },
};

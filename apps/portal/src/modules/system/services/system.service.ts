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
  clientThermometer: {
    periodDays: number;
    averageScoreAmongActive: number;
    totalClients: number;
    counts: { hot: number; warm: number; cold: number; none: number };
    samples: Array<{
      client_id: string;
      name: string;
      score: number;
      level: 'hot' | 'warm' | 'cold' | 'none';
    }>;
  } | null;
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

  async getModuleUsage(days = 30, companyId?: string | null): Promise<ModuleUsageSummary> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    params.set('days', String(days));
    if (companyId) params.set('companyId', companyId);
    const response = await apiRequest<ModuleUsageResponse>(
      `/api/v1/system/module-usage?${params.toString()}`,
      {
        method: 'GET',
        token: token || undefined,
      }
    );
    return response.data.usage;
  },
};

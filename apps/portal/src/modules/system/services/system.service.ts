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
  limit: number;
  tenantsScanned: number;
  windowSize: number;
  averageScoreAmongActive: number;
  counts: { hot: number; warm: number; cold: number; none: number };
  rows: GlobalClientThermometerRow[];
}

interface ModuleUsageResponse {
  data: {
    usage: ModuleUsageSummary;
  };
}

interface GlobalThermometerResponse {
  data: {
    thermometer: GlobalClientThermometerSummary;
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

  async getGlobalClientThermometer(params: {
    days?: number;
    limit?: number;
    clientSearch?: string;
    companySearch?: string;
    companyId?: string;
  }): Promise<GlobalClientThermometerSummary> {
    const token = localStorage.getItem('accessToken');
    const q = new URLSearchParams();
    if (params.days != null) q.set('days', String(params.days));
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.clientSearch) q.set('clientSearch', params.clientSearch);
    if (params.companySearch) q.set('companySearch', params.companySearch);
    if (params.companyId) q.set('companyId', params.companyId);
    const response = await apiRequest<GlobalThermometerResponse>(
      `/api/v1/system/global-client-thermometer?${q.toString()}`,
      {
        method: 'GET',
        token: token || undefined,
      }
    );
    return response.data.thermometer;
  },
};

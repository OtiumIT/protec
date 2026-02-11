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

export const systemService = {
  async getStats(): Promise<DatabaseStats> {
    const token = localStorage.getItem('accessToken');
    const response = await apiRequest<SystemStatsResponse>('/api/v1/system/stats', {
      method: 'GET',
      token: token || undefined,
    });
    return response.data.stats;
  },
};

import apiRequest from '../../../shared/services/api';

export interface AccessListEntry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  company_name?: string;
  user_id?: string;
  tenant_id?: string;
  status: 'pending' | 'active' | 'inactive';
  activated_at?: string;
  deactivated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AccessListStats {
  total: number;
  pending: number;
  active: number;
  inactive: number;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; email: string; reason: string }>;
}

export interface ActivationResult {
  id: string;
  email: string;
  success: boolean;
  error?: string;
}

export interface Credentials {
  email: string;
  tempPassword: string;
  loginUrl: string;
  name: string;
}

const BASE = '/api/v1/access-list';

export const accessListService = {
  async list(params: { status?: string; search?: string; page?: number; limit?: number } = {}): Promise<{ data: { entries: AccessListEntry[]; total: number } }> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return apiRequest(`${BASE}${qs ? `?${qs}` : ''}`);
  },

  async getStats(): Promise<{ data: AccessListStats }> {
    return apiRequest(`${BASE}/stats`);
  },

  async importCsv(file: File): Promise<{ data: ImportResult }> {
    const formData = new FormData();
    formData.append('file', file);
    const { getApiUrl } = await import('../../../shared/services/api');
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const token = localStorage.getItem('accessToken') || '';
    const response = await fetch(`${baseUrl}${BASE}/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
  },

  async activate(ids: string[]): Promise<{ data: ActivationResult[] }> {
    return apiRequest(`${BASE}/activate`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  async deactivate(ids: string[]): Promise<{ data: ActivationResult[] }> {
    return apiRequest(`${BASE}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  async activateOne(id: string): Promise<{ data: ActivationResult }> {
    return apiRequest(`${BASE}/${id}/activate`, { method: 'POST' });
  },

  async deactivateOne(id: string): Promise<{ data: ActivationResult }> {
    return apiRequest(`${BASE}/${id}/deactivate`, { method: 'POST' });
  },

  async regeneratePassword(id: string): Promise<{ data: { tempPassword: string } }> {
    return apiRequest(`${BASE}/${id}/regenerate-password`, { method: 'POST' });
  },

  async getCredentials(id: string): Promise<{ data: Credentials }> {
    return apiRequest(`${BASE}/${id}/credentials`);
  },

  async deleteEntry(id: string): Promise<void> {
    await apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
  },
};

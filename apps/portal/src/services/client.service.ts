import apiRequest from './api';
import type { Client } from '@shared/core';

// Tipos locais para compatibilidade
export interface ClientWithCreatedAt extends Omit<Client, 'created_at' | 'updated_at'> {
  createdAt: string;
}

export interface CreateClientData {
  name: string;
  cnpj: string;
  email?: string;
}

export interface UpdateClientData {
  name?: string;
  cnpj?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

// Helper para obter token e tenantId do localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId };
}

// Helper para converter Client da API para formato do frontend
function convertClient(client: Client): ClientWithCreatedAt {
  return {
    id: client.id,
    name: client.name,
    cnpj: client.cnpj,
    email: client.email || '',
    company_id: client.company_id,
    status: client.status,
    createdAt: typeof client.created_at === 'string' ? client.created_at : new Date(client.created_at).toISOString(),
  };
}

export const clientService = {
  async list(): Promise<ClientWithCreatedAt[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { clients: Client[]; total: number; page: number; limit: number } }>(
      '/api/v1/clients',
      { token, tenantId }
    );
    return response.data.clients.map(convertClient);
  },

  async getById(id: string): Promise<ClientWithCreatedAt | null> {
    const { token, tenantId } = getAuthHeaders();
    try {
      const response = await apiRequest<{ data: { client: Client } }>(
        `/api/v1/clients/${id}`,
        { token, tenantId }
      );
      return convertClient(response.data.client);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }
  },

  async create(data: CreateClientData): Promise<ClientWithCreatedAt> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { client: Client } }>(
      '/api/v1/clients',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return convertClient(response.data.client);
  },

  async update(id: string, data: UpdateClientData): Promise<ClientWithCreatedAt> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { client: Client } }>(
      `/api/v1/clients/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return convertClient(response.data.client);
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/clients/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

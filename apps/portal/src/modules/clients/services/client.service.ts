import apiRequest from '../../../shared/services/api';
import type { Client } from '@shared/core';

// Tipos locais para compatibilidade
export interface ClientWithCreatedAt extends Omit<Client, 'created_at' | 'updated_at'> {
  createdAt: string;
  tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
  cnae?: string;
  state_registration?: string;
  municipal_registration?: string;
  notes?: string;
}

export interface CreateClientData {
  name: string;
  cnpj?: string; // Opcional para super_admin criar empresa
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
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const tenantId = localStorage.getItem('tenantId');
  
  // Super admin não precisa de tenantId
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  // Se for super_admin, não enviar tenantId (será undefined)
  if (user?.role === 'super_admin') {
    return { token, tenantId: undefined };
  }
  
  if (!tenantId) {
    throw new Error('Not authenticated');
  }
  
  return { token, tenantId };
}

// Helper para converter Client da API para formato do frontend
function convertClient(client: any): ClientWithCreatedAt {
  return {
    id: client.id,
    name: client.name,
    cnpj: client.cnpj,
    email: client.email || '',
    status: client.status || 'active', // Default para 'active' se não tiver status
    tax_regime: client.tax_regime,
    cnae: client.cnae,
    state_registration: client.state_registration,
    municipal_registration: client.municipal_registration,
    notes: client.notes,
    createdAt: client.createdAt || client.created_at 
      ? (typeof (client.createdAt || client.created_at) === 'string' 
          ? (client.createdAt || client.created_at) 
          : new Date(client.createdAt || client.created_at).toISOString())
      : new Date().toISOString(),
  };
}

export const clientService = {
  async list(): Promise<ClientWithCreatedAt[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { clients: Client[]; total: number; page: number; limit: number } }>(
      '/api/v1/clients',
      { token, tenantId }
    );
    
    // Se clients não for array, retornar array vazio
    if (!Array.isArray(response.data.clients)) {
      console.error('clientService.list: clients is not an array', response.data);
      return [];
    }
    
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

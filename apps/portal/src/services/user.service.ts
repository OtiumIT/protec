import apiRequest from './api';

// Tipos
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  if (!token || !tenantId) {
    throw new Error('Not authenticated');
  }
  return { token, tenantId };
}

// Helper para converter formato da API
function convertUser(user: any): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    status: user.status || 'active',
    createdAt: user.created_at 
      ? (typeof user.created_at === 'string' ? user.created_at : new Date(user.created_at).toISOString())
      : new Date().toISOString(),
  };
}

export const userService = {
  async list(): Promise<User[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { users: any[]; total: number; page: number; limit: number } }>(
      '/api/v1/users',
      { token, tenantId }
    );
    return response.data.users.map(convertUser);
  },

  async getById(id: string): Promise<User | null> {
    const { token, tenantId } = getAuthHeaders();
    try {
      const response = await apiRequest<{ data: { user: any } }>(
        `/api/v1/users/${id}`,
        { token, tenantId }
      );
      return convertUser(response.data.user);
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return null;
      }
      throw error;
    }
  },

  async create(data: CreateUserData): Promise<User> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { user: any } }>(
      '/api/v1/users',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return convertUser(response.data.user);
  },

  async update(id: string, data: UpdateUserData): Promise<User> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { user: any } }>(
      `/api/v1/users/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return convertUser(response.data.user);
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/users/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },
};

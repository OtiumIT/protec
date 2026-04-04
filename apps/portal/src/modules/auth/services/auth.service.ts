import apiRequest from '../../../shared/services/api';

export interface LoginData {
  email: string;
  password: string;
}

/** Dados para cadastro de escritório (tenant) + usuário responsável - suporta PF e PJ */
export interface RegisterData {
  company: {
    person_type: 'pf' | 'pj';
    legal_name: string;
    trade_name?: string;
    cnpj?: string;
    cpf?: string;
    phone?: string;
  };
  user: {
    name: string;
    email: string;
    password: string;
  };
}

export interface AuthResponse {
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenant_id: string | null;
    };
    tokens: {
      access: string;
      refresh: string;
    };
  };
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async refreshToken(token: string): Promise<{ data: { accessToken: string } }> {
    return apiRequest('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  async logout(token: string, accessToken: string, tenantId: string): Promise<void> {
    return apiRequest('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ token }),
      token: accessToken,
      tenantId,
    });
  },

  async getMe(accessToken: string, tenantId: string) {
    return apiRequest('/api/v1/auth/me', {
      token: accessToken,
      tenantId,
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiRequest('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiRequest('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password, confirmPassword: password }),
    });
  },
};

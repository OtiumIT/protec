// Em produção (Cloudflare): usa Render se VITE_API_URL não estiver definido
const API_URL = (import.meta.env?.VITE_API_URL as string) || (import.meta.env.PROD ? 'https://protec-n05v.onrender.com' : 'http://localhost:3001');

interface RequestOptions extends RequestInit {
  token?: string;
  tenantId?: string | undefined;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return null;
      }

      const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!response.ok) {
        // Refresh token inválido, fazer logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
        window.location.href = '/login';
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.data?.accessToken || data.data?.access;
      
      if (newAccessToken) {
        localStorage.setItem('accessToken', newAccessToken);
        return newAccessToken;
      }

      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenantId');
      window.location.href = '/login';
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, tenantId, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  let accessToken = token || localStorage.getItem('accessToken') || undefined;

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (tenantId && tenantId !== '') {
    headers['X-Tenant-ID'] = tenantId;
  }

  // Garantir que a URL está corretamente formatada
  if (!API_URL || typeof API_URL !== 'string') {
    throw new Error('API_URL is not configured. Please set VITE_API_URL environment variable.');
  }
  
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;
  
  if (!url || typeof url !== 'string') {
    throw new Error(`Invalid URL constructed: ${url}`);
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Se receber 401 e tiver refresh token, tentar fazer refresh
  if (response.status === 401 && !options.token && localStorage.getItem('refreshToken')) {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Tentar novamente com o novo token
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    let errorMessage = 'Request failed';
    
    try {
      const error = await response.json();
      const errorMsg = error?.error?.message || error?.message;
      if (errorMsg && typeof errorMsg === 'string') {
        errorMessage = errorMsg;
      } else {
        const statusText = response.statusText || 'Unknown error';
        errorMessage = `HTTP ${response.status}: ${statusText}`;
      }
    } catch (jsonError) {
      // Se não conseguir parsear JSON, usar status text
      const statusText = response.statusText || 'Unknown error';
      errorMessage = `HTTP ${response.status}: ${statusText}`;
    }
    
    // Se ainda for 401 após refresh, redirecionar para login
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenantId');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    throw new Error(errorMessage);
  }

  try {
    const data = await response.json();
    // Validar que a resposta tem estrutura esperada
    if (!data || typeof data !== 'object') {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response structure from server');
    }
    return data;
  } catch (jsonError: any) {
    // Se não conseguir parsear JSON, lançar erro
    console.error('Error parsing JSON response:', jsonError);
    const errorMsg = jsonError?.message || 'Invalid JSON response from server';
    throw new Error(errorMsg);
  }
}

export default apiRequest;

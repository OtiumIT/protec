const DEV_API_URL = 'http://localhost:3001';

/** Base URL da API. Em produção o Vite injeta VITE_API_URL no build (Cloudflare Pages, etc.) — não há fallback fixo para um domínio. */
export function getApiUrl(): string {
  const fromEnv = (import.meta.env?.VITE_API_URL as string | undefined)?.trim() ?? '';
  if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
    return DEV_API_URL;
  }
  if (fromEnv) {
    return fromEnv;
  }
  if (import.meta.env.PROD) {
    return '';
  }
  return DEV_API_URL;
}

interface RequestOptions extends RequestInit {
  token?: string;
  tenantId?: string | undefined;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/** Limpa sessão e redireciona para login apenas quando o refresh token é inválido/expirado (não em erro de rede). */
function clearSessionAndRedirectToLogin(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('tenantId');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

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

      const baseUrl = getApiUrl().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (response.status === 401) {
        // Token inválido ou expirado: sessão acabou, redirecionar
        const body = await response.json().catch(() => ({}));
        const code = body?.error?.code;
        if (code === 'INVALID_REFRESH_TOKEN' || body?.error?.message?.toLowerCase().includes('refresh')) {
          clearSessionAndRedirectToLogin();
        }
        return null;
      }

      if (!response.ok) {
        // 5xx ou outro erro: não deslogar (pode ser instabilidade), só falhar o refresh
        console.warn('Refresh retornou status', response.status, '- mantendo sessão');
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
      // Erro de rede/timeout: NÃO deslogar, só falhar o refresh (usuário pode tentar de novo)
      console.error('Error refreshing token (network or server):', error);
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

  const baseUrl = getApiUrl().replace(/\/$/, '');
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error(
      'API base URL is not configured. No build-time VITE_API_URL — set it in Cloudflare Pages (Production) and redeploy.',
    );
  }
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;
  
  if (!url || typeof url !== 'string') {
    throw new Error(`Invalid URL constructed: ${url}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (fetchError: unknown) {
    const msg = fetchError instanceof Error ? fetchError.message : '';
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente mais tarde.');
    }
    throw fetchError;
  }

  // Se receber 401 e tiver refresh token, tentar fazer refresh (sem deslogar em erro de rede)
  if (response.status === 401 && !options.token && localStorage.getItem('refreshToken')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
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
      const statusText = response.statusText || 'Unknown error';
      errorMessage = `HTTP ${response.status}: ${statusText}`;
    }

    // 401 = token inválido/expirado: redirecionar para login sempre (evita toast sem redirect)
    if (response.status === 401) {
      clearSessionAndRedirectToLogin();
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

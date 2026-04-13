const DEV_API_URL = 'http://localhost:3001';

/**
 * Evita Mixed Content: se VITE_API_URL vier com `http://` (variável antiga ou typo no CI),
 * força `https://` para qualquer host que não seja desenvolvimento local.
 */
function normalizeApiBaseUrl(url: string): string {
  const u = url.trim();
  if (!u.startsWith('http://')) {
    return u;
  }
  try {
    const host = new URL(u).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return u;
    }
  } catch {
    return u;
  }
  return `https://${u.slice('http://'.length)}`;
}

/**
 * Endpoints do portal sempre começam com `/api/v1/...`.
 * Se `VITE_API_URL` já incluir `/api/v1`, sem isso a URL vira `/api/v1/api/v1/...` e a API responde 404 "Route not found".
 */
function stripTrailingApiV1Base(url: string): string {
  if (!url) return url;
  return url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/i, '')
    .replace(/\/+$/, '');
}

/** Base URL da API (host apenas, sem `/api/v1`). Em produção o Vite injeta VITE_API_URL no build (Cloudflare Pages, etc.) — não há fallback fixo para um domínio. */
export function getApiUrl(): string {
  const fromEnv = (import.meta.env?.VITE_API_URL as string | undefined)?.trim() ?? '';
  if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
    return stripTrailingApiV1Base(DEV_API_URL);
  }
  if (fromEnv) {
    return stripTrailingApiV1Base(normalizeApiBaseUrl(fromEnv));
  }
  if (import.meta.env.PROD) {
    return '';
  }
  return stripTrailingApiV1Base(DEV_API_URL);
}

interface RequestOptions extends RequestInit {
  token?: string;
  tenantId?: string | undefined;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/** Monta URL absoluta: path absoluto (`/api/v1/...`) substitui o path da base, evitando `/api/v1/api/v1/...` e barras duplicadas. */
function resolveApiRequestUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return new URL(p, `${base}/`).href;
}

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

      const response = await fetch(resolveApiRequestUrl(getApiUrl(), '/api/v1/auth/refresh'), {
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

  const baseUrl = getApiUrl().trim();
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error(
      'API base URL is not configured. No build-time VITE_API_URL — set it in Cloudflare Pages (Production) and redeploy.',
    );
  }
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Rotas de auth não devem enviar tenant (evita sessão anterior atrapalhar login de super_admin).
  const isAuthPublicPath =
    path.includes('/api/v1/auth/login') ||
    path.includes('/api/v1/auth/register') ||
    path.includes('/api/v1/auth/forgot-password') ||
    path.includes('/api/v1/auth/reset-password');
  if (!isAuthPublicPath && tenantId && tenantId !== '') {
    headers['X-Tenant-ID'] = tenantId;
  }
  if (isAuthPublicPath) {
    delete headers['X-Tenant-ID'];
  }
  const url = resolveApiRequestUrl(baseUrl, path);
  
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

  // 401: tentar refresh sempre que houver refresh token (mesmo com `token` explício em options — vem do localStorage e pode estar expirado).
  if (response.status === 401 && localStorage.getItem('refreshToken')) {
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

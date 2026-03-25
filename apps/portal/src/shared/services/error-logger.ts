import { getApiUrl } from './api';

/**
 * Reporta erros do frontend para o backend (fire-and-forget).
 * Usado para correlacionar falhas de API com logs do servidor.
 */
export function logClientError(payload: {
  endpoint: string;
  status: number;
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
}): void {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const baseUrl = getApiUrl().replace(/\/$/, '');
  if (!baseUrl) return;

  const tenantId = localStorage.getItem('tenantId');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  fetch(`${baseUrl}/api/v1/system/log-client-error`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {});
}

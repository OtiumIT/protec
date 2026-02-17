import apiRequest from '../../../shared/services/api';

function getFiscalFileApiUrl(): string {
  const fromEnv = (import.meta.env?.VITE_API_URL as string)?.trim();
  if (fromEnv && fromEnv !== 'http://localhost:3001') return fromEnv;
  if (import.meta.env.PROD) return 'https://protec-n05v.onrender.com';
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) return 'https://protec-n05v.onrender.com';
  return 'http://localhost:3001';
}
const API_URL = getFiscalFileApiUrl();

export interface FiscalFile {
  id: string;
  client_id: string;
  file_type: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
  competence: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  processing_error: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UploadFiscalFileData {
  client_id: string;
  competence: string;
  file_type: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
  file: File;
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

export const fiscalFileService = {
  /**
   * Upload de arquivo fiscal
   */
  async upload(data: UploadFiscalFileData): Promise<FiscalFile> {
    const { token, tenantId } = getAuthHeaders();

    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('client_id', data.client_id);
    formData.append('competence', data.competence);
    formData.append('file_type', data.file_type);

    const response = await fetch(`${API_URL}/api/v1/fiscal-files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        // Não definir Content-Type para FormData (browser faz automaticamente)
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || 'Upload failed');
    }

    const result = await response.json();
    return result.data.fiscal_file;
  },

  /**
   * Listar arquivos fiscais
   */
  async list(options: {
    client_id?: string;
    competence?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ files: FiscalFile[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();

    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.competence) params.append('competence', options.competence);
    if (options.status) params.append('status', options.status);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiRequest<{ data: { files: FiscalFile[]; total: number; page: number; limit: number } }>(
      `/api/v1/fiscal-files?${params.toString()}`,
      { token, tenantId }
    );

    return response.data;
  },

  /**
   * Buscar arquivo por ID
   */
  async getById(id: string): Promise<FiscalFile> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { fiscal_file: FiscalFile } }>(
      `/api/v1/fiscal-files/${id}`,
      { token, tenantId }
    );
    return response.data.fiscal_file;
  },

  /**
   * Obter URL de download
   */
  async getDownloadUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { download_url: string; expires_in: number } }>(
      `/api/v1/fiscal-files/${id}/download?expires_in=${expiresIn}`,
      { token, tenantId }
    );
    return response.data.download_url;
  },

  /**
   * Deletar arquivo
   */
  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/fiscal-files/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  /**
   * Listar arquivos de um cliente
   */
  async listByClient(clientId: string): Promise<FiscalFile[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { files: FiscalFile[] } }>(
      `/api/v1/fiscal-files/client/${clientId}`,
      { token, tenantId }
    );
    return response.data.files;
  },
};

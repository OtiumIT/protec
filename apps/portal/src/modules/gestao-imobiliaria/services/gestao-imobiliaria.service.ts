import apiRequest, { getApiUrl } from '../../../shared/services/api';
import type {
  PropertyTenant, PropertyLease, PropertyLedgerEntry, PropertyStatementShare,
  PropertyGuarantee, PropertyDocument,
} from '@shared/core';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const tenantId = localStorage.getItem('tenantId');
  if (!token) throw new Error('Not authenticated');
  if (user?.role === 'super_admin') return { token, tenantId: undefined as string | undefined };
  if (!tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

const BASE = '/api/v1/gestao-imobiliaria';

async function get<T>(path: string): Promise<T> {
  const { token, tenantId } = getAuthHeaders();
  const res = await apiRequest<{ data: T }>(`${BASE}${path}`, { token, tenantId });
  return res.data;
}
async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const { token, tenantId } = getAuthHeaders();
  const res = await apiRequest<{ data: T }>(`${BASE}${path}`, {
    method, token, tenantId, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return res.data;
}

export interface DashboardData {
  kpis: { receita_recebida: number; receita_prevista: number; despesa_paga: number; pendencias: number; resultado_liquido: number };
  imoveis: Array<{ property_id: string; identificador: string; receita: number; despesa: number; resultado: number; atrasado: number }>;
}
export interface StatementData {
  client_id: string; period_from: string; period_to: string;
  resumo: { receitas: number; despesas: number; resultado_liquido: number };
  imoveis: Array<{ property_id: string; identificador: string; receitas: number; despesas: number; resultado: number; categorias: Record<string, number> }>;
}
export interface AlertItem {
  tipo: string; property_identificador?: string; data?: string; valor?: number; categoria?: string; lease_id?: string; ledger_id?: string;
}

export const gestaoImobiliariaService = {
  // Dashboard / alertas / extrato
  getDashboard: (params?: { client_id?: string; competencia?: string }) => {
    const q = new URLSearchParams();
    if (params?.client_id) q.set('client_id', params.client_id);
    if (params?.competencia) q.set('competencia', params.competencia);
    return get<DashboardData>(`/dashboard${q.toString() ? `?${q}` : ''}`);
  },
  getAlerts: (params?: { client_id?: string; dias?: number }) => {
    const q = new URLSearchParams();
    if (params?.client_id) q.set('client_id', params.client_id);
    if (params?.dias) q.set('dias', String(params.dias));
    return get<AlertItem[]>(`/alerts${q.toString() ? `?${q}` : ''}`);
  },
  getStatement: (params: { client_id: string; property_ids?: string[]; period_from: string; period_to: string }) => {
    const q = new URLSearchParams();
    q.set('client_id', params.client_id);
    if (params.property_ids?.length) q.set('property_ids', params.property_ids.join(','));
    q.set('period_from', params.period_from);
    q.set('period_to', params.period_to);
    return get<StatementData>(`/statement?${q}`);
  },

  // Inquilinos
  listTenants: (clientId?: string) => get<PropertyTenant[]>(`/tenants${clientId ? `?client_id=${clientId}` : ''}`),
  createTenant: (body: Record<string, unknown>) => send<PropertyTenant>('/tenants', 'POST', body),
  updateTenant: (id: string, body: Record<string, unknown>) => send<PropertyTenant>(`/tenants/${id}`, 'PATCH', body),
  deleteTenant: (id: string) => send<{ success: boolean }>(`/tenants/${id}`, 'DELETE'),

  // Contratos
  listLeases: (filters?: { property_id?: string; status?: string; client_id?: string }) => {
    const q = new URLSearchParams(filters as Record<string, string>);
    return get<PropertyLease[]>(`/leases${q.toString() ? `?${q}` : ''}`);
  },
  getLease: (id: string) => get<PropertyLease>(`/leases/${id}`),
  createLease: (body: Record<string, unknown>) => send<PropertyLease>('/leases', 'POST', body),
  updateLease: (id: string, body: Record<string, unknown>) => send<PropertyLease>(`/leases/${id}`, 'PATCH', body),
  deleteLease: (id: string) => send<{ success: boolean }>(`/leases/${id}`, 'DELETE'),
  quickSimulateLease: (leaseId: string) => send<any>(`/leases/${leaseId}/quick-simulate`, 'POST', {}),
  saveLeaseRegime: (leaseId: string, regime: 'pf' | 'pj') => send<any>(`/leases/${leaseId}/regime`, 'PATCH', { regime }),
  listAmendments: (leaseId: string) => get<any[]>(`/leases/${leaseId}/amendments`),
  createAmendment: (leaseId: string, body: Record<string, unknown>) => send<any>(`/leases/${leaseId}/amendments`, 'POST', body),
  listGuarantees: (leaseId: string) => get<PropertyGuarantee[]>(`/leases/${leaseId}/guarantees`),
  createGuarantee: (leaseId: string, body: Record<string, unknown>) => send<PropertyGuarantee>(`/leases/${leaseId}/guarantees`, 'POST', body),
  updateGuarantee: (id: string, body: Record<string, unknown>) => send<PropertyGuarantee>(`/guarantees/${id}`, 'PATCH', body),

  // Ledger
  listLedger: (filters?: Record<string, string | number>) => {
    const q = new URLSearchParams();
    Object.entries(filters ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return get<{ entries: PropertyLedgerEntry[]; total: number; page: number; limit: number }>(`/ledger${q.toString() ? `?${q}` : ''}`);
  },
  createLedgerEntry: (body: Record<string, unknown>) => send<PropertyLedgerEntry>('/ledger', 'POST', body),
  updateLedgerEntry: (id: string, body: Record<string, unknown>) => send<PropertyLedgerEntry>(`/ledger/${id}`, 'PATCH', body),
  settleLedgerEntry: (id: string, paid_at?: string) => send<PropertyLedgerEntry>(`/ledger/${id}/settle`, 'POST', { paid_at }),
  cancelLedgerEntry: (id: string) => send<PropertyLedgerEntry>(`/ledger/${id}/cancel`, 'POST'),
  deleteLedgerEntry: (id: string) => send<{ success: boolean }>(`/ledger/${id}`, 'DELETE'),
  markOverdue: () => send<{ updated: number }>('/ledger/mark-overdue', 'POST'),

  // Recorrências
  listRecurring: (propertyId?: string) => get<any[]>(`/recurring${propertyId ? `?property_id=${propertyId}` : ''}`),
  createRecurring: (body: Record<string, unknown>) => send<any>('/recurring', 'POST', body),
  deleteRecurring: (id: string) => send<{ success: boolean }>(`/recurring/${id}`, 'DELETE'),
  generateRecurring: (competencia: string) => send<{ created: number; skipped: number }>('/recurring/generate', 'POST', { competencia }),

  // Documentos
  listDocuments: (filters: { property_id?: string; lease_id?: string }) => {
    const q = new URLSearchParams(filters as Record<string, string>);
    return get<PropertyDocument[]>(`/documents${q.toString() ? `?${q}` : ''}`);
  },
  createDocument: (body: Record<string, unknown>) => send<PropertyDocument>('/documents', 'POST', body),
  deleteDocument: (id: string) => send<{ success: boolean }>(`/documents/${id}`, 'DELETE'),
  getDocumentDownloadUrl: (id: string) => get<{ download_url: string; nome_arquivo: string; mime_type: string | null; expires_in: number }>(`/documents/${id}/download`),
  async uploadLeaseDocument(leaseId: string, file: File, categoria: string): Promise<PropertyDocument> {
    const { token, tenantId } = getAuthHeaders();
    const baseUrl = getApiUrl().replace(/\/$/, '');
    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId ?? '',
    };
    const uploadUrlRes = await fetch(`${baseUrl}/api/v1/gestao-imobiliaria/documents/upload-url`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lease_id: leaseId, filename: file.name, mime_type: file.type || null }),
    });
    if (!uploadUrlRes.ok) {
      const err = await uploadUrlRes.json().catch(() => ({ error: { message: 'Falha ao gerar URL de upload' } }));
      throw new Error(err.error?.message || 'Falha ao gerar URL de upload');
    }
    const { data: uploadData } = await uploadUrlRes.json();
    const uploadRes = await fetch(uploadData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!uploadRes.ok) throw new Error('Falha ao enviar o arquivo');
    return send<PropertyDocument>('/documents', 'POST', {
      lease_id: leaseId,
      categoria,
      nome_arquivo: file.name,
      mime_type: file.type || null,
      tamanho_bytes: file.size,
      storage_key: uploadData.storage_path,
    });
  },

  // Ownership
  listOwnership: (propertyId: string) => get<any[]>(`/ownership-shares?property_id=${propertyId}`),
  createOwnership: (body: Record<string, unknown>) => send<any>('/ownership-shares', 'POST', body),
  deleteOwnership: (id: string) => send<{ success: boolean }>(`/ownership-shares/${id}`, 'DELETE'),

  // Operação
  listVendors: () => get<any[]>('/vendors'),
  createVendor: (body: Record<string, unknown>) => send<any>('/vendors', 'POST', body),
  deleteVendor: (id: string) => send<{ success: boolean }>(`/vendors/${id}`, 'DELETE'),
  listMaintenance: (propertyId?: string) => get<any[]>(`/maintenance${propertyId ? `?property_id=${propertyId}` : ''}`),
  createMaintenance: (body: Record<string, unknown>) => send<any>('/maintenance', 'POST', body),
  updateMaintenance: (id: string, body: Record<string, unknown>) => send<any>(`/maintenance/${id}`, 'PATCH', body),
  deleteMaintenance: (id: string) => send<{ success: boolean }>(`/maintenance/${id}`, 'DELETE'),
  listInspections: (propertyId?: string) => get<any[]>(`/inspections${propertyId ? `?property_id=${propertyId}` : ''}`),
  createInspection: (body: Record<string, unknown>) => send<any>('/inspections', 'POST', body),
  listInventory: (propertyId: string) => get<any[]>(`/inventory?property_id=${propertyId}`),
  createInventory: (body: Record<string, unknown>) => send<any>('/inventory', 'POST', body),

  // Share links
  listStatementShares: (clientId?: string) => get<PropertyStatementShare[]>(`/statement-shares${clientId ? `?client_id=${clientId}` : ''}`),
  createStatementShare: (body: Record<string, unknown>) => send<{ share: PropertyStatementShare; token: string }>('/statement-shares', 'POST', body),
  revokeStatementShare: (id: string) => send<PropertyStatementShare>(`/statement-shares/${id}/revoke`, 'POST'),

  // Integrações (stubs)
  listPaymentCharges: (propertyId?: string) => get<any[]>(`/payment-charges${propertyId ? `?property_id=${propertyId}` : ''}`),
  createPaymentCharge: (body: Record<string, unknown>) => send<any>('/payment-charges', 'POST', body),
  listCommunications: (clientId?: string) => get<any[]>(`/communications${clientId ? `?client_id=${clientId}` : ''}`),
  createCommunication: (body: Record<string, unknown>) => send<any>('/communications', 'POST', body),
  listBankImports: () => get<any[]>('/bank-imports'),
  createBankImport: (body: Record<string, unknown>) => send<any>('/bank-imports', 'POST', body),
};

/** Rota pública read-only (sem auth). */
export async function fetchPublicStatement(token: string): Promise<{
  share: { title: string | null; period_from: string; period_to: string };
  statement: StatementData;
}> {
  const res = await apiRequest<{ data: { share: any; statement: StatementData } }>(
    `/api/v1/gestao-imobiliaria/public/statement/${encodeURIComponent(token)}`,
    {}
  );
  return res.data;
}

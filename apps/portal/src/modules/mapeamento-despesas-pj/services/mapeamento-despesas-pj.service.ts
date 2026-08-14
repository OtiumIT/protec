import apiRequest from '../../../shared/services/api';
import type {
  AnalyzeExpenseMappingInput,
  CreateDiagnosisInput,
  UpdateDiagnosisInput,
  ExpenseMappingResult,
  ExpenseMappingDiagnosis,
  ClassifiedExpenseItem,
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

const BASE = '/api/v1/mapeamento-despesas-pj';

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

export interface DiagnosisFull {
  diagnosis: ExpenseMappingDiagnosis;
  items: ClassifiedExpenseItem[];
  answers: Array<{ category_key: string; question_key: string; answer: Record<string, unknown> }>;
  pendencies: any[];
  evidence: any[];
}

export interface PortfolioSummary {
  clientes_mapeados: number;
  diagnosticos_concluidos: number;
  base_anual_analisada: number;
  potencial_operacional: number;
  condicionado: number;
  pendencias_abertas: number;
}

export const mapeamentoService = {
  getCatalog: () => get<{ version: string; categories: any[] }>('/catalog'),
  getDashboard: () => get<PortfolioSummary>('/dashboard'),
  analyze: (input: AnalyzeExpenseMappingInput) => send<ExpenseMappingResult>('/analyze', 'POST', input),

  create: (input: CreateDiagnosisInput) => send<DiagnosisFull>('', 'POST', input),
  list: (params?: { client_id?: string; reference_year?: number; status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return get<{ diagnoses: ExpenseMappingDiagnosis[]; total: number; page: number; limit: number }>(q.toString() ? `?${q}` : '');
  },
  getById: (id: string) => get<DiagnosisFull>(`/${id}`),
  update: (id: string, input: UpdateDiagnosisInput) => send<DiagnosisFull>(`/${id}`, 'PATCH', input),
  complete: (id: string) => send<DiagnosisFull>(`/${id}/complete`, 'POST'),
  reopen: (id: string) => send<DiagnosisFull>(`/${id}/reopen`, 'POST'),
  remove: (id: string) => send<{ success: boolean }>(`/${id}`, 'DELETE'),
  audit: (id: string) => get<any[]>(`/${id}/audit`),

  listPendencies: (id: string) => get<any[]>(`/${id}/pendencies`),
  createPendency: (id: string, body: Record<string, unknown>) => send<any>(`/${id}/pendencies`, 'POST', body),
  updatePendency: (pid: string, body: Record<string, unknown>) => send<any>(`/pendencies/${pid}`, 'PATCH', body),
  deletePendency: (pid: string) => send<{ success: boolean }>(`/pendencies/${pid}`, 'DELETE'),

  listEvidence: (id: string) => get<any[]>(`/${id}/evidence`),
  createEvidence: (id: string, body: Record<string, unknown>) => send<any>(`/${id}/evidence`, 'POST', body),
  deleteEvidence: (eid: string) => send<{ success: boolean }>(`/evidence/${eid}`, 'DELETE'),

  listImports: (id: string) => get<any[]>(`/${id}/imports`),
  createImport: (id: string, body: Record<string, unknown>) => send<any>(`/${id}/imports`, 'POST', body),
};

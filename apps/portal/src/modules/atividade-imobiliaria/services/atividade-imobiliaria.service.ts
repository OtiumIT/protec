import apiRequest from '../../../shared/services/api';
import type {
  RealEstateDevelopment,
  RealEstateUnit,
  DevelopmentIntegrity,
  CreateDevelopmentInput,
  UpdateDevelopmentInput,
  CreateUnitInput,
  UpdateUnitInput,
  ListDevelopmentsQuery,
  CreateSaleContractInput,
  UpdateSaleContractInput,
  SaleContractDetail,
  RealEstateSaleContract,
  ContractIntegrity,
  CreateReceiptInput,
  RealEstateSaleReceipt,
  DominioExportFile,
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

const BASE = '/api/v1/atividade-imobiliaria';

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

export const atividadeImobiliariaService = {
  // Empreendimentos
  listDevelopments: (params?: Partial<ListDevelopmentsQuery>) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return get<{ developments: RealEstateDevelopment[]; total: number }>(`/developments${qs ? `?${qs}` : ''}`);
  },
  getDevelopment: (id: string) => get<RealEstateDevelopment>(`/developments/${id}`),
  createDevelopment: (data: CreateDevelopmentInput) => send<RealEstateDevelopment>('/developments', 'POST', data),
  updateDevelopment: (id: string, data: UpdateDevelopmentInput) => send<RealEstateDevelopment>(`/developments/${id}`, 'PATCH', data),
  deleteDevelopment: (id: string) => send<{ ok: boolean }>(`/developments/${id}`, 'DELETE'),

  // Unidades
  listUnits: (developmentId: string) => get<RealEstateUnit[]>(`/developments/${developmentId}/units`),
  createUnit: (developmentId: string, data: CreateUnitInput) => send<RealEstateUnit>(`/developments/${developmentId}/units`, 'POST', data),
  createUnitsBatch: (developmentId: string, units: CreateUnitInput[]) =>
    send<RealEstateUnit[]>(`/developments/${developmentId}/units/batch`, 'POST', { units }),
  updateUnit: (unitId: string, data: UpdateUnitInput) => send<RealEstateUnit>(`/units/${unitId}`, 'PATCH', data),
  deleteUnit: (unitId: string) => send<{ ok: boolean }>(`/units/${unitId}`, 'DELETE'),

  // Integridade
  getIntegrity: (developmentId: string) => get<DevelopmentIntegrity>(`/developments/${developmentId}/integrity`),

  // Contratos
  listContracts: (developmentId: string) => get<RealEstateSaleContract[]>(`/developments/${developmentId}/contracts`),
  getContract: (contractId: string) => get<SaleContractDetail>(`/contracts/${contractId}`),
  createContract: (developmentId: string, data: CreateSaleContractInput) =>
    send<SaleContractDetail>(`/developments/${developmentId}/contracts`, 'POST', data),
  updateContract: (contractId: string, data: UpdateSaleContractInput) =>
    send<SaleContractDetail>(`/contracts/${contractId}`, 'PATCH', data),
  deleteContract: (contractId: string) => send<{ ok: boolean }>(`/contracts/${contractId}`, 'DELETE'),
  getContractIntegrity: (contractId: string) => get<ContractIntegrity>(`/contracts/${contractId}/integrity`),

  // Baixas
  createReceipt: (installmentId: string, data: CreateReceiptInput) =>
    send<RealEstateSaleReceipt>(`/installments/${installmentId}/receipts`, 'POST', data),
  deleteReceipt: (receiptId: string) => send<{ ok: boolean }>(`/receipts/${receiptId}`, 'DELETE'),

  // Exportação
  exportDominio: (developmentId: string) => get<DominioExportFile>(`/developments/${developmentId}/export-dominio`),
};

import apiRequest from '../../../shared/services/api';
import type {
  Property,
  PropertyTransaction,
  PropertySimulation,
  SimulateStandaloneInput,
  IndicesLc214,
  FiscalIndicesIpcaSeriesResponse,
  SaveGanhoCapitalSimulationInput,
  UpdateGanhoCapitalSimulationInput,
  SimulationKind,
} from '@shared/core';
import type { PropertyTaxSimulationResponse } from '@shared/core';

export interface PropertyWithClient extends Property {
  client_name?: string;
}

let ipcaSeriesEndpointUnavailable = false;
const ipcaSeriesInFlight = new Map<string, Promise<FiscalIndicesIpcaSeriesResponse | null>>();

type BcbSerieRow = { data: string; valor: string };

function monthKeyFromBrDate(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}`;
}

function previousMonthKey(key: string): string {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  let year = Number(m[1]);
  let month = Number(m[2]);
  month -= 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function compoundPct(values: number[]): number {
  const factor = values.reduce((acc, pct) => acc * (1 + pct / 100), 1);
  return Math.round((factor - 1) * 100 * 1_000_000) / 1_000_000;
}

function compoundFactor(values: number[]): number {
  const factor = values.reduce((acc, pct) => acc * (1 + pct / 100), 1);
  return Math.round(factor * 1_000_000) / 1_000_000;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function getMesReferenciaFimIpcaParaAnoCalendario(anoCalendario: number): {
  year: number;
  month: number;
} {
  if (anoCalendario < 2025) return { year: 2025, month: 7 };
  if (anoCalendario === 2025) return { year: 2025, month: 12 };
  return { year: anoCalendario - 1, month: 12 };
}

async function buildIpcaSeriesFromBcb(
  ano: number,
  janela = 24
): Promise<FiscalIndicesIpcaSeriesResponse | null> {
  try {
    const n = Math.min(Math.max(Math.trunc(janela), 6), 60);
    const ref = getMesReferenciaFimIpcaParaAnoCalendario(ano);
    // A série de auditoria deve mostrar o mês mais recente disponível no BCB
    // (não apenas o mês de referência do cálculo LC214).
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    startDate.setMonth(startDate.getMonth() - Math.max(n + 24, 36));
    const pad2 = (v: number) => String(v).padStart(2, '0');
    const brDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

    const rangeUrl =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json` +
      `&dataInicial=${encodeURIComponent(brDate(startDate))}` +
      `&dataFinal=${encodeURIComponent(brDate(endDate))}`;
    const latestUrl =
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json';

    const urls = [rangeUrl, latestUrl];
    let raw: BcbSerieRow[] = [];
    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const payload = (await res.json()) as BcbSerieRow[];
      if (Array.isArray(payload) && payload.length > 0) {
        raw = payload;
        break;
      }
    }
    if (raw.length === 0) return null;
    const parsedAsc = raw
      .map((r) => {
        const mes = monthKeyFromBrDate(r.data);
        const valor = Number(String(r.valor).replace(',', '.'));
        if (!mes || !Number.isFinite(valor)) return null;
        return { mes_referencia: mes, variacao_mensal_pct: valor };
      })
      .filter((x): x is { mes_referencia: string; variacao_mensal_pct: number } => !!x)
      .sort((a, b) => a.mes_referencia.localeCompare(b.mes_referencia));

    if (parsedAsc.length === 0) return null;
    const monthlyMap = new Map(parsedAsc.map((r) => [r.mes_referencia, r.variacao_mensal_pct]));

    const meses = parsedAsc.map((row) => {
      const [yearStr, monthStr] = row.mes_referencia.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);

      const anoVals: number[] = [];
      for (let mm = 1; mm <= month; mm += 1) {
        const key = `${year}-${String(mm).padStart(2, '0')}`;
        anoVals.push(monthlyMap.get(key) ?? 0);
      }

      const vals12: number[] = [];
      let cursor = row.mes_referencia;
      for (let i = 0; i < 12; i += 1) {
        vals12.push(monthlyMap.get(cursor) ?? 0);
        cursor = previousMonthKey(cursor);
      }

      const valsLc214: number[] = [];
      let y = 2025;
      let m = 2;
      while (y < year || (y === year && m <= month)) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        valsLc214.push(monthlyMap.get(key) ?? 0);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }

      return {
        mes_referencia: row.mes_referencia,
        variacao_mensal_pct: row.variacao_mensal_pct,
        acumulado_ano_pct: compoundPct(anoVals),
        acumulado_12m_pct: compoundPct(vals12),
        fator_lc214_no_mes: compoundFactor(valsLc214),
      };
    });

    const mesesRecortados = meses.slice(-n);
    const mesesFinal = mesesRecortados.length > 0 ? mesesRecortados : meses;
    const mesMaisRecenteSerie = mesesFinal.length > 0
      ? mesesFinal[mesesFinal.length - 1]!.mes_referencia
      : `${ref.year}-${String(ref.month).padStart(2, '0')}`;
    return {
      fonte: 'bcb_online',
      serie_sgs_codigo: 433,
      data_consulta_bcb: new Date().toISOString(),
      ano_calendario: ano,
      mes_referencia_fim: `${ref.year}-${String(ref.month).padStart(2, '0')}`,
      mes_mais_recente_serie: mesMaisRecenteSerie,
      meses: mesesFinal,
    };
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const tenantId = localStorage.getItem('tenantId');

  if (!token) throw new Error('Not authenticated');
  if (user?.role === 'super_admin') {
    return { token, tenantId: undefined };
  }
  if (!tenantId) throw new Error('Not authenticated');
  return { token, tenantId };
}

export const propertyService = {
  async extractPropertyDoc(file: File, documentType: 'matricula' | 'iptu'): Promise<{
    document_type: 'matricula' | 'iptu';
    pages_estimated: number;
    suggested_fields: Record<string, string | number>;
    warnings: string[];
  }> {
    const { token, tenantId } = getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    const response = await apiRequest<{ data: {
      document_type: 'matricula' | 'iptu';
      pages_estimated: number;
      suggested_fields: Record<string, string | number>;
      warnings: string[];
    } }>('/api/v1/properties/extract-property-doc', {
      method: 'POST',
      body: formData,
      token,
      tenantId,
    });
    return response.data;
  },
  async list(params?: {
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ properties: PropertyWithClient[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.client_id) query.set('client_id', params.client_id);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = `/api/v1/properties${qs ? `?${qs}` : ''}`;
    const response = await apiRequest<{
      data: { properties: PropertyWithClient[]; total: number; page: number; limit: number };
    }>(url, { token, tenantId });
    return response.data;
  },

  async getById(id: string): Promise<PropertyWithClient | null> {
    const { token, tenantId } = getAuthHeaders();
    try {
      const response = await apiRequest<{ data: { property: PropertyWithClient } }>(
        `/api/v1/properties/${id}`,
        { token, tenantId }
      );
      return response.data.property;
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes('404')) return null;
      throw err;
    }
  },

  async create(data: {
    client_id: string;
    tipo_locacao: 'fixa' | 'flexivel';
    natureza_locacao?: 'residencial' | 'nao_residencial';
    identificador: string;
    valor_aluguel_mensal?: number;
    modo_entrada?: 'detalhado' | 'reduzido';
    matricula_imovel?: string;
    inscricao_iptu?: string;
    cartorio_registro?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    iptu_mensal_padrao?: number;
    condominio_mensal_padrao?: number;
    seguro_mensal_padrao?: number;
    camareira_mensal_padrao?: number;
    seguranca_mensal_padrao?: number;
    material_limpeza_mensal_padrao?: number;
    lavanderia_enxoval_mensal_padrao?: number;
    checkin_checkout_mensal_padrao?: number;
    taxas_pagamento_mensal_padrao?: number;
    tarifas_bancarias_mensal_padrao?: number;
    vacancia_mensal_padrao?: number;
    inadimplencia_mensal_padrao?: number;
  }): Promise<Property> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { property: Property } }>(
      '/api/v1/properties',
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.property;
  },

  async createBatch(input: {
    client_id: string;
    properties: Array<{
      tipo_locacao: 'fixa' | 'flexivel';
      natureza_locacao?: 'residencial' | 'nao_residencial';
      identificador: string;
      valor_aluguel_mensal?: number;
      modo_entrada?: 'detalhado' | 'reduzido';
      matricula_imovel?: string;
      inscricao_iptu?: string;
      cartorio_registro?: string;
      cep?: string;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      uf?: string;
      iptu_mensal_padrao?: number;
      condominio_mensal_padrao?: number;
      seguro_mensal_padrao?: number;
      camareira_mensal_padrao?: number;
      seguranca_mensal_padrao?: number;
      material_limpeza_mensal_padrao?: number;
      lavanderia_enxoval_mensal_padrao?: number;
      checkin_checkout_mensal_padrao?: number;
      taxas_pagamento_mensal_padrao?: number;
      tarifas_bancarias_mensal_padrao?: number;
      vacancia_mensal_padrao?: number;
      inadimplencia_mensal_padrao?: number;
    }>;
  }): Promise<Property[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { properties: Property[] } }>(
      '/api/v1/properties/batch',
      {
        method: 'POST',
        body: JSON.stringify(input),
        token,
        tenantId,
      }
    );
    return response.data.properties;
  },

  async update(
    id: string,
    data: Partial<{ client_id: string; tipo_locacao: 'fixa' | 'flexivel'; natureza_locacao: 'residencial' | 'nao_residencial'; identificador: string; valor_aluguel_mensal: number; modo_entrada: 'detalhado' | 'reduzido'; matricula_imovel: string; inscricao_iptu: string; cartorio_registro: string; cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; iptu_mensal_padrao: number; condominio_mensal_padrao: number; seguro_mensal_padrao: number; camareira_mensal_padrao: number; seguranca_mensal_padrao: number; material_limpeza_mensal_padrao: number; lavanderia_enxoval_mensal_padrao: number; checkin_checkout_mensal_padrao: number; taxas_pagamento_mensal_padrao: number; tarifas_bancarias_mensal_padrao: number; vacancia_mensal_padrao: number; inadimplencia_mensal_padrao: number; }>
  ): Promise<Property> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { property: Property } }>(
      `/api/v1/properties/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.property;
  },

  async delete(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/properties/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  async listTransactions(
    propertyId: string,
    params?: { ano?: number; mes?: string }
  ): Promise<PropertyTransaction[]> {
    const { token, tenantId } = getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.ano) query.set('ano', String(params.ano));
    if (params?.mes) query.set('mes', params.mes);
    const qs = query.toString();
    const response = await apiRequest<{ data: { transactions: PropertyTransaction[] } }>(
      `/api/v1/properties/${propertyId}/transactions${qs ? `?${qs}` : ''}`,
      { token, tenantId }
    );
    return response.data.transactions;
  },

  async addTransaction(
    propertyId: string,
    data: {
      mes_referencia: string;
      tipo: 'receita' | 'despesa_dedutivel' | 'custo_operacional';
      categoria: string;
      valor: number;
      gera_credito_ibs_cbs?: boolean;
      tipo_credito?: 'insumo' | 'uso_consumo' | 'nao_creditavel';
      observacao?: string;
    }
  ): Promise<PropertyTransaction> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { transaction: PropertyTransaction } }>(
      `/api/v1/properties/${propertyId}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        token,
        tenantId,
      }
    );
    return response.data.transaction;
  },

  async addTransactionsBatch(
    propertyId: string,
    transactions: Array<{
      mes_referencia: string;
      tipo: 'receita' | 'despesa_dedutivel' | 'custo_operacional';
      categoria: string;
      valor: number;
      observacao?: string;
    }>
  ): Promise<PropertyTransaction[]> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { transactions: PropertyTransaction[] } }>(
      `/api/v1/properties/${propertyId}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify(transactions),
        token,
        tenantId,
      }
    );
    return response.data.transactions;
  },

  async deleteTransaction(propertyId: string, txId: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(
      `/api/v1/properties/${propertyId}/transactions/${txId}`,
      {
        method: 'DELETE',
        token,
        tenantId,
      }
    );
  },

  async upsertMonthlyTotals(
    propertyId: string,
    params: { ano: number; meses: Array<{
      mes_referencia: string;
      receita_longa: number;
      receita_short: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }> }
  ): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/properties/${propertyId}/monthly-totals`, {
      method: 'PUT',
      body: JSON.stringify(params),
      token,
      tenantId,
    });
  },

  async getMonthlyTotals(
    propertyId: string,
    ano: number
  ): Promise<Array<{
    mes_referencia: string;
    receita_longa: number;
    receita_short: number;
    despesas_dedutiveis: number;
    custos_operacionais: number;
  }>> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { totals: unknown[] } }>(
      `/api/v1/properties/${propertyId}/monthly-totals?ano=${ano}`,
      { token, tenantId }
    );
    return response.data.totals as Array<{
      mes_referencia: string;
      receita_longa: number;
      receita_short: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }>;
  },

  async simulateStandaloneAndSave(params: (Partial<SimulateStandaloneInput> & {
    ano: number;
    meses: SimulateStandaloneInput['meses'];
    client_id: string;
    title?: string;
    save_simulation?: boolean;
  })): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation; result: PropertyTaxSimulationResponse };
    }>('/api/v1/properties/simulate-standalone-and-save', {
      method: 'POST',
      body: JSON.stringify({ ...params, save_simulation: true }),
      token,
      tenantId,
    });
    return response.data;
  },

  async listSimulations(options: {
    client_id?: string;
    ano?: number;
    simulation_kind?: SimulationKind;
    page?: number;
    limit?: number;
  } = {}): Promise<{ simulations: PropertySimulation[]; total: number; page: number; limit: number }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    if (options.client_id) params.append('client_id', options.client_id);
    if (options.ano != null) params.append('ano', String(options.ano));
    if (options.simulation_kind) params.append('simulation_kind', options.simulation_kind);
    if (options.page) params.append('page', String(options.page));
    if (options.limit) params.append('limit', String(options.limit));
    const response = await apiRequest<{
      data: { simulations: PropertySimulation[]; total: number; page: number; limit: number };
    }>(`/api/v1/properties/simulations?${params.toString()}`, { token, tenantId });
    return response.data;
  },

  async getSimulationById(id: string): Promise<PropertySimulation> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: { simulation: PropertySimulation } }>(
      `/api/v1/properties/simulations/${id}`,
      { token, tenantId }
    );
    return response.data.simulation;
  },

  async updateSimulation(
    id: string,
    input: Partial<SimulateStandaloneInput> & { ano: number; meses: SimulateStandaloneInput['meses'] }
  ): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation; result: PropertyTaxSimulationResponse };
    }>(`/api/v1/properties/simulations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      token,
      tenantId,
    });
    return response.data;
  },

  async deleteSimulation(id: string): Promise<void> {
    const { token, tenantId } = getAuthHeaders();
    await apiRequest(`/api/v1/properties/simulations/${id}`, {
      method: 'DELETE',
      token,
      tenantId,
    });
  },

  async saveGanhoCapitalSimulation(
    params: SaveGanhoCapitalSimulationInput
  ): Promise<{ simulation: PropertySimulation }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation };
    }>('/api/v1/properties/simulations/ganho-capital', {
      method: 'POST',
      body: JSON.stringify(params),
      token,
      tenantId,
    });
    return response.data;
  },

  async updateGanhoCapitalSimulation(
    id: string,
    params: UpdateGanhoCapitalSimulationInput
  ): Promise<{ simulation: PropertySimulation }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation };
    }>(`/api/v1/properties/simulations/${encodeURIComponent(id)}/ganho-capital`, {
      method: 'PATCH',
      body: JSON.stringify(params),
      token,
      tenantId,
    });
    return response.data;
  },

  async simulateStandalone(params: Partial<SimulateStandaloneInput> & { ano: number; meses: SimulateStandaloneInput['meses'] }): Promise<PropertyTaxSimulationResponse> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PropertyTaxSimulationResponse }>(
      '/api/v1/properties/simulate-standalone',
      {
        method: 'POST',
        body: JSON.stringify(params),
        token,
        tenantId,
      }
    );
    return response.data;
  },

  async getFiscalIndicesIpca(ano: number): Promise<IndicesLc214> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: IndicesLc214 }>(
      `/api/v1/properties/fiscal-indices/ipca?ano=${encodeURIComponent(String(ano))}`,
      { token, tenantId }
    );
    const preview = response.data;

    // Ajuste de compatibilidade: se a API local ainda estiver com referência antiga
    // e a série já tiver meses do próprio ano (ex.: 01/2026 e 02/2026), atualiza a prévia.
    try {
      const series = await this.getFiscalIndicesIpcaSeries(ano, 24);
      const latest = series?.meses?.[series.meses.length - 1];
      if (
        latest &&
        latest.mes_referencia.startsWith(`${ano}-`) &&
        latest.mes_referencia > preview.mes_referencia_fim
      ) {
        const fatorNovo = latest.fator_lc214_no_mes;
        const fatorAntigo = preview.fator_acumulado_desde_publicacao || 1;
        const baseLim240 = preview.limite_receita_pf_contribuinte / fatorAntigo;
        const baseLim288 = preview.limite_receita_pf_absoluto / fatorAntigo;
        return {
          ...preview,
          mes_referencia_fim: latest.mes_referencia,
          fator_acumulado_desde_publicacao: fatorNovo,
          redutor_social_mensal_efetivo: round2(preview.redutor_social_mensal_nominal * fatorNovo),
          limite_receita_pf_contribuinte: round2(baseLim240 * fatorNovo),
          limite_receita_pf_absoluto: round2(baseLim288 * fatorNovo),
        };
      }
    } catch {
      // Mantém resposta original caso a série não esteja disponível.
    }
    return preview;
  },

  async getFiscalIndicesIpcaSeries(
    ano: number,
    janela = 24
  ): Promise<FiscalIndicesIpcaSeriesResponse | null> {
    const key = `${ano}:${janela}`;
    const running = ipcaSeriesInFlight.get(key);
    if (running) return running;

    const task = (async (): Promise<FiscalIndicesIpcaSeriesResponse | null> => {
    if (ipcaSeriesEndpointUnavailable) {
      return buildIpcaSeriesFromBcb(ano, janela);
    }
    const { token, tenantId } = getAuthHeaders();
    try {
      const response = await apiRequest<{ data: FiscalIndicesIpcaSeriesResponse }>(
        `/api/v1/properties/fiscal-indices/ipca/series?ano=${encodeURIComponent(
          String(ano)
        )}&janela=${encodeURIComponent(String(janela))}`,
        { token, tenantId }
      );
      return response.data;
    } catch (err) {
      const msg = (err instanceof Error ? err.message : '').toLowerCase();
      if (msg.includes('404') || msg.includes('not found')) {
        ipcaSeriesEndpointUnavailable = true;
        return buildIpcaSeriesFromBcb(ano, janela);
      }
      throw err;
    }
    })();
    ipcaSeriesInFlight.set(key, task);
    try {
      return await task;
    } finally {
      ipcaSeriesInFlight.delete(key);
    }
  },

  async aggregatePreview(
    propertyIds: string[],
    ano: number
  ): Promise<{
    meses: Array<{
      mes_referencia: string;
      receita_aluguel_tradicional: number;
      receita_aluguel_curto: number;
      receita_garagem: number;
      receita_outras: number;
      iptu: number;
      condominio: number;
      seguro_imovel: number;
      juros_financiamento: number;
      manutencao_conservacao: number;
      outras_dedutiveis: number;
      reformas_melhorias: number;
      mobilia_equipamentos: number;
      limpeza_higienizacao: number;
      comissao_corretagem: number;
      taxa_plataforma: number;
      custo_camareira: number;
      custo_seguranca: number;
      custo_material_limpeza: number;
      custo_lavanderia_enxoval: number;
      custo_checkin_checkout_terceiros: number;
      taxas_meios_pagamento: number;
      tarifas_bancarias: number;
      mao_de_obra_operacional: number;
      encargos_folha: number;
      vacancia_estimada: number;
      inadimplencia_estimada: number;
      outros_custos: number;
    }>;
    receita_total: number;
    despesas_dedutiveis_total: number;
    custos_operacionais_total: number;
    metadata?: {
      usou_defaults_cadastro: boolean;
      quantidade_imoveis_com_defaults: number;
    };
  }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    params.set('property_ids', propertyIds.join(','));
    params.set('ano', String(ano));
    const response = await apiRequest<{ data: unknown }>(
      `/api/v1/properties/aggregate-preview?${params.toString()}`,
      { token, tenantId }
    );
    return response.data as {
      meses: Array<{
        mes_referencia: string;
        receita_aluguel_tradicional: number;
        receita_aluguel_curto: number;
        receita_garagem: number;
        receita_outras: number;
        iptu: number;
        condominio: number;
        seguro_imovel: number;
        juros_financiamento: number;
        manutencao_conservacao: number;
        outras_dedutiveis: number;
        reformas_melhorias: number;
        mobilia_equipamentos: number;
        limpeza_higienizacao: number;
        comissao_corretagem: number;
        taxa_plataforma: number;
        custo_camareira: number;
        custo_seguranca: number;
        custo_material_limpeza: number;
        custo_lavanderia_enxoval: number;
        custo_checkin_checkout_terceiros: number;
        taxas_meios_pagamento: number;
        tarifas_bancarias: number;
        mao_de_obra_operacional: number;
        encargos_folha: number;
        vacancia_estimada: number;
        inadimplencia_estimada: number;
        outros_custos: number;
      }>;
      receita_total: number;
      despesas_dedutiveis_total: number;
      custos_operacionais_total: number;
      metadata?: {
        usou_defaults_cadastro: boolean;
        quantidade_imoveis_com_defaults: number;
      };
    };
  },

  async checkExists(
    clientId: string,
    identificador: string
  ): Promise<{ exists: boolean; property_id?: string }> {
    const { token, tenantId } = getAuthHeaders();
    const params = new URLSearchParams();
    params.set('client_id', clientId);
    params.set('identificador', identificador);
    const response = await apiRequest<{ data: { exists: boolean; property_id?: string } }>(
      `/api/v1/properties/check-exists?${params.toString()}`,
      { token, tenantId }
    );
    return response.data;
  },

  async simulate(params: {
    ano: number;
    property_ids: string[];
    aliquota_efetiva_dirpf?: number;
    aplicar_presuncao_16_servicos?: boolean;
    aplicar_equiparacao_hospitalar?: boolean;
    opcoes_reforma?: {
      aliquota_ibs_cbs_estimada?: number;
      aliquota_ibs_plena?: number;
      aliquota_cbs_estimada?: number;
      redutor_locacao_pct?: number;
      contrato_antes_16012025?: boolean;
      perfil_locacao?: 'residencial_comum' | 'hospedagem_temporada' | 'ambos';
    };
    quantidade_imoveis_residenciais?: number;
    quantidade_imoveis_comerciais?: number;
    receita_locacao_residencial_anual?: number;
    receita_locacao_nao_residencial_anual?: number;
  }): Promise<PropertyTaxSimulationResponse> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{ data: PropertyTaxSimulationResponse }>(
      '/api/v1/properties/simulate',
      {
        method: 'POST',
        body: JSON.stringify(params),
        token,
        tenantId,
      }
    );
    return response.data;
  },

  /** Simular por property_ids e salvar no histórico (ex.: detalhe do imóvel). */
  async simulateAndSaveFromProperties(params: {
    ano: number;
    property_ids: string[];
    client_id: string;
    title?: string;
    aliquota_efetiva_dirpf?: number;
    aplicar_presuncao_16_servicos?: boolean;
    aplicar_equiparacao_hospitalar?: boolean;
    opcoes_reforma?: {
      aliquota_ibs_cbs_estimada?: number;
      aliquota_ibs_plena?: number;
      aliquota_cbs_estimada?: number;
      redutor_locacao_pct?: number;
      contrato_antes_16012025?: boolean;
      perfil_locacao?: 'residencial_comum' | 'hospedagem_temporada' | 'ambos';
    };
  }): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    const { token, tenantId } = getAuthHeaders();
    const response = await apiRequest<{
      data: { simulation: PropertySimulation; result: PropertyTaxSimulationResponse };
    }>('/api/v1/properties/simulate-and-save', {
      method: 'POST',
      body: JSON.stringify(params),
      token,
      tenantId,
    });
    return response.data;
  },
};

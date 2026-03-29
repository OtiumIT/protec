import {
  BCB_SGS_IPCA_MENSAL_CODIGO,
  calcularIndicesLc214,
  type IndicesLc214Calculados,
  type IpcaMonthlyMap,
} from '@shared/core';
import { IPCA_FALLBACK_VARIACAO_MENSAL_PCT } from './ipca-fallback-series';

export type IpcaFonte = 'bcb_online' | 'cache' | 'embutido';

export type IpcaContextoLc214 = IndicesLc214Calculados & {
  ipca_fonte: IpcaFonte;
  serie_sgs_codigo: number;
  data_consulta_bcb?: string;
};

type CacheEntry = { map: Map<string, number>; fetchedAt: number; fonte: IpcaFonte };

const TTL_MS = 24 * 60 * 60 * 1000;
let cache: CacheEntry | null = null;

function parseBcbDate(br: string): { y: number; m: number } | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (!day || month < 1 || month > 12) return null;
  return { y: year, m: month };
}

function mergeMaps(
  primary: Map<string, number>,
  fallback: Record<string, number>
): Map<string, number> {
  const out = new Map(primary);
  for (const [k, v] of Object.entries(fallback)) {
    if (!out.has(k)) out.set(k, v);
  }
  return out;
}

/**
 * Busca variação mensal % (série 433) no intervalo [dataInicial, dataFinal] DD/MM/AAAA.
 */
async function fetchBcbSgs433(
  dataInicial: string,
  dataFinal: string
): Promise<Map<string, number>> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${BCB_SGS_IPCA_MENSAL_CODIGO}/dados?formato=json&dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BCB HTTP ${res.status}`);
  const raw = (await res.json()) as Array<{ data: string; valor: string }>;
  const map = new Map<string, number>();
  for (const row of raw) {
    const d = parseBcbDate(row.data);
    if (!d) continue;
    const key = `${d.y}-${String(d.m).padStart(2, '0')}`;
    const v = Number(String(row.valor).replace(',', '.'));
    if (!Number.isFinite(v)) continue;
    map.set(key, v);
  }
  return map;
}

/**
 * Intervalo amplo o suficiente para simulações 2020–2030 (ago/2025 → dez/2030).
 */
const BCB_DATA_INICIAL = '01/08/2025';
const BCB_DATA_FINAL = '31/12/2030';

export async function getIpcaMonthlyMapMerged(): Promise<{
  map: IpcaMonthlyMap;
  fonte: IpcaFonte;
  data_consulta_bcb?: string;
}> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return {
      map: cache.map,
      fonte: cache.fonte === 'bcb_online' ? 'cache' : cache.fonte,
      data_consulta_bcb: new Date(cache.fetchedAt).toISOString(),
    };
  }

  try {
    const online = await fetchBcbSgs433(BCB_DATA_INICIAL, BCB_DATA_FINAL);
    const merged = mergeMaps(online, IPCA_FALLBACK_VARIACAO_MENSAL_PCT);
    cache = {
      map: merged,
      fetchedAt: now,
      fonte: 'bcb_online',
    };
    return {
      map: merged,
      fonte: 'bcb_online',
      data_consulta_bcb: new Date(now).toISOString(),
    };
  } catch {
    const fallbackOnly = mergeMaps(new Map(), IPCA_FALLBACK_VARIACAO_MENSAL_PCT);
    cache = {
      map: fallbackOnly,
      fetchedAt: now,
      fonte: 'embutido',
    };
    return {
      map: fallbackOnly,
      fonte: 'embutido',
      data_consulta_bcb: undefined,
    };
  }
}

export async function getIpcaContextoLc214ParaAno(
  anoCalendario: number
): Promise<IpcaContextoLc214> {
  const { map, fonte, data_consulta_bcb } = await getIpcaMonthlyMapMerged();
  const base = calcularIndicesLc214(map, anoCalendario);
  return {
    ...base,
    ipca_fonte: fonte,
    serie_sgs_codigo: BCB_SGS_IPCA_MENSAL_CODIGO,
    data_consulta_bcb,
  };
}

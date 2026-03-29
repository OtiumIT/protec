import {
  BCB_SGS_IPCA_MENSAL_CODIGO,
  LIMITE_RECEITA_ABSOLUTO_PF_NOMINAL,
  LIMITE_RECEITA_CONTRIBUINTE_PF_NOMINAL,
  LC214_IPCA_FIRST_CORRECTION_MONTH,
  LC214_IPCA_FIRST_CORRECTION_YEAR,
  REDUTOR_SOCIAL_MENSAL_NOMINAL_LC214,
  calcularFatorIpcaAcumuladoLc214,
  calcularIndicesLc214,
  mesReferenciaFimIpcaParaAnoCalendario,
  monthKey,
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

export type IpcaSerieDetalhadaMes = {
  mes_referencia: string;
  variacao_mensal_pct: number;
  acumulado_ano_pct: number;
  acumulado_12m_pct: number;
  fator_lc214_no_mes: number;
};

export type IpcaSerieDetalhada = {
  fonte: IpcaFonte;
  serie_sgs_codigo: number;
  data_consulta_bcb?: string;
  ano_calendario: number;
  mes_referencia_fim: string;
  mes_mais_recente_serie: string;
  meses: IpcaSerieDetalhadaMes[];
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
  const legacyBase = calcularIndicesLc214(map, anoCalendario);
  const latestKey = Array.from(map.keys()).sort().at(-1);
  const latest = latestKey ? parseMonthKey(latestKey) : null;
  const fallbackEnd = mesReferenciaFimIpcaParaAnoCalendario(anoCalendario);

  let endYear = fallbackEnd.year;
  let endMonth = fallbackEnd.month;
  if (latest) {
    // Usa o mês mais recente já publicado pelo BCB, sem projetar meses futuros.
    if (latest.year < anoCalendario) {
      endYear = latest.year;
      endMonth = latest.month;
    } else if (latest.year === anoCalendario) {
      endYear = latest.year;
      endMonth = latest.month;
    }
  }

  const { fator } = calcularFatorIpcaAcumuladoLc214(map, endYear, endMonth);
  const base: IndicesLc214Calculados = {
    ...legacyBase,
    mes_referencia_fim: monthKey(endYear, endMonth),
    fator_acumulado_desde_publicacao: fator,
    redutor_social_mensal_efetivo: Math.round(REDUTOR_SOCIAL_MENSAL_NOMINAL_LC214 * fator * 100) / 100,
    limite_receita_pf_contribuinte: Math.round(LIMITE_RECEITA_CONTRIBUINTE_PF_NOMINAL * fator * 100) / 100,
    limite_receita_pf_absoluto: Math.round(LIMITE_RECEITA_ABSOLUTO_PF_NOMINAL * fator * 100) / 100,
  };
  return {
    ...base,
    ipca_fonte: fonte,
    serie_sgs_codigo: BCB_SGS_IPCA_MENSAL_CODIGO,
    data_consulta_bcb,
  };
}

function parseMonthKey(key: string): { year: number; month: number } {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`Month key inválida: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function compoundPct(values: number[]): number {
  const factor = values.reduce((acc, pct) => acc * (1 + pct / 100), 1);
  return Math.round((factor - 1) * 100 * 1_000_000) / 1_000_000;
}

function compoundFactor(values: number[]): number {
  const factor = values.reduce((acc, pct) => acc * (1 + pct / 100), 1);
  return Math.round(factor * 1_000_000) / 1_000_000;
}

export async function getIpcaSerieDetalhadaParaAno(
  anoCalendario: number,
  janelaMeses = 24
): Promise<IpcaSerieDetalhada> {
  const { map, fonte, data_consulta_bcb } = await getIpcaMonthlyMapMerged();
  const endRef = mesReferenciaFimIpcaParaAnoCalendario(anoCalendario);
  const latestKey = Array.from(map.keys()).sort().at(-1);
  const end = latestKey ? parseMonthKey(latestKey) : endRef;
  const totalMeses = Number.isFinite(janelaMeses)
    ? Math.min(Math.max(Math.trunc(janelaMeses), 6), 60)
    : 24;

  const keysAsc: string[] = [];
  let y = end.year;
  let m = end.month;
  for (let i = 0; i < totalMeses; i += 1) {
    keysAsc.push(monthKey(y, m));
    const prev = previousMonth(y, m);
    y = prev.year;
    m = prev.month;
  }
  keysAsc.reverse();

  const meses = keysAsc.map((key) => {
    const { year, month } = parseMonthKey(key);
    const variacaoMensal = map.get(key) ?? 0;

    const anoPcts: number[] = [];
    for (let mm = 1; mm <= month; mm += 1) {
      anoPcts.push(map.get(monthKey(year, mm)) ?? 0);
    }
    const acumuladoAnoPct = compoundPct(anoPcts);

    const twelvePcts: number[] = [];
    let y12 = year;
    let m12 = month;
    for (let i = 0; i < 12; i += 1) {
      const k = monthKey(y12, m12);
      twelvePcts.push(map.get(k) ?? 0);
      const prev = previousMonth(y12, m12);
      y12 = prev.year;
      m12 = prev.month;
    }
    const acumulado12mPct = compoundPct(twelvePcts);

    const lc214Pcts: number[] = [];
    let yl = LC214_IPCA_FIRST_CORRECTION_YEAR;
    let ml = LC214_IPCA_FIRST_CORRECTION_MONTH;
    while (yl < year || (yl === year && ml <= month)) {
      lc214Pcts.push(map.get(monthKey(yl, ml)) ?? 0);
      ml += 1;
      if (ml > 12) {
        ml = 1;
        yl += 1;
      }
    }
    const fatorLc214NoMes = compoundFactor(lc214Pcts);

    return {
      mes_referencia: key,
      variacao_mensal_pct: variacaoMensal,
      acumulado_ano_pct: acumuladoAnoPct,
      acumulado_12m_pct: acumulado12mPct,
      fator_lc214_no_mes: fatorLc214NoMes,
    };
  });

  return {
    fonte,
    serie_sgs_codigo: BCB_SGS_IPCA_MENSAL_CODIGO,
    data_consulta_bcb,
    ano_calendario: anoCalendario,
    mes_referencia_fim: monthKey(endRef.year, endRef.month),
    mes_mais_recente_serie: monthKey(end.year, end.month),
    meses,
  };
}

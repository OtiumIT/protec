/**
 * Parâmetros LC 214/2025 corrigidos pelo IPCA (série mensal % — ex. BCB SGS 433).
 * Data-base nominal: publicação da LC 214/2025 (16/01/2025). Correção composta a partir do mês seguinte.
 * Art. 260 par. único (redação dada pela LC 227/2026): atualização mensal a partir da data de publicação.
 */

export const LC214_IPCA_ANCHOR_YEAR = 2025;
export const LC214_IPCA_ANCHOR_MONTH = 1;
/** Série SGS BCB — variação mensal % do IPCA */
export const BCB_SGS_IPCA_MENSAL_CODIGO = 433;

export const REDUTOR_SOCIAL_MENSAL_NOMINAL_LC214 = 600;
export const LIMITE_RECEITA_CONTRIBUINTE_PF_NOMINAL = 240_000;
export const LIMITE_RECEITA_ABSOLUTO_PF_NOMINAL = 288_000;

export type IpcaMonthlyMap = ReadonlyMap<string, number>;

/** Metadados para UI e auditoria (espelha contrato da API). */
export type IndicesLc214Calculados = {
  mes_referencia_fim: string;
  fator_acumulado_desde_publicacao: number;
  redutor_social_mensal_nominal: number;
  redutor_social_mensal_efetivo: number;
  limite_receita_pf_contribuinte: number;
  limite_receita_pf_absoluto: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Chave YYYY-MM */
export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

/**
 * Último mês do IPCA usado para parâmetros do ano-calendário da simulação:
 * - ano >= 2026: dezembro do ano anterior (ex.: simulação 2027 → até 2026-12).
 * - ano === 2025: dezembro/2025 (fevereiro–dezembro após publicação em jan/2025).
 * - ano < 2025: ancora jan/2025 (sem meses de correção → fator 1).
 */
export function mesReferenciaFimIpcaParaAnoCalendario(anoCalendario: number): {
  year: number;
  month: number;
} {
  if (anoCalendario < LC214_IPCA_ANCHOR_YEAR) {
    return { year: LC214_IPCA_ANCHOR_YEAR, month: LC214_IPCA_ANCHOR_MONTH };
  }
  if (anoCalendario === LC214_IPCA_ANCHOR_YEAR) {
    return { year: LC214_IPCA_ANCHOR_YEAR, month: 12 };
  }
  return { year: anoCalendario - 1, month: 12 };
}

function compareYm(aY: number, aM: number, bY: number, bM: number): number {
  if (aY !== bY) return aY - bY;
  return aM - bM;
}

/**
 * Primeiro mês com correção: fevereiro/2025 (mês seguinte à publicação da LC 214 em 16/01/2025).
 */
export const LC214_IPCA_FIRST_CORRECTION_YEAR = 2025;
export const LC214_IPCA_FIRST_CORRECTION_MONTH = 2;

/**
 * Fator acumulado = produto (1 + variacao%/100) para cada mês no intervalo [primeira correção, fim] inclusivo.
 * Meses sem dado na série: tratados como 0% (fator 1).
 */
export function calcularFatorIpcaAcumuladoLc214(
  variacaoMensalPctPorMes: IpcaMonthlyMap,
  anoFim: number,
  mesFim: number
): { fator: number; meses_aplicados: string[] } {
  const mesesAplicados: string[] = [];
  let y = LC214_IPCA_FIRST_CORRECTION_YEAR;
  let m = LC214_IPCA_FIRST_CORRECTION_MONTH;
  if (compareYm(anoFim, mesFim, y, m) < 0) {
    return { fator: 1, meses_aplicados: [] };
  }
  let fator = 1;
  while (compareYm(y, m, anoFim, mesFim) <= 0) {
    const key = monthKey(y, m);
    const pct = variacaoMensalPctPorMes.get(key) ?? 0;
    mesesAplicados.push(key);
    fator *= 1 + pct / 100;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return {
    fator: Math.round(fator * 1_000_000) / 1_000_000,
    meses_aplicados: mesesAplicados,
  };
}

export function calcularIndicesLc214(
  variacaoMensalPctPorMes: IpcaMonthlyMap,
  anoCalendarioSimulacao: number
): IndicesLc214Calculados {
  const { year: yFim, month: mFim } = mesReferenciaFimIpcaParaAnoCalendario(
    anoCalendarioSimulacao
  );
  const { fator } = calcularFatorIpcaAcumuladoLc214(variacaoMensalPctPorMes, yFim, mFim);
  const mes_referencia_fim = monthKey(yFim, mFim);
  const redutor_social_mensal_efetivo =
    Math.round(REDUTOR_SOCIAL_MENSAL_NOMINAL_LC214 * fator * 100) / 100;
  return {
    mes_referencia_fim,
    fator_acumulado_desde_publicacao: fator,
    redutor_social_mensal_nominal: REDUTOR_SOCIAL_MENSAL_NOMINAL_LC214,
    redutor_social_mensal_efetivo,
    limite_receita_pf_contribuinte:
      Math.round(LIMITE_RECEITA_CONTRIBUINTE_PF_NOMINAL * fator * 100) / 100,
    limite_receita_pf_absoluto:
      Math.round(LIMITE_RECEITA_ABSOLUTO_PF_NOMINAL * fator * 100) / 100,
  };
}

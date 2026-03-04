/**
 * Motor de Cálculo Tributário IN 2.306/2026 - Lucro Presumido
 * Regras: Art. 14 e 15 da IN RFB nº 2.306/2026, ajuste anual § 5º, equiparação hospitalar, adicional IRPJ 10%
 *
 * Receita Federal - Perguntas e Respostas (Redução Incentivos V2):
 * - Pergunta 12: IRPJ acréscimo a partir do 1º trim/2026; CSLL a partir do 2º trim/2026.
 * - Pergunta 13: CSLL limite anual 2026 = R$ 3.750.000 (¾ do limite pleno).
 * - Pergunta 14: Proporção por atividade no trimestre — já implementado.
 */

import type { ReceitasTrimestre, DeducoesTrimestre, RetencoesTrimestre } from '@shared/core';

const LIMITE_TRIMESTRAL = 1_250_000;
const LIMITE_ANUAL = 5_000_000;
/** Pergunta 13 RF: CSLL 2026 — acréscimo só a partir do 2º trim → limite anual = ¾ × 5M = R$ 3.750.000 */
const LIMITE_ANUAL_CSLL_2026 = 3_750_000;
const LIMITE_LUCRO_PRESUMIDO_ADICIONAL = 60_000; // R$ 60.000/trimestre (adicional 10% sobre o que exceder)
const ALIQ_IRPJ = 0.15;
const ALIQ_IRPJ_ADICIONAL = 0.1;
const ALIQ_CSLL = 0.09;
const ALIQ_PIS = 0.0065;
const ALIQ_COFINS = 0.03;

/** Percentuais de presunção por tipo de atividade: [IRPJ%, CSLL%] */
const PRESUMICAO = {
  produtos_mercadorias: { irpj: 0.08, csll: 0.12 },
  servicos: { irpj: 0.32, csll: 0.32 },
  servicos_favorecida: { irpj: 0.16, csll: 0.32 },
  servicos_hospitalares: { irpj: 0.08, csll: 0.12 },
  demais_receitas: { irpj: 1, csll: 1 },
} as const;

/** Receita bruta total do trimestre */
export function receitaBrutaTrimestre(r: ReceitasTrimestre): number {
  return (
    (r.produtos_mercadorias ?? 0) +
    (r.servicos ?? 0) +
    (r.servicos_favorecida ?? 0) +
    (r.servicos_hospitalares ?? 0) +
    (r.demais_receitas ?? 0)
  );
}

/** Base de cálculo IRPJ e CSLL do trimestre SEM acréscimo 10% (cenário 2025) */
function basesTrimestreSemAcrescimo(
  r: ReceitasTrimestre,
  equiparacaoHospitalar: boolean
): { baseIrpj: number; baseCsll: number } {
  const presServicos = equiparacaoHospitalar
    ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll }
    : PRESUMICAO.servicos;
  let baseIrpj = 0;
  let baseCsll = 0;
  baseIrpj += (r.produtos_mercadorias ?? 0) * PRESUMICAO.produtos_mercadorias.irpj;
  baseCsll += (r.produtos_mercadorias ?? 0) * PRESUMICAO.produtos_mercadorias.csll;
  baseIrpj += (r.servicos ?? 0) * presServicos.irpj;
  baseCsll += (r.servicos ?? 0) * presServicos.csll;
  baseIrpj += (r.servicos_favorecida ?? 0) * PRESUMICAO.servicos_favorecida.irpj;
  baseCsll += (r.servicos_favorecida ?? 0) * PRESUMICAO.servicos_favorecida.csll;
  baseIrpj += (r.servicos_hospitalares ?? 0) * PRESUMICAO.servicos_hospitalares.irpj;
  baseCsll += (r.servicos_hospitalares ?? 0) * PRESUMICAO.servicos_hospitalares.csll;
  baseIrpj += (r.demais_receitas ?? 0) * PRESUMICAO.demais_receitas.irpj;
  baseCsll += (r.demais_receitas ?? 0) * PRESUMICAO.demais_receitas.csll;
  return { baseIrpj: round2(baseIrpj), baseCsll: round2(baseCsll) };
}

/**
 * Base de cálculo com acréscimo 10% sobre a parcela que excede R$ 1.250.000/trimestre (§ 2º e § 3º).
 * Proporcional por atividade (Pergunta 14 / § 6º).
 *
 * Pergunta 12 RF: IRPJ acréscimo a partir do 1º trim/2026; CSLL a partir do 2º trim/2026.
 */
function basesTrimestreComAcrescimo(
  r: ReceitasTrimestre,
  equiparacaoHospitalar: boolean,
  trimestre: number,
  ano: number
): { baseIrpj: number; baseCsll: number; receitaExcedente: number } {
  const total = receitaBrutaTrimestre(r);
  if (total <= LIMITE_TRIMESTRAL) {
    const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(r, equiparacaoHospitalar);
    return { baseIrpj, baseCsll, receitaExcedente: 0 };
  }
  const aplicarAcrescimoIrpj = ano >= 2026;
  const aplicarAcrescimoCsll = ano >= 2026 && trimestre >= 2; // Pergunta 12: CSLL só a partir do 2º trim
  const excedente = total - LIMITE_TRIMESTRAL;
  const presServicos = equiparacaoHospitalar
    ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll }
    : PRESUMICAO.servicos;
  let baseIrpj = 0;
  let baseCsll = 0;
  const keys: (keyof ReceitasTrimestre)[] = [
    'produtos_mercadorias',
    'servicos',
    'servicos_favorecida',
    'servicos_hospitalares',
    'demais_receitas',
  ];
  const presMap: Record<keyof ReceitasTrimestre, { irpj: number; csll: number }> = {
    produtos_mercadorias: PRESUMICAO.produtos_mercadorias,
    servicos: presServicos,
    servicos_favorecida: PRESUMICAO.servicos_favorecida,
    servicos_hospitalares: PRESUMICAO.servicos_hospitalares,
    demais_receitas: PRESUMICAO.demais_receitas,
  };
  for (const key of keys) {
    const val = r[key] ?? 0;
    if (val <= 0) continue;
    const prop = val / total;
    const limiteAtividade = LIMITE_TRIMESTRAL * prop;
    const excedenteAtividade = Math.max(0, val - limiteAtividade);
    const pres = presMap[key];
    const fatorIrpj = aplicarAcrescimoIrpj ? 1.1 : 1;
    const fatorCsll = aplicarAcrescimoCsll ? 1.1 : 1;
    baseIrpj += limiteAtividade * pres.irpj + excedenteAtividade * (pres.irpj * fatorIrpj);
    baseCsll += limiteAtividade * pres.csll + excedenteAtividade * (pres.csll * fatorCsll);
  }
  return {
    baseIrpj: round2(baseIrpj),
    baseCsll: round2(baseCsll),
    receitaExcedente: round2(excedente),
  };
}

/**
 * Base de cálculo com excedente escalado (para § 5º II - recálculo proporcional).
 * IN 2306 art. 15 § 5º II: novo_excedente_i = razão_i × excedente_anual.
 * Escala o excedente por atividade mantendo a proporção.
 */
function basesTrimestreComExcedenteEscalado(
  r: ReceitasTrimestre,
  equiparacaoHospitalar: boolean,
  trimestre: number,
  ano: number,
  fatorEscalaExcedente: number
): { baseIrpj: number; baseCsll: number } {
  const total = receitaBrutaTrimestre(r);
  if (total <= LIMITE_TRIMESTRAL || fatorEscalaExcedente <= 0) {
    const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(r, equiparacaoHospitalar);
    return { baseIrpj, baseCsll };
  }
  const aplicarAcrescimoIrpj = ano >= 2026;
  const aplicarAcrescimoCsll = ano >= 2026 && trimestre >= 2;
  const excedenteOriginal = total - LIMITE_TRIMESTRAL;
  const excedenteEscalado = excedenteOriginal * Math.min(1, fatorEscalaExcedente);
  const presServicos = equiparacaoHospitalar
    ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll }
    : PRESUMICAO.servicos;
  let baseIrpj = 0;
  let baseCsll = 0;
  const keys: (keyof ReceitasTrimestre)[] = [
    'produtos_mercadorias',
    'servicos',
    'servicos_favorecida',
    'servicos_hospitalares',
    'demais_receitas',
  ];
  const presMap: Record<keyof ReceitasTrimestre, { irpj: number; csll: number }> = {
    produtos_mercadorias: PRESUMICAO.produtos_mercadorias,
    servicos: presServicos,
    servicos_favorecida: PRESUMICAO.servicos_favorecida,
    servicos_hospitalares: PRESUMICAO.servicos_hospitalares,
    demais_receitas: PRESUMICAO.demais_receitas,
  };
  for (const key of keys) {
    const val = r[key] ?? 0;
    if (val <= 0) continue;
    const prop = val / total;
    const limiteAtividade = LIMITE_TRIMESTRAL * prop;
    const excedenteAtividadeOriginal = Math.max(0, val - limiteAtividade);
    const excedenteAtividadeEscalado = excedenteOriginal > 0
      ? excedenteAtividadeOriginal * (excedenteEscalado / excedenteOriginal)
      : 0;
    const pres = presMap[key];
    const fatorIrpj = aplicarAcrescimoIrpj ? 1.1 : 1;
    const fatorCsll = aplicarAcrescimoCsll ? 1.1 : 1;
    baseIrpj += limiteAtividade * pres.irpj + excedenteAtividadeEscalado * (pres.irpj * fatorIrpj);
    baseCsll += limiteAtividade * pres.csll + excedenteAtividadeEscalado * (pres.csll * fatorCsll);
  }
  return { baseIrpj: round2(baseIrpj), baseCsll: round2(baseCsll) };
}

function formatNum(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Labels das atividades para exibição (Receita Federal – Perguntas e Respostas) */
const LABEL_ATIVIDADE: Record<keyof ReceitasTrimestre, string> = {
  produtos_mercadorias: 'Venda de produtos/mercadorias',
  servicos: 'Prestação de serviços',
  servicos_favorecida: 'Serviços (lista favorecida)',
  servicos_hospitalares: 'Serviços hospitalares',
  demais_receitas: 'Demais receitas',
};

export interface ProporcaoAtividade {
  chave: keyof ReceitasTrimestre;
  label: string;
  receita: number;
  participacao_pct: number;
  limite_proporcional: number;
  excedente: number;
  percentual_irpj_normal: number;
  percentual_irpj_acrescimo: number;
  percentual_csll_normal: number;
  percentual_csll_acrescimo: number;
  /** Fórmula resumida: "(limite × P%) + (excedente × P'%)" para esta atividade */
  formula_resumida: string;
}

export interface ProporcaoTrimestre {
  trimestre: number;
  receita_bruta_total: number;
  limite_trimestral: number;
  aplica_acrescimo_irpj: boolean;
  aplica_acrescimo_csll: boolean;
  atividades: ProporcaoAtividade[];
  /** Fórmula geral: (R$ A × P%) + (R$ B × P'%) + ... */
  formula_geral_irpj: string;
  formula_geral_csll: string;
}

/**
 * Detalhe do cálculo por proporção (Pergunta 14 RF / § 6º).
 * Retorna null quando a receita do trimestre não excede o limite (não há parcela excedente).
 * Usado para demonstrar na tela: participação de cada atividade, limite proporcional e excedente.
 */
export function detalheProporcaoTrimestre(
  r: ReceitasTrimestre,
  equiparacaoHospitalar: boolean,
  numTrimestre: number,
  ano: number
): ProporcaoTrimestre | null {
  const total = receitaBrutaTrimestre(r);
  if (total <= 0 || total <= LIMITE_TRIMESTRAL) return null;

  const aplicarAcrescimoIrpj = ano >= 2026;
  const aplicarAcrescimoCsll = ano >= 2026 && numTrimestre >= 2;
  const presServicos = equiparacaoHospitalar
    ? { irpj: PRESUMICAO.servicos_hospitalares.irpj, csll: PRESUMICAO.servicos_hospitalares.csll }
    : PRESUMICAO.servicos;
  const presMap: Record<keyof ReceitasTrimestre, { irpj: number; csll: number }> = {
    produtos_mercadorias: PRESUMICAO.produtos_mercadorias,
    servicos: presServicos,
    servicos_favorecida: PRESUMICAO.servicos_favorecida,
    servicos_hospitalares: PRESUMICAO.servicos_hospitalares,
    demais_receitas: PRESUMICAO.demais_receitas,
  };

  const keys: (keyof ReceitasTrimestre)[] = [
    'produtos_mercadorias',
    'servicos',
    'servicos_favorecida',
    'servicos_hospitalares',
    'demais_receitas',
  ];

  const atividades: ProporcaoAtividade[] = [];
  const partesIrpj: string[] = [];
  const partesCsll: string[] = [];

  for (const key of keys) {
    const val = r[key] ?? 0;
    if (val <= 0) continue;

    const participacao_pct = (val / total) * 100;
    const limite_proporcional = round2(LIMITE_TRIMESTRAL * (val / total));
    const excedente = round2(Math.max(0, val - limite_proporcional));
    const pres = presMap[key];
    const pctIrpjNormal = pres.irpj * 100;
    const pctIrpjAcrescimo = round2(pctIrpjNormal * 1.1);
    const pctCsllNormal = pres.csll * 100;
    const pctCsllAcrescimo = round2(pctCsllNormal * 1.1);

    const formulaResumida =
      excedente > 0
        ? `(R$ ${formatNum(limite_proporcional)} × ${pctIrpjNormal}%) + (R$ ${formatNum(excedente)} × ${pctIrpjAcrescimo}%)`
        : `(R$ ${formatNum(limite_proporcional)} × ${pctIrpjNormal}%)`;

    atividades.push({
      chave: key,
      label: LABEL_ATIVIDADE[key],
      receita: round2(val),
      participacao_pct: round2(participacao_pct),
      limite_proporcional,
      excedente,
      percentual_irpj_normal: pctIrpjNormal,
      percentual_irpj_acrescimo: pctIrpjAcrescimo,
      percentual_csll_normal: pctCsllNormal,
      percentual_csll_acrescimo: pctCsllAcrescimo,
      formula_resumida: formulaResumida,
    });

    if (limite_proporcional > 0) {
      partesIrpj.push(`(R$ ${formatNum(limite_proporcional)} × ${pctIrpjNormal}%)`);
      partesCsll.push(`(R$ ${formatNum(limite_proporcional)} × ${pctCsllNormal}%)`);
    }
    if (excedente > 0) {
      const pI = aplicarAcrescimoIrpj ? pctIrpjAcrescimo : pctIrpjNormal;
      const pC = aplicarAcrescimoCsll ? pctCsllAcrescimo : pctCsllNormal;
      partesIrpj.push(`(R$ ${formatNum(excedente)} × ${pI}%)`);
      partesCsll.push(`(R$ ${formatNum(excedente)} × ${pC}%)`);
    }
  }

  return {
    trimestre: numTrimestre,
    receita_bruta_total: round2(total),
    limite_trimestral: LIMITE_TRIMESTRAL,
    aplica_acrescimo_irpj: aplicarAcrescimoIrpj,
    aplica_acrescimo_csll: aplicarAcrescimoCsll,
    atividades,
    formula_geral_irpj: partesIrpj.join(' + '),
    formula_geral_csll: partesCsll.join(' + '),
  };
}

/** Adicional de IRPJ 10% sobre a parcela do lucro presumido que exceder R$ 60.000 no trimestre (Módulo C) */
function adicionalIRPJ(baseCalculoIrpjTrimestre: number): number {
  if (baseCalculoIrpjTrimestre <= LIMITE_LUCRO_PRESUMIDO_ADICIONAL) return 0;
  const baseAdicional = baseCalculoIrpjTrimestre - LIMITE_LUCRO_PRESUMIDO_ADICIONAL;
  return round2(baseAdicional * ALIQ_IRPJ_ADICIONAL);
}

/** Retorna a base IRPJ por atividade para um trimestre (usado no rateio do adicional) */
function basesIrpjPorAtividade(
  r: ReceitasTrimestre,
  equiparacao: boolean,
  _numTrimestre: number,
  ano: number,
  usarAcrescimoIN2306: boolean
): { baseTotal: number; porAtividade: Array<{ chave: keyof ReceitasTrimestre; receita: number; baseIrpj: number }> } {
  const presServicos = equiparacao
    ? { irpj: PRESUMICAO.servicos_hospitalares.irpj }
    : { irpj: PRESUMICAO.servicos.irpj };
  const presMap: Record<keyof ReceitasTrimestre, number> = {
    produtos_mercadorias: PRESUMICAO.produtos_mercadorias.irpj,
    servicos: presServicos.irpj,
    servicos_favorecida: PRESUMICAO.servicos_favorecida.irpj,
    servicos_hospitalares: PRESUMICAO.servicos_hospitalares.irpj,
    demais_receitas: PRESUMICAO.demais_receitas.irpj,
  };
  const keys: (keyof ReceitasTrimestre)[] = [
    'produtos_mercadorias',
    'servicos',
    'servicos_favorecida',
    'servicos_hospitalares',
    'demais_receitas',
  ];
  let baseTotal = 0;
  const porAtividade: Array<{ chave: keyof ReceitasTrimestre; receita: number; baseIrpj: number }> = [];

  if (!usarAcrescimoIN2306) {
    for (const key of keys) {
      const val = r[key] ?? 0;
      const baseA = round2(val * presMap[key]);
      if (val > 0) {
        porAtividade.push({ chave: key, receita: round2(val), baseIrpj: baseA });
        baseTotal += baseA;
      }
    }
    return { baseTotal: round2(baseTotal), porAtividade };
  }

  const total = receitaBrutaTrimestre(r);
  const aplicarAcrescimoIrpj = ano >= 2026;
  if (total <= LIMITE_TRIMESTRAL || !aplicarAcrescimoIrpj) {
    for (const key of keys) {
      const val = r[key] ?? 0;
      const baseA = round2(val * presMap[key]);
      if (val > 0) {
        porAtividade.push({ chave: key, receita: round2(val), baseIrpj: baseA });
        baseTotal += baseA;
      }
    }
    return { baseTotal: round2(baseTotal), porAtividade };
  }

  for (const key of keys) {
    const val = r[key] ?? 0;
    if (val <= 0) continue;
    const prop = val / total;
    const limiteAtividade = LIMITE_TRIMESTRAL * prop;
    const excedenteAtividade = Math.max(0, val - limiteAtividade);
    const pres = presMap[key];
    const fatorIrpj = 1.1;
    const baseA = round2(limiteAtividade * pres + excedenteAtividade * pres * fatorIrpj);
    porAtividade.push({ chave: key, receita: round2(val), baseIrpj: baseA });
    baseTotal += baseA;
  }
  return { baseTotal: round2(baseTotal), porAtividade };
}

export interface RateioAdicionalAtividade {
  chave: keyof ReceitasTrimestre;
  label: string;
  receita: number;
  base_irpj: number;
  participacao_pct: number;
  adicional_proporcional: number;
}

export interface RateioAdicionalTrimestre {
  trimestre: number;
  base_total: number;
  adicional_total: number;
  atividades: RateioAdicionalAtividade[];
}

/**
 * Rateio proporcional do Adicional de IRPJ por tipo de receita.
 * Fórmula: Adicional_A = (Base_IRPJ_A / Base_IRPJ_Total) × Adicional_Total
 */
export function rateioAdicionalIrpjPorTrimestre(
  trimestres: ReceitasTrimestre[],
  equiparacao: boolean,
  usarBaseComAcrescimoIN2306: boolean,
  ano: number
): RateioAdicionalTrimestre[] {
  const results: RateioAdicionalTrimestre[] = [];
  for (let t = 0; t < 4; t++) {
    const r = trimestres[t] ?? {
      produtos_mercadorias: 0,
      servicos: 0,
      servicos_favorecida: 0,
      servicos_hospitalares: 0,
      demais_receitas: 0,
    };
    const { baseTotal, porAtividade } = basesIrpjPorAtividade(
      r,
      equiparacao,
      t + 1,
      ano,
      usarBaseComAcrescimoIN2306
    );
    const adicionalTotal = adicionalIRPJ(baseTotal);
    if (adicionalTotal <= 0 || baseTotal <= 0) continue;

    const atividades: RateioAdicionalAtividade[] = porAtividade.map(({ chave, receita, baseIrpj }) => {
      const participacao_pct = round2((baseIrpj / baseTotal) * 100);
      const adicional_proporcional = round2((baseIrpj / baseTotal) * adicionalTotal);
      return {
        chave,
        label: LABEL_ATIVIDADE[chave],
        receita,
        base_irpj: baseIrpj,
        participacao_pct,
        adicional_proporcional,
      };
    });
    results.push({
      trimestre: t + 1,
      base_total: baseTotal,
      adicional_total: adicionalTotal,
      atividades,
    });
  }
  return results;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TrimestreResult {
  trimestre: number;
  receita_bruta: number;
  receita_excedente_limite?: number;
  base_calculo_irpj: number;
  base_calculo_csll: number;
  irpj: number;
  irpj_adicional: number;
  csll: number;
  irpj_a_rec: number;
  csll_a_rec: number;
  pis_a_rec: number;
  cofins_a_rec: number;
}

/** Calcula um trimestre para cenário 2025 (sem acréscimo IN 2.306) */
export function calcularTrimestre2025(
  receitas: ReceitasTrimestre,
  deducoes: DeducoesTrimestre,
  retencoes: RetencoesTrimestre,
  equiparacao: boolean,
  numTrimestre: number
): TrimestreResult {
  const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(receitas, equiparacao);
  const irpj = round2(baseIrpj * ALIQ_IRPJ);
  const irpjAdic = adicionalIRPJ(baseIrpj);
  const csll = round2(baseCsll * ALIQ_CSLL);
  const receitaParaPisCofins = Math.max(0, receitaBrutaTrimestre(receitas) - (deducoes?.pis_cofins_zero ?? 0) - (deducoes?.icms_destacado ?? 0));
  const pis_a_rec = round2(receitaParaPisCofins * ALIQ_PIS);
  const cofins_a_rec = round2(receitaParaPisCofins * ALIQ_COFINS);
  const irrf = retencoes?.irrf ?? 0;
  const op = retencoes?.orgaos_publicos ?? 0;
  const irpj_a_rec = Math.max(0, irpj + irpjAdic - irrf - op);
  const csll_a_rec = Math.max(0, csll - (retencoes?.irrf ?? 0) * 0); // CSLL retida se houver
  return {
    trimestre: numTrimestre,
    receita_bruta: receitaBrutaTrimestre(receitas),
    base_calculo_irpj: baseIrpj,
    base_calculo_csll: baseCsll,
    irpj,
    irpj_adicional: irpjAdic,
    csll,
    irpj_a_rec,
    csll_a_rec,
    pis_a_rec,
    cofins_a_rec,
  };
}

export interface AjusteAnualMetadata {
  aplicado: boolean;
  compensacao_irpj: number;
  compensacao_csll: number;
  /** Valor compensado por trimestre (T1, T2, T3) — origem da compensação deduzida no T4 */
  compensacao_por_trimestre?: {
    irpj: [number, number, number];
    csll: [number, number, number];
  };
}

/** Calcula os 4 trimestres para 2026 COM acréscimo IN 2.306 e aplica ajuste anual (§ 5º) */
export function calcularAno2026(
  trimestres: ReceitasTrimestre[],
  deducoesTrimestrais: (DeducoesTrimestre | undefined)[],
  retencoesTrimestrais: (RetencoesTrimestre | undefined)[],
  equiparacao: boolean
): { resultados: TrimestreResult[]; ajusteAnual: AjusteAnualMetadata } {
  const resultados: TrimestreResult[] = [];
  let receitaAcumuladaAno = 0;
  const parcelasExcedentesTrimestres: number[] = [];

  for (let t = 0; t < 4; t++) {
    const r = trimestres[t] ?? {
      produtos_mercadorias: 0,
      servicos: 0,
      servicos_favorecida: 0,
      servicos_hospitalares: 0,
      demais_receitas: 0,
    };
    const { baseIrpj, baseCsll, receitaExcedente } = basesTrimestreComAcrescimo(r, equiparacao, t + 1, 2026);
    receitaAcumuladaAno += receitaBrutaTrimestre(r);
    parcelasExcedentesTrimestres.push(receitaExcedente);

    const irpj = round2(baseIrpj * ALIQ_IRPJ);
    const irpjAdic = adicionalIRPJ(baseIrpj);
    const csll = round2(baseCsll * ALIQ_CSLL);
    const ded = deducoesTrimestrais[t];
    const ret = retencoesTrimestrais[t];
    const receitaParaPisCofins = Math.max(0, receitaBrutaTrimestre(r) - (ded?.pis_cofins_zero ?? 0) - (ded?.icms_destacado ?? 0));
    const pis_a_rec = round2(receitaParaPisCofins * ALIQ_PIS);
    const cofins_a_rec = round2(receitaParaPisCofins * ALIQ_COFINS);
    const irrf = ret?.irrf ?? 0;
    const op = ret?.orgaos_publicos ?? 0;
    resultados.push({
      trimestre: t + 1,
      receita_bruta: receitaBrutaTrimestre(r),
      receita_excedente_limite: receitaExcedente > 0 ? receitaExcedente : undefined,
      base_calculo_irpj: baseIrpj,
      base_calculo_csll: baseCsll,
      irpj,
      irpj_adicional: irpjAdic,
      csll,
      irpj_a_rec: Math.max(0, irpj + irpjAdic - irrf - op),
      csll_a_rec: Math.max(0, csll),
      pis_a_rec,
      cofins_a_rec,
    });
  }

  // § 5º Ajuste no último trimestre
  const receitaAnual = receitaAcumuladaAno;
  const somaExcedentesAntesDoUltimo =
    parcelasExcedentesTrimestres[0] + parcelasExcedentesTrimestres[1] + parcelasExcedentesTrimestres[2];
  const excedenteAnualIrpj = Math.max(0, receitaAnual - LIMITE_ANUAL);
  const excedenteAnualCsll = Math.max(0, receitaAnual - LIMITE_ANUAL_CSLL_2026);
  const resultadoT4 = resultados[3]!;

  const valoresComAcrescimo = resultados.slice(0, 3).reduce(
    (acc, x) => ({
      irpj: acc.irpj + x.irpj + (x.irpj_adicional ?? 0),
      csll: acc.csll + x.csll,
    }),
    { irpj: 0, csll: 0 }
  );
  const valoresSemAcrescimoPorTrimestre: { irpj: number[]; csll: number[] } = {
    irpj: [0, 0, 0],
    csll: [0, 0, 0],
  };
  for (let i = 0; i < 3; i++) {
    const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(trimestres[i]!, equiparacao);
    valoresSemAcrescimoPorTrimestre.irpj[i] = round2(baseIrpj * ALIQ_IRPJ) + adicionalIRPJ(baseIrpj);
    valoresSemAcrescimoPorTrimestre.csll[i] = round2(baseCsll * ALIQ_CSLL);
  }
  const valoresSemAcrescimoT1T3 = {
    irpj: valoresSemAcrescimoPorTrimestre.irpj.reduce((a, b) => a + b, 0),
    csll: valoresSemAcrescimoPorTrimestre.csll.reduce((a, b) => a + b, 0),
  };

  let compensacaoIrpj = 0;
  let compensacaoCsll = 0;
  const compensacaoPorTrimestre: { irpj: [number, number, number]; csll: [number, number, number] } = {
    irpj: [0, 0, 0],
    csll: [0, 0, 0],
  };

  if (receitaAnual <= LIMITE_ANUAL) {
    // § 5º I IRPJ: receita anual ≤ 5M → não incide acréscimo; deduzir diferença do T4
    for (let i = 0; i < 3; i++) {
      const pago = resultados[i]!.irpj + (resultados[i]!.irpj_adicional ?? 0);
      compensacaoPorTrimestre.irpj[i] = round2(Math.max(0, pago - valoresSemAcrescimoPorTrimestre.irpj[i]));
    }
    compensacaoIrpj = round2(valoresComAcrescimo.irpj - valoresSemAcrescimoT1T3.irpj);
    resultadoT4.irpj_a_rec = Math.max(0, resultadoT4.irpj_a_rec - compensacaoIrpj);
  }
  if (receitaAnual <= LIMITE_ANUAL_CSLL_2026) {
    // § 5º I CSLL (Pergunta 13): receita anual ≤ 3,75M → não incide acréscimo
    for (let i = 0; i < 3; i++) {
      const pago = resultados[i]!.csll;
      compensacaoPorTrimestre.csll[i] = round2(Math.max(0, pago - valoresSemAcrescimoPorTrimestre.csll[i]));
    }
    compensacaoCsll = round2(valoresComAcrescimo.csll - valoresSemAcrescimoT1T3.csll);
    resultadoT4.csll_a_rec = Math.max(0, resultadoT4.csll_a_rec - compensacaoCsll);
  }

  if (receitaAnual > LIMITE_ANUAL && excedenteAnualIrpj < somaExcedentesAntesDoUltimo && somaExcedentesAntesDoUltimo > 0) {
    // § 5º II IRPJ: IN 2306 procedimento literal - razão × excedente anual → recálculo
    const valoresRecalculadosIrpjPorTrimestre: number[] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const excedI = parcelasExcedentesTrimestres[i] ?? 0;
      if (excedI <= 0) continue;
      const razao = excedI / somaExcedentesAntesDoUltimo;
      const novoExcedenteI = razao * excedenteAnualIrpj;
      const fatorEscala = excedI > 0 ? novoExcedenteI / excedI : 0;
      const { baseIrpj } = basesTrimestreComExcedenteEscalado(
        trimestres[i]!,
        equiparacao,
        i + 1,
        2026,
        fatorEscala
      );
      const recalc = round2(baseIrpj * ALIQ_IRPJ) + adicionalIRPJ(baseIrpj);
      valoresRecalculadosIrpjPorTrimestre[i] = recalc;
      const pago = resultados[i]!.irpj + (resultados[i]!.irpj_adicional ?? 0);
      compensacaoPorTrimestre.irpj[i] = round2(Math.max(0, pago - recalc));
    }
    compensacaoIrpj = round2(valoresComAcrescimo.irpj - valoresRecalculadosIrpjPorTrimestre.reduce((a, b) => a + b, 0));
    resultadoT4.irpj_a_rec = Math.max(0, resultadoT4.irpj_a_rec - compensacaoIrpj);
  }
  if (receitaAnual > LIMITE_ANUAL_CSLL_2026 && excedenteAnualCsll < somaExcedentesAntesDoUltimo && somaExcedentesAntesDoUltimo > 0) {
    // § 5º II CSLL: mesma lógica
    const valoresRecalculadosCsllPorTrimestre: number[] = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const excedI = parcelasExcedentesTrimestres[i] ?? 0;
      if (excedI <= 0) continue;
      const razao = excedI / somaExcedentesAntesDoUltimo;
      const novoExcedenteI = razao * excedenteAnualCsll;
      const fatorEscala = excedI > 0 ? novoExcedenteI / excedI : 0;
      const { baseCsll } = basesTrimestreComExcedenteEscalado(
        trimestres[i]!,
        equiparacao,
        i + 1,
        2026,
        fatorEscala
      );
      const recalc = round2(baseCsll * ALIQ_CSLL);
      valoresRecalculadosCsllPorTrimestre[i] = recalc;
      const pago = resultados[i]!.csll;
      compensacaoPorTrimestre.csll[i] = round2(Math.max(0, pago - recalc));
    }
    compensacaoCsll = round2(valoresComAcrescimo.csll - valoresRecalculadosCsllPorTrimestre.reduce((a, b) => a + b, 0));
    resultadoT4.csll_a_rec = Math.max(0, resultadoT4.csll_a_rec - compensacaoCsll);
  }

  const ajusteAnual: AjusteAnualMetadata = {
    aplicado: compensacaoIrpj > 0 || compensacaoCsll > 0,
    compensacao_irpj: compensacaoIrpj,
    compensacao_csll: compensacaoCsll,
    compensacao_por_trimestre: compensacaoPorTrimestre,
  };

  return { resultados, ajusteAnual };
}

/** Cenário 2025: 4 trimestres sem acréscimo IN 2.306 */
export function calcularCenario2025(
  trimestres: ReceitasTrimestre[],
  deducoesTrimestrais: (DeducoesTrimestre | undefined)[],
  retencoesTrimestrais: (RetencoesTrimestre | undefined)[],
  equiparacao: boolean
): TrimestreResult[] {
  const defaultDeducoes: DeducoesTrimestre = { pis_cofins_zero: 0, icms_destacado: 0 };
  const defaultRetencoes: RetencoesTrimestre = { irrf: 0, orgaos_publicos: 0 };
  return trimestres.map((r, i) =>
    calcularTrimestre2025(
      r,
      deducoesTrimestrais[i] ?? defaultDeducoes,
      retencoesTrimestrais[i] ?? defaultRetencoes,
      equiparacao,
      i + 1
    )
  );
}

/** Agrega resultados trimestrais em totais anuais */
export function agregarAnual(trimestres: TrimestreResult[]): {
  receita_bruta_total: number;
  irpj_total: number;
  irpj_adicional_total: number;
  csll_total: number;
  irpj_a_rec_total: number;
  csll_a_rec_total: number;
  pis_a_rec_total: number;
  cofins_a_rec_total: number;
} {
  return {
    receita_bruta_total: round2(trimestres.reduce((s, t) => s + t.receita_bruta, 0)),
    irpj_total: round2(trimestres.reduce((s, t) => s + t.irpj, 0)),
    irpj_adicional_total: round2(trimestres.reduce((s, t) => s + (t.irpj_adicional ?? 0), 0)),
    csll_total: round2(trimestres.reduce((s, t) => s + t.csll, 0)),
    irpj_a_rec_total: round2(trimestres.reduce((s, t) => s + t.irpj_a_rec, 0)),
    csll_a_rec_total: round2(trimestres.reduce((s, t) => s + t.csll_a_rec, 0)),
    pis_a_rec_total: round2(trimestres.reduce((s, t) => s + t.pis_a_rec, 0)),
    cofins_a_rec_total: round2(trimestres.reduce((s, t) => s + t.cofins_a_rec, 0)),
  };
}

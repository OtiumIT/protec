/**
 * Motor de Cálculo Tributário IN 2.306/2026 - Lucro Presumido
 * Regras: Art. 14 e 15 da IN RFB nº 2.306/2026, ajuste anual § 5º, equiparação hospitalar, adicional IRPJ 10%
 */

import type { ReceitasTrimestre, DeducoesTrimestre, RetencoesTrimestre } from '@shared/core';

const LIMITE_TRIMESTRAL = 1_250_000;
const LIMITE_ANUAL = 5_000_000;
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
 * Proporcional por atividade (§ 6º).
 */
function basesTrimestreComAcrescimo(
  r: ReceitasTrimestre,
  equiparacaoHospitalar: boolean
): { baseIrpj: number; baseCsll: number; receitaExcedente: number } {
  const total = receitaBrutaTrimestre(r);
  if (total <= LIMITE_TRIMESTRAL) {
    const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(r, equiparacaoHospitalar);
    return { baseIrpj, baseCsll, receitaExcedente: 0 };
  }
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
    baseIrpj += limiteAtividade * pres.irpj + excedenteAtividade * (pres.irpj * 1.1);
    baseCsll += limiteAtividade * pres.csll + excedenteAtividade * (pres.csll * 1.1);
  }
  return {
    baseIrpj: round2(baseIrpj),
    baseCsll: round2(baseCsll),
    receitaExcedente: round2(excedente),
  };
}

/** Adicional de IRPJ 10% sobre a parcela do lucro presumido que exceder R$ 60.000 no trimestre (Módulo C) */
function adicionalIRPJ(baseCalculoIrpjTrimestre: number): number {
  if (baseCalculoIrpjTrimestre <= LIMITE_LUCRO_PRESUMIDO_ADICIONAL) return 0;
  const baseAdicional = baseCalculoIrpjTrimestre - LIMITE_LUCRO_PRESUMIDO_ADICIONAL;
  return round2(baseAdicional * ALIQ_IRPJ_ADICIONAL);
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

/** Calcula os 4 trimestres para 2026 COM acréscimo IN 2.306 e aplica ajuste anual (§ 5º) */
export function calcularAno2026(
  trimestres: ReceitasTrimestre[],
  deducoesTrimestrais: (DeducoesTrimestre | undefined)[],
  retencoesTrimestrais: (RetencoesTrimestre | undefined)[],
  equiparacao: boolean
): TrimestreResult[] {
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
    const { baseIrpj, baseCsll, receitaExcedente } = basesTrimestreComAcrescimo(r, equiparacao);
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
  const excedenteAnual = Math.max(0, receitaAnual - LIMITE_ANUAL);
  const resultadoT4 = resultados[3]!;

  if (receitaAnual <= LIMITE_ANUAL) {
    // § 5º I: receita anual < 5M → não incide acréscimo no 4º tri; recalcular T1-T3 sem acréscimo e deduzir do T4
    const valoresComAcrescimo = resultados.slice(0, 3).reduce(
      (acc, x) => ({
        irpj: acc.irpj + x.irpj + (x.irpj_adicional ?? 0),
        csll: acc.csll + x.csll,
      }),
      { irpj: 0, csll: 0 }
    );
    const valoresSemAcrescimoT1T3 = [0, 1, 2].reduce(
      (acc, i) => {
        const { baseIrpj, baseCsll } = basesTrimestreSemAcrescimo(trimestres[i]!, equiparacao);
        return {
          irpj: acc.irpj + round2(baseIrpj * ALIQ_IRPJ) + adicionalIRPJ(baseIrpj),
          csll: acc.csll + round2(baseCsll * ALIQ_CSLL),
        };
      },
      { irpj: 0, csll: 0 }
    );
    const diferencaIrpj = round2(valoresComAcrescimo.irpj - valoresSemAcrescimoT1T3.irpj);
    const diferencaCsll = round2(valoresComAcrescimo.csll - valoresSemAcrescimoT1T3.csll);
    resultadoT4.irpj_a_rec = Math.max(0, resultadoT4.irpj_a_rec - diferencaIrpj);
    resultadoT4.csll_a_rec = Math.max(0, resultadoT4.csll_a_rec - diferencaCsll);
  } else if (excedenteAnual < somaExcedentesAntesDoUltimo) {
    // § 5º II: parcela excedente anual < soma dos excedentes T1-T3 → recálculo proporcional e dedução no T4
    const excedenteT4 = parcelasExcedentesTrimestres[3] ?? 0;
    if (excedenteT4 < somaExcedentesAntesDoUltimo) {
      const razao = somaExcedentesAntesDoUltimo > 0 ? excedenteAnual / somaExcedentesAntesDoUltimo : 0;
      const novoExcedenteT4 = round2(excedenteT4 * razao);
      // Simplificação: ajuste no valor a rec do T4 proporcional à base
      const fator = excedenteAnual > 0 && (parcelasExcedentesTrimestres[3] ?? 0) > 0
        ? Math.min(1, novoExcedenteT4 / (parcelasExcedentesTrimestres[3] ?? 1))
        : 0;
      const reducaoIrpj = round2(resultadoT4.irpj * (1 - fator) * 0.1 / 0.32);
      const reducaoCsll = round2(resultadoT4.csll * (1 - fator) * 0.1 / 0.32);
      resultadoT4.irpj_a_rec = Math.max(0, resultadoT4.irpj_a_rec - reducaoIrpj);
      resultadoT4.csll_a_rec = Math.max(0, resultadoT4.csll_a_rec - reducaoCsll);
    }
  }
  // § 5º III: excedente T4 limitado à diferença (já considerado no cálculo trimestral ao limitar por excedente)

  return resultados;
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

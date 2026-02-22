/**
 * Motor de Cálculo Tributário Imobiliário - PF vs PJ vs Reforma 2027
 *
 * Cenário A (PF): Tabela progressiva Carnê-Leão, deduções Lei 7.713/88
 * Cenário B (PJ): Lucro Presumido 32%, IN 2.306/2026
 * Cenário C (Reforma): IBS/CBS com créditos sobre custos operacionais
 */

export interface AggregatedMonth {
  mes: string;
  receita: number;
  despesas_dedutiveis: number;
  custos_operacionais: number;
}

export interface AggregatedYear {
  ano: number;
  receita_total: number;
  despesas_dedutiveis_total: number;
  custos_operacionais_total: number;
  meses: AggregatedMonth[];
}

/** Tabela progressiva mensal IR PF 2026 (Carnê-Leão) */
const FAIXAS_IRPF_2026 = [
  { limite: 2428.8, aliquota: 0, deducao: 0 },
  { limite: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { limite: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { limite: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { limite: Infinity, aliquota: 0.275, deducao: 908.73 },
];

/** Lucro Presumido - locação de imóveis */
const PRESUNCAO_IRPJ = 0.32;
const PRESUNCAO_CSLL = 0.32;
const PRESUNCAO_IRPJ_16 = 0.16; // Serviços receita acum. <= 120k/ano (Lei)
const LIMITE_PRESUNCAO_16_SERVICOS = 120_000;
const ALIQ_IRPJ = 0.15;
const ALIQ_IRPJ_ADICIONAL = 0.1;
const ALIQ_CSLL = 0.09;
const ALIQ_PIS = 0.0065;
const ALIQ_COFINS = 0.03;
const LIMITE_LUCRO_PRESUMIDO_ADICIONAL = 60000; // R$/trimestre
const LIMITE_TRIMESTRAL_IN2306 = 1_250_000;
const LIMITE_ANUAL_IN2306 = 5_000_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** IR mensal sobre base de cálculo (tabela progressiva) */
export function impostoIRPFMensal(baseCalculo: number): number {
  if (baseCalculo <= 0) return 0;
  for (const faixa of FAIXAS_IRPF_2026) {
    if (baseCalculo <= faixa.limite) {
      return round2(baseCalculo * faixa.aliquota - faixa.deducao);
    }
  }
  return round2(baseCalculo * 0.275 - 908.73);
}

/** Cenário PF: calcular impostos anuais sobre renda de locação */
export function calcularPF(
  aggregated: AggregatedYear,
  aliquotaEfetivaDirpf?: number
): {
  receita_bruta_total: number;
  despesas_dedutiveis_total: number;
  base_calculo_total: number;
  imposto_total: number;
  aliquota_efetiva_anual: number;
  trimestres: Array<{
    trimestre: number;
    receita: number;
    despesas_dedutiveis: number;
    base_calculo: number;
    imposto: number;
  }>;
} {
  const { receita_total, despesas_dedutiveis_total, meses } = aggregated;
  const baseTotal = Math.max(0, receita_total - despesas_dedutiveis_total);

  let impostoTotal = 0;
  const trimestres: Array<{
    trimestre: number;
    receita: number;
    despesas_dedutiveis: number;
    base_calculo: number;
    imposto: number;
  }> = [];

  for (let t = 1; t <= 4; t++) {
    const startMonth = (t - 1) * 3;
    let recTrim = 0;
    let despTrim = 0;
    let impTrim = 0;
    for (let m = 0; m < 3; m++) {
      const mes = meses[startMonth + m];
      if (mes) {
        recTrim += mes.receita;
        despTrim += mes.despesas_dedutiveis;
        const baseMes = Math.max(0, mes.receita - mes.despesas_dedutiveis);
        impTrim += impostoIRPFMensal(baseMes);
      }
    }
    impostoTotal += impTrim;
    trimestres.push({
      trimestre: t,
      receita: round2(recTrim),
      despesas_dedutiveis: round2(despTrim),
      base_calculo: round2(Math.max(0, recTrim - despTrim)),
      imposto: round2(impTrim),
    });
  }

  const aliquotaEfetiva =
    aliquotaEfetivaDirpf !== undefined && aliquotaEfetivaDirpf >= 0
      ? aliquotaEfetivaDirpf / 100
      : baseTotal > 0
        ? impostoTotal / baseTotal
        : 0;

  return {
    receita_bruta_total: round2(receita_total),
    despesas_dedutiveis_total: round2(despesas_dedutiveis_total),
    base_calculo_total: round2(baseTotal),
    imposto_total: round2(impostoTotal),
    aliquota_efetiva_anual: round2(aliquotaEfetiva * 100),
    trimestres,
  };
}

/** Adicional IRPJ 10% sobre lucro presumido > R$ 60k/trimestre */
function adicionalIRPJ(baseCalculoTrimestre: number): number {
  if (baseCalculoTrimestre <= LIMITE_LUCRO_PRESUMIDO_ADICIONAL) return 0;
  const baseAdicional = baseCalculoTrimestre - LIMITE_LUCRO_PRESUMIDO_ADICIONAL;
  return round2(baseAdicional * ALIQ_IRPJ_ADICIONAL);
}

/** Cenário PJ: Lucro Presumido com IN 2.306/2026
 * Regra 16% (Bruno Sacani): PJ prestadora de serviço em geral, receita anual até R$ 120k
 * pode usar 16%. Se receita acumulada até um trimestre > 120k, passa a 32% e recolhe
 * a diferença do imposto postergado nos trimestres anteriores.
 */
export function calcularPJ(
  aggregated: AggregatedYear,
  elegivelPresuncao16: boolean
): {
  receita_bruta_total: number;
  base_presumida_irpj: number;
  base_presumida_csll: number;
  irpj: number;
  irpj_adicional: number;
  irpj_postergado: number;
  csll: number;
  pis: number;
  cofins: number;
  imposto_total: number;
  aliquota_efetiva: number;
  aplicou_in_2306: boolean;
  trimestres: Array<{
    trimestre: number;
    receita: number;
    base_irpj: number;
    base_csll: number;
    presuncao_irpj_pct: number;
    irpj: number;
    irpj_adicional: number;
    irpj_postergado: number;
    csll: number;
    pis: number;
    cofins: number;
  }>;
} {
  const { receita_total, meses } = aggregated;
  const presCsll = PRESUNCAO_CSLL;

  let receitaAcumulada = 0;
  let aplicouIN2306 = false;
  let irpjPostergadoTotal = 0;
  const trimestreData: Array<{
    trimestre: number;
    receita: number;
    recTrim: number;
    presuncaoUsada: number;
  }> = [];

  for (let t = 1; t <= 4; t++) {
    const startMonth = (t - 1) * 3;
    let recTrim = 0;
    for (let m = 0; m < 3; m++) {
      const mes = meses[startMonth + m];
      if (mes) recTrim += mes.receita;
    }
    receitaAcumulada += recTrim;

    const usar16 =
      elegivelPresuncao16 && receitaAcumulada <= LIMITE_PRESUNCAO_16_SERVICOS;
    const presIrpj = usar16 ? PRESUNCAO_IRPJ_16 : PRESUNCAO_IRPJ;

    trimestreData.push({
      trimestre: t,
      receita: round2(recTrim),
      recTrim,
      presuncaoUsada: presIrpj,
    });
  }

  const trimestres: Array<{
    trimestre: number;
    receita: number;
    base_irpj: number;
    base_csll: number;
    presuncao_irpj_pct: number;
    irpj: number;
    irpj_adicional: number;
    irpj_postergado: number;
    csll: number;
    pis: number;
    cofins: number;
  }> = [];

  let receitaAcumAnterior = 0;
  let indicePrimeiroExcesso = -1;

  for (let i = 0; i < trimestreData.length; i++) {
    const { trimestre, receita, recTrim, presuncaoUsada } = trimestreData[i]!;
    receitaAcumAnterior += recTrim;

    const excedenteTrimestral = Math.max(0, recTrim - LIMITE_TRIMESTRAL_IN2306);
    const fatorAcrescimo =
      excedenteTrimestral > 0 || receitaAcumAnterior > LIMITE_ANUAL_IN2306 ? 1.1 : 1;
    if (fatorAcrescimo > 1) aplicouIN2306 = true;

    const baseNormal = Math.min(recTrim, LIMITE_TRIMESTRAL_IN2306);
    const baseExcedente = excedenteTrimestral;
    const baseIrpj =
      baseNormal * presuncaoUsada + baseExcedente * presuncaoUsada * fatorAcrescimo;
    const baseCsll =
      baseNormal * presCsll + baseExcedente * presCsll * fatorAcrescimo;

    let irpj = round2(baseIrpj * ALIQ_IRPJ);
    const irpjAdic = adicionalIRPJ(baseIrpj);
    let irpjPostergado = 0;

    if (
      elegivelPresuncao16 &&
      presuncaoUsada === PRESUNCAO_IRPJ &&
      indicePrimeiroExcesso < 0
    ) {
      indicePrimeiroExcesso = i;
      for (let q = 0; q < i; q++) {
        const qData = trimestreData[q]!;
        if (qData.presuncaoUsada === PRESUNCAO_IRPJ_16) {
          const base16 = qData.recTrim * PRESUNCAO_IRPJ_16;
          const base32 = qData.recTrim * PRESUNCAO_IRPJ;
          const difBase = base32 - base16;
          const difIrpj = round2(difBase * ALIQ_IRPJ);
          const difAdic =
            adicionalIRPJ(base32) - adicionalIRPJ(base16);
          irpjPostergado += round2(difIrpj + difAdic);
        }
      }
      irpjPostergadoTotal += irpjPostergado;
    }

    const csll = round2(baseCsll * ALIQ_CSLL);
    const pis = round2(recTrim * ALIQ_PIS);
    const cofins = round2(recTrim * ALIQ_COFINS);

    trimestres.push({
      trimestre,
      receita,
      base_irpj: round2(baseIrpj),
      base_csll: round2(baseCsll),
      presuncao_irpj_pct: presuncaoUsada * 100,
      irpj,
      irpj_adicional: irpjAdic,
      irpj_postergado: irpjPostergado,
      csll,
      pis,
      cofins,
    });
  }

  const impostoTotal = trimestres.reduce(
    (s, x) =>
      s + x.irpj + x.irpj_adicional + x.irpj_postergado + x.csll + x.pis + x.cofins,
    0
  );
  const aliquotaEfetiva =
    receita_total > 0 ? (impostoTotal / receita_total) * 100 : 0;

  return {
    receita_bruta_total: round2(receita_total),
    base_presumida_irpj: round2(
      trimestres.reduce((s, x) => s + x.base_irpj, 0)
    ),
    base_presumida_csll: round2(
      trimestres.reduce((s, x) => s + x.base_csll, 0)
    ),
    irpj: round2(trimestres.reduce((s, x) => s + x.irpj, 0)),
    irpj_adicional: round2(trimestres.reduce((s, x) => s + x.irpj_adicional, 0)),
    irpj_postergado: round2(irpjPostergadoTotal),
    csll: round2(trimestres.reduce((s, x) => s + x.csll, 0)),
    pis: round2(trimestres.reduce((s, x) => s + x.pis, 0)),
    cofins: round2(trimestres.reduce((s, x) => s + x.cofins, 0)),
    imposto_total: round2(impostoTotal),
    aliquota_efetiva: round2(aliquotaEfetiva),
    aplicou_in_2306: aplicouIN2306,
    trimestres,
  };
}

/**
 * Cenário Reforma 2027: IBS/CBS com créditos sobre custos operacionais.
 * Para locação de imóveis, o setor tem redutor de alíquota (ex.: 70% → paga 30% da alíquota nominal).
 * Com redutor 70% e nominal 28%, alíquota efetiva IBS/CBS ≈ 8,4%; somando IRPJ+CSLL, carga holding ≈ 16–18%.
 */
export function calcularReforma2027(
  aggregated: AggregatedYear,
  aliquotaIbsCbs: number = 26.5,
  redutorLocacaoPct?: number
): {
  receita_bruta_total: number;
  custos_operacionais_total: number;
  creditos_ibs_cbs: number;
  ibs_cbs_sobre_receita: number;
  ibs_cbs_liquido: number;
  imposto_total: number;
  aliquota_efetiva: number;
  /** Alíquota nominal (antes do redutor), para exibição */
  aliquota_nominal_ibs_cbs: number;
  /** Redutor aplicado (0 = nenhum), para exibição */
  redutor_locacao_aplicado_pct: number;
} {
  const {
    receita_total,
    custos_operacionais_total,
  } = aggregated;

  /** Redutor padrão 70% para locação de imóveis (setor); regra de negócio fica no backend. */
  const redutor = redutorLocacaoPct ?? 70;
  const aliquotaEfetivaRate = (aliquotaIbsCbs / 100) * (1 - redutor / 100);

  const ibsCbsReceita = round2(receita_total * aliquotaEfetivaRate);
  const creditosIbsCbs = round2(
    custos_operacionais_total * aliquotaEfetivaRate
  );
  const ibsCbsLiquido = Math.max(0, round2(ibsCbsReceita - creditosIbsCbs));

  const aliquotaEfetiva =
    receita_total > 0 ? (ibsCbsLiquido / receita_total) * 100 : 0;

  return {
    receita_bruta_total: round2(receita_total),
    custos_operacionais_total: round2(custos_operacionais_total),
    creditos_ibs_cbs: creditosIbsCbs,
    ibs_cbs_sobre_receita: ibsCbsReceita,
    ibs_cbs_liquido: ibsCbsLiquido,
    imposto_total: round2(ibsCbsLiquido),
    aliquota_efetiva: round2(aliquotaEfetiva),
    aliquota_nominal_ibs_cbs: round2(aliquotaIbsCbs),
    redutor_locacao_aplicado_pct: redutor,
  };
}

/** Break-even: valor mensal aproximado onde PJ vence PF (carga PJ < carga PF) */
export function calcularBreakEven(
  cargaPFPercentual: number,
  cargaPJPercentual: number
): number | null {
  if (cargaPJPercentual >= cargaPFPercentual) return null;
  // Break-even é conceitual: geralmente entre R$ 10k e R$ 15k/mês
  // Retornamos um valor aproximado para exibição
  const diferenca = cargaPFPercentual - cargaPJPercentual;
  if (diferenca <= 0) return null;
  return round2(12000); // Valor típico para exibição
}

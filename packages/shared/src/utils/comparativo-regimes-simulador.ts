/**
 * Motor de cálculo: Comparativo de Regimes Tributários (Serviços)
 *
 * Compara Lucro Presumido, Lucro Real e Simples Nacional para prestadores de serviços.
 */

import type { ComparativoRegimesInput, ComparativoRegimesResult, ImpostoDetalhado } from '../schemas/comparativo-regimes.schema.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Simples Nacional ───────────────────────────────────────────────

interface FaixaSimples {
  limiteInferior: number;
  limiteSuperior: number;
  aliquotaNominal: number;
  parcelaDeduzir: number;
}

const ANEXO_III: FaixaSimples[] = [
  { limiteInferior: 0,          limiteSuperior: 180_000,     aliquotaNominal: 6.0,  parcelaDeduzir: 0 },
  { limiteInferior: 180_000,    limiteSuperior: 360_000,     aliquotaNominal: 11.2, parcelaDeduzir: 9_360 },
  { limiteInferior: 360_000,    limiteSuperior: 720_000,     aliquotaNominal: 13.5, parcelaDeduzir: 17_640 },
  { limiteInferior: 720_000,    limiteSuperior: 1_800_000,   aliquotaNominal: 16.0, parcelaDeduzir: 35_640 },
  { limiteInferior: 1_800_000,  limiteSuperior: 3_600_000,   aliquotaNominal: 21.0, parcelaDeduzir: 125_640 },
  { limiteInferior: 3_600_000,  limiteSuperior: 4_800_000,   aliquotaNominal: 33.0, parcelaDeduzir: 648_000 },
];

const ANEXO_V: FaixaSimples[] = [
  { limiteInferior: 0,          limiteSuperior: 180_000,     aliquotaNominal: 15.5, parcelaDeduzir: 0 },
  { limiteInferior: 180_000,    limiteSuperior: 360_000,     aliquotaNominal: 18.0, parcelaDeduzir: 4_500 },
  { limiteInferior: 360_000,    limiteSuperior: 720_000,     aliquotaNominal: 19.5, parcelaDeduzir: 9_900 },
  { limiteInferior: 720_000,    limiteSuperior: 1_800_000,   aliquotaNominal: 20.5, parcelaDeduzir: 17_100 },
  { limiteInferior: 1_800_000,  limiteSuperior: 3_600_000,   aliquotaNominal: 23.0, parcelaDeduzir: 62_100 },
  { limiteInferior: 3_600_000,  limiteSuperior: 4_800_000,   aliquotaNominal: 30.5, parcelaDeduzir: 540_000 },
];

const LIMITE_SIMPLES_ANUAL = 4_800_000;

function obterFaixa(rbt12: number, tabela: FaixaSimples[]): FaixaSimples {
  for (const faixa of tabela) {
    if (rbt12 <= faixa.limiteSuperior) return faixa;
  }
  return tabela[tabela.length - 1]!;
}

function calcularAliquotaEfetivaSN(rbt12: number, tabela: FaixaSimples[]): number {
  if (rbt12 <= 0) return 0;
  const faixa = obterFaixa(rbt12, tabela);
  return round2(((rbt12 * (faixa.aliquotaNominal / 100) - faixa.parcelaDeduzir) / rbt12) * 100);
}

// ─── Lucro Presumido ────────────────────────────────────────────────

const LIMITE_PRESUNCAO_16 = 120_000;
const PRESUNCAO_32 = 0.32;
const PRESUNCAO_16 = 0.16;
const ALIQ_IRPJ = 0.15;
const ALIQ_IRPJ_ADICIONAL = 0.10;
const LIMITE_ADICIONAL_IRPJ_TRIMESTRAL = 60_000;
const ALIQ_CSLL = 0.09;
const ALIQ_PIS_CUMULATIVO = 0.0065;
const ALIQ_COFINS_CUMULATIVO = 0.03;

function calcularLucroPresumido(
  faturamentoAnual: number,
  issAliquota: number,
): { impostos: ImpostoDetalhado[]; cargaTotal: number; aliquotaEfetiva: number } {
  const presuncao = faturamentoAnual <= LIMITE_PRESUNCAO_16 ? PRESUNCAO_16 : PRESUNCAO_32;
  const basePresumida = round2(faturamentoAnual * presuncao);

  const irpjBase = round2(basePresumida * ALIQ_IRPJ);
  const excedenteAdicional = Math.max(0, basePresumida - LIMITE_ADICIONAL_IRPJ_TRIMESTRAL * 4);
  const irpjAdicional = round2(excedenteAdicional * ALIQ_IRPJ_ADICIONAL);
  const irpjTotal = round2(irpjBase + irpjAdicional);

  const csllBase = round2(faturamentoAnual * PRESUNCAO_32);
  const csll = round2(csllBase * ALIQ_CSLL);

  const pis = round2(faturamentoAnual * ALIQ_PIS_CUMULATIVO);
  const cofins = round2(faturamentoAnual * ALIQ_COFINS_CUMULATIVO);
  const iss = round2(faturamentoAnual * (issAliquota / 100));

  const impostos: ImpostoDetalhado[] = [
    { nome: 'IRPJ', valor: irpjBase, aliquota: ALIQ_IRPJ * 100, base_calculo: basePresumida },
    { nome: 'IRPJ Adicional', valor: irpjAdicional, aliquota: ALIQ_IRPJ_ADICIONAL * 100, base_calculo: excedenteAdicional },
    { nome: 'CSLL', valor: csll, aliquota: ALIQ_CSLL * 100, base_calculo: csllBase },
    { nome: 'PIS', valor: pis, aliquota: ALIQ_PIS_CUMULATIVO * 100, base_calculo: faturamentoAnual },
    { nome: 'COFINS', valor: cofins, aliquota: ALIQ_COFINS_CUMULATIVO * 100, base_calculo: faturamentoAnual },
    { nome: 'ISS', valor: iss, aliquota: issAliquota, base_calculo: faturamentoAnual },
  ];

  const cargaTotal = round2(irpjTotal + csll + pis + cofins + iss);
  const aliquotaEfetiva = faturamentoAnual > 0 ? round2((cargaTotal / faturamentoAnual) * 100) : 0;

  return { impostos, cargaTotal, aliquotaEfetiva };
}

// ─── Lucro Real ─────────────────────────────────────────────────────

const ALIQ_PIS_NAO_CUMULATIVO = 0.0165;
const ALIQ_COFINS_NAO_CUMULATIVO = 0.076;
const FATOR_CREDITO_INSUMOS = 0.30;
const LIMITE_ADICIONAL_IRPJ_ANUAL = 240_000;

function calcularLucroReal(
  faturamentoAnual: number,
  custosDedutiveis: number,
  folhaAnual: number,
  issAliquota: number,
): { impostos: ImpostoDetalhado[]; cargaTotal: number; aliquotaEfetiva: number } {
  const despesasTotais = round2(custosDedutiveis + folhaAnual);
  const lucroLiquido = Math.max(0, round2(faturamentoAnual - despesasTotais));

  const irpjBase = round2(lucroLiquido * ALIQ_IRPJ);
  const excedenteAdicional = Math.max(0, lucroLiquido - LIMITE_ADICIONAL_IRPJ_ANUAL);
  const irpjAdicional = round2(excedenteAdicional * ALIQ_IRPJ_ADICIONAL);
  const irpjTotal = round2(irpjBase + irpjAdicional);

  const csll = round2(lucroLiquido * ALIQ_CSLL);

  const pisBruto = round2(faturamentoAnual * ALIQ_PIS_NAO_CUMULATIVO);
  const creditosPis = round2(custosDedutiveis * FATOR_CREDITO_INSUMOS * ALIQ_PIS_NAO_CUMULATIVO);
  const pis = round2(Math.max(0, pisBruto - creditosPis));

  const cofinsBruto = round2(faturamentoAnual * ALIQ_COFINS_NAO_CUMULATIVO);
  const creditosCofins = round2(custosDedutiveis * FATOR_CREDITO_INSUMOS * ALIQ_COFINS_NAO_CUMULATIVO);
  const cofins = round2(Math.max(0, cofinsBruto - creditosCofins));

  const iss = round2(faturamentoAnual * (issAliquota / 100));

  const impostos: ImpostoDetalhado[] = [
    { nome: 'IRPJ', valor: irpjBase, aliquota: ALIQ_IRPJ * 100, base_calculo: lucroLiquido },
    { nome: 'IRPJ Adicional', valor: irpjAdicional, aliquota: ALIQ_IRPJ_ADICIONAL * 100, base_calculo: excedenteAdicional },
    { nome: 'CSLL', valor: csll, aliquota: ALIQ_CSLL * 100, base_calculo: lucroLiquido },
    { nome: 'PIS (não-cumulativo)', valor: pis, aliquota: ALIQ_PIS_NAO_CUMULATIVO * 100, base_calculo: faturamentoAnual },
    { nome: 'COFINS (não-cumulativo)', valor: cofins, aliquota: ALIQ_COFINS_NAO_CUMULATIVO * 100, base_calculo: faturamentoAnual },
    { nome: 'ISS', valor: iss, aliquota: issAliquota, base_calculo: faturamentoAnual },
  ];

  const cargaTotal = round2(irpjTotal + csll + pis + cofins + iss);
  const aliquotaEfetiva = faturamentoAnual > 0 ? round2((cargaTotal / faturamentoAnual) * 100) : 0;

  return { impostos, cargaTotal, aliquotaEfetiva };
}

// ─── Simples Nacional (Serviços) ────────────────────────────────────

function calcularSimplesNacional(
  faturamentoAnual: number,
  folhaAnual: number,
): {
  impostos: ImpostoDetalhado[];
  cargaTotal: number;
  aliquotaEfetiva: number;
  fatorR: number;
  anexo: string;
  excedeLimite: boolean;
} {
  const excedeLimite = faturamentoAnual > LIMITE_SIMPLES_ANUAL;

  if (faturamentoAnual <= 0) {
    return {
      impostos: [{ nome: 'Simples Nacional', valor: 0, aliquota: 0 }],
      cargaTotal: 0,
      aliquotaEfetiva: 0,
      fatorR: 0,
      anexo: 'N/A',
      excedeLimite,
    };
  }

  const fatorR = round2((folhaAnual / faturamentoAnual) * 100);
  const usarAnexoIII = fatorR >= 28;
  const tabela = usarAnexoIII ? ANEXO_III : ANEXO_V;
  const nomeAnexo = usarAnexoIII ? 'Anexo III' : 'Anexo V';

  const rbt12 = Math.min(faturamentoAnual, LIMITE_SIMPLES_ANUAL);
  const aliquotaEfetiva = calcularAliquotaEfetivaSN(rbt12, tabela);

  const faixa = obterFaixa(rbt12, tabela);
  const cargaTotal = round2(rbt12 * (aliquotaEfetiva / 100));

  const impostos: ImpostoDetalhado[] = [
    {
      nome: `Simples Nacional (${nomeAnexo})`,
      valor: cargaTotal,
      aliquota: aliquotaEfetiva,
      base_calculo: rbt12,
    },
  ];

  if (excedeLimite) {
    const excedente = faturamentoAnual - LIMITE_SIMPLES_ANUAL;
    impostos.push({
      nome: 'Excedente acima do limite (tributação normal)',
      valor: round2(excedente * (aliquotaEfetiva / 100)),
      aliquota: aliquotaEfetiva,
      base_calculo: excedente,
    });
  }

  return {
    impostos,
    cargaTotal: excedeLimite
      ? round2(faturamentoAnual * (aliquotaEfetiva / 100))
      : cargaTotal,
    aliquotaEfetiva,
    fatorR,
    anexo: `${nomeAnexo} - Faixa ${tabela.indexOf(faixa) + 1}`,
    excedeLimite,
  };
}

// ─── Simulação Comparativa ──────────────────────────────────────────

export function simularComparativoRegimes(input: ComparativoRegimesInput): ComparativoRegimesResult {
  const faturamentoAnual = round2(input.faturamento_mensal.reduce((s, v) => s + v, 0));
  const folhaAnual = round2(input.folha_mensal.reduce((s, v) => s + v, 0));
  const custosAnuais = round2(input.custos_dedutiveis_mensal * 12);

  const lp = calcularLucroPresumido(faturamentoAnual, input.iss_aliquota);
  const lr = calcularLucroReal(faturamentoAnual, custosAnuais, folhaAnual, input.iss_aliquota);
  const sn = calcularSimplesNacional(faturamentoAnual, folhaAnual);

  const regimes = [
    { key: 'lucro_presumido', carga: lp.cargaTotal },
    { key: 'lucro_real', carga: lr.cargaTotal },
    { key: 'simples_nacional', carga: sn.excedeLimite ? Infinity : sn.cargaTotal },
  ];
  const maisEconomico = regimes.reduce((min, r) => (r.carga < min.carga ? r : min), regimes[0]!);

  let economiaVsAtual: number | undefined;
  if (input.regime_atual) {
    const cargaAtual =
      input.regime_atual === 'lucro_presumido' ? lp.cargaTotal :
      input.regime_atual === 'lucro_real' ? lr.cargaTotal :
      sn.cargaTotal;
    economiaVsAtual = round2(cargaAtual - maisEconomico.carga);
  }

  return {
    lucro_presumido: {
      impostos_detalhados: lp.impostos,
      carga_total_anual: lp.cargaTotal,
      aliquota_efetiva: lp.aliquotaEfetiva,
      regime: 'Lucro Presumido',
    },
    lucro_real: {
      impostos_detalhados: lr.impostos,
      carga_total_anual: lr.cargaTotal,
      aliquota_efetiva: lr.aliquotaEfetiva,
      regime: 'Lucro Real',
    },
    simples_nacional: {
      impostos_detalhados: sn.impostos,
      carga_total_anual: sn.cargaTotal,
      aliquota_efetiva: sn.aliquotaEfetiva,
      regime: 'Simples Nacional',
      fator_r: sn.fatorR,
      anexo: sn.anexo,
      excede_limite: sn.excedeLimite,
    },
    regime_mais_economico: maisEconomico.key,
    economia_vs_atual: economiaVsAtual,
    faturamento_anual: faturamentoAnual,
  };
}

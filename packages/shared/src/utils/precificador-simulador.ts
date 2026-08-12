import type { PrecificadorInput, PrecificadorResult, PrecificadorRegimeResult, PrecificadorImpostoDetalhado } from '../schemas/precificador.schema.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function calcMargemFixa(input: PrecificadorInput): number {
  if (input.margem_tipo === 'fixo') return input.margem_desejada;
  return round2(input.custo_servico * (input.margem_desejada / 100));
}

// ---------------------------------------------------------------------------
// Simples Nacional - Fator R e tabelas Anexo III / Anexo V
// ---------------------------------------------------------------------------

interface SimpleFaixa {
  limite: number;
  aliqNominal: number;
  parcelaDeduzir: number;
}

const ANEXO_III: SimpleFaixa[] = [
  { limite: 180_000, aliqNominal: 0.06, parcelaDeduzir: 0 },
  { limite: 360_000, aliqNominal: 0.112, parcelaDeduzir: 9_360 },
  { limite: 720_000, aliqNominal: 0.135, parcelaDeduzir: 17_640 },
  { limite: 1_800_000, aliqNominal: 0.16, parcelaDeduzir: 35_640 },
  { limite: 3_600_000, aliqNominal: 0.21, parcelaDeduzir: 125_640 },
  { limite: 4_800_000, aliqNominal: 0.33, parcelaDeduzir: 648_000 },
];

const ANEXO_V: SimpleFaixa[] = [
  { limite: 180_000, aliqNominal: 0.155, parcelaDeduzir: 0 },
  { limite: 360_000, aliqNominal: 0.18, parcelaDeduzir: 4_500 },
  { limite: 720_000, aliqNominal: 0.195, parcelaDeduzir: 9_900 },
  { limite: 1_800_000, aliqNominal: 0.205, parcelaDeduzir: 17_100 },
  { limite: 3_600_000, aliqNominal: 0.23, parcelaDeduzir: 62_100 },
  { limite: 4_800_000, aliqNominal: 0.305, parcelaDeduzir: 540_000 },
];

function aliquotaEfetivaSN(rbt12: number, fatorR: number): number {
  if (rbt12 <= 0) return 0;
  if (rbt12 > 4_800_000) return 0.33;

  const tabela = fatorR >= 0.28 ? ANEXO_III : ANEXO_V;
  const faixa = tabela.find((f) => rbt12 <= f.limite) ?? tabela[tabela.length - 1];
  const aliqEfetiva = ((rbt12 * faixa.aliqNominal) - faixa.parcelaDeduzir) / rbt12;
  return Math.max(0, round4(aliqEfetiva));
}

// ---------------------------------------------------------------------------
// Lucro Presumido - alíquota efetiva (serviços)
// ---------------------------------------------------------------------------

function calcLucroPresumido(issAliquota: number): {
  aliquotaEfetiva: number;
  detalhes: { nome: string; aliq: number }[];
} {
  const presuncaoIRPJ = 0.32;
  const presuncaoCSLL = 0.32;

  const irpjBase = 0.15 * presuncaoIRPJ;
  const irpjAdicional = 0.10 * presuncaoIRPJ * 0.3;
  const irpjEfetivo = irpjBase + irpjAdicional;
  const csllEfetivo = 0.09 * presuncaoCSLL;
  const pis = 0.0065;
  const cofins = 0.03;
  const iss = issAliquota / 100;

  const aliquotaEfetiva = round4(irpjEfetivo + csllEfetivo + pis + cofins + iss);

  return {
    aliquotaEfetiva,
    detalhes: [
      { nome: 'ISS', aliq: iss },
      { nome: 'PIS', aliq: pis },
      { nome: 'COFINS', aliq: cofins },
      { nome: 'IRPJ', aliq: round4(irpjEfetivo) },
      { nome: 'CSLL', aliq: round4(csllEfetivo) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Lucro Real - alíquota efetiva estimada (serviços)
// ---------------------------------------------------------------------------

function calcLucroReal(
  issAliquota: number,
  custoServico: number,
  margemFixaRS: number,
): {
  aliquotaEfetiva: number;
  detalhes: { nome: string; aliq: number }[];
} {
  const pis = 0.0165;
  const cofins = 0.076;
  const iss = issAliquota / 100;

  const creditoEstimado = 0.30;
  const pisEfetivo = round4(pis * (1 - creditoEstimado));
  const cofinsEfetivo = round4(cofins * (1 - creditoEstimado));

  const precoEstimado = custoServico + margemFixaRS;
  const lucroEstimado = precoEstimado > 0 ? margemFixaRS / precoEstimado : 0.15;
  const irpjSobreLucro = 0.25 * lucroEstimado;
  const csllSobreLucro = 0.09 * lucroEstimado;

  const aliquotaEfetiva = round4(pisEfetivo + cofinsEfetivo + iss + irpjSobreLucro + csllSobreLucro);

  return {
    aliquotaEfetiva,
    detalhes: [
      { nome: 'ISS', aliq: iss },
      { nome: 'PIS', aliq: pisEfetivo },
      { nome: 'COFINS', aliq: cofinsEfetivo },
      { nome: 'IRPJ', aliq: round4(irpjSobreLucro) },
      { nome: 'CSLL', aliq: round4(csllSobreLucro) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Reforma IBS/CBS - alíquota de referência com redutor para serviços
// ---------------------------------------------------------------------------

function calcReformaIbsCbs(): {
  aliquotaEfetiva: number;
  detalhes: { nome: string; aliq: number }[];
} {
  const aliquotaReferencia = 0.265;
  const redutorServicos = 0.30;
  const aliquotaEfetiva = round4(aliquotaReferencia * (1 - redutorServicos));

  return {
    aliquotaEfetiva,
    detalhes: [
      { nome: 'IBS/CBS', aliq: aliquotaEfetiva },
    ],
  };
}

// ---------------------------------------------------------------------------
// Calcula resultado por regime
// ---------------------------------------------------------------------------

function buildRegimeResult(
  regimeNome: string,
  custo: number,
  margemFixaRS: number,
  aliquotaEfetiva: number,
  detalhes: { nome: string; aliq: number }[],
): PrecificadorRegimeResult {
  const precoSugerido = aliquotaEfetiva >= 1
    ? round2(custo + margemFixaRS)
    : round2((custo + margemFixaRS) / (1 - aliquotaEfetiva));

  const impostos: PrecificadorImpostoDetalhado[] = detalhes.map((d) => ({
    nome: d.nome,
    valor: round2(precoSugerido * d.aliq),
    aliquota: round4(d.aliq * 100),
  }));

  const totalImpostos = round2(impostos.reduce((s, i) => s + i.valor, 0));
  const margemLiquida = round2(precoSugerido - custo - totalImpostos);
  const margemLiquidaPct = precoSugerido > 0 ? round4((margemLiquida / precoSugerido) * 100) : 0;

  return {
    regime: regimeNome,
    preco_sugerido: precoSugerido,
    impostos_detalhados: impostos,
    total_impostos: totalImpostos,
    aliquota_efetiva_sobre_receita: round4(aliquotaEfetiva * 100),
    margem_liquida_resultante: margemLiquida,
    margem_liquida_percentual: margemLiquidaPct,
  };
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export function simularPrecificador(input: PrecificadorInput): PrecificadorResult {
  const margemFixaRS = calcMargemFixa(input);

  const lp = calcLucroPresumido(input.iss_aliquota);
  const lpResult = buildRegimeResult(
    'Lucro Presumido', input.custo_servico, margemFixaRS,
    lp.aliquotaEfetiva, lp.detalhes,
  );

  const lr = calcLucroReal(input.iss_aliquota, input.custo_servico, margemFixaRS);
  const lrResult = buildRegimeResult(
    'Lucro Real', input.custo_servico, margemFixaRS,
    lr.aliquotaEfetiva, lr.detalhes,
  );

  const rbt12 = input.faturamento_mensal_estimado * 12;
  const fatorR = rbt12 > 0 ? (input.folha_mensal * 12) / rbt12 : 0;
  const aliqSN = aliquotaEfetivaSN(rbt12, fatorR);
  const snDetalhes = [{ nome: 'DAS (Simples)', aliq: aliqSN }];
  const snResult = buildRegimeResult(
    'Simples Nacional', input.custo_servico, margemFixaRS,
    aliqSN, snDetalhes,
  );

  const reforma = calcReformaIbsCbs();
  const reformaResult = buildRegimeResult(
    'Reforma IBS/CBS', input.custo_servico, margemFixaRS,
    reforma.aliquotaEfetiva, reforma.detalhes,
  );

  const regimes = [lpResult, lrResult, snResult, reformaResult];
  const melhor = regimes.reduce((best, r) =>
    r.margem_liquida_percentual > best.margem_liquida_percentual ? r : best,
  );

  return {
    lucro_presumido: lpResult,
    lucro_real: lrResult,
    simples_nacional: snResult,
    reforma_ibs_cbs: reformaResult,
    melhor_regime: melhor.regime,
    input_resumo: input,
  };
}

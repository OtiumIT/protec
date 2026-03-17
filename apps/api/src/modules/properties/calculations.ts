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
/** Presunção 16% para locação de imóveis com receita até R$ 120k/ano (Lei 9.249/95, Art. 15, § 7º - IN RFB 1700/2017, art. 33, § 7º) */
const PRESUNCAO_IRPJ_16 = 0.16;
const LIMITE_PRESUNCAO_16_LOCACAO = 120_000;

/** Limites para PF ser contribuinte de IBS/CBS (LC 214/2025) */
const LIMITE_RECEITA_IBS_CBS_PF = 240_000;
const LIMITE_RECEITA_ABSOLUTO_IBS_CBS_PF = 288_000; // 20% acima de 240k
const LIMITE_IMOVEIS_IBS_CBS_PF = 3;
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

/**
 * Verifica se a Pessoa Física é contribuinte de IBS/CBS na locação de imóveis (LC 214/2025).
 * Critérios:
 * - Mais de 3 imóveis E receita > R$ 240.000/ano = contribuinte
 * - OU receita > R$ 288.000/ano (20% acima de 240k) = contribuinte independente do número de imóveis
 * - Caso contrário = não contribuinte (apenas IR Carnê-Leão)
 */
export function verificarContribuinteIbsCbsPF(
  quantidadeImoveis: number,
  receitaAnual: number
): { contribuinte: boolean; motivo: string } {
  if (receitaAnual > LIMITE_RECEITA_ABSOLUTO_IBS_CBS_PF) {
    return {
      contribuinte: true,
      motivo: `Receita anual > R$ 288.000 (${((receitaAnual / LIMITE_RECEITA_IBS_CBS_PF - 1) * 100).toFixed(0)}% acima de R$ 240k)`,
    };
  }
  if (quantidadeImoveis > LIMITE_IMOVEIS_IBS_CBS_PF && receitaAnual > LIMITE_RECEITA_IBS_CBS_PF) {
    return {
      contribuinte: true,
      motivo: `Mais de ${LIMITE_IMOVEIS_IBS_CBS_PF} imóveis (${quantidadeImoveis}) e receita > R$ 240.000`,
    };
  }
  return {
    contribuinte: false,
    motivo: quantidadeImoveis <= LIMITE_IMOVEIS_IBS_CBS_PF
      ? `Até ${LIMITE_IMOVEIS_IBS_CBS_PF} imóveis e receita ≤ R$ 288.000`
      : `Receita ≤ R$ 240.000`,
  };
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
 * Regra 16% para locação de imóveis (Lei 9.249/95, Art. 15, § 7º - IN RFB 1700/2017, art. 33, § 7º):
 * Quando a receita anual de locação for até R$ 120.000, a presunção de IRPJ é 16% (não 32%).
 * Se receita acumulada até um trimestre > 120k, passa a 32% e recolhe
 * a diferença do imposto postergado nos trimestres anteriores (§ 8º).
 * 
 * @param aggregated - Dados agregados do ano
 * @param _elegivelPresuncao16 - DEPRECATED: agora é calculado automaticamente baseado na receita
 */
export function calcularPJ(
  aggregated: AggregatedYear,
  _elegivelPresuncao16?: boolean
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
  /** Indica se aplicou presunção 16% para locação (receita até R$ 120k) */
  aplicou_presuncao_16: boolean;
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

  let receitaAcumulada = 0;
  let aplicouIN2306 = false;
  let irpjPostergadoTotal = 0;
  let aplicouPresuncao16 = false;
  /** Se receita anual já conhecida > R$ 120k, usar 32% em todos os trimestres (Lei 9.249/95, Art. 15, § 7º) */
  const usar32PorCentoEmTodos =
    receita_total > LIMITE_PRESUNCAO_16_LOCACAO;

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

    // Presunção: 32% se receita anual > 120k; senão 16% até acumulado ≤ 120k (Lei 9.249/95, Art. 15, § 7º)
    let presIrpj: number;
    if (usar32PorCentoEmTodos) {
      presIrpj = PRESUNCAO_IRPJ;
    } else if (receitaAcumulada <= LIMITE_PRESUNCAO_16_LOCACAO) {
      presIrpj = PRESUNCAO_IRPJ_16;
      aplicouPresuncao16 = true;
    } else {
      presIrpj = PRESUNCAO_IRPJ;
    }

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
      baseNormal * PRESUNCAO_CSLL + baseExcedente * PRESUNCAO_CSLL * fatorAcrescimo;

    const irpj = round2(baseIrpj * ALIQ_IRPJ);
    const irpjAdic = adicionalIRPJ(baseIrpj);
    let irpjPostergado = 0;

    // § 8º Lei 9.249/95: se ultrapassou 120k e usava 16% antes, recolhe diferença
    if (presuncaoUsada === PRESUNCAO_IRPJ && indicePrimeiroExcesso < 0) {
      indicePrimeiroExcesso = i;
      for (let q = 0; q < i; q++) {
        const qData = trimestreData[q]!;
        if (qData.presuncaoUsada === PRESUNCAO_IRPJ_16) {
          const base16 = qData.recTrim * PRESUNCAO_IRPJ_16;
          const base32 = qData.recTrim * PRESUNCAO_IRPJ;
          const difBase = base32 - base16;
          const difIrpj = round2(difBase * ALIQ_IRPJ);
          const difAdic = adicionalIRPJ(base32) - adicionalIRPJ(base16);
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
    aplicou_presuncao_16: aplicouPresuncao16,
    trimestres,
  };
}

/** Alíquota IBS fixa em 2027/2028 – Transição Reforma (LC 214/2025) */
const ALIQUOTA_IBS_2027_2028 = 0.1;
/** Alíquota CBS default em 2027/2028 quando não informada */
const ALIQUOTA_CBS_DEFAULT = 9;
/** Redutor locação residencial comum (LC 214/2025 Art. 261) */
const REDUTOR_LOCACAO_RESIDENCIAL = 70;
/** Redutor hospedagem / curta temporada */
const REDUTOR_SHORT_STAY = 50;
/** Regime de transição Art. 487: 3,65% sobre receita bruta (contratos até 16/01/2025) */
const ALIQUOTA_TRANSICAO_ART487 = 3.65;

export interface OpcoesReformaCalculo {
  ano: number;
  /** Override da alíquota nominal total (compatibilidade). Se informado, prevalece sobre aliquota_ibs_plena/aliquota_cbs_estimada. */
  aliquota_ibs_cbs_estimada?: number;
  /** Alíquota plena IBS (%) para 2029+ (transição). Default 19. */
  aliquota_ibs_plena?: number;
  /** Alíquota CBS estimada (%). Em 2027/2028 e 2029+. Default 9. */
  aliquota_cbs_estimada?: number;
  redutor_locacao_pct?: number;
  redutor_short_stay_pct?: number;
  /** Regime transição: 3,65% sobre receita; resultado = min(3,65%, regime normal) */
  contrato_antes_16012025?: boolean;
  /** Se true, aplica 50% no montante de receita short e 70% no long (quando short > long) */
  usar_redutor_diferenciado_short?: boolean;
  /** Se true (perfil "ambos"), aplica 70% na parte longa e 50% na curta, proporcional à receita de cada tipo. */
  usar_ambos_redutores?: boolean;
  receita_longa_total?: number;
  receita_short_total?: number;
  /** Receita anual de locação residencial (para modelo com split residencial/não residencial). */
  receita_locacao_residencial_anual?: number;
  /** Receita anual de locação não residencial (sem redutor social). */
  receita_locacao_nao_residencial_anual?: number;
  /**
   * Redutor social anual para locação residencial (LC 214/2025, arts. 259 e 260).
   * Valor absoluto em reais abatido da BASE de cálculo (não do imposto): 600 × 12 × quantidade_imoveis_residenciais.
   */
  redutor_social_residencial_anual?: number;
}

/**
 * Cenário Reforma: IBS/CBS com créditos sobre custos.
 * 2027/2028: IBS 0,1% (fixo) + CBS (editável); 2029+: IBS (transição) + CBS (editável).
 * Redutor 70% locação residencial; 50% curta temporada quando dominante (Art. 261).
 * Regime transição Art. 487: opção 3,65% sobre faturamento (contratos antes 16/01/2025).
 */
export function calcularReforma2027(
  aggregated: AggregatedYear,
  aliquotaIbsCbsOverride?: number,
  redutorLocacaoPct?: number,
  opcoes?: OpcoesReformaCalculo
): {
  receita_bruta_total: number;
  custos_operacionais_total: number;
  creditos_ibs_cbs: number;
  ibs_cbs_sobre_receita: number;
  ibs_cbs_liquido: number;
  imposto_total: number;
  aliquota_efetiva: number;
  aliquota_nominal_ibs_cbs: number;
  redutor_locacao_aplicado_pct: number;
  /** Regime transição Art. 487 aplicado (imposto a 3,65%) */
  imposto_transicao_365?: number;
  aplicou_transicao_art487?: boolean;
  /** Quando redutor proporcional: 50% na parte short, 70% na long */
  redutor_diferenciado_short?: boolean;
  /** Percentuais aplicados quando redutor diferenciado (para exibição na UI). */
  redutor_long_pct?: number;
  redutor_short_pct?: number;
  /** IBS/CBS líquido antes de redutor social (para memória de cálculo). */
  ibs_cbs_antes_redutor_social?: number;
  /** Valor do redutor social aplicado na base (Art. 260). */
  redutor_social_aplicado?: number;
} {
  const { receita_total, custos_operacionais_total, ano: aggAno } = aggregated;
  const ano = opcoes?.ano ?? aggAno ?? 2027;
  const aliquotaCBS = opcoes?.aliquota_cbs_estimada ?? ALIQUOTA_CBS_DEFAULT;
  const aliquotaIbsPlena = opcoes?.aliquota_ibs_plena ?? 19;

  /** Escalonamento: 2027/2028 IBS 0,1% + CBS; 2029+ IBS (transição) + CBS. Override prevalece para compatibilidade. */
  let aliquotaNominal: number;
  if (aliquotaIbsCbsOverride != null) {
    aliquotaNominal = aliquotaIbsCbsOverride;
  } else if (ano >= 2027 && ano <= 2028) {
    aliquotaNominal = ALIQUOTA_IBS_2027_2028 + aliquotaCBS;
  } else {
    const dadosTransicao = TRANSICAO_IBS_ANOS[ano];
    const ibsEfetivo = dadosTransicao
      ? round2((aliquotaIbsPlena / 100) * (dadosTransicao.ibsPct / 100) * 100)
      : aliquotaIbsPlena;
    aliquotaNominal = ibsEfetivo + aliquotaCBS;
  }

  const receitaResidencial = opcoes?.receita_locacao_residencial_anual ?? 0;
  const receitaNaoResidencial = opcoes?.receita_locacao_nao_residencial_anual ?? 0;
  const usarModeloSplit =
    receitaResidencial > 0 &&
    receitaNaoResidencial > 0 &&
    (opcoes?.redutor_social_residencial_anual ?? 0) > 0;

  const receitaLonga = opcoes?.receita_longa_total ?? 0;
  const receitaShort = opcoes?.receita_short_total ?? 0;
  const temReceitaLongaOuShort = receitaLonga + receitaShort > 0;
  const usarRedutorDiferenciado =
    !usarModeloSplit &&
    receita_total > 0 &&
    temReceitaLongaOuShort &&
    (opcoes?.usar_ambos_redutores === true ||
      (opcoes?.usar_redutor_diferenciado_short === true && receitaShort > receitaLonga));

  const redutorLong = redutorLocacaoPct ?? opcoes?.redutor_locacao_pct ?? REDUTOR_LOCACAO_RESIDENCIAL;
  const redutorShort = opcoes?.redutor_short_stay_pct ?? REDUTOR_SHORT_STAY;
  const redutorSocialAnual = opcoes?.redutor_social_residencial_anual ?? 0;

  let ibsCbsReceita: number;
  let creditosIbsCbs: number;
  let redutorExibicao: number;
  let ibsCbsAntesRedutorSocial: number | undefined;
  let redutorSocialAplicado: number | undefined;

  if (usarModeloSplit) {
    // Modelo com split: residencial (base reduzida + redutor alíquota) e não residencial (alíquota plena)
    const baseResidencial = Math.max(0, round2(receitaResidencial - redutorSocialAnual));
    const aliquotaEfetivaResidencial = (aliquotaNominal / 100) * (1 - redutorLong / 100);
    const aliquotaPlena = aliquotaNominal / 100;
    const ibsCbsResidencial = round2(baseResidencial * aliquotaEfetivaResidencial);
    const ibsCbsNaoResidencial = round2(receitaNaoResidencial * aliquotaPlena);
    const receitaReforma = receitaResidencial + receitaNaoResidencial;
    ibsCbsReceita = round2(ibsCbsResidencial + ibsCbsNaoResidencial);
    const rateMedio = receitaReforma > 0 ? ibsCbsReceita / receitaReforma : 0;
    creditosIbsCbs = round2(custos_operacionais_total * rateMedio);
    redutorExibicao = redutorLong;
    const impostoResidencialSemRedutorBase = round2(receitaResidencial * aliquotaEfetivaResidencial);
    redutorSocialAplicado = round2(Math.min(receitaResidencial, redutorSocialAnual) * aliquotaEfetivaResidencial);
    ibsCbsAntesRedutorSocial = round2(impostoResidencialSemRedutorBase + ibsCbsNaoResidencial - creditosIbsCbs);
  } else {
    // Modelo unificado: redutor social na BASE (Art. 260), não no imposto
    const baseTributavel = redutorSocialAnual > 0
      ? Math.max(0, round2(receita_total - redutorSocialAnual))
      : receita_total;

    if (usarRedutorDiferenciado) {
      const partLong = receitaLonga / receita_total;
      const partShort = receitaShort / receita_total;
      const rateLong = (aliquotaNominal / 100) * (1 - redutorLong / 100);
      const rateShort = (aliquotaNominal / 100) * (1 - redutorShort / 100);
      const aliquotaEfetivaMedia = partLong * rateLong + partShort * rateShort;
      ibsCbsReceita = round2(baseTributavel * aliquotaEfetivaMedia);
      const rateMedio = receita_total > 0 ? (baseTributavel * aliquotaEfetivaMedia) / receita_total : 0;
      creditosIbsCbs = round2(custos_operacionais_total * rateMedio);
      redutorExibicao = redutorLong;
      redutorSocialAplicado = redutorSocialAnual > 0
        ? round2(Math.min(receita_total, redutorSocialAnual) * (partLong * rateLong + partShort * rateShort))
        : 0;
      ibsCbsAntesRedutorSocial = redutorSocialAnual > 0 && redutorSocialAplicado
        ? round2(Math.max(0, ibsCbsReceita - creditosIbsCbs) + redutorSocialAplicado)
        : undefined;
    } else {
      const redutor = redutorLocacaoPct ?? opcoes?.redutor_locacao_pct ?? REDUTOR_LOCACAO_RESIDENCIAL;
      const aliquotaEfetivaRate = (aliquotaNominal / 100) * (1 - redutor / 100);
      ibsCbsReceita = round2(baseTributavel * aliquotaEfetivaRate);
      creditosIbsCbs = round2(custos_operacionais_total * aliquotaEfetivaRate);
      redutorExibicao = redutor;
      redutorSocialAplicado = redutorSocialAnual > 0
        ? round2(Math.min(receita_total, redutorSocialAnual) * aliquotaEfetivaRate)
        : 0;
      ibsCbsAntesRedutorSocial = redutorSocialAnual > 0 && redutorSocialAplicado
        ? round2(Math.max(0, ibsCbsReceita - creditosIbsCbs) + redutorSocialAplicado)
        : undefined;
    }
  }

  let ibsCbsLiquido = Math.max(0, round2(ibsCbsReceita - creditosIbsCbs));

  let aplicouTransicao = false;
  let impostoTransicao365: number | undefined;

  if (opcoes?.contrato_antes_16012025 && receita_total > 0) {
    impostoTransicao365 = round2(receita_total * (ALIQUOTA_TRANSICAO_ART487 / 100));
    if (impostoTransicao365 < ibsCbsLiquido) {
      ibsCbsLiquido = impostoTransicao365;
      aplicouTransicao = true;
    }
  }

  const receitaParaAliquota = usarModeloSplit ? receitaResidencial + receitaNaoResidencial : receita_total;

  return {
    receita_bruta_total: round2(receitaParaAliquota),
    custos_operacionais_total: round2(custos_operacionais_total),
    creditos_ibs_cbs: creditosIbsCbs,
    ibs_cbs_sobre_receita: ibsCbsReceita,
    ibs_cbs_liquido: ibsCbsLiquido,
    imposto_total: round2(ibsCbsLiquido),
    aliquota_efetiva: round2(receitaParaAliquota > 0 ? (ibsCbsLiquido / receitaParaAliquota) * 100 : 0),
    aliquota_nominal_ibs_cbs: round2(aliquotaNominal),
    redutor_locacao_aplicado_pct: redutorExibicao,
    ...(impostoTransicao365 != null && { imposto_transicao_365: impostoTransicao365 }),
    ...(aplicouTransicao && { aplicou_transicao_art487: true }),
    ...(usarRedutorDiferenciado && {
      redutor_diferenciado_short: true,
      redutor_long_pct: redutorLong,
      redutor_short_pct: redutorShort,
    }),
    ...(ibsCbsAntesRedutorSocial != null && { ibs_cbs_antes_redutor_social: ibsCbsAntesRedutorSocial }),
    ...(redutorSocialAplicado != null && redutorSocialAplicado > 0 && { redutor_social_aplicado: redutorSocialAplicado }),
  };
}

/** Cronograma de transição IBS vs ICMS/ISS (LC 214/2025) – 2029 a 2033 */
export const TRANSICAO_IBS_ANOS: Record<number, { ibsPct: number; icmsIssPct: number }> = {
  2029: { ibsPct: 10, icmsIssPct: 90 },
  2030: { ibsPct: 20, icmsIssPct: 80 },
  2031: { ibsPct: 30, icmsIssPct: 70 },
  2032: { ibsPct: 40, icmsIssPct: 60 },
  2033: { ibsPct: 100, icmsIssPct: 0 },
};

export type TransicaoIBSResult = {
  ano: number;
  aliquotaPlenaPct: number;
  ibsPct: number;
  icmsIssPct: number;
  aliquotaEfetivaIBS: number;
};

/**
 * Simulador de transição IBS vs ICMS/ISS (2029–2033).
 * Retorna a alíquota efetiva do IBS para cada ano, com base na alíquota plena estimada.
 */
export function calcularTransicaoIBS(
  aliquotaPlenaPct: number,
  anos?: number[]
): TransicaoIBSResult[] {
  const years = anos ?? [2029, 2030, 2031, 2032, 2033];
  return years.map((ano) => {
    const dados = TRANSICAO_IBS_ANOS[ano];
    if (!dados) return { ano, aliquotaPlenaPct, ibsPct: 0, icmsIssPct: 100, aliquotaEfetivaIBS: 0 };
    const aliquotaEfetivaIBS = round2((aliquotaPlenaPct / 100) * (dados.ibsPct / 100) * 100);
    return {
      ano,
      aliquotaPlenaPct,
      ibsPct: dados.ibsPct,
      icmsIssPct: dados.icmsIssPct,
      aliquotaEfetivaIBS,
    };
  });
}

/** Break-even: valor mensal aproximado onde PJ vence PF (carga PJ < carga PF) */
export function calcularBreakEven(
  cargaPFPercentual: number,
  cargaPJPercentual: number
): number | null {
  if (cargaPJPercentual >= cargaPFPercentual) return null;
  const diferenca = cargaPFPercentual - cargaPJPercentual;
  if (diferenca <= 0) return null;
  return round2(12000);
}

export interface TributacaoAnoResult {
  ano: number;
  /** CBS com redutor aplicado */
  cbs_efetiva: number;
  cbs_valor: number;
  /** IBS com redutor aplicado (0,1% fixo em 2027/2028, progressivo 2029+) */
  ibs_efetivo: number;
  ibs_valor: number;
  /** Total IBS + CBS */
  ibs_cbs_total: number;
  /** Créditos sobre custos operacionais */
  creditos: number;
  /** IBS/CBS líquido após créditos */
  ibs_cbs_liquido: number;
  /** IRPJ + CSLL (para PJ) */
  irpj_csll: number;
  /** Tributação total */
  total_tributos: number;
  /** Alíquota efetiva total */
  aliquota_efetiva: number;
}

/**
 * Simula a tributação ano a ano de 2027 a 2033 para PJ (Reforma Tributária LC 214/2025).
 * 
 * Cronograma:
 * - 2027/2028: CBS + IBS fixo 0,1% (ambos com redutor)
 * - 2029: CBS + IBS 10% da alíquota plena (ambos com redutor)
 * - 2030: CBS + IBS 20% da alíquota plena
 * - 2031: CBS + IBS 30% da alíquota plena
 * - 2032: CBS + IBS 40% da alíquota plena
 * - 2033: CBS + IBS 100% (alíquota plena)
 */
export function calcularTributacaoAnoAno(
  receitaAnual: number,
  custosOperacionais: number,
  irpjCsll: number,
  opcoes?: {
    aliquotaIbsPlena?: number;  // default 19
    aliquotaCBS?: number;       // default 9
    redutorLocacao?: number;    // default 70
  }
): TributacaoAnoResult[] {
  const aliquotaIbsPlena = opcoes?.aliquotaIbsPlena ?? 19;
  const aliquotaCBS = opcoes?.aliquotaCBS ?? 9;
  const redutor = opcoes?.redutorLocacao ?? 70;
  const fatorReducao = 1 - redutor / 100; // 30% após redutor de 70%

  const anos = [2027, 2028, 2029, 2030, 2031, 2032, 2033];
  const results: TributacaoAnoResult[] = [];

  for (const ano of anos) {
    let ibsNominal: number;
    
    if (ano <= 2028) {
      // 2027/2028: IBS fixo 0,1%
      ibsNominal = 0.1;
    } else {
      // 2029+: IBS progressivo
      const transicao = TRANSICAO_IBS_ANOS[ano];
      if (transicao) {
        ibsNominal = round2((aliquotaIbsPlena * transicao.ibsPct) / 100);
      } else {
        ibsNominal = aliquotaIbsPlena;
      }
    }

    // Aplicar redutor a CBS e IBS
    const cbsEfetiva = round2(aliquotaCBS * fatorReducao);
    const ibsEfetivo = round2(ibsNominal * fatorReducao);

    // Calcular valores
    const cbsValor = round2((receitaAnual * cbsEfetiva) / 100);
    const ibsValor = round2((receitaAnual * ibsEfetivo) / 100);
    const ibsCbsTotal = round2(cbsValor + ibsValor);

    // Créditos sobre custos operacionais
    const aliquotaEfetivaCombinada = cbsEfetiva + ibsEfetivo;
    const creditos = round2((custosOperacionais * aliquotaEfetivaCombinada) / 100);

    // Líquido
    const ibsCbsLiquido = Math.max(0, round2(ibsCbsTotal - creditos));

    // Total com IRPJ/CSLL
    const totalTributos = round2(ibsCbsLiquido + irpjCsll);

    // Alíquota efetiva
    const aliquotaEfetiva = receitaAnual > 0 ? round2((totalTributos / receitaAnual) * 100) : 0;

    results.push({
      ano,
      cbs_efetiva: cbsEfetiva,
      cbs_valor: cbsValor,
      ibs_efetivo: ibsEfetivo,
      ibs_valor: ibsValor,
      ibs_cbs_total: ibsCbsTotal,
      creditos,
      ibs_cbs_liquido: ibsCbsLiquido,
      irpj_csll: irpjCsll,
      total_tributos: totalTributos,
      aliquota_efetiva: aliquotaEfetiva,
    });
  }

  return results;
}

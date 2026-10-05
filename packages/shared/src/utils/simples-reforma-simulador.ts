/**
 * Motor de cálculo: Simples puro x regime regular de IBS/CBS (Simples híbrido).
 *
 * Compara apenas a parcela de IBS/CBS. ISS/ICMS remanescentes, IRPJ, CSLL e CPP
 * seguem dentro do DAS nos dois cenários e não entram na diferença.
 */

import {
  CATEGORIAS_SEM_CREDITO_SIMPLES,
  type AnexoSimples,
  type CategoriaDespesaSimples,
  type SimplesIbsCbsInput,
  type SimplesIbsCbsResult,
} from '../schemas/comparativo-regimes.schema.js';
import { ANEXO_III, calcularAliquotaEfetivaSN, obterFaixa, type FaixaSimples } from './comparativo-regimes-simulador.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const SIMPLES_REFORMA_VERSAO = 'simples-reforma-2026-09';

const LIMITE_SIMPLES_ANUAL = 4_800_000;

/**
 * Alíquotas estimadas por ano (percentual sobre a receita).
 * CBS 9% segue a referência usada na aula de 28/08/2026; IBS de 2029 a 2032 é 10% a 40%
 * de uma referência estimada de 17,7%. Todos os valores são editáveis na simulação.
 */
export const ALIQUOTAS_IBS_CBS_POR_ANO: Record<number, { cbs: number; ibs: number; fracao_ibs_simples: number }> = {
  2027: { cbs: 9, ibs: 0.1, fracao_ibs_simples: 0 },
  2028: { cbs: 9, ibs: 0.1, fracao_ibs_simples: 0 },
  2029: { cbs: 9, ibs: 1.77, fracao_ibs_simples: 0.1 },
  2030: { cbs: 9, ibs: 3.54, fracao_ibs_simples: 0.2 },
  2031: { cbs: 9, ibs: 5.31, fracao_ibs_simples: 0.3 },
  2032: { cbs: 9, ibs: 7.08, fracao_ibs_simples: 0.4 },
  2033: { cbs: 9, ibs: 17.7, fracao_ibs_simples: 1 },
};

function parametrosDoAno(ano: number) {
  const anos = Object.keys(ALIQUOTAS_IBS_CBS_POR_ANO).map(Number).sort((a, b) => a - b);
  const alvo = anos.filter((a) => a <= ano).pop() ?? anos[0]!;
  return ALIQUOTAS_IBS_CBS_POR_ANO[alvo]!;
}

const ANEXO_I: FaixaSimples[] = [
  { limiteInferior: 0,         limiteSuperior: 180_000,   aliquotaNominal: 4.0,  parcelaDeduzir: 0 },
  { limiteInferior: 180_000,   limiteSuperior: 360_000,   aliquotaNominal: 7.3,  parcelaDeduzir: 5_940 },
  { limiteInferior: 360_000,   limiteSuperior: 720_000,   aliquotaNominal: 9.5,  parcelaDeduzir: 13_860 },
  { limiteInferior: 720_000,   limiteSuperior: 1_800_000, aliquotaNominal: 10.7, parcelaDeduzir: 22_500 },
  { limiteInferior: 1_800_000, limiteSuperior: 3_600_000, aliquotaNominal: 14.3, parcelaDeduzir: 87_300 },
  { limiteInferior: 3_600_000, limiteSuperior: 4_800_000, aliquotaNominal: 19.0, parcelaDeduzir: 378_000 },
];

const ANEXO_IV: FaixaSimples[] = [
  { limiteInferior: 0,         limiteSuperior: 180_000,   aliquotaNominal: 4.5,  parcelaDeduzir: 0 },
  { limiteInferior: 180_000,   limiteSuperior: 360_000,   aliquotaNominal: 9.0,  parcelaDeduzir: 8_100 },
  { limiteInferior: 360_000,   limiteSuperior: 720_000,   aliquotaNominal: 10.2, parcelaDeduzir: 12_420 },
  { limiteInferior: 720_000,   limiteSuperior: 1_800_000, aliquotaNominal: 14.0, parcelaDeduzir: 39_780 },
  { limiteInferior: 1_800_000, limiteSuperior: 3_600_000, aliquotaNominal: 22.0, parcelaDeduzir: 183_780 },
  { limiteInferior: 3_600_000, limiteSuperior: 4_800_000, aliquotaNominal: 33.0, parcelaDeduzir: 828_000 },
];

const ANEXO_V: FaixaSimples[] = [
  { limiteInferior: 0,         limiteSuperior: 180_000,   aliquotaNominal: 15.5, parcelaDeduzir: 0 },
  { limiteInferior: 180_000,   limiteSuperior: 360_000,   aliquotaNominal: 18.0, parcelaDeduzir: 4_500 },
  { limiteInferior: 360_000,   limiteSuperior: 720_000,   aliquotaNominal: 19.5, parcelaDeduzir: 9_900 },
  { limiteInferior: 720_000,   limiteSuperior: 1_800_000, aliquotaNominal: 20.5, parcelaDeduzir: 17_100 },
  { limiteInferior: 1_800_000, limiteSuperior: 3_600_000, aliquotaNominal: 23.0, parcelaDeduzir: 62_100 },
  { limiteInferior: 3_600_000, limiteSuperior: 4_800_000, aliquotaNominal: 30.5, parcelaDeduzir: 540_000 },
];

/**
 * Repartição do DAS por faixa (LC 123/2006, anexos): `cbs` = PIS + COFINS, `ibs` = ICMS ou ISS.
 * Na 6ª faixa o ICMS/ISS é recolhido fora do DAS.
 */
const REPARTICAO_DAS: Record<AnexoSimples, { tabela: FaixaSimples[]; faixas: Array<{ cbs: number; ibs: number }> }> = {
  I: {
    tabela: ANEXO_I,
    faixas: [
      { cbs: 15.5, ibs: 34.0 }, { cbs: 15.5, ibs: 34.0 }, { cbs: 15.5, ibs: 33.5 },
      { cbs: 15.5, ibs: 33.5 }, { cbs: 15.5, ibs: 33.5 }, { cbs: 34.4, ibs: 0 },
    ],
  },
  III: {
    tabela: ANEXO_III,
    faixas: [
      { cbs: 15.6, ibs: 33.5 }, { cbs: 17.1, ibs: 32.0 }, { cbs: 16.6, ibs: 32.5 },
      { cbs: 16.6, ibs: 32.5 }, { cbs: 15.6, ibs: 33.5 }, { cbs: 19.5, ibs: 0 },
    ],
  },
  IV: {
    tabela: ANEXO_IV,
    faixas: [
      { cbs: 21.51, ibs: 44.5 }, { cbs: 25.0, ibs: 40.0 }, { cbs: 24.0, ibs: 40.0 },
      { cbs: 23.0, ibs: 40.0 }, { cbs: 22.0, ibs: 40.0 }, { cbs: 32.67, ibs: 0 },
    ],
  },
  V: {
    tabela: ANEXO_V,
    faixas: [
      { cbs: 17.15, ibs: 14.0 }, { cbs: 17.15, ibs: 17.0 }, { cbs: 18.15, ibs: 19.0 },
      { cbs: 19.15, ibs: 21.0 }, { cbs: 17.15, ibs: 23.5 }, { cbs: 20.0, ibs: 0 },
    ],
  },
};

const MOTIVO_SEM_CREDITO: Record<string, string> = {
  pessoal: 'Folha e encargos não geram crédito de IBS/CBS',
  tributo: 'Tributos não geram crédito de IBS/CBS',
  uso_pessoal: 'Uso e consumo pessoal é vedado (LC 214/2025, art. 57)',
};

/**
 * Exemplos de partida editáveis. Advocacia reproduz a DRE da aula "Simples puro vs híbrido" (28/08/2026).
 */
export const EXEMPLOS_SIMPLES_REFORMA: Record<
  'advocacia' | 'comercio',
  { rotulo: string; input: Omit<SimplesIbsCbsInput, 'client_id' | 'title'> }
> = {
  advocacia: {
    rotulo: 'Advocacia (serviço, Anexo IV)',
    input: {
      ano: 2027,
      perfil: 'servico',
      anexo: 'IV',
      receita_bruta_anual: 2_750_000,
      deducoes_anual: 250_000,
      aliquota_cbs: 9,
      aliquota_ibs: 0,
      percentual_vendas_empresas: 80,
      despesas: [
        { descricao: 'Aluguel de imóveis', categoria: 'aluguel', valor_anual: 76_817, gera_credito: true, aliquota_credito: 2.7 },
        { descricao: 'Assinatura de IA', categoria: 'tecnologia', valor_anual: 24_000, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Publicidade e propaganda', categoria: 'publicidade', valor_anual: 14_900, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Prêmios de seguros', categoria: 'seguro', valor_anual: 4_988, gera_credito: true, aliquota_credito: 10.85 },
        { descricao: 'Energia, gás, água e esgoto', categoria: 'energia', valor_anual: 15_000, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Serviços técnico-profissionais (PJ)', categoria: 'servico_pj', valor_anual: 350_000, gera_credito: true, aliquota_credito: 6.3 },
        { descricao: 'Despesas com pessoal', categoria: 'pessoal', valor_anual: 333_750, gera_credito: false, aliquota_credito: 0 },
      ],
    },
  },
  comercio: {
    rotulo: 'Comércio (Anexo I)',
    input: {
      ano: 2027,
      perfil: 'comercio',
      anexo: 'I',
      receita_bruta_anual: 3_000_000,
      deducoes_anual: 60_000,
      aliquota_cbs: 9,
      aliquota_ibs: 0.1,
      percentual_vendas_empresas: 60,
      despesas: [
        { descricao: 'Mercadorias para revenda', categoria: 'mercadoria', valor_anual: 1_800_000, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Aluguel do ponto', categoria: 'aluguel', valor_anual: 120_000, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Energia elétrica', categoria: 'energia', valor_anual: 36_000, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Sistemas e tecnologia', categoria: 'tecnologia', valor_anual: 18_000, gera_credito: true, aliquota_credito: 9 },
        { descricao: 'Despesas com pessoal', categoria: 'pessoal', valor_anual: 360_000, gera_credito: false, aliquota_credito: 0 },
      ],
    },
  },
};

export const AVISO_SIMPLES_REFORMA =
  'Simulação para planejamento. Alíquotas de transição e repartição do DAS são estimativas editáveis. ' +
  'Não substitui parecer nem a apuração oficial. A opção pelo regime regular de IBS/CBS pode ser revista ' +
  'nas janelas semestrais previstas para o Simples Nacional.';

export function simularSimplesIbsCbs(input: SimplesIbsCbsInput): SimplesIbsCbsResult {
  const receitaBruta = round2(input.receita_bruta_anual);
  const deducoes = round2(input.deducoes_anual ?? 0);
  const receitaLiquida = round2(receitaBruta - deducoes);

  const doAno = parametrosDoAno(input.ano);
  const aliquotaCbs = input.aliquota_cbs ?? doAno.cbs;
  const aliquotaIbs = input.aliquota_ibs ?? doAno.ibs;

  const anexo: AnexoSimples = input.anexo ?? (input.perfil === 'comercio' ? 'I' : 'III');
  const reparticao = REPARTICAO_DAS[anexo];
  const rbt12 = Math.min(receitaBruta, LIMITE_SIMPLES_ANUAL);
  const faixa = obterFaixa(rbt12, reparticao.tabela);
  const indiceFaixa = reparticao.tabela.indexOf(faixa);
  const partes = reparticao.faixas[indiceFaixa]!;

  const informada = input.aliquota_efetiva_simples !== undefined;
  const aliquotaEfetivaSimples = informada
    ? input.aliquota_efetiva_simples!
    : calcularAliquotaEfetivaSN(rbt12, reparticao.tabela);

  const participacaoIbsNoDas = partes.ibs * doAno.fracao_ibs_simples;
  const aliquotaIbsCbsNoDas = aliquotaEfetivaSimples * ((partes.cbs + participacaoIbsNoDas) / 100);
  const simplesPuro = round2(receitaLiquida * (aliquotaIbsCbsNoDas / 100));

  const despesas = (input.despesas ?? []).map((d) => {
    const vedada = (CATEGORIAS_SEM_CREDITO_SIMPLES as readonly CategoriaDespesaSimples[]).includes(d.categoria);
    const geraCredito = d.gera_credito && !vedada && d.aliquota_credito > 0;
    const credito = geraCredito ? round2(d.valor_anual * (d.aliquota_credito / 100)) : 0;
    let motivo: string | undefined;
    if (vedada) motivo = MOTIVO_SEM_CREDITO[d.categoria];
    else if (!d.gera_credito) motivo = 'Marcada sem direito a crédito';
    else if (d.aliquota_credito <= 0) motivo = 'Alíquota de crédito zero';
    return {
      descricao: d.descricao,
      categoria: d.categoria,
      valor_anual: round2(d.valor_anual),
      gera_credito_informado: d.gera_credito,
      gera_credito: geraCredito,
      aliquota_credito: geraCredito ? d.aliquota_credito : 0,
      credito,
      ...(motivo ? { motivo_sem_credito: motivo } : {}),
    };
  });

  const debito = round2(receitaLiquida * ((aliquotaCbs + aliquotaIbs) / 100));
  const credito = round2(despesas.reduce((s, d) => s + d.credito, 0));
  const saldo = round2(debito - credito);
  const saldoRecolher = Math.max(0, saldo);
  const saldoCredor = Math.max(0, -saldo);

  const pctEmpresas = input.percentual_vendas_empresas ?? 0;
  const receitaEmpresas = round2(receitaLiquida * (pctEmpresas / 100));
  const creditoAdqRegular = round2(receitaEmpresas * ((aliquotaCbs + aliquotaIbs) / 100));
  const creditoAdqSimples = round2(receitaEmpresas * (aliquotaIbsCbsNoDas / 100));

  const diferenca = round2(simplesPuro - saldoRecolher);
  const regimeMaisEconomico: SimplesIbsCbsResult['regime_mais_economico'] =
    Math.abs(diferenca) < 0.01 ? 'empate' : diferenca > 0 ? 'regime_regular' : 'simples_puro';

  const alertas: string[] = [];
  if (receitaBruta > LIMITE_SIMPLES_ANUAL) {
    alertas.push('Receita acima de R$ 4,8 milhões: a empresa excede o limite do Simples Nacional.');
  }
  const vedadas = CATEGORIAS_SEM_CREDITO_SIMPLES as readonly CategoriaDespesaSimples[];
  if (despesas.some((d) => d.gera_credito_informado && vedadas.includes(d.categoria))) {
    alertas.push('Despesas de folha, tributo ou uso pessoal marcadas com crédito foram zeradas.');
  }
  if (saldoCredor > 0) {
    alertas.push('Crédito maior que o débito no regime regular: saldo credor a compensar ou ressarcir.');
  }
  if (pctEmpresas >= 50 && regimeMaisEconomico === 'simples_puro') {
    alertas.push(
      'A maior parte das vendas é para empresas: no Simples puro o cliente toma crédito menor, o que pode pesar na negociação de preço.',
    );
  }

  return {
    kind: 'simples_ibs_cbs',
    ano: input.ano,
    perfil: input.perfil,
    receita_bruta_anual: receitaBruta,
    deducoes_anual: deducoes,
    receita_liquida_anual: receitaLiquida,
    parametros: {
      versao: SIMPLES_REFORMA_VERSAO,
      aliquota_cbs: aliquotaCbs,
      aliquota_ibs: aliquotaIbs,
      aliquota_efetiva_simples: round2(aliquotaEfetivaSimples),
      aliquota_efetiva_simples_informada: informada,
      anexo: `Anexo ${anexo}`,
      faixa: indiceFaixa + 1,
      participacao_cbs_das: partes.cbs,
      participacao_ibs_das: round2(participacaoIbsNoDas),
      fracao_ibs_transicao: doAno.fracao_ibs_simples,
    },
    simples_puro: {
      ibs_cbs_anual: simplesPuro,
      aliquota_sobre_receita: receitaLiquida > 0 ? round2((simplesPuro / receitaLiquida) * 100) : 0,
    },
    regime_regular: {
      debito,
      credito,
      saldo_recolher: saldoRecolher,
      saldo_credor: saldoCredor,
      aliquota_sobre_receita: receitaLiquida > 0 ? round2((saldoRecolher / receitaLiquida) * 100) : 0,
    },
    despesas,
    efeito_adquirente: {
      percentual_vendas_empresas: pctEmpresas,
      receita_para_empresas: receitaEmpresas,
      credito_adquirente_regime_regular: creditoAdqRegular,
      credito_adquirente_simples_puro: creditoAdqSimples,
      diferenca: round2(creditoAdqRegular - creditoAdqSimples),
    },
    diferenca_anual: diferenca,
    regime_mais_economico: regimeMaisEconomico,
    alertas,
    aviso: AVISO_SIMPLES_REFORMA,
  };
}

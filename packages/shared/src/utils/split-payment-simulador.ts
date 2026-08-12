/**
 * Simulador de Impacto do Split Payment (Reforma Tributária).
 *
 * Regime atual (sem split): empresa recebe valor integral e paga IBS/CBS depois,
 * aproveitando o float tributário durante o prazo até o vencimento.
 *
 * Com Split Payment: banco/adquirente retém IBS/CBS na hora do pagamento eletrônico,
 * reduzindo imediatamente o caixa disponível para a empresa.
 */

import type { SplitPaymentInput, SplitPaymentResult, SplitPaymentProjecaoMensal } from '../schemas/split-payment.schema.js';

export function simularSplitPayment(input: SplitPaymentInput): SplitPaymentResult {
  const {
    faturamento_mensal,
    percentual_eletronico,
    prazo_medio_recebimento_dias,
    custo_capital_anual,
    aliquota_ibs_cbs,
  } = input;

  const pctEletronico = percentual_eletronico / 100;
  const aliquota = aliquota_ibs_cbs / 100;
  const custoCapital = custo_capital_anual / 100;

  let totalImpostosRetidos = 0;
  let totalReceita = 0;
  let totalCustoFinanceiro = 0;

  const projecao_mensal: SplitPaymentProjecaoMensal[] = faturamento_mensal.map((receita_bruta, idx) => {
    const parcela_eletronica = receita_bruta * pctEletronico;
    const impostos_retidos_split = parcela_eletronica * aliquota;
    const receita_liquida_antes = receita_bruta;
    const receita_liquida_depois = receita_bruta - impostos_retidos_split;
    const diferenca_caixa = impostos_retidos_split;
    const custo_financeiro_mes = impostos_retidos_split * (prazo_medio_recebimento_dias / 365) * custoCapital;

    totalImpostosRetidos += impostos_retidos_split;
    totalReceita += receita_bruta;
    totalCustoFinanceiro += custo_financeiro_mes;

    return {
      mes: idx + 1,
      receita_bruta: Math.round(receita_bruta * 100) / 100,
      impostos_retidos_split: Math.round(impostos_retidos_split * 100) / 100,
      receita_liquida_antes: Math.round(receita_liquida_antes * 100) / 100,
      receita_liquida_depois: Math.round(receita_liquida_depois * 100) / 100,
      diferenca_caixa: Math.round(diferenca_caixa * 100) / 100,
      custo_financeiro_mes: Math.round(custo_financeiro_mes * 100) / 100,
    };
  });

  const capital_giro_necessario = totalImpostosRetidos / 12;
  const custo_financeiro_mensal = totalCustoFinanceiro / 12;
  const reducao_caixa_percentual = totalReceita > 0
    ? (totalImpostosRetidos / totalReceita) * 100
    : 0;

  return {
    resumo: {
      capital_giro_necessario: Math.round(capital_giro_necessario * 100) / 100,
      custo_financeiro_mensal: Math.round(custo_financeiro_mensal * 100) / 100,
      custo_financeiro_anual: Math.round(totalCustoFinanceiro * 100) / 100,
      reducao_caixa_percentual: Math.round(reducao_caixa_percentual * 100) / 100,
    },
    projecao_mensal,
  };
}

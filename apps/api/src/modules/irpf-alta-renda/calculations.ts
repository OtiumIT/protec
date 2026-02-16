/**
 * Motor de cálculo IRPF Alta Renda - Lei 15.270/2025
 *
 * Parâmetros centralizados em CONFIG_LEI_15270_2025 para facilitar ajuste quando
 * a Receita Federal publicar regulamentação (tabela ou fórmula da faixa progressiva).
 * Até lá, a faixa 600k–1,2M usa interpolação linear (0% em 600k até 10% em 1,2M).
 */

import type { RendimentoIsentoDividendo } from '@shared/core';

/** Parâmetros da Lei 15.270/2025 – alterar aqui quando houver regulamentação ou nova lei */
export const CONFIG_LEI_15270_2025 = {
  limite_isento: 600_000,
  limite_progressiva: 1_200_000,
  aliquota_fixa_percentual: 10,
  limite_retencao_mensal: 50_000,
  fonte_normativa: 'Lei 15.270/2025',
  observacao_progressiva:
    'Faixa progressiva 600k–1,2M: interpolação linear até 10%. Sujeita a tabela ou fórmula da Receita Federal quando regulamentado.',
} as const;

const LIMITE_ISENTO = CONFIG_LEI_15270_2025.limite_isento;
const LIMITE_PROGRESSIVA = CONFIG_LEI_15270_2025.limite_progressiva;
const ALIQUOTA_FIXA = CONFIG_LEI_15270_2025.aliquota_fixa_percentual / 100;
const LIMITE_RETENCAO_MENSAL = CONFIG_LEI_15270_2025.limite_retencao_mensal;

export type FaixaAltaRenda = 'isento' | 'progressiva' | 'fixa_10';

export interface ResultadoSimulacao {
  base_calculo_combinada: number;
  faixa: FaixaAltaRenda;
  aliquota_percentual: number;
  imposto_estimado: number;
  excedente_sobre_600k?: number;
  risco_retencao_mensal: boolean;
  risco_retencao_detalhe?: string;
  memoria_calculo?: Record<string, unknown>;
}

/**
 * Calcula BCC = RT + soma dos rendimentos isentos (códigos 09 e 13).
 */
export function calcularBCC(
  rendimentosTributaveis: number,
  rendimentosIsentosDividendos: RendimentoIsentoDividendo[]
): number {
  const somaDividendos = rendimentosIsentosDividendos.reduce((s, d) => s + d.valor, 0);
  return round2(rendimentosTributaveis + somaDividendos);
}

/**
 * Aplica faixas da Lei 15.270/2025 e retorna alíquota e imposto.
 * Progressiva 600k–1,2M: interpolada até 10% (ver CONFIG_LEI_15270_2025.observacao_progressiva).
 */
export function aplicarFaixas(bcc: number): Omit<ResultadoSimulacao, 'risco_retencao_mensal' | 'risco_retencao_detalhe'> {
  let faixa: FaixaAltaRenda;
  let aliquotaPercentual: number;
  let imposto: number;
  let excedenteSobre600k = 0;

  if (bcc <= LIMITE_ISENTO) {
    faixa = 'isento';
    aliquotaPercentual = 0;
    imposto = 0;
  } else if (bcc <= LIMITE_PROGRESSIVA) {
    faixa = 'progressiva';
    excedenteSobre600k = round2(bcc - LIMITE_ISENTO);
    const faixaProgressiva = LIMITE_PROGRESSIVA - LIMITE_ISENTO;
    aliquotaPercentual = (excedenteSobre600k / faixaProgressiva) * CONFIG_LEI_15270_2025.aliquota_fixa_percentual;
    if (aliquotaPercentual > 10) aliquotaPercentual = 10;
    imposto = round2(bcc * (aliquotaPercentual / 100));
  } else {
    faixa = 'fixa_10';
    excedenteSobre600k = round2(bcc - LIMITE_ISENTO);
    aliquotaPercentual = CONFIG_LEI_15270_2025.aliquota_fixa_percentual;
    imposto = round2(bcc * ALIQUOTA_FIXA);
  }

  return {
    base_calculo_combinada: bcc,
    faixa,
    aliquota_percentual: round2(aliquotaPercentual),
    imposto_estimado: imposto,
    excedente_sobre_600k: excedenteSobre600k > 0 ? excedenteSobre600k : undefined,
    memoria_calculo: {
      limite_isento: LIMITE_ISENTO,
      limite_progressiva: LIMITE_PROGRESSIVA,
      aliquota_fixa_percentual: CONFIG_LEI_15270_2025.aliquota_fixa_percentual,
      fonte_normativa: CONFIG_LEI_15270_2025.fonte_normativa,
      observacao_progressiva: CONFIG_LEI_15270_2025.observacao_progressiva,
    },
  };
}

/**
 * Verifica risco de retenção 10% na fonte (Art. 5º): pagamento no mês > R$ 50.000.
 * Simplificação: se alguma fonte tem valor anual que, dividido por 12, supera 50k, sinaliza risco.
 */
export function avaliarRiscoRetencao(rendimentosIsentosDividendos: RendimentoIsentoDividendo[]): {
  risco_retencao_mensal: boolean;
  risco_retencao_detalhe?: string;
} {
  const fontesAcima = rendimentosIsentosDividendos.filter((d) => d.valor / 12 > LIMITE_RETENCAO_MENSAL);
  if (fontesAcima.length === 0) {
    return { risco_retencao_mensal: false };
  }
  const nomes = fontesAcima.map((f) => f.nome_fonte || f.cnpj_fonte || 'Fonte').join(', ');
  return {
    risco_retencao_mensal: true,
    risco_retencao_detalhe: `Possível retenção de 10% na fonte: valor mensal superior a R$ 50.000 em uma ou mais fontes (${nomes}).`,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

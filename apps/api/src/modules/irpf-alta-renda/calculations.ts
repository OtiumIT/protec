/**
 * Motor de cálculo IRPF Alta Renda - Lei 15.270/2025
 *
 * Fórmula legal (Art. 16-A § 2º II): Alíquota % = (REND/60.000) − 10
 * Para rendimentos entre 600k e 1,2M. Acima de 1,2M: 10% fixo.
 */

import type { RendimentoIsentoDividendo, DadosIrpfAltaRenda } from '@shared/core';

/** Parâmetros da Lei 15.270/2025 – alterar aqui quando houver regulamentação ou nova lei */
export const CONFIG_LEI_15270_2025 = {
  limite_isento: 600_000,
  limite_progressiva: 1_200_000,
  aliquota_fixa_percentual: 10,
  limite_retencao_mensal: 50_000,
  fonte_normativa: 'Lei 15.270/2025',
  observacao_progressiva:
    'Alíquota % = (REND/60.000) − 10 (Art. 16-A § 2º II). Faixa 600k–1,2M.',
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
 * Calcula BCC = RT + soma isentos (09, 13) − lucros aprovados até 31/12/2025 − ganho capital − FIIs.
 * Art. 16-A § 1º: exclui ganho de capital (I), FIIs qualificados (V-j), lucros aprovados até 31/12/2025 (XII).
 */
export function calcularBCC(
  rendimentosTributaveis: number,
  rendimentosIsentosDividendos: RendimentoIsentoDividendo[],
  lucrosAprovadosAte31dez2025 = 0,
  ganhoCapitalExcluido = 0,
  rendimentosFiisExcluidos = 0
): number {
  const somaDividendos = rendimentosIsentosDividendos.reduce((s, d) => s + d.valor, 0);
  const bruto =
    rendimentosTributaveis +
    somaDividendos -
    lucrosAprovadosAte31dez2025 -
    ganhoCapitalExcluido -
    rendimentosFiisExcluidos;
  return round2(Math.max(0, bruto));
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
    // Art. 16-A § 2º II: Alíquota % = (REND/60.000) − 10
    aliquotaPercentual = bcc / 60_000 - 10;
    if (aliquotaPercentual < 0) aliquotaPercentual = 0;
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

/**
 * Gera sugestões de planejamento tributário com base nos dados e no resultado da simulação.
 * Lei 15.270/2025 – estratégias para holding, segregação e redução do impacto.
 */
export function gerarSugestoesPlanejamento(
  dados: DadosIrpfAltaRenda,
  resultado: {
    base_calculo_combinada: number;
    faixa: string;
    imposto_estimado: number;
    risco_retencao_mensal: boolean;
    risco_retencao_detalhe?: string;
  }
): string[] {
  const sugestoes: string[] = [];
  const bcc = resultado.base_calculo_combinada;
  const dividendos = dados.rendimentos_isentos_dividendos ?? [];

  // Retenção 10%: fontes com valor mensal > R$ 50k → holding/fracionamento
  const fontesAcima = dividendos.filter((d) => (d.valor ?? 0) / 12 > LIMITE_RETENCAO_MENSAL);
  if (fontesAcima.length > 0) {
    fontesAcima.forEach((f) => {
      const nome = f.nome_fonte ?? f.cnpj_fonte ?? 'Fonte';
      sugestoes.push(
        `Retenção 10% na fonte: "${nome}" com valor anual ${formatBRL(f.valor ?? 0)} (média mensal > R$ 50k). Considere holding ou fracionamento de recebimentos.`
      );
    });
  }

  // Aluguéis gerando carnê-leão → holding imobiliária
  const carneLeao = dados.imposto_ja_pago_carne_leao ?? 0;
  const rt = dados.rendimentos_tributaveis ?? 0;
  if (carneLeao > 0 && rt > 0) {
    sugestoes.push(
      `Aluguéis/receitas PF gerando carnê-leão (IR pago: ${formatBRL(carneLeao)}). Avalie constituição de holding imobiliária para reorganização tributária.`
    );
  }

  // Base acima de R$ 1,2M → segregação com cônjuge/filhos
  if (bcc > LIMITE_PROGRESSIVA) {
    sugestoes.push(
      `Base de cálculo (${formatBRL(bcc)}) acima de R$ 1,2M. Considere segregação da renda com cônjuge ou filhos (dentro dos limites legais) para reduzir a alíquota efetiva.`
    );
  }

  // Base entre 600k e 1,2M – alíquota progressiva
  if (bcc > LIMITE_ISENTO && bcc <= LIMITE_PROGRESSIVA) {
    sugestoes.push(
      `Base na faixa progressiva. Revisão do momento e da forma de recebimento dos rendimentos pode auxiliar no planejamento.`
    );
  }

  // Fallback genérico se não houver sugestões específicas
  if (sugestoes.length === 0) {
    sugestoes.push(
      'Revisão do momento e da forma de recebimento dos rendimentos pode auxiliar no planejamento. Consulte seu consultor tributário para simulações específicas à Lei 15.270/2025.'
    );
  }

  return sugestoes;
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

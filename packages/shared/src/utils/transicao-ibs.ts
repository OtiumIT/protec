/**
 * Simulador de transição IBS vs ICMS/ISS (LC 214/2025) - 2029 a 2033.
 * Cronograma gradual de substituição dos impostos estaduais/municipais pelo IBS.
 */

/** Cronograma: ano -> % IBS (da alíquota plena) e % residual ICMS/ISS */
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula a alíquota efetiva do IBS para cada ano da transição.
 * Ex: aliquotaPlena 19% em 2029 -> IBS efetivo = 1,9%
 */
export function calcularTransicaoIBS(
  aliquotaPlenaPct: number,
  anos: number[] = [2029, 2030, 2031, 2032, 2033]
): TransicaoIBSResult[] {
  return anos.map((ano) => {
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

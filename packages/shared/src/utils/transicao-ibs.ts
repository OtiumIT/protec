/**
 * Simulador de transição IBS vs ICMS/ISS (LC 214/2025) - 2027 a 2033.
 * 2027/2028: IBS fixo 0,1%; 2029+: cronograma gradual de substituição pelo IBS.
 */

/** Alíquota IBS fixa em 2027 e 2028 */
export const ALIQUOTA_IBS_2027_2028 = 0.1;

/** Cronograma: ano -> % IBS (da alíquota plena) e % residual ICMS/ISS. 2027/2028 têm ibsFixo. */
export const TRANSICAO_IBS_ANOS: Record<
  number,
  { ibsPct: number; icmsIssPct: number; ibsFixo?: number }
> = {
  2027: { ibsPct: 0, icmsIssPct: 100, ibsFixo: ALIQUOTA_IBS_2027_2028 },
  2028: { ibsPct: 0, icmsIssPct: 100, ibsFixo: ALIQUOTA_IBS_2027_2028 },
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
  /** true em 2027/2028 quando IBS é fixo 0,1% */
  ibsFixo?: boolean;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula a alíquota efetiva do IBS para cada ano da transição.
 * 2027/2028: IBS fixo 0,1%. 2029+: ex. aliquotaPlena 19% em 2029 -> IBS efetivo = 1,9%
 */
export function calcularTransicaoIBS(
  aliquotaPlenaPct: number,
  anos: number[] = [2027, 2028, 2029, 2030, 2031, 2032, 2033]
): TransicaoIBSResult[] {
  return anos.map((ano) => {
    const dados = TRANSICAO_IBS_ANOS[ano];
    if (!dados) return { ano, aliquotaPlenaPct, ibsPct: 0, icmsIssPct: 100, aliquotaEfetivaIBS: 0 };
    const aliquotaEfetivaIBS =
      dados.ibsFixo != null
        ? round2(dados.ibsFixo)
        : round2((aliquotaPlenaPct / 100) * (dados.ibsPct / 100) * 100);
    return {
      ano,
      aliquotaPlenaPct,
      ibsPct: dados.ibsPct,
      icmsIssPct: dados.icmsIssPct,
      aliquotaEfetivaIBS,
      ...(dados.ibsFixo != null && { ibsFixo: true }),
    };
  });
}

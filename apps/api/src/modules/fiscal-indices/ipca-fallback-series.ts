/**
 * Snapshot mínimo IPCA (% mês a mês, série 433) quando o BCB está indisponível.
 * Atualizar periodicamente via script ou release. Valores ilustrativos baixos se vazio.
 */
export const IPCA_FALLBACK_VARIACAO_MENSAL_PCT: Record<string, number> = {
  '2025-08': 0.21,
  '2025-09': 0.48,
  '2025-10': 0.35,
  '2025-11': 0.24,
  '2025-12': 0.52,
};

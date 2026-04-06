/**
 * Snapshot mínimo IPCA (% mês a mês, série 433) quando o BCB está indisponível.
 * Atualizar periodicamente via script ou release.
 * Correção IPCA inicia em fev/2025 (mês seguinte à publicação da LC 214 em 16/01/2025).
 */
export const IPCA_FALLBACK_VARIACAO_MENSAL_PCT: Record<string, number> = {
  '2025-02': 1.31,
  '2025-03': 0.56,
  '2025-04': 0.43,
  '2025-05': 0.26,
  '2025-06': 0.24,
  '2025-07': 0.26,
  '2025-08': 0.21,
  '2025-09': 0.48,
  '2025-10': 0.35,
  '2025-11': 0.24,
  '2025-12': 0.52,
};

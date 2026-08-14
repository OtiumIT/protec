/** Módulos ativados no cadastro das landings PabloArruda e EPS. */
export const PABLO_MODULE_KEYS = [
  'GESTAO_IMOVEIS',
  'SIMULADOR_IN_2306',
  'IRPF_ALTA_RENDA',
  'MAPEAMENTO_DESPESAS_PJ',
  'COMPARATIVO_REGIMES',
] as const;

export type PabloModuleKey = (typeof PABLO_MODULE_KEYS)[number];

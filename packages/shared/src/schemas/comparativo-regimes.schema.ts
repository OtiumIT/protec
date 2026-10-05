import { z } from 'zod';

const monetaryValue = z.number().nonnegative();

export const ComparativoRegimesInputSchema = z.object({
  faturamento_mensal: z.array(monetaryValue).length(12),
  folha_mensal: z.array(monetaryValue).length(12),
  custos_dedutiveis_mensal: monetaryValue.default(0),
  cnae: z.string().min(1).max(10).optional(),
  iss_aliquota: z.number().min(0).max(5).default(5),
  regime_atual: z.enum(['lucro_presumido', 'lucro_real', 'simples_nacional']).optional(),
  ano: z.number().int().min(2020).max(2035).default(2026),
  client_id: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
});

const ImpostoDetalhadoSchema = z.object({
  nome: z.string(),
  valor: z.number(),
  aliquota: z.number().optional(),
  base_calculo: z.number().optional(),
});

const RegimeResultSchema = z.object({
  impostos_detalhados: z.array(ImpostoDetalhadoSchema),
  carga_total_anual: z.number(),
  aliquota_efetiva: z.number(),
  regime: z.string(),
});

export const ComparativoRegimesResultSchema = z.object({
  lucro_presumido: RegimeResultSchema,
  lucro_real: RegimeResultSchema,
  simples_nacional: RegimeResultSchema.extend({
    fator_r: z.number(),
    anexo: z.string(),
    excede_limite: z.boolean().optional(),
  }),
  regime_mais_economico: z.string(),
  economia_vs_atual: z.number().optional(),
  faturamento_anual: z.number(),
});

export const ComparativoRegimesSimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ─── Simples puro x regime regular de IBS/CBS ──────────────────────

export const SIMULACAO_KINDS = ['regimes', 'simples_ibs_cbs'] as const;
export const ANEXOS_SIMPLES = ['I', 'III', 'IV', 'V'] as const;
export const SimulacaoKindSchema = z.enum(SIMULACAO_KINDS);

export const CATEGORIAS_DESPESA_SIMPLES = [
  'mercadoria',
  'insumo',
  'aluguel',
  'servico_pj',
  'energia',
  'tecnologia',
  'publicidade',
  'seguro',
  'pessoal',
  'tributo',
  'uso_pessoal',
  'outros',
] as const;

/** Categorias que nunca geram crédito de IBS/CBS, mesmo que marcadas na tela. */
export const CATEGORIAS_SEM_CREDITO_SIMPLES = ['pessoal', 'tributo', 'uso_pessoal'] as const;

export const SimplesIbsCbsDespesaSchema = z.object({
  descricao: z.string().trim().min(1).max(120),
  categoria: z.enum(CATEGORIAS_DESPESA_SIMPLES),
  valor_anual: monetaryValue,
  gera_credito: z.boolean().default(true),
  aliquota_credito: z.number().min(0).max(40).default(0),
});

export const SimplesIbsCbsInputSchema = z
  .object({
    ano: z.number().int().min(2027).max(2035).default(2027),
    perfil: z.enum(['servico', 'comercio']),
    anexo: z.enum(ANEXOS_SIMPLES).optional(),
    receita_bruta_anual: z.number().positive(),
    deducoes_anual: monetaryValue.default(0),
    aliquota_efetiva_simples: z.number().min(0).max(33).optional(),
    aliquota_cbs: z.number().min(0).max(30).optional(),
    aliquota_ibs: z.number().min(0).max(30).optional(),
    percentual_vendas_empresas: z.number().min(0).max(100).default(0),
    despesas: z.array(SimplesIbsCbsDespesaSchema).max(100).default([]),
    client_id: z.string().uuid().optional(),
    title: z.string().max(255).optional(),
  })
  .refine((d) => d.deducoes_anual <= d.receita_bruta_anual, {
    message: 'Deduções não podem superar a receita bruta',
    path: ['deducoes_anual'],
  });

const SimplesIbsCbsDespesaResultSchema = z.object({
  descricao: z.string(),
  categoria: z.enum(CATEGORIAS_DESPESA_SIMPLES),
  valor_anual: z.number(),
  gera_credito_informado: z.boolean(),
  gera_credito: z.boolean(),
  aliquota_credito: z.number(),
  credito: z.number(),
  motivo_sem_credito: z.string().optional(),
});

export const SimplesIbsCbsResultSchema = z.object({
  kind: z.literal('simples_ibs_cbs'),
  ano: z.number(),
  perfil: z.enum(['servico', 'comercio']),
  receita_bruta_anual: z.number(),
  deducoes_anual: z.number(),
  receita_liquida_anual: z.number(),
  parametros: z.object({
    versao: z.string(),
    aliquota_cbs: z.number(),
    aliquota_ibs: z.number(),
    aliquota_efetiva_simples: z.number(),
    aliquota_efetiva_simples_informada: z.boolean(),
    anexo: z.string(),
    faixa: z.number(),
    participacao_cbs_das: z.number(),
    participacao_ibs_das: z.number(),
    fracao_ibs_transicao: z.number(),
  }),
  simples_puro: z.object({
    ibs_cbs_anual: z.number(),
    aliquota_sobre_receita: z.number(),
  }),
  regime_regular: z.object({
    debito: z.number(),
    credito: z.number(),
    saldo_recolher: z.number(),
    saldo_credor: z.number(),
    aliquota_sobre_receita: z.number(),
  }),
  despesas: z.array(SimplesIbsCbsDespesaResultSchema),
  efeito_adquirente: z.object({
    percentual_vendas_empresas: z.number(),
    receita_para_empresas: z.number(),
    credito_adquirente_regime_regular: z.number(),
    credito_adquirente_simples_puro: z.number(),
    diferenca: z.number(),
  }),
  diferenca_anual: z.number(),
  regime_mais_economico: z.enum(['simples_puro', 'regime_regular', 'empate']),
  alertas: z.array(z.string()),
  aviso: z.string(),
});

export const ListComparativoRegimesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  kind: SimulacaoKindSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ComparativoRegimesInput = z.infer<typeof ComparativoRegimesInputSchema>;
export type ComparativoRegimesResult = z.infer<typeof ComparativoRegimesResultSchema>;
export type ImpostoDetalhado = z.infer<typeof ImpostoDetalhadoSchema>;
export type RegimeResult = z.infer<typeof RegimeResultSchema>;
export type SimulacaoKind = z.infer<typeof SimulacaoKindSchema>;
export type CategoriaDespesaSimples = (typeof CATEGORIAS_DESPESA_SIMPLES)[number];
export type AnexoSimples = (typeof ANEXOS_SIMPLES)[number];
export type SimplesIbsCbsDespesa = z.infer<typeof SimplesIbsCbsDespesaSchema>;
export type SimplesIbsCbsInput = z.infer<typeof SimplesIbsCbsInputSchema>;
export type SimplesIbsCbsResult = z.infer<typeof SimplesIbsCbsResultSchema>;

export interface ComparativoRegimesSimulation {
  id: string;
  kind: SimulacaoKind;
  client_id: string | null;
  ano: number;
  title: string | null;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

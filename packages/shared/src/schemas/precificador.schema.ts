import { z } from 'zod';

export const PrecificadorInputSchema = z.object({
  custo_servico: z.number().nonnegative(),
  margem_desejada: z.number().nonnegative(),
  margem_tipo: z.enum(['percentual', 'fixo']),
  cnae: z.string().optional(),
  iss_aliquota: z.number().min(0).max(5).default(5),
  faturamento_mensal_estimado: z.number().nonnegative(),
  folha_mensal: z.number().nonnegative(),
  ano: z.number().int().min(2024).max(2035),
});

const PrecificadorImpostoDetalhadoSchema = z.object({
  nome: z.string(),
  valor: z.number(),
  aliquota: z.number(),
});

const PrecificadorRegimeResultSchema = z.object({
  regime: z.string(),
  preco_sugerido: z.number(),
  impostos_detalhados: z.array(PrecificadorImpostoDetalhadoSchema),
  total_impostos: z.number(),
  aliquota_efetiva_sobre_receita: z.number(),
  margem_liquida_resultante: z.number(),
  margem_liquida_percentual: z.number(),
});

export const PrecificadorResultSchema = z.object({
  lucro_presumido: PrecificadorRegimeResultSchema,
  lucro_real: PrecificadorRegimeResultSchema,
  simples_nacional: PrecificadorRegimeResultSchema,
  reforma_ibs_cbs: PrecificadorRegimeResultSchema,
  melhor_regime: z.string(),
  input_resumo: PrecificadorInputSchema,
});

export const CreatePrecificadorSimulationSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().max(255).optional().nullable(),
  input: PrecificadorInputSchema,
});

export const ListPrecificadorSimulationsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const PrecificadorSimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type PrecificadorInput = z.infer<typeof PrecificadorInputSchema>;
export type PrecificadorImpostoDetalhado = z.infer<typeof PrecificadorImpostoDetalhadoSchema>;
export type PrecificadorRegimeResult = z.infer<typeof PrecificadorRegimeResultSchema>;
export type PrecificadorResult = z.infer<typeof PrecificadorResultSchema>;
export type CreatePrecificadorSimulationInput = z.infer<typeof CreatePrecificadorSimulationSchema>;

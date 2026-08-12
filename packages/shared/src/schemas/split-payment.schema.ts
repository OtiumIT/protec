import { z } from 'zod';

export const SplitPaymentInputSchema = z.object({
  faturamento_mensal: z.array(z.number().min(0)).length(12),
  regime_tributario: z.enum(['lucro_presumido', 'lucro_real', 'simples_nacional']),
  percentual_eletronico: z.number().min(0).max(100).default(80),
  prazo_medio_recebimento_dias: z.number().min(0).default(30),
  custo_capital_anual: z.number().min(0).default(13.75),
  aliquota_ibs_cbs: z.number().min(0).max(100).default(26.5),
});

export const SplitPaymentProjecaoMensalSchema = z.object({
  mes: z.number().int().min(1).max(12),
  receita_bruta: z.number(),
  impostos_retidos_split: z.number(),
  receita_liquida_antes: z.number(),
  receita_liquida_depois: z.number(),
  diferenca_caixa: z.number(),
  custo_financeiro_mes: z.number(),
});

export const SplitPaymentResumoSchema = z.object({
  capital_giro_necessario: z.number(),
  custo_financeiro_mensal: z.number(),
  custo_financeiro_anual: z.number(),
  reducao_caixa_percentual: z.number(),
});

export const SplitPaymentResultSchema = z.object({
  resumo: SplitPaymentResumoSchema,
  projecao_mensal: z.array(SplitPaymentProjecaoMensalSchema).length(12),
});

export const CreateSplitPaymentSimulationSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().max(255).optional().nullable(),
  input: SplitPaymentInputSchema,
});

export const ListSplitPaymentSimulationsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const SplitPaymentSimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type SplitPaymentInput = z.infer<typeof SplitPaymentInputSchema>;
export type SplitPaymentProjecaoMensal = z.infer<typeof SplitPaymentProjecaoMensalSchema>;
export type SplitPaymentResumo = z.infer<typeof SplitPaymentResumoSchema>;
export type SplitPaymentResult = z.infer<typeof SplitPaymentResultSchema>;
export type CreateSplitPaymentSimulationInput = z.infer<typeof CreateSplitPaymentSimulationSchema>;

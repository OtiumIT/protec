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

export const ListComparativoRegimesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ComparativoRegimesInput = z.infer<typeof ComparativoRegimesInputSchema>;
export type ComparativoRegimesResult = z.infer<typeof ComparativoRegimesResultSchema>;
export type ImpostoDetalhado = z.infer<typeof ImpostoDetalhadoSchema>;
export type RegimeResult = z.infer<typeof RegimeResultSchema>;

export interface ComparativoRegimesSimulation {
  id: string;
  client_id: string | null;
  ano: number;
  title: string | null;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

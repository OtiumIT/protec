import { z } from 'zod';

// Valor monetário (não negativo, 2 decimais)
const monetaryValue = z.number().nonnegative().multipleOf(0.01).or(z.literal(0));

/**
 * Receitas por tipo de atividade em um trimestre (R$)
 * IN 2.306/2026: presunções - Prod./Merc 8% IRPJ/12% CSLL; Serviços 32%/32%; Favorecida 16% IRPJ; Hospitalar (equiparação) 8%/12%; Demais 100%
 */
export const ReceitasTrimestreSchema = z.object({
  produtos_mercadorias: monetaryValue.optional().default(0),
  servicos: monetaryValue.optional().default(0),
  servicos_favorecida: monetaryValue.optional().default(0),
  servicos_hospitalares: monetaryValue.optional().default(0),
  demais_receitas: monetaryValue.optional().default(0),
});

/**
 * Deduções no trimestre (PIS/COFINS alíq. zero, ICMS destacado)
 */
export const DeducoesTrimestreSchema = z.object({
  pis_cofins_zero: monetaryValue.optional().default(0),
  icms_destacado: monetaryValue.optional().default(0),
}).optional().default({});

/**
 * Retenções no trimestre (IRRF e demais retenções, ex.: 4,65% órgãos públicos, Lei 10.833/03)
 */
export const RetencoesTrimestreSchema = z.object({
  irrf: monetaryValue.optional().default(0),
  orgaos_publicos: monetaryValue.optional().default(0),
}).optional().default({});

/**
 * Input para simulação tributária IN 2.306/2026 (Lucro Presumido)
 * Comparativo: Cálculo 2025 x Projeção 2026 (com aumento) x Cenário Equiparação Hospitalar
 */
export const SimulateTributarioIN2306InputSchema = z.object({
  ano: z.number().int().min(2020).max(2030),
  trimestres: z.array(ReceitasTrimestreSchema).length(4),
  deducoes_trimestrais: z.array(DeducoesTrimestreSchema).length(4).optional(),
  retencoes_trimestrais: z.array(RetencoesTrimestreSchema).length(4).optional(),
  aplicar_equiparacao_hospitalar: z.boolean().optional().default(false),
  client_id: z.string().uuid().optional(),
  save_simulation: z.boolean().optional().default(false),
  title: z.string().max(255).optional(),
});

/**
 * Schema de entrada para simulação IN 2.306/2026 (legado - parcelamento simples)
 */
export const SimulateIN2306InputSchema = z.object({
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve ser YYYY-MM'),
  client_id: z.string().uuid().optional(),
  save_simulation: z.boolean().optional().default(false),
  title: z.string().max(255).optional(),
  valor_total: monetaryValue.optional().default(0),
  valor_entrada: monetaryValue.optional().default(0),
  numero_parcelas: z.number().int().min(1).max(360).optional().default(1),
  tipo_calculo: z.enum(['parcelamento', 'refinanciamento', 'simulacao']).optional().default('simulacao'),
  opcoes: z.record(z.unknown()).optional(),
});

/** Detalhe por trimestre para um cenário */
export const CenarioTrimestreSchema = z.object({
  trimestre: z.number().int().min(1).max(4),
  receita_bruta: z.number(),
  receita_excedente_limite: z.number().optional(),
  base_calculo_irpj: z.number(),
  base_calculo_csll: z.number(),
  irpj: z.number(),
  irpj_adicional: z.number().optional(),
  csll: z.number(),
  irpj_a_rec: z.number(),
  csll_a_rec: z.number(),
  pis_a_rec: z.number().optional(),
  cofins_a_rec: z.number().optional(),
});

/** Resumo anual de um cenário */
export const CenarioAnualSchema = z.object({
  receita_bruta_total: z.number(),
  irpj_total: z.number(),
  irpj_adicional_total: z.number().optional(),
  csll_total: z.number(),
  irpj_a_rec_total: z.number(),
  csll_a_rec_total: z.number(),
  pis_a_rec_total: z.number().optional(),
  cofins_a_rec_total: z.number().optional(),
  trimestres: z.array(CenarioTrimestreSchema),
});

/** Resposta do simulador tributário: 3 cenários + comparativo */
export const SimuladorTributarioResponseSchema = z.object({
  ano: z.number(),
  cenario_2025: CenarioAnualSchema,
  cenario_2026: CenarioAnualSchema,
  cenario_equiparacao: CenarioAnualSchema.optional(),
  comparativo: z.object({
    imposto_a_maior_2026_vs_2025: z.number(),
    imposto_a_maior_2026_vs_equiparacao: z.number().optional(),
    economia_equiparacao_vs_2026: z.number().optional(),
  }),
  memoria_calculo: z.record(z.unknown()).optional(),
});

export const IN2306SimulationResponseSchema = z.object({
  simulation_id: z.string().uuid().optional(),
  input_data: z.record(z.unknown()),
  result_data: z.object({
    valor_total: z.number(),
    valor_entrada: z.number(),
    valor_financiado: z.number(),
    numero_parcelas: z.number(),
    valor_parcela: z.number().optional(),
    parcelas: z.array(z.object({
      numero: z.number(),
      valor: z.number(),
      vencimento: z.string().optional(),
    })).optional(),
    resumo: z.record(z.unknown()).optional(),
  }).or(z.record(z.unknown())),
  is_simulation: z.boolean(),
});

export const ListIN2306SimulationsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  competence: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const IN2306SimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Input para PATCH (atualizar simulação existente). Aceita dados de tributário ou parcelamento.
 * Re-simula com os dados enviados e atualiza o registro.
 */
export const UpdateIN2306SimulationInputSchema = z.union([
  SimulateTributarioIN2306InputSchema.omit({ save_simulation: true }),
  SimulateIN2306InputSchema.omit({ save_simulation: true }),
]);

export type ReceitasTrimestre = z.infer<typeof ReceitasTrimestreSchema>;
export type DeducoesTrimestre = z.infer<typeof DeducoesTrimestreSchema>;
export type RetencoesTrimestre = z.infer<typeof RetencoesTrimestreSchema>;
export type SimulateTributarioIN2306Input = z.infer<typeof SimulateTributarioIN2306InputSchema>;
export type SimulateIN2306Input = z.infer<typeof SimulateIN2306InputSchema>;
export type CenarioTrimestre = z.infer<typeof CenarioTrimestreSchema>;
export type CenarioAnual = z.infer<typeof CenarioAnualSchema>;
export type SimuladorTributarioResponse = z.infer<typeof SimuladorTributarioResponseSchema>;
export type IN2306SimulationResponse = z.infer<typeof IN2306SimulationResponseSchema>;
export type UpdateIN2306SimulationInput = z.infer<typeof UpdateIN2306SimulationInputSchema>;

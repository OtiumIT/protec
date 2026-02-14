import { z } from 'zod';

// Schema para valores monetários (números não negativos com até 2 casas decimais)
const monetaryValue = z.number().nonnegative().multipleOf(0.01).or(z.literal(0));

// Schema para Ativo Circulante (campos granulares)
export const AtivoCirculanteSchema = z.object({
  caixa_equivalentes: monetaryValue.default(0),
  aplicacoes_financeiras: monetaryValue.default(0),
  contas_receber: monetaryValue.default(0),
  estoques: monetaryValue.default(0),
  tributos_recuperar: monetaryValue.default(0),
  despesas_antecipadas: monetaryValue.default(0),
  outros_ativos_circulantes: monetaryValue.default(0),
});

// Schema para Realizável a Longo Prazo
export const RealizavelLongoPrazoSchema = z.object({
  contas_receber_lp: monetaryValue.default(0),
  emprestimos_concedidos: monetaryValue.default(0),
  outros_creditos_lp: monetaryValue.default(0),
});

// Schema para Ativo Não Circulante
export const AtivoNaoCirculanteSchema = z.object({
  realizavel_longo_prazo: RealizavelLongoPrazoSchema.default({}),
  investimentos: monetaryValue.default(0),
  imobilizado: monetaryValue.default(0),
  intangivel: monetaryValue.default(0),
  outros_ativos_nao_circulantes: monetaryValue.default(0),
});

// Schema para Passivo Circulante (campos granulares)
export const PassivoCirculanteSchema = z.object({
  fornecedores: monetaryValue.default(0),
  emprestimos_financiamentos: monetaryValue.default(0),
  obrigacoes_trabalhistas: monetaryValue.default(0),
  tributos_pagar: monetaryValue.default(0),
  contas_pagar: monetaryValue.default(0),
  provisoes: monetaryValue.default(0),
  outros_passivos_circulantes: monetaryValue.default(0),
});

// Schema para Passivo Não Circulante
export const PassivoNaoCirculanteSchema = z.object({
  emprestimos_financiamentos_lp: monetaryValue.default(0),
  obrigacoes_trabalhistas_lp: monetaryValue.default(0),
  tributos_pagar_lp: monetaryValue.default(0),
  provisoes_lp: monetaryValue.default(0),
  outros_passivos_nao_circulantes: monetaryValue.default(0),
});

// Schema para Patrimônio Líquido
export const PatrimonioLiquidoSchema = z.object({
  capital_social: monetaryValue.default(0),
  reservas_capital: monetaryValue.default(0),
  reservas_lucros: monetaryValue.default(0),
  lucros_prejuizos_acumulados: z.number().multipleOf(0.01), // Pode ser negativo
  outros_ajustes: monetaryValue.default(0),
});

// Schema para DRE (opcional)
export const DRESchema = z.object({
  receita_bruta: monetaryValue.default(0),
  deducoes_vendas: monetaryValue.default(0),
  receita_liquida: monetaryValue.optional(), // Calculado automaticamente se não fornecido
  custos_vendas: monetaryValue.default(0),
  despesas_operacionais: monetaryValue.default(0),
  resultado_financeiro: z.number().multipleOf(0.01), // Pode ser negativo
  outros_resultados: z.number().multipleOf(0.01), // Pode ser negativo
}).optional();

// Schema principal para simulação
export const SimulateRatingSchema = z.object({
  // Balanço Patrimonial (campos granulares)
  ativo_circulante: AtivoCirculanteSchema,
  ativo_nao_circulante: AtivoNaoCirculanteSchema,
  passivo_circulante: PassivoCirculanteSchema,
  passivo_nao_circulante: PassivoNaoCirculanteSchema,
  patrimonio_liquido: PatrimonioLiquidoSchema,
  
  // Totais diretos (opcionais - quando o sistema já possui o valor calculado)
  ativo_circulante_total: monetaryValue.optional(),
  realizavel_longo_prazo_total: monetaryValue.optional(),
  passivo_circulante_total: monetaryValue.optional(),
  passivo_nao_circulante_total: monetaryValue.optional(),
  patrimonio_liquido_total: monetaryValue.optional(),
  
  // DRE (opcional)
  dre: DRESchema,
  
  // Metadados
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve ser no formato AAAA-MM (ex.: 2025-01)'),
  client_id: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v)),
  rating_real: z.enum(['A', 'B', 'C', 'D']).optional(),
  save_simulation: z.boolean().optional().default(false),
});

// Schema para resposta de simulação
export const RatingSimulationResponseSchema = z.object({
  // Valores agregados calculados
  calculated_values: z.object({
    ativo_circulante_total: z.number(),
    realizavel_longo_prazo_total: z.number(),
    passivo_circulante_total: z.number(),
    passivo_nao_circulante_total: z.number(),
    patrimonio_liquido_total: z.number(),
    ativo_total: z.number(),
    passivo_total: z.number(),
  }),
  
  // Indicadores calculados
  indicators: z.object({
    liquidez_corrente: z.number(),
    liquidez_geral: z.number(),
    solvencia: z.number(),
  }),
  
  // Ratings
  rating_estimado: z.enum(['A', 'B', 'C', 'D']),
  rating_real: z.enum(['A', 'B', 'C', 'D']).optional(),
  
  // Análise
  has_discrepancy: z.boolean(),
  discrepancy_details: z.object({
    rating_estimado: z.enum(['A', 'B', 'C', 'D']),
    rating_real: z.enum(['A', 'B', 'C', 'D']),
    message: z.string(),
  }).optional(),
  
  // Metadados
  validation_id: z.string().uuid().optional(), // ID se foi salvo
  is_simulation: z.boolean(),
});

// Schema para query params de listagem
export const ListRatingValidationsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM').optional(),
  is_simulation: z.coerce.boolean().optional(),
  rating_estimado: z.enum(['A', 'B', 'C', 'D']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Schema para route params
export const RatingValidationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const RatingValidatorFiscalFileIdParamSchema = z.object({
  fiscal_file_id: z.string().uuid(),
});

// Schema para validação a partir de dados extraídos
export const ValidateFromDataSchema = z.object({
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM'),
  rating_real: z.enum(['A', 'B', 'C', 'D']).optional(),
});

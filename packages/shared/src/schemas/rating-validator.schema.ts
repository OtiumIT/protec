import { z } from 'zod';

/** Arredonda para 2 decimais (evita resíduos de float que falham em multipleOf(0.01)) */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Recursivamente arredonda todos os números de um valor (objetos/arrays). */
function deepRoundNumbers(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === 'number') return round2(value);
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(deepRoundNumbers);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = deepRoundNumbers((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

// Número arredondado para 2 decimais antes de validar (evita falha por resíduos de float)
const numberRounded = z.number().transform(round2);
// Schema para valores monetários (números não negativos com até 2 casas decimais)
const monetaryValue = numberRounded.pipe(z.number().nonnegative().multipleOf(0.01)).or(z.literal(0));

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
  lucros_prejuizos_acumulados: numberRounded.pipe(z.number().multipleOf(0.01)), // Pode ser negativo
  outros_ajustes: monetaryValue.default(0),
});

// Número que pode ser negativo (2 decimais) — usado em DRE
const signedMonetary = numberRounded.pipe(z.number().multipleOf(0.01));

// Schema para DRE (opcional) — todos os valores podem ser negativos
export const DRESchema = z.object({
  receita_bruta: signedMonetary.default(0),
  deducoes_vendas: signedMonetary.default(0),
  receita_liquida: signedMonetary.optional(), // Calculado automaticamente se não fornecido
  custos_vendas: signedMonetary.default(0),
  despesas_operacionais: signedMonetary.default(0),
  resultado_financeiro: signedMonetary.default(0),
  outros_resultados: signedMonetary.default(0),
}).optional();

// =====================================================
// PARCELAMENTO PGFN - Schemas para dados do recibo
// =====================================================

// Schema para cada dívida negociada
export const DividaNegociadaSchema = z.object({
  numero_divida: z.string(),
  devedor_cnpj: z.string().optional(),
  codigo_receita: z.string().optional(),
  data_consolidacao: z.string().optional(),
  principal: monetaryValue,
  multa: monetaryValue,
  juros: monetaryValue,
  encargo_legal: monetaryValue,
  total: monetaryValue,
});

// Schema para capacidade de pagamento calculada pela PGFN
export const CapacidadePagamentoPGFNSchema = z.object({
  valor_divida_adesao: monetaryValue,
  capacidade_60_meses: monetaryValue,
  permite_desconto: z.boolean(),
  desconto_maximo_pct: z.number().min(0).max(100),
});

// Schema para demonstrativo de consolidação
export const ConsolidacaoParcelamentoSchema = z.object({
  principal: monetaryValue,
  multa: monetaryValue,
  juros: monetaryValue,
  encargo_legal: monetaryValue,
  total_sem_desconto: monetaryValue,
  entrada_total: monetaryValue,
  desconto_total: monetaryValue,
  creditos_utilizados: monetaryValue.optional(),
  total_a_pagar: monetaryValue,
});

// Schema para dados de pagamento (entrada e parcelas)
export const PagamentoParcelamentoSchema = z.object({
  entrada_qtd: z.number().int().nonnegative(),
  entrada_valor: monetaryValue,
  parcelas_qtd: z.number().int().nonnegative(),
  parcelas_valor: monetaryValue,
});

// Schema principal do Parcelamento PGFN
export const ParcelamentoPGFNSchema = z.object({
  numero_conta: z.string().optional(),
  cnpj: z.string(),
  razao_social: z.string(),
  negociacao: z.string(),
  modalidade: z.string(),
  data_adesao: z.string(),
  
  dividas: z.array(DividaNegociadaSchema),
  
  capacidade_pagamento: CapacidadePagamentoPGFNSchema,
  
  consolidacao: ConsolidacaoParcelamentoSchema,
  
  pagamento: PagamentoParcelamentoSchema,
  
  rating_inferido: z.enum(['A', 'B', 'C', 'D']).optional(),
});

// =====================================================
// SIMULAÇÃO - Schema principal
// =====================================================

// Schema principal para simulação (com pré-processamento que arredonda todos os números)
const SimulateRatingSchemaRaw = z.object({
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
  
  // Dados do parcelamento PGFN (opcional - para comparativo)
  parcelamento_pgfn: ParcelamentoPGFNSchema.optional(),
});

/** Schema com pré-processamento: arredonda todos os números do body antes de validar (evita 400 por resíduos de float). */
export const SimulateRatingSchema = z.preprocess(
  (data) => (data != null && typeof data === 'object' ? deepRoundNumbers(data) : data),
  SimulateRatingSchemaRaw
);

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

export const RealValidationOverridesSchema = z.object({
  ativo_circulante_total: monetaryValue.optional(),
  realizavel_longo_prazo_total: monetaryValue.optional(),
  outros_ativos_nao_circulantes: monetaryValue.optional(),
  passivo_circulante_total: monetaryValue.optional(),
  passivo_nao_circulante_total: monetaryValue.optional(),
  patrimonio_liquido_total: monetaryValue.optional(),
  dre: z
    .object({
      receita_bruta: signedMonetary.optional(),
      deducoes_vendas: signedMonetary.optional(),
      receita_liquida: signedMonetary.optional(),
      custos_vendas: signedMonetary.optional(),
      despesas_operacionais: signedMonetary.optional(),
      resultado_financeiro: signedMonetary.optional(),
      outros_resultados: signedMonetary.optional(),
    })
    .optional(),
});

// Schema para validação a partir de dados extraídos
export const ValidateFromDataSchema = z.object({
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM'),
  rating_real: z.enum(['A', 'B', 'C', 'D']).optional(),
  overrides: RealValidationOverridesSchema.optional(),
});

export const ListProcessedEcdFilesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM').optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

/** Query GET /rating-validator/processed-ecd-competences — competências distintas com ECD processado */
export const ProcessedEcdCompetencesQuerySchema = z.object({
  client_id: z.string().uuid(),
});

/** Query GET /rating-validator/prefill-by-competence */
export const PrefillByCompetenceQuerySchema = z.object({
  client_id: z.string().uuid(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM'),
});

/** Body POST /rating-validator/validate-by-competence */
export const ValidateByCompetenceBodySchema = z.object({
  client_id: z.string().uuid(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM'),
  rating_real: z.enum(['A', 'B', 'C', 'D']).optional(),
  overrides: RealValidationOverridesSchema.optional(),
});

// Schema para extração de PDF do recibo PGFN (resposta da API)
export const ExtractPGFNPdfResponseSchema = z.object({
  parcelamento: ParcelamentoPGFNSchema,
  confianca_extracao: z.number().min(0).max(100).optional(),
  campos_incertos: z.array(z.string()).optional(),
});

// Schema para comparativo de parcelamento
export const ComparativoParcelamentoSchema = z.object({
  rating_calculado: z.enum(['A', 'B', 'C', 'D']),
  rating_pgfn: z.enum(['A', 'B', 'C', 'D']),
  divergencia: z.boolean(),
  
  cenario_calculado: z.object({
    desconto_maximo_multa_juros_pct: z.number(),
    prazo_maximo_meses: z.number(),
    entrada_minima_pct: z.number(),
  }),
  
  cenario_pgfn: z.object({
    valor_total_divida: z.number(),
    entrada_total: z.number(),
    entrada_pct: z.number(),
    parcelas_qtd: z.number(),
    parcelas_valor: z.number(),
    desconto_aplicado_pct: z.number(),
    total_a_pagar: z.number(),
  }),
  
  diferenca_financeira: z.object({
    economia_potencial: z.number(),
    parcelas_extras_disponiveis: z.number(),
    valor_excedente_entrada: z.number(),
  }),
  
  fundamentacao_juridica: z.string(),
});

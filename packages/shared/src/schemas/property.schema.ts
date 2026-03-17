import { z } from 'zod';

const monetaryValue = z.number().nonnegative().multipleOf(0.01).or(z.literal(0));

export const TipoLocacaoSchema = z.enum(['fixa', 'flexivel']);
export type TipoLocacao = z.infer<typeof TipoLocacaoSchema>;

export const TransactionTipoSchema = z.enum([
  'receita',
  'despesa_dedutivel',
  'custo_operacional',
]);
export type TransactionTipo = z.infer<typeof TransactionTipoSchema>;

export const TransactionCategoriaSchema = z.enum([
  'aluguel',
  'diarias',
  'iptu',
  'condominio',
  'taxa_imobiliaria',
  'taxa_plataforma',
  'reforma',
  'mobilia',
  'limpeza',
  'energia',
  'internet',
  'taxa_intermediacao',
  'outros',
]);
export type TransactionCategoria = z.infer<typeof TransactionCategoriaSchema>;

export const ModoEntradaSchema = z.enum(['detalhado', 'reduzido']);
export type ModoEntrada = z.infer<typeof ModoEntradaSchema>;

export const CreatePropertySchema = z.object({
  client_id: z.string().uuid(),
  tipo_locacao: TipoLocacaoSchema,
  identificador: z.string().min(1).max(255),
  modo_entrada: ModoEntradaSchema.optional().default('detalhado'),
});

export const UpdatePropertySchema = z.object({
  client_id: z.string().uuid().optional(),
  tipo_locacao: TipoLocacaoSchema.optional(),
  identificador: z.string().min(1).max(255).optional(),
  modo_entrada: ModoEntradaSchema.optional(),
});

/** Modo reduzido: totais mensais (locação longa + short) */
export const PropertyMonthlyTotalSchema = z.object({
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
  receita_longa: monetaryValue,
  receita_short: monetaryValue,
  despesas_dedutiveis: monetaryValue,
  custos_operacionais: monetaryValue,
});

export const UpsertMonthlyTotalsSchema = z.object({
  property_id: z.string().uuid().optional(),
  ano: z.number().int().min(2020).max(2030),
  meses: z.array(PropertyMonthlyTotalSchema).min(1).max(12),
});

export const PropertyTransactionSchema = z.object({
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
  tipo: TransactionTipoSchema,
  categoria: TransactionCategoriaSchema,
  valor: monetaryValue,
  observacao: z.string().max(500).optional(),
});

export const BatchPropertyTransactionSchema = z.object({
  property_id: z.string().uuid(),
  transactions: z.array(PropertyTransactionSchema).min(1),
});

/** Perfil de locação para redutor Reforma: residencial 70%, hospedagem/temporada 50%, ou ambos (proporcional) */
export const PerfilLocacaoReformaSchema = z.enum(['residencial_comum', 'hospedagem_temporada', 'ambos']);
export type PerfilLocacaoReforma = z.infer<typeof PerfilLocacaoReformaSchema>;

export const OpcoesReformaSchema = z.object({
  /** Alíquota nominal estimada do IVA (IBS+CBS). Em 2027/2028 sugere-se 9% (só CBS); 2029+ 26,5% a 28%. Mantido para compatibilidade. */
  aliquota_ibs_cbs_estimada: z.number().min(0).max(100).optional().default(26.5),
  /** Alíquota plena IBS (%) para transição 2029+. Usado na tabela e no cálculo. Default 19. */
  aliquota_ibs_plena: z.number().min(0).max(100).optional().default(19),
  /** Alíquota CBS estimada (%). Em 2027/2028 e 2029+ somada ao IBS. Default 9. */
  aliquota_cbs_estimada: z.number().min(0).max(100).optional().default(9),
  /** Redutor para locação residencial (reforma): 70 = alíquota efetiva = nominal × 30%. Padrão 70. */
  redutor_locacao_pct: z.number().min(0).max(100).optional(),
  /** Redutor para curta temporada / hospedagem: 50%. Usado quando perfil é hospedagem. */
  redutor_short_stay_pct: z.number().min(0).max(100).optional().default(50),
  /** Contrato firmado antes de 16/01/2025? Regime de transição Art. 487 LC 214/25: opção 3,65% sobre faturamento bruto. */
  contrato_antes_16012025: z.boolean().optional().default(false),
  /** Perfil: residencial_comum (70%), hospedagem_temporada (50%) ou ambos (70%+50% proporcional). */
  perfil_locacao: PerfilLocacaoReformaSchema.optional(),
  /**
   * Redutor social anual para locação residencial (LC 214/2025, arts. 259 e 260).
   * Valor absoluto em reais (ex.: 600 × 12 × número de imóveis residenciais).
   * Opcional para manter compatibilidade; calculado no backend quando não enviado.
   */
  redutor_social_residencial_anual: monetaryValue.optional(),
});

/** Simulador standalone: campos granulares por mês */
export const SimulateStandaloneMesSchema = z.object({
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM'),
  // Receitas
  receita_aluguel_tradicional: monetaryValue.optional().default(0),
  receita_aluguel_curto: monetaryValue.optional().default(0),
  receita_garagem: monetaryValue.optional().default(0),
  receita_outras: monetaryValue.optional().default(0),
  // Despesas dedutíveis (Lei 7.713/88 - PF)
  iptu: monetaryValue.optional().default(0),
  condominio: monetaryValue.optional().default(0),
  seguro_imovel: monetaryValue.optional().default(0),
  juros_financiamento: monetaryValue.optional().default(0),
  manutencao_conservacao: monetaryValue.optional().default(0),
  outras_dedutiveis: monetaryValue.optional().default(0),
  // Custos operacionais (Reforma IBS/CBS e análise)
  reformas_melhorias: monetaryValue.optional().default(0),
  mobilia_equipamentos: monetaryValue.optional().default(0),
  limpeza_higienizacao: monetaryValue.optional().default(0),
  comissao_corretagem: monetaryValue.optional().default(0),
  taxa_plataforma: monetaryValue.optional().default(0),
  outros_custos: monetaryValue.optional().default(0),
});

/** Simulador standalone: dados diretos por mês, sem cadastro de imóveis */
export const SimulateStandaloneInputSchema = z.object({
  ano: z.number().int().min(2020).max(2030),
  meses: z.array(SimulateStandaloneMesSchema).length(12),
  aplicar_equiparacao_hospitalar: z.boolean().optional().default(false),
  opcoes_reforma: OpcoesReformaSchema.optional(),
  /** Quantidade de imóveis para análise de contribuinte IBS/CBS (Reforma 2027) */
  quantidade_imoveis: z.number().int().min(1).optional(),
  /** Quantidade de imóveis residenciais (com direito ao redutor social LC 214/2025) */
  quantidade_imoveis_residenciais: z.number().int().min(0).optional(),
  /** Quantidade de imóveis comerciais (sem redutor social) */
  quantidade_imoveis_comerciais: z.number().int().min(0).optional(),
});

/** Input para simular e salvar (persistir simulação standalone) */
export const SimulateStandaloneAndSaveInputSchema = SimulateStandaloneInputSchema.extend({
  client_id: z.string().uuid().optional(),
  save_simulation: z.boolean().optional().default(false),
  title: z.string().max(255).optional(),
});

export const SimulatePropertyTaxInputSchema = z.object({
  ano: z.number().int().min(2020).max(2030),
  property_ids: z.array(z.string().uuid()).min(1),
  aliquota_efetiva_dirpf: z.number().min(0).max(100).optional(),
  aplicar_presuncao_16_servicos: z.boolean().optional().default(false),
  aplicar_equiparacao_hospitalar: z.boolean().optional().default(false),
  opcoes_reforma: OpcoesReformaSchema.optional(),
  /** Quantidade de imóveis residenciais (com direito ao redutor social LC 214/2025) */
  quantidade_imoveis_residenciais: z.number().int().min(0).optional(),
  /** Quantidade de imóveis comerciais (sem redutor social) */
  quantidade_imoveis_comerciais: z.number().int().min(0).optional(),
});

/** Input para simular por property_ids e salvar no histórico (ex.: tela de detalhe do imóvel). */
export const SimulatePropertyTaxAndSaveInputSchema = SimulatePropertyTaxInputSchema.extend({
  client_id: z.string().uuid(),
  title: z.string().max(255).optional(),
});

export const CenarioPFSchema = z.object({
  receita_bruta_total: z.number(),
  despesas_dedutiveis_total: z.number(),
  base_calculo_total: z.number(),
  imposto_total: z.number(),
  aliquota_efetiva_anual: z.number(),
  trimestres: z.array(z.object({
    trimestre: z.number(),
    receita: z.number(),
    despesas_dedutiveis: z.number(),
    base_calculo: z.number(),
    imposto: z.number(),
  })),
});

export const CenarioPJSchema = z.object({
  receita_bruta_total: z.number(),
  base_presumida_irpj: z.number(),
  base_presumida_csll: z.number(),
  irpj: z.number(),
  irpj_adicional: z.number().optional(),
  irpj_postergado: z.number().optional(),
  csll: z.number(),
  pis: z.number(),
  cofins: z.number(),
  imposto_total: z.number(),
  aliquota_efetiva: z.number(),
  aplicou_in_2306: z.boolean(),
  aplicou_presuncao_16: z.boolean().optional(),
  trimestres: z.array(z.object({
    trimestre: z.number(),
    receita: z.number(),
    base_irpj: z.number(),
    base_csll: z.number(),
    presuncao_irpj_pct: z.number().optional(),
    irpj: z.number(),
    irpj_adicional: z.number().optional(),
    irpj_postergado: z.number().optional(),
    csll: z.number(),
    pis: z.number(),
    cofins: z.number(),
  })),
});

export const CenarioReforma2027Schema = z.object({
  receita_bruta_total: z.number(),
  custos_operacionais_total: z.number(),
  creditos_ibs_cbs: z.number(),
  ibs_cbs_sobre_receita: z.number(),
  ibs_cbs_liquido: z.number(),
  imposto_total: z.number(),
  aliquota_efetiva: z.number(),
  /** Alíquota nominal IBS/CBS (antes do redutor locação), para exibição */
  aliquota_nominal_ibs_cbs: z.number().optional(),
  /** Redutor aplicado para locação (ex.: 70), para exibição */
  redutor_locacao_aplicado_pct: z.number().optional(),
  /** Na ótica PF em 2027: IR (Carnê-Leão) continua; imposto_total = ir_pf + ibs_cbs_liquido */
  ir_pf: z.number().optional(),
  /** Regime transição Art. 487: valor do imposto a 3,65% sobre receita bruta */
  imposto_transicao_365: z.number().optional(),
  /** true se foi aplicado o regime de transição (3,65%) por ser menor que o regime normal */
  aplicou_transicao_art487: z.boolean().optional(),
  /** true quando foi aplicado redutor 50% na parte short stay (hospedagem/temporada) */
  redutor_diferenciado_short: z.boolean().optional(),
  /** Na ótica PJ em 2027+: IRPJ e CSLL (excl. PIS/COFINS substituídos por IBS/CBS) */
  irpj: z.number().optional(),
  csll: z.number().optional(),
});

export const BreakEvenSchema = z.object({
  valor_mensal_break_even: z.number(),
  descricao: z.string(),
});

/** Embasamento legal por cenário (PF, PJ, Reforma) */
export const EmbasamentoLegalSchema = z.object({
  cenario: z.enum(['pf', 'pj', 'reforma']),
  norma: z.string(),
  artigo: z.string().optional(),
  descricao: z.string(),
});
export type EmbasamentoLegal = z.infer<typeof EmbasamentoLegalSchema>;

export const FluxoCaixaSchema = z.object({
  property_id: z.string().uuid(),
  identificador: z.string(),
  receita_total: z.number(),
  despesas_total: z.number(),
  impostos_pf: z.number(),
  impostos_pj: z.number(),
  lucro_liquido_pf: z.number(),
  lucro_liquido_pj: z.number(),
});

export const PropertyTaxSimulationResponseSchema = z.object({
  ano: z.number(),
  cenarios: z.object({
    pf: CenarioPFSchema,
    pj: CenarioPJSchema,
    /** Reforma 2027 (IBS/CBS) na ótica Pessoa Física – mesma base de cálculo, para comparação */
    reforma_2027_pf: CenarioReforma2027Schema.optional(),
    /** Reforma 2027 (IBS/CBS) na ótica Pessoa Jurídica – substitui PIS/COFINS na atividade */
    reforma_2027_pj: CenarioReforma2027Schema.optional(),
    /** @deprecated use reforma_2027_pf / reforma_2027_pj */
    reforma_2027: CenarioReforma2027Schema.optional(),
  }),
  break_even: BreakEvenSchema.optional(),
  fluxo_caixa: z.array(FluxoCaixaSchema),
  memoria_calculo: z.record(z.unknown()).optional(),
  /** Embasamentos legais por cenário (PF, PJ, Reforma 2027) */
  embasamentos_legais: z.array(EmbasamentoLegalSchema).optional(),
});

export const ListPropertiesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const ListTransactionsQuerySchema = z.object({
  ano: z.coerce.number().int().optional(),
  mes: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const PropertyIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const TransactionIdParamSchema = z.object({
  id: z.string().uuid(),
  txId: z.string().uuid(),
});

export const PropertySimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const ListPropertySimulationsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  ano: z.coerce.number().int().min(2020).max(2035).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const UpdatePropertySimulationInputSchema = SimulateStandaloneInputSchema;

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type PropertyMonthlyTotalInput = z.infer<typeof PropertyMonthlyTotalSchema>;
export type UpsertMonthlyTotalsInput = z.infer<typeof UpsertMonthlyTotalsSchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
export type PropertyTransactionInput = z.infer<typeof PropertyTransactionSchema>;
export type BatchPropertyTransactionInput = z.infer<typeof BatchPropertyTransactionSchema>;
export type SimulateStandaloneMesInput = z.infer<typeof SimulateStandaloneMesSchema>;
export type SimulateStandaloneInput = z.infer<typeof SimulateStandaloneInputSchema>;
export type SimulateStandaloneAndSaveInput = z.infer<typeof SimulateStandaloneAndSaveInputSchema>;
export type SimulatePropertyTaxInput = z.infer<typeof SimulatePropertyTaxInputSchema>;
export type SimulatePropertyTaxAndSaveInput = z.infer<typeof SimulatePropertyTaxAndSaveInputSchema>;
export type UpdatePropertySimulationInput = z.infer<typeof UpdatePropertySimulationInputSchema>;

export interface PropertySimulation {
  id: string;
  client_id: string | null;
  ano: number;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type PropertyTaxSimulationResponse = z.infer<typeof PropertyTaxSimulationResponseSchema>;
export type CenarioPF = z.infer<typeof CenarioPFSchema>;
export type CenarioPJ = z.infer<typeof CenarioPJSchema>;
export type CenarioReforma2027 = z.infer<typeof CenarioReforma2027Schema>;
export type BreakEven = z.infer<typeof BreakEvenSchema>;
export type FluxoCaixa = z.infer<typeof FluxoCaixaSchema>;

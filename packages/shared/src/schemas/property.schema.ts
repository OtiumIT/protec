import { z } from 'zod';

const monetaryValue = z.number().nonnegative().multipleOf(0.01).or(z.literal(0));

export const TipoLocacaoSchema = z.enum(['fixa', 'flexivel']);
export type TipoLocacao = z.infer<typeof TipoLocacaoSchema>;
export const NaturezaLocacaoSchema = z.enum(['residencial', 'nao_residencial']);
export type NaturezaLocacao = z.infer<typeof NaturezaLocacaoSchema>;

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
  'camareira',
  'seguranca',
  'material_limpeza',
  'lavanderia_enxoval',
  'checkin_checkout',
  'taxas_meios_pagamento',
  'tarifas_bancarias',
  'mao_de_obra_operacional',
  'encargos_folha',
  'vacancia',
  'inadimplencia',
  'outros',
]);
export type TransactionCategoria = z.infer<typeof TransactionCategoriaSchema>;
export const TipoCreditoFiscalSchema = z.enum(['insumo', 'uso_consumo', 'nao_creditavel']);
export type TipoCreditoFiscal = z.infer<typeof TipoCreditoFiscalSchema>;

export const ModoEntradaSchema = z.enum(['detalhado', 'reduzido']);
export type ModoEntrada = z.infer<typeof ModoEntradaSchema>;

export const CreatePropertySchema = z.object({
  client_id: z.string().uuid(),
  tipo_locacao: TipoLocacaoSchema,
  natureza_locacao: NaturezaLocacaoSchema.optional().default('residencial'),
  identificador: z.string().min(1).max(255),
  valor_aluguel_mensal: monetaryValue.optional().default(0),
  modo_entrada: ModoEntradaSchema.optional().default('detalhado'),
  matricula_imovel: z.string().max(100).optional(),
  inscricao_iptu: z.string().max(100).optional(),
  cartorio_registro: z.string().max(255).optional(),
  cep: z.string().max(10).optional(),
  logradouro: z.string().max(255).optional(),
  numero: z.string().max(30).optional(),
  complemento: z.string().max(120).optional(),
  bairro: z.string().max(120).optional(),
  cidade: z.string().max(120).optional(),
  uf: z.string().max(2).optional(),
  iptu_mensal_padrao: monetaryValue.optional(),
  condominio_mensal_padrao: monetaryValue.optional(),
  seguro_mensal_padrao: monetaryValue.optional(),
  camareira_mensal_padrao: monetaryValue.optional(),
  seguranca_mensal_padrao: monetaryValue.optional(),
  material_limpeza_mensal_padrao: monetaryValue.optional(),
  lavanderia_enxoval_mensal_padrao: monetaryValue.optional(),
  checkin_checkout_mensal_padrao: monetaryValue.optional(),
  taxas_pagamento_mensal_padrao: monetaryValue.optional(),
  tarifas_bancarias_mensal_padrao: monetaryValue.optional(),
  vacancia_mensal_padrao: monetaryValue.optional(),
  inadimplencia_mensal_padrao: monetaryValue.optional(),
});

export const CreatePropertyBatchItemSchema = CreatePropertySchema.omit({
  client_id: true,
});

export const CreatePropertiesBatchSchema = z.object({
  client_id: z.string().uuid(),
  properties: z.array(CreatePropertyBatchItemSchema).min(1).max(200),
});

export const UpdatePropertySchema = z.object({
  client_id: z.string().uuid().optional(),
  tipo_locacao: TipoLocacaoSchema.optional(),
  natureza_locacao: NaturezaLocacaoSchema.optional(),
  identificador: z.string().min(1).max(255).optional(),
  valor_aluguel_mensal: monetaryValue.optional(),
  modo_entrada: ModoEntradaSchema.optional(),
  matricula_imovel: z.string().max(100).optional(),
  inscricao_iptu: z.string().max(100).optional(),
  cartorio_registro: z.string().max(255).optional(),
  cep: z.string().max(10).optional(),
  logradouro: z.string().max(255).optional(),
  numero: z.string().max(30).optional(),
  complemento: z.string().max(120).optional(),
  bairro: z.string().max(120).optional(),
  cidade: z.string().max(120).optional(),
  uf: z.string().max(2).optional(),
  iptu_mensal_padrao: monetaryValue.optional(),
  condominio_mensal_padrao: monetaryValue.optional(),
  seguro_mensal_padrao: monetaryValue.optional(),
  camareira_mensal_padrao: monetaryValue.optional(),
  seguranca_mensal_padrao: monetaryValue.optional(),
  material_limpeza_mensal_padrao: monetaryValue.optional(),
  lavanderia_enxoval_mensal_padrao: monetaryValue.optional(),
  checkin_checkout_mensal_padrao: monetaryValue.optional(),
  taxas_pagamento_mensal_padrao: monetaryValue.optional(),
  tarifas_bancarias_mensal_padrao: monetaryValue.optional(),
  vacancia_mensal_padrao: monetaryValue.optional(),
  inadimplencia_mensal_padrao: monetaryValue.optional(),
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
  gera_credito_ibs_cbs: z.boolean().optional(),
  tipo_credito: TipoCreditoFiscalSchema.optional(),
  observacao: z.string().max(500).optional(),
});

export const BatchPropertyTransactionSchema = z.object({
  property_id: z.string().uuid(),
  transactions: z.array(PropertyTransactionSchema).min(1),
});

/** Perfil de locação para redutor Reforma: residencial 70%, hospedagem/temporada 40% (Art. 281), ou ambos (proporcional) */
export const PerfilLocacaoReformaSchema = z.enum(['residencial_comum', 'hospedagem_temporada', 'ambos']);
export type PerfilLocacaoReforma = z.infer<typeof PerfilLocacaoReformaSchema>;

export const OpcoesReformaSchema = z.object({
  /** Ano de referência para o cálculo Reforma (2027-2033). Default 2033 (reforma integral). */
  ano_referencia_reforma: z.number().int().min(2027).max(2033).optional().default(2033),
  /** Alíquota nominal estimada do IVA (IBS+CBS). Em 2027/2028 sugere-se 9% (só CBS); 2029+ 26,5% a 28%. Mantido para compatibilidade. */
  aliquota_ibs_cbs_estimada: z.number().min(0).max(100).optional().default(26.5),
  /** Alíquota plena IBS (%) para transição 2029+. Usado na tabela e no cálculo. Default 19. */
  aliquota_ibs_plena: z.number().min(0).max(100).optional().default(19),
  /** Alíquota CBS estimada (%). Em 2027/2028 e 2029+ somada ao IBS. Default 9. */
  aliquota_cbs_estimada: z.number().min(0).max(100).optional().default(9),
  /** Redutor para locação residencial (reforma): 70 = alíquota efetiva = nominal × 30%. Padrão 70. */
  redutor_locacao_pct: z.number().min(0).max(100).optional(),
  /** Redutor para curta temporada / hospedagem: 40% (Art. 281 LC 214/2025). */
  redutor_short_stay_pct: z.number().min(0).max(100).optional().default(40),
  /** Contrato firmado antes de 16/01/2025? Regime de transição Art. 487 LC 214/25: opção 3,65% sobre faturamento bruto. */
  contrato_antes_16012025: z.boolean().optional().default(false),
  /** Perfil: residencial_comum (70%), hospedagem_temporada (40%, Art. 281) ou ambos (70%+40% proporcional). */
  perfil_locacao: PerfilLocacaoReformaSchema.optional(),
  /**
   * Redutor social anual para locação residencial (LC 214/2025, arts. 259 e 260).
   * Valor absoluto em reais (ex.: 600 × 12 × número de imóveis residenciais).
   * Opcional para manter compatibilidade; calculado no backend quando não enviado.
   */
  redutor_social_residencial_anual: monetaryValue.optional(),
  /** Override: teto com mais de 3 imóveis (R$). Se só este campo for enviado, o absoluto usa 120% deste valor. */
  limite_receita_contribuinte_pf_manual: monetaryValue.optional(),
  /** Override: teto absoluto PF contribuinte IBS/CBS (R$). */
  limite_receita_absoluto_contribuinte_pf_manual: monetaryValue.optional(),
  /** Override: redutor social mensal por imóvel residencial (R$), antes de multiplicar por 12 × quantidade. */
  redutor_social_mensal_manual: monetaryValue.optional(),
});

export type OpcoesReforma = z.infer<typeof OpcoesReformaSchema>;

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
  custo_camareira: monetaryValue.optional().default(0),
  custo_seguranca: monetaryValue.optional().default(0),
  custo_material_limpeza: monetaryValue.optional().default(0),
  custo_lavanderia_enxoval: monetaryValue.optional().default(0),
  custo_checkin_checkout_terceiros: monetaryValue.optional().default(0),
  taxas_meios_pagamento: monetaryValue.optional().default(0),
  tarifas_bancarias: monetaryValue.optional().default(0),
  mao_de_obra_operacional: monetaryValue.optional().default(0),
  encargos_folha: monetaryValue.optional().default(0),
  vacancia_estimada: monetaryValue.optional().default(0),
  inadimplencia_estimada: monetaryValue.optional().default(0),
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
  /** Quantidade total de imóveis residenciais (longa + curta), para teste de contribuinte PF IBS/CBS */
  quantidade_imoveis_residenciais: z.number().int().min(0).optional(),
  /** Quantidade de imóveis residenciais de LONGA duração (> 90 dias) — somente estes geram redutor social Art. 260 LC 214/2025 */
  quantidade_imoveis_residenciais_longa: z.number().int().min(0).optional(),
  /** Quantidade de imóveis comerciais (sem redutor social) */
  quantidade_imoveis_comerciais: z.number().int().min(0).optional(),
  /** Receita anual de locação de imóveis residenciais (para redutor social R$ 600 e redutor da alíquota). Obrigatório quando misto residencial+comercial. */
  receita_locacao_residencial_anual: monetaryValue.optional(),
  /** Receita anual de locação de imóveis não residenciais (sem redutor social). */
  receita_locacao_nao_residencial_anual: monetaryValue.optional(),
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
  /** Quantidade total de imóveis residenciais (longa + curta), para teste de contribuinte PF IBS/CBS */
  quantidade_imoveis_residenciais: z.number().int().min(0).optional(),
  /** Quantidade de imóveis residenciais de LONGA duração (> 90 dias) — somente estes geram redutor social Art. 260 LC 214/2025 */
  quantidade_imoveis_residenciais_longa: z.number().int().min(0).optional(),
  /** Quantidade de imóveis comerciais (sem redutor social) */
  quantidade_imoveis_comerciais: z.number().int().min(0).optional(),
  /** Receita anual de locação de imóveis residenciais (para redutor social R$ 600 e redutor da alíquota). */
  receita_locacao_residencial_anual: monetaryValue.optional(),
  /** Receita anual de locação de imóveis não residenciais (sem redutor social). */
  receita_locacao_nao_residencial_anual: monetaryValue.optional(),
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
  /** IBS/CBS líquido antes de aplicar redutor social (para memória de cálculo). */
  ibs_cbs_antes_redutor_social: z.number().optional(),
  /**
   * Dedução anual na base de cálculo (receita de longa duração), em R$:
   * min(receita longa, redutor_social_residencial_anual). Art. 260 (12 meses × valor mensal corrigido × imóveis).
   */
  redutor_social_base_deduzida_anual: z.number().optional(),
  /** Redução do IBS/CBS em R$ correspondente à base deduzida (base deduzida × alíquota efetiva). */
  redutor_social_aplicado: z.number().optional(),
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
  /** true quando foi aplicado redutor 40% na parte short stay (hospedagem/temporada, Art. 281) */
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

export const AnaliseCategoriaCustoSchema = z.object({
  categoria: z.string(),
  valor: z.number(),
  participacao_percentual: z.number(),
  impacto_lucro_liquido: z.number(),
  gera_credito_ibs_cbs: z.boolean(),
  credito_potencial: z.number(),
});

export const AnaliseCustosSchema = z.object({
  custo_total: z.number(),
  custo_outros_percentual: z.number(),
  categorias: z.array(AnaliseCategoriaCustoSchema),
  creditos_ibs_cbs: z.object({
    total_potencial: z.number(),
    total_aproveitado: z.number(),
    nao_aproveitado: z.number(),
  }),
  indicadores: z.object({
    margem_operacional_antes_tributos: z.number(),
    margem_operacional_apos_tributos_pf: z.number(),
    margem_operacional_apos_tributos_pj: z.number(),
    custo_medio_mensal: z.number(),
    custo_por_diaria: z.number().optional(),
  }),
  sensibilidade: z.object({
    cenario_base_lucro_liquido_pj: z.number(),
    cenario_custos_mais_10_lucro_liquido_pj: z.number(),
    variacao_lucro_liquido_pj: z.number(),
  }),
  alertas: z.array(z.string()),
});

export const IndicesLc214Schema = z.object({
  ipca_fonte: z.enum(['bcb_online', 'cache', 'embutido']),
  serie_sgs_codigo: z.number(),
  mes_referencia_fim: z.string(),
  fator_acumulado_desde_publicacao: z.number(),
  redutor_social_mensal_nominal: z.number(),
  redutor_social_mensal_efetivo: z.number(),
  limite_receita_pf_contribuinte: z.number(),
  limite_receita_pf_absoluto: z.number(),
  data_consulta_bcb: z.string().optional(),
  parametros_origem: z.enum(['calculado', 'manual_parcial', 'manual_completo']),
});

export type IndicesLc214 = z.infer<typeof IndicesLc214Schema>;

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
  analise_custos: AnaliseCustosSchema.optional(),
  memoria_calculo: z.record(z.unknown()).optional(),
  /** IPCA/LC 214: índices e parâmetros efetivos (transparência). */
  indices_lc214: IndicesLc214Schema.optional(),
  /** Embasamentos legais por cenário (PF, PJ, Reforma 2027) */
  embasamentos_legais: z.array(EmbasamentoLegalSchema).optional(),
});

export const FiscalIndicesIpcaQuerySchema = z.object({
  ano: z.coerce.number().int().min(2020).max(2035),
});

export const FiscalIndicesIpcaSeriesQuerySchema = z.object({
  ano: z.coerce.number().int().min(2020).max(2035),
  janela: z.coerce.number().int().min(6).max(60).default(24),
});

export const IpcaSerieMesSchema = z.object({
  mes_referencia: z.string().regex(/^\d{4}-\d{2}$/),
  variacao_mensal_pct: z.number(),
  acumulado_ano_pct: z.number(),
  acumulado_12m_pct: z.number(),
  fator_lc214_no_mes: z.number(),
});

export const FiscalIndicesIpcaSeriesResponseSchema = z.object({
  fonte: z.enum(['bcb_online', 'cache', 'embutido']),
  serie_sgs_codigo: z.number(),
  data_consulta_bcb: z.string().optional(),
  ano_calendario: z.number(),
  mes_referencia_fim: z.string().regex(/^\d{4}-\d{2}$/),
  mes_mais_recente_serie: z.string().regex(/^\d{4}-\d{2}$/),
  meses: z.array(IpcaSerieMesSchema),
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
export type CreatePropertyBatchItemInput = z.infer<typeof CreatePropertyBatchItemSchema>;
export type CreatePropertiesBatchInput = z.infer<typeof CreatePropertiesBatchSchema>;
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
export type FiscalIndicesIpcaSeriesQuery = z.infer<typeof FiscalIndicesIpcaSeriesQuerySchema>;
export type IpcaSerieMes = z.infer<typeof IpcaSerieMesSchema>;
export type FiscalIndicesIpcaSeriesResponse = z.infer<typeof FiscalIndicesIpcaSeriesResponseSchema>;

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

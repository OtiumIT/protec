import { z } from 'zod';

const monetaryValue = z.number().nonnegative().multipleOf(0.01).or(z.literal(0));

/** Contribuinte (nome e CPF) */
export const ContribuinteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  cpf: z.string().min(11, 'CPF inválido').max(14),
});

// ── Rendimentos ───────────────────────────────────────────────────────────────

/** Rendimento tributável de Pessoa Jurídica (salário, pró-labore) */
export const RendimentoPJSchema = z.object({
  fonte: z.string().max(255).optional(),
  cnpj: z.string().max(18).optional(),
  valor: monetaryValue,
});

/** Rendimento tributável de Pessoa Física (aluguéis / carnê-leão) */
export const RendimentoPFAluguelSchema = z.object({
  mes: z.string().max(20).optional(),
  valor: monetaryValue,
});

/** Item de rendimentos isentos (código 09 - Lucros/dividendos; 13 - Sócio ME/EPP Simples) */
export const RendimentoIsentoDividendoSchema = z.object({
  cnpj_fonte: z.string().max(18).optional(),
  nome_fonte: z.string().max(255).optional(),
  valor: monetaryValue,
  codigo: z.enum(['09', '13']).optional(),
});

/** Outros rendimentos (exclusivos da BCC — tributados exclusivamente na fonte) */
export const OutrosRendimentosSchema = z.object({
  aplicacoes_financeiras_exclusiva: monetaryValue.default(0),
  juros_capital_proprio: monetaryValue.default(0),
  poupanca_lci_lca: monetaryValue.default(0),
});

/** Item de patrimônio imobiliário que gera renda de aluguel */
export const PatrimonioImobiliarioSchema = z.object({
  descricao: z.string().max(255).optional(),
  valor_atual: monetaryValue,
});

/** Isentos que entram na base mínima (fora dos códigos 09/13) */
export const OutroIsentoQueEntraBaseSchema = z.object({
  descricao: z.string().max(255),
  tipo_ativo: z.enum(['outro_isento', 'lucro_exterior', 'renda_eventual']).default('outro_isento'),
  valor: monetaryValue,
});

/** Rendimentos da Lei 7.713 com IRRF potencialmente compensável no ajuste */
export const RendimentoTributadoLei7713Schema = z.object({
  descricao: z.string().max(255),
  valor_bruto: monetaryValue,
  irrf: monetaryValue.default(0),
  aliquota_irrf_percentual: z.number().nonnegative().max(100).optional().default(15),
});

export const MemoriaLegalExclusaoSchema = z.object({
  item: z.string(),
  valor: monetaryValue,
  base_legal: z.string(),
  motivo: z.string(),
});

export const ImpactoIncrementalCategoriaSchema = z.object({
  categoria: z.string(),
  valor: monetaryValue,
  percentual_base: z.number(),
});

export const OtimizacaoIsentoVsTributadoSchema = z.object({
  valor_migrado: monetaryValue,
  bcc_cenario_atual: monetaryValue,
  bcc_cenario_otimizado: monetaryValue,
  imposto_complementar_atual: monetaryValue,
  imposto_complementar_otimizado: monetaryValue,
  irrf_compensavel_estimado: monetaryValue,
  rendimento_liquido_cenario_isento: monetaryValue,
  rendimento_liquido_cenario_tributado: monetaryValue,
  ganho_liquido_estimado: monetaryValue,
  observacao: z.string().optional(),
});

/** Cenário PF: tributação exclusiva (Lei 7.713) — aplicação NÃO entra na BCC, só IRRF */
export const CenarioPfTributacaoExclusivaSchema = z.object({
  imposto_total: monetaryValue,
  irrf: monetaryValue,
  rendimento_liquido: monetaryValue,
});

/** Cenário PF: aplicação entra na base — impacto IRPFM + IRRF compensável */
export const CenarioPfEntraBaseSchema = z.object({
  imposto_total: monetaryValue,
  irrf_compensavel: monetaryValue,
  rendimento_liquido: monetaryValue,
});

/** Comparativo PF vs PJ para mesma aplicação financeira (Lucro Presumido) */
export const ComparativoPfPjSchema = z.object({
  rendimento_bruto: monetaryValue,
  /** PF tributação exclusiva (Lei 7.713): CDB, JCP — não entra na BCC, só IRRF */
  cenario_pf_tributacao_exclusiva: CenarioPfTributacaoExclusivaSchema,
  /** PF aplicação entra na base: impacto IRPFM + IRRF compensável */
  cenario_pf_entra_base: CenarioPfEntraBaseSchema,
  /** Mantido para compatibilidade; aponta para cenario_pf_tributacao_exclusiva (cenário típico) */
  cenario_pf: z.object({
    imposto_total: monetaryValue,
    irrf_compensavel: monetaryValue,
    rendimento_liquido: monetaryValue,
  }),
  cenario_pj: z.object({
    irpj: monetaryValue,
    adicional_irpj: monetaryValue,
    csll: monetaryValue,
    carga_efetiva_percentual: z.number(),
    rendimento_liquido: monetaryValue,
  }),
  /** % a mais de imposto na PJ em relação ao líquido PF (tributação exclusiva, cenário típico) */
  diferenca_percentual_pj_mais_caro: z.number(),
});

// ── Dados completos extraídos / preenchidos ───────────────────────────────────

/**
 * Dados de entrada para simulação.
 * Campos legados (rendimentos_tributaveis + rendimentos_isentos_dividendos) mantidos para
 * backward-compat com o formulário manual.
 * Campos ricos (tributaveis_pj, tributaveis_pf_alugueis, etc.) populados pela extração via PDF.
 * O backend sempre prioriza os arrays ricos quando presentes; senão usa os legados.
 */
export const DadosIrpfAltaRendaSchema = z.object({
  contribuinte: ContribuinteSchema,

  // ── Legado (formulário manual) ──────────────────────────────────────────────
  /** Soma de todos os rendimentos tributáveis (PJ + PF). Calculado automaticamente quando os arrays ricos estiverem presentes. */
  rendimentos_tributaveis: monetaryValue,
  /** Array combinado de rendimentos isentos (códigos 09 e 13). Calculado automaticamente quando os arrays ricos estiverem presentes. */
  rendimentos_isentos_dividendos: z.array(RendimentoIsentoDividendoSchema).default([]),

  // ── Campos ricos (extração PDF) ─────────────────────────────────────────────
  /** Rendimentos tributáveis de PJ (salário, pró-labore) – ficha "Recebidos de PJ" */
  tributaveis_pj: z.array(RendimentoPJSchema).optional(),
  /** Rendimentos tributáveis de PF (aluguéis, carnê-leão) – ficha "Recebidos de PF" */
  tributaveis_pf_alugueis: z.array(RendimentoPFAluguelSchema).optional(),
  /** Rendimentos isentos – código 09 (Lucros e dividendos) */
  isentos_lucros_dividendos: z.array(RendimentoIsentoDividendoSchema).optional(),
  /** Rendimentos isentos – código 13 (Sócio ME/EPP Simples Nacional) */
  isentos_simples_nacional: z.array(RendimentoIsentoDividendoSchema).optional(),
  /** Outros rendimentos exclusivos de tributação (não entram na BCC) */
  outros_rendimentos: OutrosRendimentosSchema.optional(),
  /** Imóveis que geram renda de aluguel (bens e direitos) */
  patrimonio_imobiliario: z.array(PatrimonioImobiliarioSchema).optional(),

  // ── Lei 15.270/2025 ────────────────────────────────────────────────────────
  /** Lucros/dividendos aprovados até 31/12/2025 — excluídos da base (Art. 16-A § 1º XII) */
  lucros_aprovados_ate_31dez2025: monetaryValue.optional().default(0),
  /** IR retido na fonte (pró-labore, salários) — deduzido do imposto mínimo (Art. 16-A § 3º II) */
  imposto_ja_pago_retencao_fonte: monetaryValue.optional().default(0),
  /** IR carnê-leão — deduzido do imposto mínimo (Art. 16-A § 3º III) */
  imposto_ja_pago_carne_leao: monetaryValue.optional().default(0),
  /** IR sobre aplicações financeiras (tributação exclusiva) — deduzido (Art. 16-A § 3º IV) */
  imposto_ja_pago_aplicacoes: monetaryValue.optional().default(0),
  /** Retenção 10% sobre dividendos > R$ 50k/mês (Art. 6º-A) — deduzido (Art. 16-A § 5º) */
  imposto_antecipado_dividendos: monetaryValue.optional().default(0),
  /** Ganho de capital excluído da base (Art. 16-A § 1º I — exceto bolsa/mercado organizado) */
  ganho_capital_excluido: monetaryValue.optional().default(0),
  /** Rendimentos de FIIs excluídos (Art. 16-A § 1º V-j — FIIs com 100+ cotistas) */
  rendimentos_fiis_excluidos: monetaryValue.optional().default(0),
  /** Outros excluídos (Art. 16-A § 1º) como CRI, CRA, LCI, LCA, LIG, poupança e debêntures de infraestrutura */
  outros_excluidos_art_16a: monetaryValue.optional().default(0),
  /** Isentos que entram na base mínima, fora dos códigos 09 e 13 */
  outros_isentos_que_entram_base: z.array(OutroIsentoQueEntraBaseSchema).optional().default([]),
  /** Rendimentos tributados exclusivamente na fonte sob Lei 7.713 (IRRF pode reduzir imposto a complementar) */
  rendimentos_tributados_exclusivamente_lei_7713: z.array(RendimentoTributadoLei7713Schema).optional().default([]),
  /** Indica se o contribuinte optou pelo ajuste anual para rendimentos do art. 12-A da Lei 7.713 */
  optou_ajuste_anual_lei_7713: z.boolean().optional().default(false),
  /** Rendimentos de aplicações financeiras já existentes na PJ (diagnóstico PF vs PJ) */
  rendimentos_aplicacoes_financeiras_pj: monetaryValue.optional().default(0),
  /** Alíquota IRRF % para comparativo PF vs PJ: CDB curto/JCP 15, CDB longo (>720d) 22,5, FII 20. Default 15. */
  aliquota_irrf_comparativo_percentual: z.number().min(0).max(100).optional().default(15),
  /** Valor hipotético para comparativo PF vs PJ (sobrescreve cálculo automático a partir de aplicações). */
  valor_hipotetico_comparativo_pf_pj: monetaryValue.optional(),
});

// ── Inputs / Outputs ──────────────────────────────────────────────────────────

export const SimulateIrpfAltaRendaInputSchema = z.object({
  ano: z.number().int().min(2020).max(2035),
  dados: DadosIrpfAltaRendaSchema,
});

export const SimulateAndSaveIrpfAltaRendaInputSchema = SimulateIrpfAltaRendaInputSchema.extend({
  company_id: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
});

export const FaixaAltaRendaSchema = z.enum(['isento', 'progressiva', 'fixa_10']);

export const IrpfAltaRendaSimulacaoResponseSchema = z.object({
  ano: z.number(),
  base_calculo_combinada: z.number(),
  faixa: FaixaAltaRendaSchema,
  aliquota_percentual: z.number(),
  /** Imposto mínimo calculado (antes das deduções) */
  imposto_minimo: z.number().optional(),
  /** Soma das deduções (IR já pago) */
  deducoes_imposto_ja_pago: z.number().optional(),
  /** Imposto a complementar (valor final a pagar) — Art. 16-A § 3º e § 4º */
  imposto_estimado: z.number(),
  risco_retencao_mensal: z.boolean(),
  risco_retencao_detalhe: z.string().optional(),
  /** Sugestões dinâmicas de planejamento (holding, segregação) com base nos dados da simulação */
  sugestoes_planejamento: z.array(z.string()).optional(),
  /** Visão resumida de composição da renda para dashboards */
  composicao_renda: z.object({
    tributaveis: z.number(),
    isentos_que_entram_base: z.number(),
    dividendos_09_13: z.number().optional(),
    isentos_excluidos: z.number(),
    tributacao_exclusiva_lei_7713: z.number().optional(),
  }).optional(),
  /** Contribuição de cada grupo para a base de cálculo combinada */
  impacto_incremental_base: z.array(ImpactoIncrementalCategoriaSchema).optional(),
  /** Comparação entre manter isento que entra na base e migrar para ativo tributado com IRRF compensável */
  otimizacao_isento_vs_tributado: OtimizacaoIsentoVsTributadoSchema.optional(),
  /** Explicação jurídica das exclusões aplicadas no cálculo */
  memoria_legal_exclusoes: z.array(MemoriaLegalExclusaoSchema).optional(),
  /** Comparativo custo tributário PF vs PJ (Lucro Presumido) para mesma aplicação */
  comparativo_pf_pj: ComparativoPfPjSchema.optional(),
  memoria_calculo: z.record(z.unknown()).optional(),
  /** Aviso quando ano &lt; 2027: Lei 15.270/2025 vigente a partir do ano-calendário 2026 (declaração 2027) */
  aviso_ano_fora_vigencia: z.string().optional(),
});

export const ReportSummaryIrpfAltaRendaInputSchema = SimulateIrpfAltaRendaInputSchema.extend({
  scenario_name: z.string().max(120).optional(),
});

export const ReportSummaryIrpfAltaRendaResponseSchema = z.object({
  scenario_name: z.string(),
  gerado_em: z.string(),
  resumo_executivo: z.object({
    faixa: FaixaAltaRendaSchema,
    aliquota_percentual: z.number(),
    imposto_a_complementar: z.number(),
    economia_potencial_otimizacao: z.number().optional(),
  }),
  composicao: z.object({
    tributaveis: z.number(),
    isentos_que_entram_base: z.number(),
    isentos_excluidos: z.number(),
  }),
  comparativo_otimizacao: OtimizacaoIsentoVsTributadoSchema.optional(),
  memoria_legal_exclusoes: z.array(MemoriaLegalExclusaoSchema).default([]),
  recomendacoes_priorizadas: z.array(z.string()).default([]),
});

export const ListIrpfAltaRendaQuerySchema = z.object({
  company_id: z.string().uuid().optional(),
  ano: z.coerce.number().int().min(2020).max(2035).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const IrpfAltaRendaIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type Contribuinte = z.infer<typeof ContribuinteSchema>;
export type RendimentoPJ = z.infer<typeof RendimentoPJSchema>;
export type RendimentoPFAluguel = z.infer<typeof RendimentoPFAluguelSchema>;
export type RendimentoIsentoDividendo = z.infer<typeof RendimentoIsentoDividendoSchema>;
export type OutrosRendimentos = z.infer<typeof OutrosRendimentosSchema>;
export type PatrimonioImobiliario = z.infer<typeof PatrimonioImobiliarioSchema>;
export type OutroIsentoQueEntraBase = z.infer<typeof OutroIsentoQueEntraBaseSchema>;
export type RendimentoTributadoLei7713 = z.infer<typeof RendimentoTributadoLei7713Schema>;
export type MemoriaLegalExclusao = z.infer<typeof MemoriaLegalExclusaoSchema>;
export type ImpactoIncrementalCategoria = z.infer<typeof ImpactoIncrementalCategoriaSchema>;
export type OtimizacaoIsentoVsTributado = z.infer<typeof OtimizacaoIsentoVsTributadoSchema>;
export type ComparativoPfPj = z.infer<typeof ComparativoPfPjSchema>;
export type DadosIrpfAltaRenda = z.infer<typeof DadosIrpfAltaRendaSchema>;
export type SimulateIrpfAltaRendaInput = z.infer<typeof SimulateIrpfAltaRendaInputSchema>;
export type SimulateAndSaveIrpfAltaRendaInput = z.infer<typeof SimulateAndSaveIrpfAltaRendaInputSchema>;
export type FaixaAltaRenda = z.infer<typeof FaixaAltaRendaSchema>;
export type IrpfAltaRendaSimulacaoResponse = z.infer<typeof IrpfAltaRendaSimulacaoResponseSchema>;
export type ReportSummaryIrpfAltaRendaInput = z.infer<typeof ReportSummaryIrpfAltaRendaInputSchema>;
export type ReportSummaryIrpfAltaRendaResponse = z.infer<typeof ReportSummaryIrpfAltaRendaResponseSchema>;

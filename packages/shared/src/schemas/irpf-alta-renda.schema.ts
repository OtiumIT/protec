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
  memoria_calculo: z.record(z.unknown()).optional(),
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
export type DadosIrpfAltaRenda = z.infer<typeof DadosIrpfAltaRendaSchema>;
export type SimulateIrpfAltaRendaInput = z.infer<typeof SimulateIrpfAltaRendaInputSchema>;
export type SimulateAndSaveIrpfAltaRendaInput = z.infer<typeof SimulateAndSaveIrpfAltaRendaInputSchema>;
export type FaixaAltaRenda = z.infer<typeof FaixaAltaRendaSchema>;
export type IrpfAltaRendaSimulacaoResponse = z.infer<typeof IrpfAltaRendaSimulacaoResponseSchema>;

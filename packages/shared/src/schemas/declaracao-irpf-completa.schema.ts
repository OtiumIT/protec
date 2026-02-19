/**
 * Schema completo da Declaração de Ajuste Anual (DAA) do IRPF.
 * Representa 100% dos dados extraíveis da declaração para uso em análises,
 * simulações e planejamento tributário.
 */

import { z } from 'zod';

const valorMonetario = z.number().nonnegative().default(0);

// ── 1. Identificação do Declarante ───────────────────────────────────────────
export const IdentificacaoDeclaranteSchema = z.object({
  nome: z.string().default(''),
  cpf: z.string().default(''),
  data_nascimento: z.string().optional(),
  titulo_eleitor: z.string().optional(),
  exercicio: z.number().int().min(2020).max(2035).default(new Date().getFullYear()),
  ano_calendario: z.number().int().min(2020).max(2035).default(new Date().getFullYear()),
  tipo_declaracao: z.enum(['completa', 'simplificada']).optional(),
  cnpj_empresa_optante_simples: z.string().optional(),
  codigo_receita: z.string().optional(),
  situacao_final: z.string().optional(),
});

// ── 2. Dependentes ─────────────────────────────────────────────────────────────
export const DependenteSchema = z.object({
  nome: z.string().default(''),
  cpf: z.string().default(''),
  parentesco: z.string().optional(),
  data_nascimento: z.string().optional(),
});

// ── 3. Rendimentos Tributáveis de Pessoa Jurídica ─────────────────────────────────
export const RendimentoPJItemSchema = z.object({
  cnpj: z.string().optional(),
  nome_fonte: z.string().optional(),
  codigo: z.string().optional(),
  valor: valorMonetario,
  competencia: z.string().optional(),
});

// ── 4. Rendimentos Tributáveis de Pessoa Física ────────────────────────────────
export const RendimentoPFItemSchema = z.object({
  cpf_pagador: z.string().optional(),
  nome_pagador: z.string().optional(),
  descricao: z.string().optional(),
  valor: valorMonetario,
  mes: z.string().optional(),
});

// ── 5. Rendimentos Isentos e Não Tributáveis (por código) ───────────────────────
/** Tipo de exclusão Art. 16-A § 1º Lei 15.270/2025 (para classificação na extração) */
export const RendimentoIsentoItemSchema = z.object({
  codigo: z.string().default(''), // 01, 03, 06, 09, 13, etc.
  descricao: z.string().optional(),
  cnpj_fonte: z.string().optional(),
  nome_fonte: z.string().optional(),
  valor: valorMonetario,
  /** Classificação para Lei 15.270: nenhum | ganho_capital | fii_qualificado | lucros_31dez2025 | lhi_cri_lig_lcd */
  tipo_exclusao_art_16a: z.string().optional(),
});

// ── 6. Rendimentos Tributação Exclusiva/Definitiva na Fonte ───────────────────
export const RendimentoExclusivaItemSchema = z.object({
  codigo: z.string().optional(), // 06 aplicações, 10 JCP, etc.
  descricao: z.string().optional(),
  cnpj_fonte: z.string().optional(),
  nome_fonte: z.string().optional(),
  valor: valorMonetario,
});

// ── 7. Bens e Direitos ──────────────────────────────────────────────────────────
export const BemDireitoSchema = z.object({
  codigo: z.string().optional(), // 01 imóvel urbano, 11 imóvel rural, 12 terreno, 02 veículo, etc.
  descricao: z.string().optional(),
  situacao_31dez: z.string().optional(),
  valor_atual: valorMonetario,
  participacao_percentual: valorMonetario.optional(),
});

// ── 8. Dívidas e Ônus Reais ────────────────────────────────────────────────────
export const DividaOnusSchema = z.object({
  codigo: z.string().optional(),
  descricao: z.string().optional(),
  cnpj_cpf_credor: z.string().optional(),
  valor: valorMonetario,
});

// ── 9. Resumo da Declaração ─────────────────────────────────────────────────────
export const ResumoDeclaracaoSchema = z.object({
  base_calculo_ir: valorMonetario,
  imposto_devido: valorMonetario,
  imposto_pago_retencao: valorMonetario,
  imposto_a_restituir: valorMonetario,
  imposto_a_pagar: valorMonetario,
  deducao_simplificada: valorMonetario.optional(),
});

// ── 10. Pagamentos Efetuados (DARF, GPS, etc.) ──────────────────────────────────
export const PagamentoEfetuadoSchema = z.object({
  tipo: z.string().optional(),
  codigo_receita: z.string().optional(),
  valor: valorMonetario,
  competencia: z.string().optional(),
});

// ── 11. Doações e Deduções ─────────────────────────────────────────────────────
export const DoacaoDeducaoSchema = z.object({
  descricao: z.string().optional(),
  valor: valorMonetario,
});

/**
 * Classificações para Lei 15.270/2025 (Art. 16-A § 1º) — base de cálculo da alta renda.
 * Valores a excluir da BCC: ganho de capital (exceto bolsa), FIIs qualificados (100+ cotistas),
 * lucros aprovados até 31/12/2025, LHI, CRI, LIG, LCD, etc.
 */
export const Lei15270ClassificacaoSchema = z.object({
  /** Ganho de capital excluído (Art. 16-A § 1º I — exceto bolsa/mercado organizado) */
  ganho_capital_excluido: valorMonetario.optional().default(0),
  /** Rendimentos de FIIs qualificados (Art. 16-A § 1º V-j — 100+ cotistas) */
  rendimentos_fiis_excluidos: valorMonetario.optional().default(0),
  /** Lucros/dividendos aprovados até 31/12/2025 (Art. 16-A § 1º XII) */
  lucros_aprovados_ate_31dez2025: valorMonetario.optional().default(0),
  /** Outros excluídos (LHI, CRI, LIG, LCD — Art. 16-A § 1º) */
  outros_excluidos_art_16a: valorMonetario.optional().default(0),
});

// ── Declaração Completa (JSON 100% da DAA) ──────────────────────────────────────

export const DeclaracaoIrpfCompletaSchema = z.object({
  identificacao: IdentificacaoDeclaranteSchema.default({}),
  dependentes: z.array(DependenteSchema).default([]),

  rendimentos_tributaveis_pj: z.object({
    total: valorMonetario,
    itens: z.array(RendimentoPJItemSchema).default([]),
  }).default({ total: 0, itens: [] }),

  rendimentos_tributaveis_pf: z.object({
    total: valorMonetario,
    itens: z.array(RendimentoPFItemSchema).default([]),
  }).default({ total: 0, itens: [] }),

  rendimentos_tributaveis_outros: z.object({
    total: valorMonetario,
    itens: z.array(z.object({ descricao: z.string().optional(), valor: valorMonetario })).default([]),
  }).default({ total: 0, itens: [] }),

  rendimentos_isentos_nao_tributaveis: z.object({
    total: valorMonetario,
    itens: z.array(RendimentoIsentoItemSchema).default([]),
  }).default({ total: 0, itens: [] }),

  rendimentos_tributacao_exclusiva_definitiva: z.object({
    total: valorMonetario,
    itens: z.array(RendimentoExclusivaItemSchema).default([]),
  }).default({ total: 0, itens: [] }),

  bens_direitos: z.object({
    total: valorMonetario,
    itens: z.array(BemDireitoSchema).default([]),
  }).default({ total: 0, itens: [] }),

  dividas_onus: z.object({
    total: valorMonetario,
    itens: z.array(DividaOnusSchema).default([]),
  }).default({ total: 0, itens: [] }),

  resumo: ResumoDeclaracaoSchema.optional().default({
    base_calculo_ir: 0,
    imposto_devido: 0,
    imposto_pago_retencao: 0,
    imposto_a_restituir: 0,
    imposto_a_pagar: 0,
  }),

  pagamentos_efetuados: z.array(PagamentoEfetuadoSchema).default([]),
  doacoes_deducoes: z.array(DoacaoDeducaoSchema).default([]),

  informacoes_complementares: z.string().optional(),

  /** Classificações Lei 15.270/2025 (Art. 16-A § 1º) — preenchido pela extração ou import */
  lei_15_270_classificacao: Lei15270ClassificacaoSchema.optional().default({
    ganho_capital_excluido: 0,
    rendimentos_fiis_excluidos: 0,
    lucros_aprovados_ate_31dez2025: 0,
    outros_excluidos_art_16a: 0,
  }),

  // Metadados da extração
  extraido_em: z.string().optional(),
  fonte: z.enum(['pdf_daa', 'formulario', 'api', 'dec_dbk']).optional(),
}).passthrough();

export type DeclaracaoIrpfCompleta = z.infer<typeof DeclaracaoIrpfCompletaSchema>;
export type IdentificacaoDeclarante = z.infer<typeof IdentificacaoDeclaranteSchema>;
export type Dependente = z.infer<typeof DependenteSchema>;
export type RendimentoPJItem = z.infer<typeof RendimentoPJItemSchema>;
export type RendimentoPFItem = z.infer<typeof RendimentoPFItemSchema>;
export type RendimentoIsentoItem = z.infer<typeof RendimentoIsentoItemSchema>;
export type BemDireito = z.infer<typeof BemDireitoSchema>;
export type DividaOnus = z.infer<typeof DividaOnusSchema>;
export type ResumoDeclaracao = z.infer<typeof ResumoDeclaracaoSchema>;
export type Lei15270Classificacao = z.infer<typeof Lei15270ClassificacaoSchema>;

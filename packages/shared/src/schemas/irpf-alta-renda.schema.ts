import { z } from 'zod';

const monetaryValue = z.number().nonnegative().multipleOf(0.01).or(z.literal(0));

/** Contribuinte (nome e CPF) */
export const ContribuinteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  cpf: z.string().min(11, 'CPF inválido').max(14),
});

/** Item de rendimentos isentos (código 09 - Lucros e dividendos; 13 - Sócio ME/EPP Simples) */
export const RendimentoIsentoDividendoSchema = z.object({
  cnpj_fonte: z.string().max(18).optional(),
  nome_fonte: z.string().max(255).optional(),
  valor: monetaryValue,
  codigo: z.enum(['09', '13']).optional(), // 09 = Lucros e dividendos; 13 = Sócio Simples Nacional
});

/** Dados extraídos do IRPF (formulário ou JSON pós-PDF). BCC = RT + soma(rendimentos_isentos_dividendos) é calculada no backend. */
export const DadosIrpfAltaRendaSchema = z.object({
  contribuinte: ContribuinteSchema,
  rendimentos_tributaveis: monetaryValue,
  rendimentos_isentos_dividendos: z.array(RendimentoIsentoDividendoSchema).default([]),
});

/** Input para simulação (sem persistência) */
export const SimulateIrpfAltaRendaInputSchema = z.object({
  ano: z.number().int().min(2020).max(2035),
  dados: DadosIrpfAltaRendaSchema,
});

/** Input para simulação e salvamento */
export const SimulateAndSaveIrpfAltaRendaInputSchema = SimulateIrpfAltaRendaInputSchema.extend({
  client_id: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
});

/** Faixa aplicável (Lei 15.270/2025) */
export const FaixaAltaRendaSchema = z.enum(['isento', 'progressiva', 'fixa_10']);

/** Resposta da simulação */
export const IrpfAltaRendaSimulacaoResponseSchema = z.object({
  ano: z.number(),
  base_calculo_combinada: z.number(),
  faixa: FaixaAltaRendaSchema,
  aliquota_percentual: z.number(),
  imposto_estimado: z.number(),
  risco_retencao_mensal: z.boolean(),
  risco_retencao_detalhe: z.string().optional(),
  memoria_calculo: z.record(z.unknown()).optional(),
});

/** Query para listagem */
export const ListIrpfAltaRendaQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  ano: z.coerce.number().int().min(2020).max(2035).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const IrpfAltaRendaIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type Contribuinte = z.infer<typeof ContribuinteSchema>;
export type RendimentoIsentoDividendo = z.infer<typeof RendimentoIsentoDividendoSchema>;
export type DadosIrpfAltaRenda = z.infer<typeof DadosIrpfAltaRendaSchema>;
export type SimulateIrpfAltaRendaInput = z.infer<typeof SimulateIrpfAltaRendaInputSchema>;
export type SimulateAndSaveIrpfAltaRendaInput = z.infer<typeof SimulateAndSaveIrpfAltaRendaInputSchema>;
export type FaixaAltaRenda = z.infer<typeof FaixaAltaRendaSchema>;
export type IrpfAltaRendaSimulacaoResponse = z.infer<typeof IrpfAltaRendaSimulacaoResponseSchema>;

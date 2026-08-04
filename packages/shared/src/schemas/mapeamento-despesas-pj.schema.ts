import { z } from 'zod';

/**
 * Contratos (Zod) do módulo Mapeamento de Despesas PF -> PJ (pejotização).
 * Ferramenta para contadores/advogados. A classificação é SEMPRE calculada no servidor
 * a partir das respostas + versão do catálogo. IBS/CBS é apenas segunda lente/alerta.
 */

const uuid = z.string().uuid();
const money = z.number().min(0);

// ==========================================================================
// Enums de domínio
// ==========================================================================
export const TaxRegimeEnum = z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei', 'outro']);
export const IbsCbsTreatmentEnum = z.enum(['regime_regular', 'simples_por_dentro', 'avaliar_por_fora', 'nao_avaliar']);
export const DiagnosisStatusEnum = z.enum(['draft', 'in_review', 'completed', 'archived']);
export const CurrentPayerEnum = z.enum(['pf', 'pj', 'misto']);
export const PfPjLensEnum = z.enum(['migrate', 'organize', 'defer', 'avoid']);
export const CreditLensEnum = z.enum(['potential', 'conditioned', 'none', 'na']);
export const ClassificationEnum = z.enum(['potencial', 'condicionado', 'rateio', 'nao_recomendado']);

export const EXPENSE_CATEGORY_KEYS = [
  'veiculos',
  'imovel',
  'tecnologia',
  'viagens',
  'servicos',
  'capacitacao',
  'saude_beneficios',
  'outras',
] as const;
export const ExpenseCategoryKeyEnum = z.enum(EXPENSE_CATEGORY_KEYS);

// ==========================================================================
// Item respondido pelo usuário (entrada do motor)
// ==========================================================================
export const ExpenseItemAnswerSchema = z.object({
  category_key: ExpenseCategoryKeyEnum,
  label: z.string().min(1).max(255),
  monthly_amount: money.default(0),
  current_payer: CurrentPayerEnum.default('pf'),
  /** Vínculo com a atividade econômica da PJ */
  vinculo_atividade: z.enum(['sim', 'parcial', 'nao']).default('parcial'),
  /** Percentual comprovadamente empresarial (0-100) */
  business_use_pct: z.number().min(0).max(100).default(0),
  /** Beneficiário principal do gasto */
  beneficiario: z.enum(['empresa', 'socio', 'empregado', 'familiar', 'misto']).default('empresa'),
  /** Documento fiscal idôneo em nome da PJ */
  documento_pj: z.enum(['sim', 'parcial', 'nao']).default('nao'),
  /** Há contrato/política/controle que sustente o gasto */
  possui_evidencia: z.boolean().default(false),
  /** Marcadores especiais: p.ex. tributo/parcela de principal que não é insumo */
  is_tributo_ou_principal: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

// ==========================================================================
// Análise (sem persistir) e criação de diagnóstico
// ==========================================================================
export const DiagnosisContextSchema = z.object({
  client_id: uuid,
  title: z.string().max(255).optional().nullable(),
  reference_year: z.number().int().min(2020).max(2035),
  activity: z.string().max(255).optional().nullable(),
  tax_regime: TaxRegimeEnum.default('simples_nacional'),
  ibs_cbs_treatment: IbsCbsTreatmentEnum.default('nao_avaliar'),
  objective: z.string().optional().nullable(),
  reviewer_user_id: uuid.optional().nullable(),
});

export const AnalyzeExpenseMappingSchema = z.object({
  context: DiagnosisContextSchema,
  items: z.array(ExpenseItemAnswerSchema).min(1),
  answers: z.array(z.object({
    category_key: ExpenseCategoryKeyEnum,
    question_key: z.string().max(80),
    answer: z.record(z.string(), z.unknown()),
  })).default([]),
});

export const CreateDiagnosisSchema = AnalyzeExpenseMappingSchema;

export const UpdateDiagnosisSchema = z.object({
  context: DiagnosisContextSchema.partial().optional(),
  items: z.array(ExpenseItemAnswerSchema).optional(),
  answers: z.array(z.object({
    category_key: ExpenseCategoryKeyEnum,
    question_key: z.string().max(80),
    answer: z.record(z.string(), z.unknown()),
  })).optional(),
  status: DiagnosisStatusEnum.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const ListDiagnosesQuerySchema = z.object({
  client_id: uuid.optional(),
  reference_year: z.coerce.number().int().optional(),
  status: DiagnosisStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const DiagnosisIdParamSchema = z.object({ id: uuid });

// ==========================================================================
// Pendências e plano de ação
// ==========================================================================
export const CreatePendencySchema = z.object({
  item_id: uuid.optional().nullable(),
  tipo: z.string().max(40).default('documento'),
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional().nullable(),
  status: z.enum(['pendente', 'em_andamento', 'resolvida', 'descartada']).default('pendente'),
  due_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  owner_user_id: uuid.optional().nullable(),
});
export const UpdatePendencySchema = CreatePendencySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Informe ao menos um campo para atualizar' }
);

export const CreateEvidenceSchema = z.object({
  item_id: uuid.optional().nullable(),
  pendency_id: uuid.optional().nullable(),
  kind: z.enum(['nfe', 'contrato', 'agenda', 'extrato', 'foto', 'outro']).default('outro'),
  nome_arquivo: z.string().min(1).max(255),
  mime_type: z.string().max(120).optional().nullable(),
  tamanho_bytes: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CreateImportBatchSchema = z.object({
  referencia: z.string().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ==========================================================================
// Types (entrada)
// ==========================================================================
export type ExpenseItemAnswer = z.infer<typeof ExpenseItemAnswerSchema>;
export type DiagnosisContext = z.infer<typeof DiagnosisContextSchema>;
export type AnalyzeExpenseMappingInput = z.infer<typeof AnalyzeExpenseMappingSchema>;
export type CreateDiagnosisInput = z.infer<typeof CreateDiagnosisSchema>;
export type UpdateDiagnosisInput = z.infer<typeof UpdateDiagnosisSchema>;
export type ListDiagnosesQuery = z.infer<typeof ListDiagnosesQuerySchema>;
export type CreatePendencyInput = z.infer<typeof CreatePendencySchema>;
export type UpdatePendencyInput = z.infer<typeof UpdatePendencySchema>;
export type CreateEvidenceInput = z.infer<typeof CreateEvidenceSchema>;
export type CreateImportBatchInput = z.infer<typeof CreateImportBatchSchema>;

// ==========================================================================
// Types (resultado calculado no servidor)
// ==========================================================================
export type ExpenseClassification = z.infer<typeof ClassificationEnum>;

export interface ExpenseItemCriteria {
  vinculo_atividade: 'sim' | 'parcial' | 'nao';
  uso_pessoal_relevante: boolean;
  documento_adequado: boolean;
  controle_suficiente: boolean;
}

export interface ClassifiedExpenseItem {
  label: string;
  category_key: string;
  monthly_amount: number;
  annual_amount: number;
  business_use_pct: number;
  current_payer: 'pf' | 'pj' | 'misto';
  pf_pj_lens: z.infer<typeof PfPjLensEnum>;
  credit_lens: z.infer<typeof CreditLensEnum>;
  classification: ExpenseClassification;
  criteria: ExpenseItemCriteria;
  foundation_refs: string[];
  motivo: string;
  pendencias: string[];
  notes?: string | null;
}

export interface ExpenseMappingResult {
  reference_year: number;
  rules_version: string;
  tax_regime: string;
  ibs_cbs_treatment: string;
  totals: {
    total_analisado_anual: number;
    potencial_anual: number;
    condicionado_anual: number;
    rateio_anual: number;
    nao_recomendado_anual: number;
    itens: number;
  };
  matriz: {
    priorizar: string[];
    organizar: string[];
    corrigir_antes: string[];
    evitar: string[];
  };
  items: ClassifiedExpenseItem[];
  alertas: string[];
  disclaimer: string;
}

export interface ExpenseMappingDiagnosis {
  id: string;
  client_id: string;
  title: string | null;
  reference_year: number;
  activity: string | null;
  tax_regime: string;
  ibs_cbs_treatment: string;
  objective: string | null;
  reviewer_user_id: string | null;
  status: z.infer<typeof DiagnosisStatusEnum>;
  rules_version: string;
  totals: ExpenseMappingResult['totals'] | Record<string, never>;
  result_snapshot: ExpenseMappingResult | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

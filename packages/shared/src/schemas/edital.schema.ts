import { z } from 'zod';

// Modalidades de transação
export const TransactionModalitySchema = z.enum([
  'CAPAG',
  'PEQUENO_VALOR',
  'CONTENCIOSO',
  'IRRECUPERAVEIS',
  'DESENROLA_RURAL',
  'PTI',
]);

// Ratings
export const RatingSchema = z.enum(['A', 'B', 'C', 'D']);

// Schema para regras de desconto progressivo
export const ProgressiveDiscountSchema = z.object({
  maxMonths: z.number().int().positive(),
  discount: z.number().min(0).max(100),
});

// Schema para regras de desconto
export const DiscountRulesSchema = z.object({
  principal: z.number().min(0).max(100).optional(),
  interest: z.number().min(0).max(100).optional(),
  fees: z.number().min(0).max(100).optional(),
  charges: z.number().min(0).max(100).optional(),
  maxTotalDiscount: z.number().min(0).max(100).optional(),
  progressive: z.array(ProgressiveDiscountSchema).optional(),
});

// Schema para condições de pagamento
export const PaymentTermsSchema = z.object({
  entryPercent: z.number().min(0).max(100),
  entryInstallments: z.number().int().positive(),
  maxInstallments: z.number().int().positive(),
  minInstallmentAmount: z.number().int().nonnegative().optional(),
});

// Schema para critérios de elegibilidade
export const EligibilityCriteriaSchema = z.object({
  maxAmount: z.number().int().nonnegative().optional(), // em centavos
  minAmount: z.number().int().nonnegative().optional(), // em centavos
  requiresRating: z.boolean().optional(),
  allowedRatings: z.array(RatingSchema).optional(),
  allowedCompanyTypes: z.array(z.enum(['REGULAR', 'MEI', 'ME', 'EPP', 'RECUPERACAO_JUDICIAL', 'SANTA_CASA'])).optional(),
  minYearsInscribed: z.number().int().nonnegative().optional(),
  requiresJudicialProcess: z.boolean().optional(),
  legalThesis: z.string().optional(),
});

// Schema para regras de desconto por rating
export const DiscountRulesByRatingSchema = z.record(RatingSchema, DiscountRulesSchema);

// Schema base para edital (sem refine)
const EditalBaseSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
  extended: z.boolean().optional().default(false),
  modality: TransactionModalitySchema,
  payment_terms: PaymentTermsSchema,
  discount_rules: DiscountRulesByRatingSchema,
  eligibility: EligibilityCriteriaSchema,
  notes: z.string().optional(),
  official_link: z.string().url().optional().or(z.literal('')),
  active: z.boolean().optional().default(true),
});

// Schema completo para criar edital (com validação de datas)
export const CreateEditalSchema = EditalBaseSchema.refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: 'end_date must be greater than or equal to start_date',
  path: ['end_date'],
});

// Schema para atualizar edital (todos os campos opcionais)
export const UpdateEditalSchema = EditalBaseSchema.partial().extend({
  code: z.string().min(1).max(100).optional(), // Código não pode ser alterado
});

// Schema para query params de listagem
export const ListEditaisQuerySchema = z.object({
  modality: TransactionModalitySchema.optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Schema para route params
export const EditalIdParamSchema = z.object({
  id: z.string().uuid(),
});

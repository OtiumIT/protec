import { z } from 'zod';

// Enum para teses jurídicas
export const LegalThesisSchema = z.enum([
  'IPI_PRACA', // IPI - Conceito de Praça entre empresas interdependentes
  'PRL', // Preço de Transferência (PRL)
  'IRPJ_CSLL_DESMUTUALIZACAO', // IRPJ/CSLL sobre ganhos na desmutualização
]);

export type LegalThesis = z.infer<typeof LegalThesisSchema>;

// Schema para criar processo judicial
export const CreateJudicialProcessSchema = z.object({
  client_id: z.string().uuid(),
  process_number: z.string().min(1).max(50),
  court: z.string().max(255).optional(),
  legal_thesis: LegalThesisSchema,
  case_value: z.number().nonnegative().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  status: z.enum(['active', 'suspended', 'closed']).default('active'),
  notes: z.string().optional(),
});

// Schema para atualizar processo judicial
export const UpdateJudicialProcessSchema = z.object({
  process_number: z.string().min(1).max(50).optional(),
  court: z.string().max(255).optional(),
  legal_thesis: LegalThesisSchema.optional(),
  case_value: z.number().nonnegative().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'suspended', 'closed']).optional(),
  notes: z.string().optional(),
});

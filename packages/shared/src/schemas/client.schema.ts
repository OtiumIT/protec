import { z } from 'zod';

export const CreateClientSchema = z.object({
  name: z.string().min(3),
  cnpj: z.string().min(14).max(18),
  email: z.string().email().optional(),
  tax_regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'outros']).optional(),
  cnae: z.string().max(10).optional(),
  state_registration: z.string().max(50).optional(),
  municipal_registration: z.string().max(50).optional(),
  notes: z.string().optional(),
});

export const UpdateClientSchema = z.object({
  name: z.string().min(3).optional(),
  cnpj: z.string().min(14).max(18).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  tax_regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'outros']).optional(),
  cnae: z.string().max(10).optional(),
  state_registration: z.string().max(50).optional(),
  municipal_registration: z.string().max(50).optional(),
  notes: z.string().optional(),
});

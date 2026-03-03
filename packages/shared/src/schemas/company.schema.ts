import { z } from 'zod';

/** Aceita email válido, string vazia (transforma em undefined) ou undefined */
const optionalEmail = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.string().email().optional()
);

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  domain: z.string().optional(),
  cnpj: z.string().optional(),
  legal_name: z.string().optional(),
  trade_name: z.string().optional(),
  email: optionalEmail,
  phone: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: optionalEmail,
  contact_phone: z.string().optional(),
  tax_regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'outros']).optional(),
  state_registration: z.string().optional(),
  municipal_registration: z.string().optional(),
  cnae: z.string().optional(),
  zip_code: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreateCompanySchema = z.object({
  name: z.string().min(3),
  domain: z.string().optional(),
  person_type: z.enum(['pf', 'pj']).optional().default('pj'),
  cnpj: z.string().min(14).max(18).optional(),
  cpf: z.string().min(11).max(14).optional(),
  legal_name: z.string().optional(),
  trade_name: z.string().optional(),
  email: optionalEmail,
  phone: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: optionalEmail,
  contact_phone: z.string().optional(),
  tax_regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'outros']).optional(),
  state_registration: z.string().optional(),
  municipal_registration: z.string().optional(),
  cnae: z.string().optional(),
  zip_code: z.string().optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().max(2).optional(),
  notes: z.string().optional(),
});

export const UpdateCompanySchema = CreateCompanySchema.partial();

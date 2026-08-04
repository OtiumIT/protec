import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '../utils/masks.js';

/** Aceita email válido, string vazia (transforma em undefined) ou undefined */
const optionalEmail = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.string().email().optional()
);

export const CreateClientSchema = z
  .object({
    name: z.string().min(3),
    person_type: z.enum(['pf', 'pj']).optional().default('pj'),
    cnpj: z.string().optional(),
    cpf: z.string().optional(),
    email: optionalEmail,
    tax_regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'outros']).optional(),
    cnae: z.string().max(10).optional(),
    state_registration: z.string().max(50).optional(),
    municipal_registration: z.string().max(50).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
    const cpfDigits = (data.cpf || '').replace(/\D/g, '');
    // CPF/CNPJ são opcionais; só valida formato quando informados
    if (data.person_type === 'pj' && cnpjDigits) {
      if (cnpjDigits.length !== 14) {
        ctx.addIssue({ code: 'custom', message: 'CNPJ deve ter 14 dígitos', path: ['cnpj'] });
      } else if (!isValidCnpj(cnpjDigits)) {
        ctx.addIssue({ code: 'custom', message: 'CNPJ inválido', path: ['cnpj'] });
      }
    }
    if (data.person_type === 'pf' && cpfDigits) {
      if (cpfDigits.length !== 11) {
        ctx.addIssue({ code: 'custom', message: 'CPF deve ter 11 dígitos', path: ['cpf'] });
      } else if (!isValidCpf(cpfDigits)) {
        ctx.addIssue({ code: 'custom', message: 'CPF inválido', path: ['cpf'] });
      }
    }
  });

export const UpdateClientSchema = z.object({
  name: z.string().min(3).optional(),
  person_type: z.enum(['pf', 'pj']).optional(),
  cnpj: z.string().min(14).max(18).optional(),
  cpf: z.string().min(11).max(14).optional(),
  email: optionalEmail,
  status: z.enum(['active', 'inactive']).optional(),
  tax_regime: z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'outros']).optional(),
  cnae: z.string().max(10).optional(),
  state_registration: z.string().max(50).optional(),
  municipal_registration: z.string().max(50).optional(),
  notes: z.string().optional(),
});

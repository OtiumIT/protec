import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '../utils/masks.js';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z
  .object({
    /** Dados do escritório (tenant) - suporta PF e PJ */
    company: z.object({
      person_type: z.enum(['pf', 'pj'], { required_error: 'Selecione Pessoa Física ou Jurídica' }),
      legal_name: z.string().min(3, 'Razão social/Nome deve ter no mínimo 3 caracteres'),
      trade_name: z.string().max(255).optional().transform((s) => (s?.trim() || undefined)),
      cnpj: z.string().optional(),
      cpf: z.string().optional(),
      phone: z.string().max(20).optional(),
    }),
    /** Usuário responsável (admin do tenant) */
    user: z.object({
      name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
      email: z.string().email('E-mail inválido'),
      password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    }),
  })
  .superRefine((data, ctx) => {
    const cnpjDigits = (data.company.cnpj || '').replace(/\D/g, '');
    const cpfDigits = (data.company.cpf || '').replace(/\D/g, '');
    if (data.company.person_type === 'pj') {
      if (cnpjDigits.length !== 14) {
        ctx.addIssue({ code: 'custom', message: 'CNPJ deve ter 14 dígitos', path: ['company', 'cnpj'] });
      } else if (!isValidCnpj(cnpjDigits)) {
        ctx.addIssue({ code: 'custom', message: 'CNPJ inválido', path: ['company', 'cnpj'] });
      }
    } else {
      if (cpfDigits.length !== 11) {
        ctx.addIssue({ code: 'custom', message: 'CPF deve ter 11 dígitos', path: ['company', 'cpf'] });
      } else if (!isValidCpf(cpfDigits)) {
        ctx.addIssue({ code: 'custom', message: 'CPF inválido', path: ['company', 'cpf'] });
      }
    }
  });

export const RefreshTokenSchema = z.object({
  token: z.string().min(1),
});

export const LogoutSchema = z.object({
  token: z.string().min(1),
});

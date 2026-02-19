import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** Remove caracteres não numéricos do CNPJ para validação */
const cnpjDigits = z.string().transform((v) => v.replace(/\D/g, ''));

export const RegisterSchema = z.object({
  /** Dados do escritório de contabilidade (tenant) */
  company: z.object({
    legal_name: z.string().min(3, 'Razão social deve ter no mínimo 3 caracteres'),
    trade_name: z.string().max(255).optional().transform((s) => (s?.trim() || undefined)),
    cnpj: cnpjDigits.pipe(z.string().length(14, 'CNPJ deve ter 14 dígitos')),
    phone: z.string().max(20).optional(),
  }),
  /** Usuário responsável (admin do tenant) */
  user: z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  }),
});

export const RefreshTokenSchema = z.object({
  token: z.string().min(1),
});

export const LogoutSchema = z.object({
  token: z.string().min(1),
});

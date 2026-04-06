import { z } from 'zod';

export const AccessListImportRowSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  empresa: z.string().optional(),
});

export const ActivateAccessSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um registro'),
});

export const DeactivateAccessSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos um registro'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter ao menos 8 caracteres'),
});

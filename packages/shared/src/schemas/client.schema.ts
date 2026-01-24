import { z } from 'zod';

export const CreateClientSchema = z.object({
  name: z.string().min(3),
  cnpj: z.string().min(14).max(18),
  email: z.string().email().optional(),
});

export const UpdateClientSchema = z.object({
  name: z.string().min(3).optional(),
  cnpj: z.string().min(14).max(18).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

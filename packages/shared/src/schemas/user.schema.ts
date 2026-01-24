import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(3),
  company_id: z.string().uuid(),
  role: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
  role: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
});

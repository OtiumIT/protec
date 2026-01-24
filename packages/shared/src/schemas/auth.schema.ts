import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  company: z.object({
    name: z.string().min(3),
    domain: z.string().optional(),
  }),
  user: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const RefreshTokenSchema = z.object({
  token: z.string().min(1),
});

export const LogoutSchema = z.object({
  token: z.string().min(1),
});

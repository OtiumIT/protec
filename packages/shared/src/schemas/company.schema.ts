import { z } from 'zod';

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  domain: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreateCompanySchema = z.object({
  name: z.string().min(3),
  domain: z.string().optional(),
});

export const UpdateCompanySchema = z.object({
  name: z.string().min(3).optional(),
  domain: z.string().optional(),
});

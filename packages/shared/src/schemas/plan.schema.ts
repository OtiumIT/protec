import { z } from 'zod';

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  max_users: z.number().min(1),
  price: z.number().min(0),
  billing_cycle: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  is_custom: z.boolean().optional(),
  is_managed: z.boolean().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const CreatePlanSchema = z.object({
  name: z.string().min(3),
  maxUsers: z.number().min(1),
  price: z.number().min(0),
  billingCycle: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  isCustom: z.boolean().optional(),
  isManaged: z.boolean().optional(),
});

export const UpdatePlanSchema = z.object({
  name: z.string().min(3).optional(),
  maxUsers: z.number().min(1).optional(),
  price: z.number().min(0).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  features: z.array(z.string()).optional(),
  isCustom: z.boolean().optional(),
  isManaged: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

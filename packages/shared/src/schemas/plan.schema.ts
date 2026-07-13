import { z } from 'zod';

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  max_users: z.number().min(1),
  max_clients: z.number().min(0).optional(),
  price: z.number().min(0),
  original_price: z.number().min(0).nullable().optional(),
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
  maxClients: z.number().min(0).optional(),
  price: z.number().min(0),
  originalPrice: z.number().min(0).nullable().optional(),
  billingCycle: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  isCustom: z.boolean().optional(),
  isManaged: z.boolean().optional(),
  stripePriceId: z.string().nullable().optional(),
});

export const UpdatePlanSchema = z.object({
  name: z.string().min(3).optional(),
  maxUsers: z.number().min(1).optional(),
  maxClients: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  features: z.array(z.string()).optional(),
  isCustom: z.boolean().optional(),
  isManaged: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  stripePriceId: z.string().nullable().optional(),
});

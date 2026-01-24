import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  planId: z.string().uuid(),
});

export const UpdateSubscriptionSchema = z.object({
  planId: z.string().uuid().optional(),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing']).optional(),
});

export const CancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
});

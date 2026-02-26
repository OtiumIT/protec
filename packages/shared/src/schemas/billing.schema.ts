import { z } from 'zod';

/**
 * Schema básico para webhook do Stripe
 * Valida estrutura mínima necessária para processar eventos
 */
export const StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(), // Objeto pode variar dependendo do tipo de evento
  }),
  created: z.number().optional(),
});

export const BillingPortalSessionSchema = z.object({
  returnUrl: z.string().url(),
});

export const BillingCheckoutSessionSchema = z.object({
  planId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

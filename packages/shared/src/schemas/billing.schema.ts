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

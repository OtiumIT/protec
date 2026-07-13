-- Migration: 066_plans_standard_stripe_price
-- Define o Stripe Price ID do plano pago (Standard) na conta Stripe nova.
-- Migration de public (tabela `plans` é global; não é de tenant).

UPDATE plans
SET stripe_price_id = 'price_1Tsrz2ERvWxKRK9Y7phucM0q',
    updated_at = NOW()
WHERE name = 'Standard';

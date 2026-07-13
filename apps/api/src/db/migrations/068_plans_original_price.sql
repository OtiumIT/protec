-- Migration: 068_plans_original_price
-- (renumerada de 065: conflito com 065_eps_simulador_in_2306.sql — schema_migrations usa version INTEGER)
-- Valor cheio (exibição) vs price (valor promocional cobrado no Stripe)

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

COMMENT ON COLUMN plans.original_price IS 'Valor cheio para exibição (de/por). NULL = sem destaque promocional.';

-- Standard: promo R$ 97 (price) com valor cheio R$ 197
UPDATE plans
SET original_price = 197,
    price = 97,
    updated_at = NOW()
WHERE name = 'Standard';

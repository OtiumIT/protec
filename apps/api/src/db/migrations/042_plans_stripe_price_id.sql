-- Migration: 042_plans_stripe_price_id
-- ID do preço no Stripe para checkout (opcional; planos sem valor não usam).

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

COMMENT ON COLUMN plans.stripe_price_id IS 'Stripe Price ID (ex.: price_xxx) para Checkout; NULL = plano gratuito ou sem Stripe';

CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

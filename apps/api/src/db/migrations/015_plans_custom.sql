-- Migration: 015_plans_custom
-- Adicionar suporte para planos customizados (módulos gerenciados individualmente)

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_managed BOOLEAN DEFAULT FALSE; -- Se true, módulos são gerenciados manualmente (não via Stripe)

-- Índices
CREATE INDEX IF NOT EXISTS idx_plans_is_custom ON plans(is_custom);
CREATE INDEX IF NOT EXISTS idx_plans_is_managed ON plans(is_managed);

-- Comentários
COMMENT ON COLUMN plans.is_custom IS 'Se true, é um plano customizado (preço negociado, módulos editáveis individualmente)';
COMMENT ON COLUMN plans.is_managed IS 'Se true, módulos são gerenciados manualmente (não via Stripe/subscription automática)';

-- Criar plano Customizado (apenas se não existir)
-- NOTA: A constraint UNIQUE será adicionada na migration 019
INSERT INTO plans (name, max_users, price, billing_cycle, is_custom, is_managed, features)
SELECT 'Customizado', 999999, 0, 'monthly', true, true, '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM plans WHERE name = 'Customizado' AND is_custom = true
);

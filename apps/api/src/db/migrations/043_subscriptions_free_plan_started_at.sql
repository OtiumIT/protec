-- Migration: 043_subscriptions_free_plan_started_at
-- Data em que o tenant entrou no plano Free pela primeira vez (para bloquear após 7 dias)

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS free_plan_started_at TIMESTAMP;

COMMENT ON COLUMN subscriptions.free_plan_started_at IS 'Data em que o tenant entrou no plano Free pela primeira vez; após 7 dias perde acesso às funcionalidades';

-- Preencher para assinaturas já no plano Free (usar created_at como referência)
UPDATE subscriptions s
SET free_plan_started_at = COALESCE(s.free_plan_started_at, s.created_at)
FROM plans p
WHERE p.id = s.plan_id AND p.name = 'Free';

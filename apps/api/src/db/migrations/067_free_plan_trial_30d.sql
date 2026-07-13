-- Migration: 067_free_plan_trial_30d
-- Trial do plano Free passa a ser 30 dias por cliente (free_plan_started_at + 30d).
-- Reset do relógio dos Free atuais para NOW() (evita bloqueio imediato no deploy).
-- Migration de public (subscriptions/plans são globais; não é de tenant).

-- 1) Zerar relógio do trial para todos os tenants Free atuais
UPDATE subscriptions s
SET free_plan_started_at = NOW(),
    updated_at = NOW()
FROM plans p
WHERE p.id = s.plan_id
  AND p.name = 'Free';

-- 2) Atualizar features do plano Free: "7 dias grátis" -> "30 dias grátis"
UPDATE plans
SET features = '["30 dias grátis","Acesso a todos os módulos durante o período de teste","1 usuário","Suporte por e-mail"]'::jsonb,
    updated_at = NOW()
WHERE name = 'Free';

COMMENT ON COLUMN subscriptions.free_plan_started_at IS
  'Data em que o tenant entrou no plano Free pela primeira vez; após 30 dias perde acesso aos módulos (requireModule)';

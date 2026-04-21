-- Migration: 063_subscriptions_backfill_free_no_subscription
-- Empresas (tenants) sem nenhuma linha em subscriptions passam a ter assinatura no plano Free ativo.
-- Idempotente: só insere onde ainda não existe subscription para o company_id.
-- free_plan_started_at = NOW() para não expirar imediatamente o período de 7 dias (datas antigas bloqueariam o Free).

INSERT INTO subscriptions (company_id, plan_id, status, free_plan_started_at)
SELECT c.id, fp.id, 'active', NOW()
FROM companies c
INNER JOIN (
  SELECT id FROM plans WHERE name = 'Free' ORDER BY created_at ASC LIMIT 1
) fp ON true
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.company_id = c.id
);

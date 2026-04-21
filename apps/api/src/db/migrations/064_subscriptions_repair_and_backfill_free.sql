-- Migration: 064_subscriptions_repair_and_backfill_free
-- 1) Corrige assinaturas cujo plan_id não existe em plans (dados legados).
-- 2) Insere Free para empresas sem nenhuma linha em subscriptions (idempotente).

UPDATE subscriptions s
SET
  plan_id = (SELECT id FROM plans WHERE name = 'Free' ORDER BY created_at ASC LIMIT 1),
  status = 'active',
  free_plan_started_at = COALESCE(s.free_plan_started_at, NOW()),
  updated_at = NOW()
WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.id = s.plan_id)
  AND EXISTS (SELECT 1 FROM plans WHERE name = 'Free' LIMIT 1);

INSERT INTO subscriptions (company_id, plan_id, status, free_plan_started_at)
SELECT c.id, fp.id, 'active', NOW()
FROM companies c
INNER JOIN (
  SELECT id FROM plans WHERE name = 'Free' ORDER BY created_at ASC LIMIT 1
) fp ON true
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.company_id = c.id
);

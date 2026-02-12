-- Migration: 026_simulador_in_2306_all_tenants
-- Ativa o módulo Simulador IN 2.306/2026 para todos os tenants e em todos os planos.
-- Assim o menu carrega o item para todos os clientes (tenants).

-- 1) Incluir SIMULADOR_IN_2306 em todos os planos (novos assinantes já recebem o módulo)
INSERT INTO plan_modules (plan_id, module_id, is_default)
SELECT p.id, m.id, true
FROM plans p
CROSS JOIN modules m
WHERE m.key = 'SIMULADOR_IN_2306'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- 2) Ativar o módulo para todos os tenants existentes (menu aparece para todos)
INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
WHERE m.key = 'SIMULADOR_IN_2306'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

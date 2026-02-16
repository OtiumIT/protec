-- Migration: 031_irpf_alta_renda_all_tenants
-- Ativa o módulo IRPF Alta Renda para todos os tenants e em todos os planos.

INSERT INTO plan_modules (plan_id, module_id, is_default)
SELECT p.id, m.id, true
FROM plans p
CROSS JOIN modules m
WHERE m.key = 'IRPF_ALTA_RENDA'
ON CONFLICT (plan_id, module_id) DO NOTHING;

INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
WHERE m.key = 'IRPF_ALTA_RENDA'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

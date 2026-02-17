-- Migration: 032_force_all_modules_all_tenants
-- Ativa TODOS os módulos para TODOS os tenants (apresentação/demo).
-- Garante que o menu carregue Simulador IN 2306, IRPF Alta Renda, Fiscal Files, Rating Validator, etc.

INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
ON CONFLICT (tenant_id, module_id)
DO UPDATE SET enabled_until = NULL;
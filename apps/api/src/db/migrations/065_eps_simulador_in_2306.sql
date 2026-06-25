-- Migration: 065_eps_simulador_in_2306
-- Ativa o módulo SIMULADOR_IN_2306 (Simulador LC 224/2025) para todos os tenants
-- criados via landing EPS (companies.source = 'EPS'), que antes recebiam apenas GESTAO_IMOVEIS.

INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
WHERE c.source = 'EPS'
  AND m.key = 'SIMULADOR_IN_2306'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

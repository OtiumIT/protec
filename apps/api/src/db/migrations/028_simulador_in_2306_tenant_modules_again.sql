-- Migration: 028_simulador_in_2306_tenant_modules_again
-- Reaplica a ativação do Simulador IN 2.306/2026 para TODOS os tenants.
-- Útil se a Protec (ou outro) foi criada após a 026 e por isso não tinha o módulo no menu.

INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
WHERE m.key = 'SIMULADOR_IN_2306'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

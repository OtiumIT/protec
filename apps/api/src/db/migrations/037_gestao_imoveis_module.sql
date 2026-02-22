-- Migration: 037_gestao_imoveis_module
-- Cria o módulo Gestão Imobiliária e ativa para todos os tenants e planos.

-- 1) Inserir módulo na tabela modules
INSERT INTO modules (name, key, description)
VALUES (
  'Gestão Imobiliária',
  'GESTAO_IMOVEIS',
  'Gestão patrimonial e planejamento tributário imobiliário (PF vs PJ vs Reforma 2027)'
)
ON CONFLICT (key) DO NOTHING;

-- 2) Incluir em todos os planos
INSERT INTO plan_modules (plan_id, module_id, is_default)
SELECT p.id, m.id, true
FROM plans p
CROSS JOIN modules m
WHERE m.key = 'GESTAO_IMOVEIS'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- 3) Ativar para todos os tenants existentes
INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
WHERE m.key = 'GESTAO_IMOVEIS'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

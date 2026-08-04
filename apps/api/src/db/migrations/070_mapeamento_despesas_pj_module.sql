-- Migration: 070_mapeamento_despesas_pj_module
-- Cria o módulo Mapeamento de Despesas PF -> PJ como módulo comercial independente
-- e ativa para todos os tenants e planos existentes.

-- 1) Inserir módulo
INSERT INTO modules (name, key, description)
VALUES (
  'Mapeamento de Despesas PF → PJ',
  'MAPEAMENTO_DESPESAS_PJ',
  'Diagnóstico guiado para o contador identificar despesas mantidas na pessoa física, avaliar vínculo com a atividade, uso pessoal, documentação e organização para a PJ. Não é ferramenta de cálculo de crédito.'
)
ON CONFLICT (key) DO NOTHING;

-- 2) Incluir em todos os planos
INSERT INTO plan_modules (plan_id, module_id, is_default)
SELECT p.id, m.id, true
FROM plans p
CROSS JOIN modules m
WHERE m.key = 'MAPEAMENTO_DESPESAS_PJ'
ON CONFLICT (plan_id, module_id) DO NOTHING;

-- 3) Ativar para todos os tenants existentes
INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
SELECT c.id, m.id, NULL
FROM companies c
CROSS JOIN modules m
WHERE m.key = 'MAPEAMENTO_DESPESAS_PJ'
ON CONFLICT (tenant_id, module_id) DO NOTHING;

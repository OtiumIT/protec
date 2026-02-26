-- Migration: 040_plans_free_standard
-- Dois planos ativos: Free (7 dias grátis) e Standard (todos os módulos).
-- Demais planos passam a inactive. Adiciona coluna status em plans se não existir.

-- 1) Adicionar coluna status em plans (active/inactive)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Garantir valores válidos para status
UPDATE plans SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'inactive');
ALTER TABLE plans DROP CONSTRAINT IF EXISTS check_plans_status;
ALTER TABLE plans ADD CONSTRAINT check_plans_status CHECK (status IN ('active', 'inactive'));
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
COMMENT ON COLUMN plans.status IS 'active = visível e assinável; inactive = oculto da listagem pública';

-- 2) Marcar todos os planos existentes como inactive (depois ativamos só Free e Standard)
UPDATE plans SET status = 'inactive';

-- 3) Inserir ou atualizar plano Free (7 dias grátis)
INSERT INTO plans (name, max_users, price, billing_cycle, features, is_custom, is_managed, status)
VALUES (
  'Free',
  1,
  0,
  'monthly',
  '["7 dias grátis","Acesso a todos os módulos durante o período de teste","1 usuário","Suporte por e-mail"]'::jsonb,
  false,
  false,
  'active'
)
ON CONFLICT (name) DO UPDATE SET
  max_users = EXCLUDED.max_users,
  price = EXCLUDED.price,
  billing_cycle = EXCLUDED.billing_cycle,
  features = EXCLUDED.features,
  is_custom = EXCLUDED.is_custom,
  is_managed = EXCLUDED.is_managed,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 4) Inserir ou atualizar plano Standard (todos os módulos)
INSERT INTO plans (name, max_users, price, billing_cycle, features, is_custom, is_managed, status)
VALUES (
  'Standard',
  10,
  99.90,
  'monthly',
  '["Transação Tributária - Análise da capacidade de pagamento","Simulação do aumento da tributação do lucro presumido - LC 224/2025","Tributação da alta renda/dividendos - IRPF Alta Renda","Gestão Imobiliária","Arquivos fiscais (SPED, ECD, PGDAS)","Relatórios e análises","Analytics","Cobrança e assinaturas","Até 10 usuários","Suporte por e-mail"]'::jsonb,
  false,
  false,
  'active'
)
ON CONFLICT (name) DO UPDATE SET
  max_users = EXCLUDED.max_users,
  price = EXCLUDED.price,
  billing_cycle = EXCLUDED.billing_cycle,
  features = EXCLUDED.features,
  is_custom = EXCLUDED.is_custom,
  is_managed = EXCLUDED.is_managed,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 5) Associar todos os módulos aos planos Free e Standard (plan_modules)
INSERT INTO plan_modules (plan_id, module_id, is_default)
SELECT p.id, m.id, true
FROM plans p
CROSS JOIN modules m
WHERE p.name IN ('Free', 'Standard')
ON CONFLICT (plan_id, module_id) DO NOTHING;

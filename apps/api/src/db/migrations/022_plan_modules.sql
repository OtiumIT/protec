-- Migration: 022_plan_modules
-- Tabela de módulos associados a planos
-- Esta migration roda no schema public

CREATE TABLE IF NOT EXISTS plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT true, -- Se true, módulo é ativado automaticamente quando tenant assina o plano
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan_id, module_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plan_modules_plan_id ON plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_module_id ON plan_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_is_default ON plan_modules(is_default);

-- Comentários para documentação
COMMENT ON TABLE plan_modules IS 'Associação de módulos com planos - define quais módulos vêm com cada plano';
COMMENT ON COLUMN plan_modules.is_default IS 'Se true, módulo é ativado automaticamente quando tenant assina o plano';

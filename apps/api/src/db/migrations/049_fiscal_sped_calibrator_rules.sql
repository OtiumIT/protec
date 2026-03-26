-- Migration: 049_fiscal_sped_calibrator_rules
-- Regras de calibracao para classificacao de contas SPED (por tenant, opcionalmente por cliente)
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS fiscal_sped_calibrator_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NULL REFERENCES clients(id) ON DELETE CASCADE,
  pattern VARCHAR(255) NOT NULL,
  target_module VARCHAR(50) NOT NULL DEFAULT 'simulador_in2306',
  target_kind VARCHAR(20) NOT NULL, -- receita | deducao | retencao
  target_field VARCHAR(100) NOT NULL,
  confidence_override NUMERIC(5,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_target_kind CHECK (target_kind IN ('receita', 'deducao', 'retencao')),
  CONSTRAINT check_confidence_override CHECK (
    confidence_override IS NULL OR (confidence_override >= 0 AND confidence_override <= 1)
  )
);

CREATE INDEX IF NOT EXISTS idx_fiscal_sped_calibrator_rules_client_id
  ON fiscal_sped_calibrator_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_sped_calibrator_rules_active
  ON fiscal_sped_calibrator_rules(active);
CREATE INDEX IF NOT EXISTS idx_fiscal_sped_calibrator_rules_module
  ON fiscal_sped_calibrator_rules(target_module);

CREATE TRIGGER update_fiscal_sped_calibrator_rules_updated_at
  BEFORE UPDATE ON fiscal_sped_calibrator_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE fiscal_sped_calibrator_rules IS
  'Regras de calibracao da classificacao SPED para prefill de modulos';
COMMENT ON COLUMN fiscal_sped_calibrator_rules.client_id IS
  'Quando NULL, regra global do tenant; quando preenchido, regra especifica do cliente';
COMMENT ON COLUMN fiscal_sped_calibrator_rules.pattern IS
  'Padrao textual usado na descricao da conta para classificar';
COMMENT ON COLUMN fiscal_sped_calibrator_rules.target_kind IS
  'Tipo de classificacao: receita, deducao ou retencao';

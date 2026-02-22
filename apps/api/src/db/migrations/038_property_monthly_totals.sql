-- Migration: 038_property_monthly_totals
-- Versão reduzida: totais mensais por tipo (locação longa e short)
-- Esta migration roda em schemas de tenant (tenant_{company_id})

-- Adicionar modo_entrada ao property: detalhado (transações) ou reduzido (totais mensais)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS modo_entrada VARCHAR(20) NOT NULL DEFAULT 'detalhado'
  CHECK (modo_entrada IN ('detalhado', 'reduzido'));

-- Tabela para modo reduzido: totais mensais (locação longa + short)
CREATE TABLE IF NOT EXISTS property_monthly_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL CHECK (mes_referencia ~ '^\d{4}-\d{2}$'),
  receita_longa DECIMAL(15, 2) NOT NULL DEFAULT 0,
  receita_short DECIMAL(15, 2) NOT NULL DEFAULT 0,
  despesas_dedutiveis DECIMAL(15, 2) NOT NULL DEFAULT 0,
  custos_operacionais DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_property_monthly_totals_property_id ON property_monthly_totals(property_id);
CREATE INDEX IF NOT EXISTS idx_property_monthly_totals_mes ON property_monthly_totals(mes_referencia);

CREATE TRIGGER update_property_monthly_totals_updated_at
  BEFORE UPDATE ON property_monthly_totals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE property_monthly_totals IS 'Totais mensais (modo reduzido): locação longa, short, despesas e custos';
COMMENT ON COLUMN properties.modo_entrada IS 'detalhado=transações individuais; reduzido=totais mensais';

-- Migration: 046_property_simulations
-- Tabela de simulações do Simulador Imobiliário (PF vs PJ vs Reforma)
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS property_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ano INTEGER NOT NULL,
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  title VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_property_simulations_ano CHECK (ano >= 2020 AND ano <= 2035)
);

CREATE INDEX IF NOT EXISTS idx_property_simulations_client_id ON property_simulations(client_id);
CREATE INDEX IF NOT EXISTS idx_property_simulations_ano ON property_simulations(ano);
CREATE INDEX IF NOT EXISTS idx_property_simulations_created_at ON property_simulations(created_at DESC);

CREATE TRIGGER update_property_simulations_updated_at
  BEFORE UPDATE ON property_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE property_simulations IS 'Simulações Simulador Imobiliário PF vs PJ vs Reforma 2027';

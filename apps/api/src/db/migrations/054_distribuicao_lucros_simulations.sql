-- Migration: 054_distribuicao_lucros_simulations
-- Simulações: investimento na PJ x retenção na PF (Lei 15.270/2025)
-- Schema tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS distribuicao_lucros_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  title VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distribuicao_lucros_simulations_client_id ON distribuicao_lucros_simulations(client_id);
CREATE INDEX IF NOT EXISTS idx_distribuicao_lucros_simulations_created_at ON distribuicao_lucros_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distribuicao_lucros_simulations_input_data_gin ON distribuicao_lucros_simulations USING GIN (input_data);
CREATE INDEX IF NOT EXISTS idx_distribuicao_lucros_simulations_result_data_gin ON distribuicao_lucros_simulations USING GIN (result_data);

CREATE TRIGGER update_distribuicao_lucros_simulations_updated_at
  BEFORE UPDATE ON distribuicao_lucros_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE distribuicao_lucros_simulations IS 'Simulações investimento PJ x retenção PF (Lei 15.270/2025)';
COMMENT ON COLUMN distribuicao_lucros_simulations.input_data IS 'Parâmetros: valor, meses, irpjRate, appKey';
COMMENT ON COLUMN distribuicao_lucros_simulations.result_data IS 'Resultado completo da runDistribuicaoLucrosSimulation';

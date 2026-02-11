-- Migration: 025_in_2306_simulations
-- Tabela de simulações da Nova IN 2.306/2026
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS in_2306_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- Opcional para simulações sem vínculo
  competence VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  
  -- Dados de entrada da simulação (estrutura flexível conforme regras da IN 2.306/2026)
  input_data JSONB NOT NULL,
  
  -- Resultado da simulação (valores calculados, parcelas, condições, etc.)
  result_data JSONB NOT NULL,
  
  -- Metadados
  title VARCHAR(255), -- Título opcional da simulação
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_competence_format_in2306 CHECK (competence ~ '^\d{4}-\d{2}$')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_in_2306_simulations_client_id ON in_2306_simulations(client_id);
CREATE INDEX IF NOT EXISTS idx_in_2306_simulations_competence ON in_2306_simulations(competence);
CREATE INDEX IF NOT EXISTS idx_in_2306_simulations_created_at ON in_2306_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_2306_simulations_input_data_gin ON in_2306_simulations USING GIN (input_data);
CREATE INDEX IF NOT EXISTS idx_in_2306_simulations_result_data_gin ON in_2306_simulations USING GIN (result_data);

-- Trigger para updated_at
CREATE TRIGGER update_in_2306_simulations_updated_at
  BEFORE UPDATE ON in_2306_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE in_2306_simulations IS 'Simulações da Nova IN 2.306/2026 - Parcelamento e condições fiscais';
COMMENT ON COLUMN in_2306_simulations.input_data IS 'Dados de entrada (valores, prazos, opções conforme IN 2.306/2026)';
COMMENT ON COLUMN in_2306_simulations.result_data IS 'Resultado da simulação (parcelas, totais, condições aplicáveis)';

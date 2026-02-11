-- Migration: 021_rating_validations
-- Tabela de validações de Rating PGFN (CAPAG)
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS rating_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  competence VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  fiscal_file_id UUID REFERENCES fiscal_files(id) ON DELETE SET NULL, -- NULL para simulações
  is_simulation BOOLEAN DEFAULT false,
  
  -- Dados de entrada (campos granulares)
  input_data JSONB NOT NULL, -- Balanço e DRE usados (estrutura granular)
  
  -- Valores agregados calculados (para referência)
  calculated_values JSONB, -- Valores intermediários calculados (ativo_circulante_total, etc.)
  
  -- Indicadores calculados
  liquidez_corrente DECIMAL(15,4),
  liquidez_geral DECIMAL(15,4),
  solvencia DECIMAL(15,4),
  
  -- Ratings
  rating_estimado VARCHAR(1) NOT NULL, -- A, B, C, D
  rating_real VARCHAR(1), -- A, B, C, D (opcional)
  
  -- Análise
  has_discrepancy BOOLEAN DEFAULT false,
  discrepancy_details JSONB, -- Detalhes da discrepância
  
  -- Metadados
  created_by UUID, -- Referência a users (pode ser NULL se não houver user)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Validação de competência (formato YYYY-MM)
  CONSTRAINT check_competence_format CHECK (competence ~ '^\d{4}-\d{2}$'),
  -- Validação de rating
  CONSTRAINT check_rating_estimado CHECK (rating_estimado IN ('A', 'B', 'C', 'D')),
  CONSTRAINT check_rating_real CHECK (rating_real IS NULL OR rating_real IN ('A', 'B', 'C', 'D'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rating_validations_client_id ON rating_validations(client_id);
CREATE INDEX IF NOT EXISTS idx_rating_validations_competence ON rating_validations(competence);
CREATE INDEX IF NOT EXISTS idx_rating_validations_fiscal_file_id ON rating_validations(fiscal_file_id);
CREATE INDEX IF NOT EXISTS idx_rating_validations_is_simulation ON rating_validations(is_simulation);
CREATE INDEX IF NOT EXISTS idx_rating_validations_rating_estimado ON rating_validations(rating_estimado);
CREATE INDEX IF NOT EXISTS idx_rating_validations_client_competence ON rating_validations(client_id, competence);
CREATE INDEX IF NOT EXISTS idx_rating_validations_created_at ON rating_validations(created_at DESC);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_rating_validations_input_data_gin ON rating_validations USING GIN (input_data);
CREATE INDEX IF NOT EXISTS idx_rating_validations_calculated_values_gin ON rating_validations USING GIN (calculated_values);

-- Trigger para updated_at
CREATE TRIGGER update_rating_validations_updated_at 
  BEFORE UPDATE ON rating_validations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE rating_validations IS 'Validações de Rating PGFN (CAPAG) - Simulações e validações reais de ECD';
COMMENT ON COLUMN rating_validations.is_simulation IS 'true para simulações, false para validações reais de ECD';
COMMENT ON COLUMN rating_validations.input_data IS 'Dados de entrada granulares (Balanço e DRE)';
COMMENT ON COLUMN rating_validations.calculated_values IS 'Valores agregados calculados automaticamente (ativo_circulante_total, etc.)';
COMMENT ON COLUMN rating_validations.rating_estimado IS 'Rating calculado pelos indicadores (A, B, C, D)';
COMMENT ON COLUMN rating_validations.rating_real IS 'Rating real informado pelo usuário ou extraído da ECD';
COMMENT ON COLUMN rating_validations.has_discrepancy IS 'true se rating_estimado != rating_real';
COMMENT ON COLUMN rating_validations.competence IS 'Competência no formato YYYY-MM (ex: 2024-01)';

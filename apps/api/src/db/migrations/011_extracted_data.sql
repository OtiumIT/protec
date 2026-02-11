-- Migration: 011_extracted_data
-- Tabela de dados extraídos dos arquivos fiscais
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS extracted_fiscal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_file_id UUID NOT NULL REFERENCES fiscal_files(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  competence VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Validação de competência (formato YYYY-MM)
  CONSTRAINT check_competence_format CHECK (competence ~ '^\d{4}-\d{2}$')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_extracted_data_fiscal_file_id ON extracted_fiscal_data(fiscal_file_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_client_id ON extracted_fiscal_data(client_id);
CREATE INDEX IF NOT EXISTS idx_extracted_data_data_type ON extracted_fiscal_data(data_type);
CREATE INDEX IF NOT EXISTS idx_extracted_data_competence ON extracted_fiscal_data(competence);
CREATE INDEX IF NOT EXISTS idx_extracted_data_client_competence ON extracted_fiscal_data(client_id, competence);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_extracted_data_data_gin ON extracted_fiscal_data USING GIN (data);

-- Comentários para documentação
COMMENT ON TABLE extracted_fiscal_data IS 'Dados estruturados extraídos dos arquivos fiscais';
COMMENT ON COLUMN extracted_fiscal_data.data_type IS 'Tipo: balance_sheet, dre, tax_liabilities, revenue, other';
COMMENT ON COLUMN extracted_fiscal_data.data IS 'Dados estruturados em JSONB';
COMMENT ON COLUMN extracted_fiscal_data.competence IS 'Competência no formato YYYY-MM (ex: 2024-01)';

-- Migration: 010_fiscal_files
-- Tabela de arquivos fiscais dos clientes
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS fiscal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL,
  competence VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- Path no Supabase Storage
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
  processing_error TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Validação de competência (formato YYYY-MM)
  CONSTRAINT check_competence_format CHECK (competence ~ '^\d{4}-\d{2}$')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fiscal_files_client_id ON fiscal_files(client_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_files_competence ON fiscal_files(competence);
CREATE INDEX IF NOT EXISTS idx_fiscal_files_status ON fiscal_files(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_files_file_type ON fiscal_files(file_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_files_client_competence ON fiscal_files(client_id, competence);

-- Trigger para updated_at
CREATE TRIGGER update_fiscal_files_updated_at 
  BEFORE UPDATE ON fiscal_files 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE fiscal_files IS 'Arquivos fiscais enviados pelos clientes (SPED, ECD, PGDAS, etc)';
COMMENT ON COLUMN fiscal_files.file_type IS 'Tipo: sped, ecd, pgdas, xml, pdf, txt, outros';
COMMENT ON COLUMN fiscal_files.status IS 'Status: uploaded, processing, processed, error';
COMMENT ON COLUMN fiscal_files.competence IS 'Competência no formato YYYY-MM (ex: 2024-01)';

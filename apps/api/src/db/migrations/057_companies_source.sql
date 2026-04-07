-- Migration: 057_companies_source
-- Adiciona coluna de origem do cadastro para rastreamento de landing pages e campanhas

ALTER TABLE companies ADD COLUMN IF NOT EXISTS source VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_companies_source ON companies(source);
COMMENT ON COLUMN companies.source IS 'Origem do cadastro: EPS, organic, etc.';

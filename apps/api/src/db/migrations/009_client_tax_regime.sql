-- Migration: 009_client_tax_regime
-- Adiciona campos de regime tributário à tabela clients
-- Esta migration roda em schemas de tenant (tenant_{company_id})

-- Adicionar campos ao clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cnae VARCHAR(10),
  ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50),
  ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Criar índice para tax_regime (útil para filtros)
CREATE INDEX IF NOT EXISTS idx_clients_tax_regime ON clients(tax_regime);

-- Comentários para documentação
COMMENT ON COLUMN clients.tax_regime IS 'Regime tributário: simples_nacional, lucro_presumido, lucro_real, outros';
COMMENT ON COLUMN clients.cnae IS 'Código CNAE principal da empresa';
COMMENT ON COLUMN clients.state_registration IS 'Inscrição Estadual';
COMMENT ON COLUMN clients.municipal_registration IS 'Inscrição Municipal';

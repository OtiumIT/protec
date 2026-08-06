-- Migration: 078_simulation_shares_generic
-- Tabela genérica de shares de simulação (tenant) + lookup público
-- Suporta todos os tipos: in_2306, irpf_alta_renda, distribuicao_lucros

-- Tabela no schema do tenant
CREATE TABLE IF NOT EXISTS simulation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_type VARCHAR(50) NOT NULL,
  simulation_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  title VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  access_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_shares_token ON simulation_shares(token_hash);
CREATE INDEX IF NOT EXISTS idx_simulation_shares_type_sim ON simulation_shares(simulation_type, simulation_id);

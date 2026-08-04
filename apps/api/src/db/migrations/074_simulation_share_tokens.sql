-- Migration: 074_simulation_share_tokens
-- Tenant-side: armazena dados do share de simulação
-- Public-side: lookup rápido sem auth

-- Tabela TENANT
CREATE TABLE IF NOT EXISTS property_simulation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES property_simulations(id) ON DELETE CASCADE,
  simulation_kind VARCHAR(50) NOT NULL DEFAULT 'locacao',
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  title VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_simulation_shares_simulation
  ON property_simulation_shares(simulation_id);
CREATE INDEX IF NOT EXISTS idx_property_simulation_shares_token
  ON property_simulation_shares(token_hash);

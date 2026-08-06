-- Migration: 079_simulation_share_tokens_generic_public
-- Tabela pública para resolução de token -> company_id (sem auth)

CREATE TABLE IF NOT EXISTS simulation_share_tokens_generic (
  token_hash VARCHAR(128) PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP
);

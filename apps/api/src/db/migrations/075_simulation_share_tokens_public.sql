-- Migration: 075_simulation_share_tokens_public (PUBLIC)
-- Lookup público para resolver tenant de links compartilhados de simulações

CREATE TABLE IF NOT EXISTS public.simulation_share_tokens (
  token_hash VARCHAR(128) PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_share_tokens_company
  ON public.simulation_share_tokens(company_id);

-- Migration: 072_statement_share_tokens (PUBLIC)
-- Registro público mínimo para resolver o tenant de um link read-only de prestação
-- de contas. Os dados completos do compartilhamento vivem no schema do tenant
-- (property_statement_shares). Aqui guardamos apenas o necessário para localizar o
-- tenant e validar expiração/revogação sem exigir autenticação.

CREATE TABLE IF NOT EXISTS public.statement_share_tokens (
  token_hash VARCHAR(128) PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statement_share_tokens_company ON public.statement_share_tokens(company_id);

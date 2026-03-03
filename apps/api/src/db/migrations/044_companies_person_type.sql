-- Migration: 044_companies_person_type
-- Suporte a pessoa física no cadastro de empresas (tenants)
-- Roda no schema public

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS person_type VARCHAR(2) DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Índice único para CPF (apenas quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cpf_unique ON companies(cpf) WHERE cpf IS NOT NULL;

COMMENT ON COLUMN companies.person_type IS 'pj = Pessoa Jurídica, pf = Pessoa Física';
COMMENT ON COLUMN companies.cpf IS 'CPF da empresa quando person_type = pf';

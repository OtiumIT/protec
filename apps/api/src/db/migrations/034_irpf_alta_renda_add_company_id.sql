-- Migration: 034_irpf_alta_renda_add_company_id
-- Adiciona coluna company_id à tabela irpf_alta_renda no schema do tenant.
-- A migration 029 foi aplicada antes de essa coluna existir.
ALTER TABLE irpf_alta_renda
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_irpf_alta_renda_company_id ON irpf_alta_renda(company_id);

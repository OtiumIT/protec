-- Migration: 093_comparativo_regimes_kind
-- Separa simulações do comparativo de regimes (LP x LR x Simples)
-- das simulações Simples puro x regime regular de IBS/CBS.

ALTER TABLE comparativo_regimes_simulations
  ADD COLUMN IF NOT EXISTS kind VARCHAR(30) NOT NULL DEFAULT 'regimes';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comparativo_regimes_simulations_kind_check'
      AND conrelid = 'comparativo_regimes_simulations'::regclass
  ) THEN
    ALTER TABLE comparativo_regimes_simulations
      ADD CONSTRAINT comparativo_regimes_simulations_kind_check
      CHECK (kind IN ('regimes', 'simples_ibs_cbs'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comparativo_regimes_simulations_kind
  ON comparativo_regimes_simulations (kind, created_at DESC);

-- Migration: 053_property_simulations_simulation_kind
-- Distingue simulações do Simulador Locação PF×PJ vs Ganho de Capital (imóvel)

ALTER TABLE property_simulations
  ADD COLUMN IF NOT EXISTS simulation_kind TEXT NOT NULL DEFAULT 'locacao_pf_pj';

ALTER TABLE property_simulations
  DROP CONSTRAINT IF EXISTS check_property_simulations_simulation_kind;

ALTER TABLE property_simulations
  ADD CONSTRAINT check_property_simulations_simulation_kind
  CHECK (simulation_kind IN ('locacao_pf_pj', 'ganho_capital_imovel'));

CREATE INDEX IF NOT EXISTS idx_property_simulations_kind_created
  ON property_simulations (simulation_kind, created_at DESC);

COMMENT ON COLUMN property_simulations.simulation_kind IS 'locacao_pf_pj: Simulador locação; ganho_capital_imovel: venda / ganho de capital';

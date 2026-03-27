-- Migration: 051_properties_rent_and_nature
-- Adiciona campos principais para simulação tributária por imóvel
-- Esta migration roda em schemas de tenant (tenant_{company_id})

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS natureza_locacao VARCHAR(20) NOT NULL DEFAULT 'residencial',
  ADD COLUMN IF NOT EXISTS valor_aluguel_mensal DECIMAL(15,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'properties_natureza_locacao_check'
  ) THEN
    ALTER TABLE properties
      ADD CONSTRAINT properties_natureza_locacao_check
      CHECK (natureza_locacao IN ('residencial', 'nao_residencial'));
  END IF;
END $$;

-- Identificação e prazo do contrato de locação
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS numero VARCHAR(60);
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS prazo_meses INTEGER CHECK (prazo_meses IS NULL OR prazo_meses BETWEEN 1 AND 240);

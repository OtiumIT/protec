-- Adiciona regime tributário, cache de simulação e campos de imobiliária nos contratos
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(10);
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS ultimo_resultado_simulacao JSONB;
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS tem_imobiliaria BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS imobiliaria_tipo VARCHAR(10) CHECK (imobiliaria_tipo IN ('percentual', 'fixo'));
ALTER TABLE property_leases ADD COLUMN IF NOT EXISTS imobiliaria_valor DECIMAL(15, 2) DEFAULT 0;

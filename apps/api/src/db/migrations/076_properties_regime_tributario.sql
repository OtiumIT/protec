-- Adiciona regime tributário escolhido e cache do resultado da simulação rápida
ALTER TABLE properties ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(10);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ultimo_resultado_simulacao JSONB;

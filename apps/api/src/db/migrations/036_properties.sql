-- Migration: 036_properties
-- Tabelas de imóveis e transações para módulo de Gestão Imobiliária
-- Esta migration roda em schemas de tenant (tenant_{company_id})

-- Tipo de locação: fixa (mensal) ou flexível (Airbnb/short-term)
-- Tipo de transação: receita, despesa_dedutivel, custo_operacional

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tipo_locacao VARCHAR(20) NOT NULL CHECK (tipo_locacao IN ('fixa', 'flexivel')),
  identificador VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL CHECK (mes_referencia ~ '^\d{4}-\d{2}$'),
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('receita', 'despesa_dedutivel', 'custo_operacional')),
  categoria VARCHAR(50) NOT NULL,
  valor DECIMAL(15, 2) NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_properties_client_id ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_tipo_locacao ON properties(tipo_locacao);
CREATE INDEX IF NOT EXISTS idx_property_transactions_property_id ON property_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_transactions_mes_referencia ON property_transactions(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_property_transactions_tipo ON property_transactions(tipo);
CREATE INDEX IF NOT EXISTS idx_property_transactions_property_mes ON property_transactions(property_id, mes_referencia);

-- Triggers para updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_transactions_updated_at
  BEFORE UPDATE ON property_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE properties IS 'Imóveis para gestão patrimonial e planejamento tributário';
COMMENT ON TABLE property_transactions IS 'Lançamentos de receita e despesa por imóvel (mensais)';

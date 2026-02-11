-- Migration: 023_editais
-- Tabela de Editais PGFN (dados globais do sistema)
-- Esta migration roda no schema público (não é por tenant)

CREATE TABLE IF NOT EXISTS editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE, -- Código único (ex: "PGDAU-11-2025")
  name VARCHAR(255) NOT NULL, -- Nome oficial do edital
  description TEXT, -- Descrição
  start_date DATE NOT NULL, -- Data de início
  end_date DATE NOT NULL, -- Data de término
  extended BOOLEAN DEFAULT false, -- Se o prazo foi prorrogado
  
  -- Modalidade de transação
  modality VARCHAR(50) NOT NULL, -- CAPAG, PEQUENO_VALOR, CONTENCIOSO, etc.
  
  -- Condições de pagamento (JSONB para flexibilidade)
  payment_terms JSONB NOT NULL, -- { entryPercent, entryInstallments, maxInstallments, minInstallmentAmount }
  
  -- Regras de desconto por rating (JSONB)
  discount_rules JSONB NOT NULL, -- { A: {...}, B: {...}, C: {...}, D: {...} }
  
  -- Critérios de elegibilidade (JSONB)
  eligibility JSONB NOT NULL, -- { maxAmount, minAmount, requiresRating, allowedRatings, etc. }
  
  -- Observações e links
  notes TEXT,
  official_link VARCHAR(500),
  
  -- Status
  active BOOLEAN DEFAULT true, -- Se o edital está ativo (pode ser desativado manualmente)
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID, -- Usuário que criou (opcional)
  
  -- Validações
  CONSTRAINT check_modality CHECK (modality IN ('CAPAG', 'PEQUENO_VALOR', 'CONTENCIOSO', 'IRRECUPERAVEIS', 'DESENROLA_RURAL', 'PTI')),
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_editais_code ON editais(code);
CREATE INDEX IF NOT EXISTS idx_editais_modality ON editais(modality);
CREATE INDEX IF NOT EXISTS idx_editais_active ON editais(active);
CREATE INDEX IF NOT EXISTS idx_editais_start_date ON editais(start_date);
CREATE INDEX IF NOT EXISTS idx_editais_end_date ON editais(end_date);
CREATE INDEX IF NOT EXISTS idx_editais_dates_range ON editais(start_date, end_date);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_editais_discount_rules_gin ON editais USING GIN (discount_rules);
CREATE INDEX IF NOT EXISTS idx_editais_eligibility_gin ON editais USING GIN (eligibility);

-- Trigger para updated_at
CREATE TRIGGER update_editais_updated_at 
  BEFORE UPDATE ON editais 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE editais IS 'Editais PGFN - Dados globais do sistema (não por tenant)';
COMMENT ON COLUMN editais.code IS 'Código único do edital (ex: PGDAU-11-2025)';
COMMENT ON COLUMN editais.modality IS 'Modalidade: CAPAG, PEQUENO_VALOR, CONTENCIOSO, IRRECUPERAVEIS, DESENROLA_RURAL, PTI';
COMMENT ON COLUMN editais.payment_terms IS 'Condições de pagamento em JSON: { entryPercent, entryInstallments, maxInstallments, minInstallmentAmount }';
COMMENT ON COLUMN editais.discount_rules IS 'Regras de desconto por rating em JSON: { A: {...}, B: {...}, C: {...}, D: {...} }';
COMMENT ON COLUMN editais.eligibility IS 'Critérios de elegibilidade em JSON: { maxAmount, minAmount, requiresRating, allowedRatings, etc. }';

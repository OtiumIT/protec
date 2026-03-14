-- Migration: 048_rating_parcelamento_pgfn
-- Adiciona campo para armazenar dados do parcelamento PGFN junto com a simulação
-- Esta migration roda em schemas de tenant (tenant_{company_id})

-- Adicionar coluna para armazenar dados do parcelamento PGFN
ALTER TABLE rating_validations 
ADD COLUMN IF NOT EXISTS parcelamento_pgfn JSONB;

-- Adicionar coluna para armazenar o comparativo calculado
ALTER TABLE rating_validations 
ADD COLUMN IF NOT EXISTS comparativo_parcelamento JSONB;

-- Índice GIN para busca em JSONB do parcelamento
CREATE INDEX IF NOT EXISTS idx_rating_validations_parcelamento_pgfn_gin 
ON rating_validations USING GIN (parcelamento_pgfn) 
WHERE parcelamento_pgfn IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN rating_validations.parcelamento_pgfn IS 'Dados do parcelamento PGFN extraídos do Recibo de Adesão (CNPJ, modalidade, dívidas, capacidade de pagamento, consolidação, pagamento)';
COMMENT ON COLUMN rating_validations.comparativo_parcelamento IS 'Comparativo entre rating calculado e parcelamento PGFN (cenários, diferença financeira, fundamentação jurídica)';

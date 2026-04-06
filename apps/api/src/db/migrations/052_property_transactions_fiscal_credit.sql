-- Migration: 052_property_transactions_fiscal_credit
-- Metadados fiscais para classificar crédito IBS/CBS em custos operacionais
-- Esta migration roda em schemas de tenant (tenant_{company_id})

ALTER TABLE property_transactions
  ADD COLUMN IF NOT EXISTS gera_credito_ibs_cbs BOOLEAN,
  ADD COLUMN IF NOT EXISTS tipo_credito VARCHAR(20)
    CHECK (tipo_credito IN ('insumo', 'uso_consumo', 'nao_creditavel'));

COMMENT ON COLUMN property_transactions.gera_credito_ibs_cbs
  IS 'Indica se o lançamento foi classificado como potencial gerador de crédito IBS/CBS.';
COMMENT ON COLUMN property_transactions.tipo_credito
  IS 'Classificação fiscal do crédito: insumo, uso_consumo ou nao_creditavel.';

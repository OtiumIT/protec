-- Migration: 092_atividade_imobiliaria_contratos
-- Domínio: contrato de venda, compradores, parcelas e baixas.

CREATE TABLE IF NOT EXISTS real_estate_sale_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES real_estate_developments(id) ON DELETE CASCADE,
  numero VARCHAR(60) NOT NULL,
  data_contrato DATE NOT NULL,
  valor_venda DECIMAL(15,2) NOT NULL,
  operacao VARCHAR(2) NOT NULL DEFAULT '02' CHECK (operacao IN ('01','02')),
  indice_atualizacao VARCHAR(30),
  taxa_juros DECIMAL(8,4),
  informacoes_complementares TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','ativo','encerrado','cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (development_id, numero)
);

CREATE TABLE IF NOT EXISTS real_estate_sale_contract_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES real_estate_sale_contracts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  participacao_pct DECIMAL(6,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, client_id)
);

CREATE TABLE IF NOT EXISTS real_estate_sale_contract_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES real_estate_sale_contracts(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES real_estate_units(id),
  valor_atribuido_contrato DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, unit_id)
);

CREATE TABLE IF NOT EXISTS real_estate_sale_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES real_estate_sale_contracts(id) ON DELETE CASCADE,
  sequencia INT NOT NULL,
  vencimento DATE NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  fonte_pagadora VARCHAR(60),
  status VARCHAR(12) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contract_id, sequencia)
);

CREATE TABLE IF NOT EXISTS real_estate_sale_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES real_estate_sale_installments(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  correcao_monetaria DECIMAL(15,2) NOT NULL DEFAULT 0,
  juros DECIMAL(15,2) NOT NULL DEFAULT 0,
  multa DECIMAL(15,2) NOT NULL DEFAULT 0,
  desconto DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_recebido DECIMAL(15,2) NOT NULL,
  documento_ref VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_sale_contracts_dev ON real_estate_sale_contracts(development_id);
CREATE INDEX IF NOT EXISTS idx_re_sale_parties_contract ON real_estate_sale_contract_parties(contract_id);
CREATE INDEX IF NOT EXISTS idx_re_sale_units_contract ON real_estate_sale_contract_units(contract_id);
CREATE INDEX IF NOT EXISTS idx_re_sale_installments_contract ON real_estate_sale_installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_re_sale_receipts_installment ON real_estate_sale_receipts(installment_id);

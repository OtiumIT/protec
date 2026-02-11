-- Migration: 014_companies_complete_data
-- Adicionar campos completos para cadastro de empresas/tenants (contabilidades/advocacias)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18) UNIQUE,
  ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255), -- Razão Social
  ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255), -- Nome Fantasia
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255), -- Nome do contato responsável
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255), -- Email do contato
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20), -- Telefone do contato
  ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(50), -- Regime tributário
  ADD COLUMN IF NOT EXISTS state_registration VARCHAR(50), -- Inscrição Estadual
  ADD COLUMN IF NOT EXISTS municipal_registration VARCHAR(50), -- Inscrição Municipal
  ADD COLUMN IF NOT EXISTS cnae VARCHAR(10), -- CNAE principal
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10), -- CEP
  ADD COLUMN IF NOT EXISTS address_street VARCHAR(255), -- Rua
  ADD COLUMN IF NOT EXISTS address_number VARCHAR(20), -- Número
  ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100), -- Complemento
  ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100), -- Bairro
  ADD COLUMN IF NOT EXISTS address_city VARCHAR(100), -- Cidade
  ADD COLUMN IF NOT EXISTS address_state VARCHAR(2), -- Estado (UF)
  ADD COLUMN IF NOT EXISTS notes TEXT; -- Observações

-- Índices
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_tax_regime ON companies(tax_regime);

-- Comentários
COMMENT ON COLUMN companies.cnpj IS 'CNPJ da empresa (contabilidade/advocacia)';
COMMENT ON COLUMN companies.legal_name IS 'Razão Social';
COMMENT ON COLUMN companies.trade_name IS 'Nome Fantasia';
COMMENT ON COLUMN companies.tax_regime IS 'Regime tributário: simples_nacional, lucro_presumido, lucro_real, outros';
COMMENT ON COLUMN companies.state_registration IS 'Inscrição Estadual';
COMMENT ON COLUMN companies.municipal_registration IS 'Inscrição Municipal';

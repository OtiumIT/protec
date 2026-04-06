-- Migration: 055_access_list
-- Tabela para gerenciamento de lista de acesso (importação CSV + ativação/desativação)

CREATE TABLE IF NOT EXISTS access_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  cpf VARCHAR(14),
  company_name VARCHAR(255),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES companies(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive')),
  temp_password_enc TEXT,
  activated_at TIMESTAMP,
  deactivated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_list_email_unique ON access_list (lower(trim(email)));
CREATE INDEX IF NOT EXISTS idx_access_list_status ON access_list (status);

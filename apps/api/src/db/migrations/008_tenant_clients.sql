-- Migration: 008_tenant_clients
-- Tabela de clientes no schema do tenant
-- Esta migration roda em schemas de tenant (tenant_{company_id})
-- NOTA: Clients no schema do tenant NÃO têm company_id (isolados por schema)

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- CNPJ único por schema (não precisa company_id, já isolado por schema)
  UNIQUE(cnpj)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Trigger para updated_at
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE clients IS 'Clientes da contabilidade (empresas atendidas) - isolados por schema';
COMMENT ON COLUMN clients.cnpj IS 'CNPJ único por contabilidade (isolamento por schema)';

-- Migration: 045_clients_person_type
-- Suporte a pessoa física no cadastro de clientes
-- Esta migration roda em schemas de tenant (tenant_{company_id})

-- Tornar cnpj nullable (PF não tem CNPJ)
ALTER TABLE clients ALTER COLUMN cnpj DROP NOT NULL;

-- Adicionar person_type e cpf
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS person_type VARCHAR(2) DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Remover constraint UNIQUE(cnpj) se existir, pois agora cnpj pode ser NULL
-- Em PostgreSQL, UNIQUE permite múltiplos NULLs, então a constraint pode permanecer
-- Mas precisamos de unique em cpf quando preenchido
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_cpf_unique ON clients(cpf) WHERE cpf IS NOT NULL;

COMMENT ON COLUMN clients.person_type IS 'pj = Pessoa Jurídica, pf = Pessoa Física';
COMMENT ON COLUMN clients.cpf IS 'CPF do cliente quando person_type = pf';

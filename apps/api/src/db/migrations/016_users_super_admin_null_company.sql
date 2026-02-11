-- Migration: 016_users_super_admin_null_company
-- Permitir company_id NULL para super_admins

-- Remover constraint NOT NULL de company_id
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- Remover constraint UNIQUE(email, company_id) se existir
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_company_id_key;

-- Criar índices únicos parciais:
-- 1. Para usuários com company_id: email deve ser único por company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_company_unique 
ON users(email, company_id) 
WHERE company_id IS NOT NULL;

-- 2. Para super_admins (company_id IS NULL): email deve ser único globalmente
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_super_admin_unique 
ON users(email) 
WHERE company_id IS NULL;

-- Comentário
COMMENT ON COLUMN users.company_id IS 'NULL para super_admins, UUID para usuários de tenants';

-- Migration: 017_fix_users_unique_index
-- Corrigir índices únicos para permitir super_admins

-- Remover índice anterior se existir
DROP INDEX IF EXISTS idx_users_email_company_unique;

-- Criar índices únicos parciais:
-- 1. Para usuários com company_id: email deve ser único por company_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_company_unique 
ON users(email, company_id) 
WHERE company_id IS NOT NULL;

-- 2. Para super_admins (company_id IS NULL): email deve ser único globalmente
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_super_admin_unique 
ON users(email) 
WHERE company_id IS NULL;

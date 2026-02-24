-- Migration: 039_rename_users_company_id_to_tenant_id
-- Renomear coluna company_id para tenant_id na tabela users (id do escritório/tenant).
-- A FK para companies(id) permanece; apenas o nome da coluna alinha com o domínio.

-- 1. Renomear coluna (índices e constraints que usam a coluna são atualizados automaticamente)
ALTER TABLE users RENAME COLUMN company_id TO tenant_id;

-- 2. Renomear índice principal para clareza
ALTER INDEX IF EXISTS idx_users_company_id RENAME TO idx_users_tenant_id;

-- 3. Renomear índices únicos parciais (recriar com nome alinhado a tenant_id)
DROP INDEX IF EXISTS idx_users_email_company_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant_unique
  ON users(email, tenant_id)
  WHERE tenant_id IS NOT NULL;

-- idx_users_email_super_admin_unique já usa WHERE company_id IS NULL; após RENAME a coluna vira tenant_id
-- O índice continua válido; opcionalmente renomear para consistência (o nome do índice não referencia a coluna)
-- Deixamos como está (idx_users_email_super_admin_unique).

-- 4. Comentário na coluna
COMMENT ON COLUMN users.tenant_id IS 'Id do tenant (escritório). NULL para super_admins, UUID para usuários de um tenant.';

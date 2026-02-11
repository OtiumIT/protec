-- Migration: 012_super_admin
-- Permite usuários super_admin sem company_id (admin global do sistema)

-- Tornar company_id opcional (NULL permitido)
ALTER TABLE users 
  ALTER COLUMN company_id DROP NOT NULL;

-- Remover constraint de UNIQUE(email, company_id) e criar nova que permite NULL
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_email_company_id_key;

-- Criar constraint única: email deve ser único globalmente se company_id for NULL
-- Se company_id não for NULL, email deve ser único por empresa
CREATE UNIQUE INDEX IF NOT EXISTS users_email_company_unique 
  ON users(email, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Adicionar comentário explicativo
COMMENT ON COLUMN users.company_id IS 'NULL para super_admin (admin global), UUID para usuários de tenant específico';

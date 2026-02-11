-- Migration: 018_add_users_status
-- Adicionar campo status na tabela users

-- Adicionar coluna status com valor padrão 'active'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Atualizar usuários existentes para 'active'
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';

-- Criar índice para status
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Adicionar constraint para garantir valores válidos
ALTER TABLE users 
ADD CONSTRAINT check_users_status 
CHECK (status IN ('active', 'inactive'));

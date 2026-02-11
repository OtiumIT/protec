-- Migration: 019_fix_plans_duplicates
-- Corrigir planos duplicados e adicionar constraint UNIQUE no nome

-- 1. Remover planos "Customizado" duplicados, mantendo apenas o mais antigo
WITH ranked_plans AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
  FROM plans
  WHERE name = 'Customizado' AND is_custom = true
)
DELETE FROM plans
WHERE id IN (
  SELECT id FROM ranked_plans WHERE rn > 1
);

-- 2. Adicionar constraint UNIQUE no nome do plano
ALTER TABLE plans
ADD CONSTRAINT unique_plan_name UNIQUE (name);

-- 3. Atualizar a migration 015 para usar a constraint correta (apenas comentário)
-- O INSERT já está correto, mas agora funcionará com a constraint UNIQUE

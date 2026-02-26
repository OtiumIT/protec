-- Migration: 041_plans_max_clients
-- Campo máximo de clientes por plano (0 = ilimitado).

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_clients INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN plans.max_clients IS 'Máximo de clientes (tenant) permitidos no plano; 0 = ilimitado';

CREATE INDEX IF NOT EXISTS idx_plans_max_clients ON plans(max_clients);

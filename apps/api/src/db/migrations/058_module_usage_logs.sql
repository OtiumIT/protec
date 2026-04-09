-- Migration: 058_module_usage_logs
-- Logs de uso de módulos e funcionalidades (auditoria operacional)

CREATE TABLE IF NOT EXISTS public.module_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  module_key VARCHAR(100) NOT NULL,
  feature_key VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  method VARCHAR(10),
  route_path VARCHAR(500),
  status_code INTEGER,
  source VARCHAR(30) NOT NULL DEFAULT 'api',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_usage_logs_company_created_at
  ON public.module_usage_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_usage_logs_module_created_at
  ON public.module_usage_logs(module_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_usage_logs_user_created_at
  ON public.module_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_module_usage_logs_action_created_at
  ON public.module_usage_logs(action, created_at DESC);

COMMENT ON TABLE public.module_usage_logs IS
  'Logs de uso por módulo/funcionalidade, incluindo ações do frontend e chamadas da API.';


-- Tabela para persistir erros da API e do frontend (diagnóstico e suporte)
CREATE TABLE IF NOT EXISTS public.api_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'POST',
  status_code SMALLINT NOT NULL,
  error_code VARCHAR(100),
  error_message TEXT,
  company_id UUID REFERENCES public.companies(id),
  user_id UUID REFERENCES public.users(id),
  meta JSONB,
  source VARCHAR(20) DEFAULT 'api'
);

CREATE INDEX IF NOT EXISTS idx_api_error_logs_created_at ON public.api_error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_endpoint ON public.api_error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_error_code ON public.api_error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_company ON public.api_error_logs(company_id);

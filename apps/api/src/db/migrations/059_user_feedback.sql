-- Migration: 059_user_feedback
-- Mensagens de feedback dos usuários (LGPD: consentimento explícito no envio).

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL DEFAULT 'suggestion',
  message TEXT NOT NULL,
  page_path VARCHAR(600),
  consent_privacy_policy BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_feedback_status_check CHECK (status IN ('open', 'answered')),
  CONSTRAINT user_feedback_category_check CHECK (category IN ('suggestion', 'problem', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_tenant_created_at ON public.user_feedback (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_created_at ON public.user_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback (status);

CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_feedback IS
  'Feedback enviado por usuários autenticados; resposta da equipe registrada por super_admin.';

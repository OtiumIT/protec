-- Mensagens adicionais na conversa de feedback (usuário responde à equipe; equipe envia follow-ups).

CREATE TABLE IF NOT EXISTS public.user_feedback_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.user_feedback(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_replies_feedback_created
  ON public.user_feedback_replies (feedback_id, created_at ASC);

COMMENT ON TABLE public.user_feedback_replies IS
  'Mensagens extras no fio do feedback após a mensagem inicial; is_staff=true para a equipe.';

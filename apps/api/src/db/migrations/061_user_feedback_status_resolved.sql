-- Permite encerrar feedback (resolvido): usuário não pode mais responder no fio.

ALTER TABLE public.user_feedback DROP CONSTRAINT IF EXISTS user_feedback_status_check;
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_status_check
  CHECK (status IN ('open', 'answered', 'resolved'));

COMMENT ON COLUMN public.user_feedback.status IS
  'open = em análise; answered = em andamento (conversa); resolved = resolvido (sem novas respostas do usuário).';

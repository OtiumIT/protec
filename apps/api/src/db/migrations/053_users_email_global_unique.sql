-- Migration: 053_users_email_global_unique
-- E-mail é chave de login: um único registro por e-mail em public.users (tenants e super_admin).
-- Substitui UNIQUE (email, tenant_id) e o índice parcial de super_admin por unicidade global.
--
-- Pré-requisito: não podem existir duas linhas com o mesmo lower(trim(email)).
-- Se o CREATE UNIQUE INDEX falhar, identifique duplicatas com:
--   SELECT lower(trim(email)) AS e, count(*) FROM public.users GROUP BY 1 HAVING count(*) > 1;
-- e resolva manualmente antes de reaplicar.

DROP INDEX IF EXISTS idx_users_email_tenant_unique;
DROP INDEX IF EXISTS idx_users_email_super_admin_unique;

UPDATE public.users
SET email = lower(trim(email))
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_trim_unique
  ON public.users (lower(trim(email)));

COMMENT ON INDEX idx_users_email_lower_trim_unique IS
  'Login único: um e-mail por utilizador (inclui super_admin e utilizadores de tenant).';

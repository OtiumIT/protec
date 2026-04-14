-- Migration: 062_globodamorte_membro_eps_align
-- Alinha o utilizador membro@globodamorte.com.br e o respetivo tenant ao mesmo perfil de um cadastro via EPS
-- (ver apps/api/src/modules/auth/auth.service.ts: source EPS → só GESTAO_IMOVEIS; primeiro utilizador admin).
--
-- Efeitos quando o utilizador existir (tenant_id NOT NULL):
-- - users: role admin, password_hash (bcrypt 10 rounds), must_change_password false, status active
-- - companies: source = 'EPS' para o tenant desse utilizador
-- - tenant_modules: remove todos os módulos do tenant exceto GESTAO_IMOVEIS; garante GESTAO_IMOVEIS ativo
--
-- Nota: a restrição de módulos aplica-se a todo o escritório (tenant), não só a este e-mail.
-- Se o utilizador não existir (ex.: base local/CI), a migration conclui sem erro (NOTICE).

DO $migration$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_module_id UUID;
BEGIN
  SELECT id, tenant_id INTO v_user_id, v_tenant_id
  FROM public.users
  WHERE lower(trim(email)) = 'membro@globodamorte.com.br'
    AND tenant_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE NOTICE '062: utilizador membro@globodamorte.com.br não encontrado; ignorado.';
  ELSE
    UPDATE public.users
    SET
      role = 'admin',
      password_hash = '$2b$10$4ZHOo19ye9tWCoXTDIXzG.yq2sY.DP7jcCpn3lwwhCo/3q318BLQO',
      must_change_password = false,
      status = 'active',
      updated_at = NOW()
    WHERE id = v_user_id;

    UPDATE public.companies
    SET source = 'EPS'
    WHERE id = v_tenant_id;

    SELECT id INTO v_module_id
    FROM public.modules
    WHERE key = 'GESTAO_IMOVEIS'
    LIMIT 1;

    IF v_module_id IS NULL THEN
      RAISE WARNING '062: módulo GESTAO_IMOVEIS não encontrado; tenant_modules não alterado.';
    ELSE
      DELETE FROM public.tenant_modules
      WHERE tenant_id = v_tenant_id
        AND module_id <> v_module_id;

      INSERT INTO public.tenant_modules (tenant_id, module_id, enabled_until)
      VALUES (v_tenant_id, v_module_id, NULL)
      ON CONFLICT (tenant_id, module_id)
      DO UPDATE SET enabled_until = EXCLUDED.enabled_until;
    END IF;
  END IF;
END
$migration$;

-- Migration: 056_users_must_change_password
-- Flag para forçar troca de senha no primeiro login

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

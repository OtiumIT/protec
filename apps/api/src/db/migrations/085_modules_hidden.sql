-- Migration: 085_modules_hidden
-- Flag global para esconder módulo do menu e das listagens de tenant.
-- Super admin continua vendo e pode reexibir.

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_modules_hidden ON public.modules (hidden);

-- Fora da v1 Pablo: não poluem o menu mesmo se ainda estiverem em tenant_modules.
UPDATE public.modules
SET hidden = true
WHERE key IN (
  'RATING_VALIDATOR',
  'SIMULADOR_IN_2306',
  'FISCAL_FILES',
  'COMPARATIVO_REGIMES',
  'PRECIFICADOR',
  'SPLIT_PAYMENT',
  'REPORTS',
  'ANALYTICS',
  'BILLING'
);

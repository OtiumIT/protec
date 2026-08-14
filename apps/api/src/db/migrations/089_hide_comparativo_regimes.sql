-- Esconde o módulo Reforma Tributária (Comparativo de Regimes) do menu.
-- Feedback: o simulador ainda está incompleto e não cobre o suficiente.
-- O registro em tenant_modules permanece; ao reexibir (hidden = false),
-- o tenant que já tinha o módulo volta a vê-lo.

UPDATE public.modules
SET hidden = true
WHERE key = 'COMPARATIVO_REGIMES';

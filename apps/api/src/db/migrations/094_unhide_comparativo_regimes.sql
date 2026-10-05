-- Reexibe o módulo Reforma Tributária (Comparativo de Regimes) no menu.
-- Escondido na 089 por não cobrir a reforma; agora inclui o simulador
-- Simples puro x regime regular de IBS/CBS (kind simples_ibs_cbs).
-- tenant_modules não é alterado: quem já tinha o módulo volta a vê-lo.

UPDATE public.modules
SET hidden = false
WHERE key = 'COMPARATIVO_REGIMES';

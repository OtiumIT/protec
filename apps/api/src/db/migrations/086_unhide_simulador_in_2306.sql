-- Reexibe o simulador LC 224/2025 / IN 2.306 no menu.
-- Alunos do Pablo (advogados e contadores) usam o comparativo de lucro
-- presumido com a reforma; o módulo tinha sido escondido na 085.

UPDATE public.modules
SET hidden = false
WHERE key = 'SIMULADOR_IN_2306';

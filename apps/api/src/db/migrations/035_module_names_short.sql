-- Migration: 035_module_names_short
-- Encurta o campo `name` dos módulos para exibição no menu lateral.
-- Os textos longos comerciais permanecem no campo `description` (usados nos títulos das páginas).

UPDATE modules SET name = 'Transação Tributária'  WHERE key = 'RATING_VALIDATOR';
UPDATE modules SET name = 'Simulador LC 224/2025'  WHERE key = 'SIMULADOR_IN_2306';
UPDATE modules SET name = 'IRPF Alta Renda'        WHERE key = 'IRPF_ALTA_RENDA';

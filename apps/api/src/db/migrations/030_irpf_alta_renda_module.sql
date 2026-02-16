-- Migration: 030_irpf_alta_renda_module
-- Cria o módulo Caldo IRPF Alta Renda (Lei 15.270/2025) na tabela modules.

INSERT INTO modules (name, key, description)
VALUES (
  'Caldo IRPF Alta Renda',
  'IRPF_ALTA_RENDA',
  'Simulação de tributação de alta renda - Lei 15.270/2025 (IRPF e dividendos)'
)
ON CONFLICT (key) DO NOTHING;

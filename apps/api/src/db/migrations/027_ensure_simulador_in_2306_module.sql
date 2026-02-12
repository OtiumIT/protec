-- Migration: 027_ensure_simulador_in_2306_module
-- Garante que o módulo Simulador IN 2.306/2026 existe na tabela modules.
-- Assim ele passa a aparecer na tela "Gerenciar Módulos" (lista de módulos disponíveis).

INSERT INTO modules (name, key, description)
VALUES (
  'Simulador IN 2.306/2026',
  'SIMULADOR_IN_2306',
  'Simulador da Nova IN RFB 2.306/2026 - Parcelamento e condições'
)
ON CONFLICT (key) DO NOTHING;

-- Migration: 020_create_default_modules
-- Criar módulos padrão do sistema
--
-- IMPORTANTE: Sempre que criar um novo módulo, adicione-o aqui e também no seed.ts
-- Esta migration é executada automaticamente quando você roda: pnpm run migrate
-- O seed.ts também cria os módulos e pode ser executado independentemente: pnpm run seed

-- Módulos padrão
INSERT INTO modules (name, key, description)
VALUES 
  ('Billing', 'BILLING', 'Sistema de cobrança e assinaturas'),
  ('Fiscal Files', 'FISCAL_FILES', 'Gerenciamento de arquivos fiscais (SPED, ECD, PGDAS, etc)'),
  ('Rating Validator', 'RATING_VALIDATOR', 'Validador de Rating PGFN (CAPAG) - Análise de capacidade de pagamento'),
  ('Simulador IN 2.306/2026', 'SIMULADOR_IN_2306', 'Simulador da Nova IN RFB 2.306/2026 - Parcelamento e condições'),
  ('Reports', 'REPORTS', 'Relatórios e análises'),
  ('Analytics', 'ANALYTICS', 'Analytics avançado')
ON CONFLICT (key) DO NOTHING;

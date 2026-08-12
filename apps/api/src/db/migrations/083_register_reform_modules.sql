-- Register Reform Tax Simulator module keys (public schema)
INSERT INTO modules (key, name, description) VALUES
  ('COMPARATIVO_REGIMES', 'Comparativo de Regimes Tributários', 'Simulador comparativo LR vs LP vs Simples Nacional'),
  ('PRECIFICADOR', 'Precificador com Custo Tributário', 'Calculadora de precificação por regime tributário'),
  ('SPLIT_PAYMENT', 'Simulador Split Payment', 'Simulador de impacto do Split Payment IBS/CBS no fluxo de caixa')
ON CONFLICT (key) DO NOTHING;

INSERT INTO plan_modules (plan_id, module_id)
SELECT p.id, m.id FROM plans p CROSS JOIN modules m
WHERE m.key IN ('COMPARATIVO_REGIMES', 'PRECIFICADOR', 'SPLIT_PAYMENT')
ON CONFLICT DO NOTHING;

-- Migration: 033_module_names_commercial
-- Atualiza nomes e descrições comerciais dos 3 módulos principais (fonte: descrição comercial das ferramentas).

-- 1) Transação Tributária - Análise da capacidade de pagamento (ex-Validador de Rating)
UPDATE modules SET
  name = 'Transação Tributária - Análise da capacidade de pagamento',
  description = 'Avaliação se a classificação da capacidade de pagamento feita pela Receita Federal está correta, possibilitando a revisão do enquadramento com os dados contábeis analisados pelo sistema, com a emissão de relatório para fundamentação.'
WHERE key = 'RATING_VALIDATOR';

-- 2) Simulação do aumento da tributação do lucro presumido - LC 224/2025 (ex-Simulador IN 2.306)
UPDATE modules SET
  name = 'Simulação do aumento da tributação do lucro presumido - LC 224/2025',
  description = 'Possibilita fazer a comparação da tributação do lucro presumido antes e depois da alteração trazida pela LC 224/2025, identificando quanto será o aumento para o contribuinte.'
WHERE key = 'SIMULADOR_IN_2306';

-- 3) Tributação da alta renda/dividendos - IRPFM - Lei 12.570/2025
UPDATE modules SET
  name = 'Tributação da alta renda/dividendos - IRPFM - Lei 12.570/2025',
  description = 'Análise da declaração do IR do contribuinte e simulação da nova tributação da alta renda, com a indicação da alíquota aplicável e o valor a ser pago, comparando os cenários antes e depois da nova legislação, apontando possíveis soluções para redução (ex.: constituição de holding, segregação da renda com cônjuge/filhos).'
WHERE key = 'IRPF_ALTA_RENDA';

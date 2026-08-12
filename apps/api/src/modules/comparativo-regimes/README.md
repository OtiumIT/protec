# Módulo Comparativo de Regimes Tributários

## Descrição
Simulador que compara a carga tributária entre **Lucro Presumido**, **Lucro Real** e **Simples Nacional** para prestadores de serviços. Permite que o contador identifique o regime mais econômico para cada cliente com base em faturamento, folha de pagamento e custos dedutíveis.

## Regras de Negócio

### Regra 1: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: Tabela `comparativo_regimes_simulations` reside no schema do tenant (`tenant_{company_id}`)
- **Processo**: Queries executadas no schema do tenant (isolamento automático via `search_path`)

### Regra 2: Lucro Presumido (Serviços)
- Presunção 32% (serviços gerais); 16% se faturamento <= R$120k/ano
- IRPJ: 15% + adicional 10% sobre excedente R$240k/ano (R$60k/trimestre)
- CSLL: 9% sobre 32% da receita
- PIS 0,65% cumulativo, COFINS 3% cumulativo
- ISS parametrizado (2% a 5%)

### Regra 3: Lucro Real (Serviços)
- Lucro = receita - custos - despesas dedutíveis
- IRPJ: 15% + adicional 10% sobre excedente R$240k/ano
- CSLL: 9% sobre lucro
- PIS 1,65% não-cumulativo (créditos sobre insumos ~30%)
- COFINS 7,6% não-cumulativo (créditos sobre insumos ~30%)
- ISS mesma base

### Regra 4: Simples Nacional (Serviços)
- Fator R = folha 12m / receita 12m
- Se Fator R >= 28%: Anexo III (6% a 33%)
- Se Fator R < 28%: Anexo V (15,5% a 30,5%)
- Alíquota efetiva = ((RBT12 × alíq_nominal) − parcela_deduzir) / RBT12
- Limite R$4,8M/ano

### Regra 5: Salvamento
- `simulate`: cálculo sem persistência
- `simulate-and-save`: cálculo + persistência no banco
- `client_id` é opcional em ambos os casos

## Dependências
- **Módulos**: Feature toggle `COMPARATIVO_REGIMES`
- **Shared**: `simularComparativoRegimes()` em `packages/shared/src/utils/comparativo-regimes-simulador.ts`
- **Tabelas**: `comparativo_regimes_simulations` (tenant), `clients` (tenant, referência opcional)

## Fluxos e Endpoints

### POST /comparativo-regimes/simulate
- Body: `ComparativoRegimesInputSchema`
- Resposta: `{ data: ComparativoRegimesResult }`

### POST /comparativo-regimes/simulate-and-save
- Body: `ComparativoRegimesInputSchema`
- Resposta: `{ data: { simulation_id, ...ComparativoRegimesResult } }`

### GET /comparativo-regimes/simulations
- Query: `client_id?`, `page`, `limit`
- Resposta: `{ data: { simulations, total, page, limit } }`

### GET /comparativo-regimes/simulations/:id
- Resposta: `{ data: { simulation } }`

### DELETE /comparativo-regimes/simulations/:id
- Resposta: `{ data: { success: true } }`

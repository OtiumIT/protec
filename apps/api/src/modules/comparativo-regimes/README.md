# Módulo Comparativo de Regimes Tributários (menu Reforma Tributária)

## Descrição
Dois simuladores no mesmo módulo, separados pela coluna `kind`:

- **`regimes`**: compara a carga entre **Lucro Presumido**, **Lucro Real** e **Simples Nacional** para prestadores de serviços, com base em faturamento, folha e custos dedutíveis.
- **`simples_ibs_cbs`**: para empresa do Simples, compara **ficar no Simples puro** com **optar pelo regime regular de IBS/CBS** (Simples híbrido), com crédito das despesas linha a linha e o efeito no crédito do cliente empresa.

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

### Regra 4.1: Simples puro x regime regular de IBS/CBS (`kind = simples_ibs_cbs`)
- **Escopo**: compara só a parcela de IBS/CBS. ISS/ICMS remanescentes, IRPJ, CSLL e CPP ficam no DAS nos dois cenários.
- **Motor**: `simularSimplesIbsCbs()` em `packages/shared/src/utils/simples-reforma-simulador.ts`, versão `SIMPLES_REFORMA_VERSAO` gravada em `result_data.parametros.versao`.
- **Receita**: base = receita bruta − deduções (cancelamentos e descontos incondicionais).
- **Simples puro**: receita líquida × alíquota efetiva do DAS × participação de IBS/CBS no DAS. A participação vem da repartição da faixa (PIS+COFINS vira CBS; ICMS/ISS vira IBS na fração de transição do ano). Anexos I, III, IV e V. A alíquota efetiva pode ser informada; senão é calculada pela faixa.
- **Regime regular**: débito = receita líquida × (CBS + IBS do ano). Crédito = soma de `valor_anual × aliquota_credito` das despesas com crédito. Saldo negativo vira `saldo_credor`.
- **Alíquota de crédito padrão (tela)**: despesa nova nasce com CBS + IBS do ano. Ao trocar o ano, linhas com o padrão do ano anterior (CBS ou CBS + IBS) passam para o padrão do novo ano; alíquotas personalizadas ficam como estão.
- **Crédito vedado no servidor**: categorias `pessoal`, `tributo` e `uso_pessoal` ficam com crédito zero mesmo se o cliente enviar `gera_credito = true` (alerta emitido).
- **Alíquotas padrão por ano**: `ALIQUOTAS_IBS_CBS_POR_ANO` (CBS 9% conforme a aula de referência; IBS 0,1% em 2027–2028 e transição até 2033). Todas editáveis no input.
- **Efeito no adquirente**: com `percentual_vendas_empresas`, mostra o crédito que o cliente empresa toma no regime regular e no Simples puro.
- **Alertas**: receita acima de R$ 4,8 mi, crédito vedado zerado, saldo credor e venda majoritária para empresas com Simples puro mais barato.

### Regra 5: Salvamento
- `simulate` / `simples/simulate`: cálculo sem persistência
- `simulate-and-save` / `simples/simulate-and-save`: cálculo + persistência com o `kind` correspondente
- `client_id` é opcional em ambos os casos
- Exclusão gera log `AUDIT_COMPARATIVO_REGIMES_DELETE` com `timestamp`, `user_id`, `company_id` e `kind`

### Regra 6: Visibilidade
- **Quando aplicar**: Sempre. O módulo foi escondido na migration 089 e **reexibido** na 094 (`modules.hidden = false`), com a entrada do simulador Simples puro x regime regular.
- **Menu**: Reforma Tributária → "Simples × Regime Regular" (`/comparativo-regimes/simples`) e "Comparativo de Regimes" (`/comparativo-regimes`).
- **Acesso**: continua dependendo de `tenant_modules`. Tenant sem o módulo recebe 402 do `requireModule`.
- **Exceção**: Super admin pode esconder de novo em Gerenciar Módulos; `requireModule` volta a responder 402 `MODULE_HIDDEN`.

## Dependências
- **Módulos**: Feature toggle `COMPARATIVO_REGIMES` (visível desde a migration 094)
- **Shared**: `simularComparativoRegimes()` em `packages/shared/src/utils/comparativo-regimes-simulador.ts`
- **Shared**: `simularSimplesIbsCbs()` e `EXEMPLOS_SIMPLES_REFORMA` em `packages/shared/src/utils/simples-reforma-simulador.ts`
- **Tabelas**: `comparativo_regimes_simulations` (tenant, coluna `kind` desde a migration 093), `clients` (tenant, referência opcional)
- **Teste**: `pnpm run test-simples-reforma` (a partir de `apps/api`)

## Fluxos e Endpoints

### POST /comparativo-regimes/simulate
- Body: `ComparativoRegimesInputSchema`
- Resposta: `{ data: ComparativoRegimesResult }`

### POST /comparativo-regimes/simulate-and-save
- Body: `ComparativoRegimesInputSchema`
- Resposta: `{ data: { simulation_id, ...ComparativoRegimesResult } }`

### POST /comparativo-regimes/simples/simulate
- Body: `SimplesIbsCbsInputSchema`
- Resposta: `{ data: SimplesIbsCbsResult }`

### POST /comparativo-regimes/simples/simulate-and-save
- Body: `SimplesIbsCbsInputSchema`
- Resposta: `{ data: { simulation_id, ...SimplesIbsCbsResult } }`

### GET /comparativo-regimes/simulations
- Query: `client_id?`, `kind?` (`regimes` | `simples_ibs_cbs`), `page`, `limit`
- Resposta: `{ data: { simulations, total, page, limit } }`

### GET /comparativo-regimes/simulations/:id
- Resposta: `{ data: { simulation } }`

### DELETE /comparativo-regimes/simulations/:id
- Resposta: `{ data: { success: true } }`

# Módulo Gestão Imobiliária (GESTAO_IMOVEIS)

## Descrição

Módulo de gestão patrimonial e planejamento tributário imobiliário. Permite cadastrar imóveis vinculados a clientes, lançar receitas e despesas (dedutíveis e operacionais), e simular a carga tributária em três cenários: PF (Carnê-Leão), PJ (Lucro Presumido/Holding) e Reforma Tributária (LC 214/2025, pós-2027).

## Regras de Negócio

### Regra 1: Isolamento Multitenant

- **Quando aplicar**: Todas as operações
- **Validação**: Tabelas `properties` e `property_transactions` residem no schema do tenant (`tenant_{company_id}`)
- **Processo**: Queries executadas no schema do tenant (isolamento via `runWithTenantClient`)

### Regra 2: Vínculo com Cliente

- **Quando aplicar**: Criação e atualização de imóveis
- **Validação**: `client_id` obrigatório; cliente deve existir no tenant
- **Exceção**: Nenhuma

### Regra 3: Modo de Entrada

- `detalhado`: Lançamentos individuais por categoria (IPTU, condomínio, etc.)
- `reduzido`: Totais mensais por tipo (receita longa, receita short, despesas, custos)

### Regra 4: Tipos de Locação

- `fixa`: Locação mensal tradicional
- `flexivel`: Airbnb/short-term

### Regra 5: Categorias de Transações

- **Despesas dedutíveis (PF)**: IPTU, condomínio, taxa imobiliária, taxa plataforma (Lei 7.713/88)
- **Custos operacionais (créditos Reforma 2027)**: Reforma, mobília, limpeza, energia, internet, taxa intermediação

### Regra 6: Cenário PF (Carnê-Leão)

- Base = Receita - Despesas dedutíveis
- Tabela progressiva mensal 2026 (0% a 27,5%)
- `aliquota_efetiva_dirpf` opcional (entrada manual do usuário) para simular impacto na renda global

### Regra 7: Cenário PJ (Lucro Presumido)

- Presunção 32% IRPJ e CSLL (locação de imóveis) – Lei 9.249/95, Art. 15
- **Receita anual conhecida > R$ 120k**: quando a receita total anual (agregada) já é conhecida e superior a R$ 120.000, aplica-se **32% em todos os trimestres** desde o 1º (sem 16% e sem imposto postergado).
- **Prestadora de serviço em geral** (ex.: predominância aluguel curto/Airbnb), quando receita anual ≤ R$ 120k:
  - Receita bruta acumulada no ano-calendário ≤ R$ 120k → presunção 16% IRPJ (Lei 9.249/95, Art. 15, § 7º)
  - Se ultrapassar R$ 120k durante o ano → passa a 32% e recolhe a diferença de IRPJ dos trimestres anteriores no trimestre em que ocorreu o excesso (Lei 9.249/95, Art. 15, § 8º)
  - Campo `irpj_postergado` retorna o valor da diferença calculada retroativamente
- **Equiparação hospitalar** (`aplicar_equiparacao_hospitalar`): imóveis para serviços de saúde/hospitalares → presunção 8% IRPJ e 12% CSLL (LC 224/2025, IN RFB 2.306/2026)
- IN RFB 2.306/2026: acréscimo 10% na presunção se receita trimestral > R$ 1,25M ou anual > R$ 5M

**Fundamentação Legal:**
- Lei 9.249/1995, Art. 15, § 7º: percentual de presunção reduzido (16%) para PJ exclusivamente prestadora de serviços com receita bruta anual ≤ R$ 120k
- Lei 9.249/1995, Art. 15, § 8º: cálculo retroativo quando a receita ultrapassar o limite durante o ano-calendário
- IN RFB 1700/2017: regulamenta a apuração do IRPJ e CSLL no Lucro Presumido

### Regra 8: Cenário Reforma 2027

- IBS/CBS com alíquota nominal estimada configurável (padrão 26,5%; faixa típica 26,5% a 28%)
- **Redutor para locação**: o setor imobiliário tem redução de 70% na alíquota (longa duração, acima de 90 dias) e 50% (curta temporada, até 90 dias) → efetiva = nominal × (1 − redutor). Padrão `redutor_locacao_pct: 70`.
- **Redutor social (Art. 260 LC 214/2025)**: R$ 600/mês por imóvel residencial, deduzido da base **apenas** na parcela de longa duração. Curta temporada (até 90 dias) não recebe redutor social.
- **Reforma PJ**: `reforma_2027_pj.imposto_total` = IBS/CBS + IRPJ + CSLL (PIS/COFINS substituídos por IBS/CBS; IRPJ e CSLL sobre lucro presumido).
- **Reforma PF**: quando a PF **não** é contribuinte de IBS/CBS (LC 214/2025: até 3 imóveis e receita ≤ R$ 288k; ou receita ≤ R$ 240k), `reforma_2027_pf.imposto_total` = apenas IR (Carnê-Leão), `reforma_2027_pf.ibs_cbs_liquido` = 0. No comparativo de cenários do portal, a coluna Reforma PF exibe "—" (não se aplica) nesses casos.
- Créditos sobre custos operacionais deduzem do imposto sobre receita
- Opção `opcoes_reforma.redutor_locacao_pct` (0–100); se omitido, usa 70

## Dependências

- **Módulos**: Feature toggle `GESTAO_IMOVEIS`
- **Repositories**: `ClientRepository` (validação de cliente)
- **Tabelas**: `properties`, `property_transactions`, `property_monthly_totals` (tenant), `clients` (tenant)

## Fluxos e Endpoints

### GET /properties

- Query: `client_id?`, `page`, `limit`
- Resposta: `{ data: { properties, total, page, limit } }`

### GET /properties/:id

- Resposta: `{ data: { property } }`

### POST /properties

- Body: `CreatePropertySchema` (client_id, tipo_locacao, identificador)
- Resposta: `{ data: { property } }`

### PATCH /properties/:id

- Body: `UpdatePropertySchema`
- Resposta: `{ data: { property } }`

### DELETE /properties/:id

- Resposta: `{ data: { success: true } }`

### GET /properties/:id/transactions

- Query: `ano?`, `mes?`
- Resposta: `{ data: { transactions } }`

### POST /properties/:id/transactions

- Body: `PropertyTransactionSchema` ou array de transações (batch)
- Resposta: `{ data: { transaction } }` ou `{ data: { transactions } }`

### PUT /properties/:id/monthly-totals

- Body: `{ ano, meses[] }` (modo reduzido)
- Resposta: `{ data: { success: true } }`

### GET /properties/:id/monthly-totals

- Query: `ano`
- Resposta: `{ data: { totals } }`

### DELETE /properties/:id/transactions/:txId

- Resposta: `{ data: { success: true } }`

### POST /properties/simulate

- Body: `SimulatePropertyTaxInputSchema` (ano, property_ids, aliquota_efetiva_dirpf?, aplicar_presuncao_16_servicos?, opcoes_reforma?)
- Resposta: `{ data: PropertyTaxSimulationResponse }` (cenarios PF/PJ/Reforma, break_even, fluxo_caixa)

### POST /properties/simulate-standalone-and-save

- Simula e persiste a simulação no tenant. Exige `save_simulation: true` e `client_id`.
- Body: `SimulateStandaloneAndSaveInputSchema` (extends SimulateStandaloneInput + client_id, title)
- Resposta: `{ data: { simulation, result } }`

### GET /properties/simulations

- Lista simulações salvas. Query: `client_id?`, `ano?`, `page`, `limit`
- Resposta: `{ data: { simulations, total, page, limit } }`

### GET /properties/simulations/:id

- Busca simulação por ID. Resposta: `{ data: { simulation } }`

### PATCH /properties/simulations/:id

- Atualiza simulação (re-simula com os dados enviados). Body: `SimulateStandaloneInputSchema`

### DELETE /properties/simulations/:id

- Exclui simulação.

### POST /properties/simulate-standalone

- Simulação sem cadastro de imóveis. Recebe 12 meses com campos granulares.
- **Ctrl+D+1** na tela: preenche cenário de teste (predominância Airbnb, ~R$ 140k/ano, dispara imposto postergado).
- Body: `SimulateStandaloneInputSchema` (ano, meses[12])
- Por mês (`SimulateStandaloneMesSchema`):
  - **Receitas**: receita_aluguel_tradicional, receita_aluguel_curto, receita_garagem, receita_outras
  - **Despesas dedutíveis (PF)**: iptu, condominio, seguro_imovel, juros_financiamento, manutencao_conservacao, outras_dedutiveis
  - **Custos operacionais**: reformas_melhorias, mobilia_equipamentos, limpeza_higienizacao, comissao_corretagem, taxa_plataforma, outros_custos
- Alíquota PF e presunção PJ são definidas automaticamente pelos dados.
- Resposta: `{ data: PropertyTaxSimulationResponse }`

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

- Presunção 32% IRPJ e CSLL (locação de imóveis)
- **Prestadora de serviço em geral** (ex.: predominância aluguel curto/Airbnb): receita acumulada até o trimestre ≤ R$ 120k → 16% IRPJ; se ultrapassar → 32% + imposto postergado dos trimestres anteriores (Lei, Bruno Sacani)
- IN 2.306/2026: acréscimo 10% na presunção se receita trimestral > R$ 1,25M ou anual > R$ 5M

### Regra 8: Cenário Reforma 2027

- IBS/CBS com alíquota nominal estimada configurável (padrão 26,5%; faixa típica 26,5% a 28%)
- **Redutor para locação**: o setor imobiliário tem redução de 70% na alíquota → efetiva = nominal × 30% (ex.: 28% → 8,4%). Padrão `redutor_locacao_pct: 70`. Somando IRPJ e CSLL (que continuam), carga total da holding em 2027 estimada na faixa de 16% a 18%.
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

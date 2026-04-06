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

### Regra 3.1: Pré-cadastro opcional

- O imóvel pode armazenar campos de documentação e custos padrão mensais.
- Esses campos são opcionais e servem para acelerar o preenchimento no simulador.
- Quando houver lacuna nos dados agregados do mês, o sistema pode complementar com os padrões do cadastro.
- Recomendações por tipo de locação (alerta não bloqueante):
  - `fixa`: priorizar `iptu_mensal_padrao`, `condominio_mensal_padrao`, `seguro_mensal_padrao`.
  - `flexivel` (Airbnb): priorizar `camareira_mensal_padrao`, `material_limpeza_mensal_padrao`, `lavanderia_enxoval_mensal_padrao`, `checkin_checkout_mensal_padrao`, `taxas_pagamento_mensal_padrao`.

### Regra 3.2: OCR mínimo para documentos de imóvel

- Endpoint: `POST /properties/extract-property-doc` (multipart com `file` + `document_type`).
- Tipos de documento suportados (fase 1):
  - `matricula`
  - `iptu`
- Limites rígidos para controle de custo/erro:
  - máximo 10 MB por arquivo
  - máximo 10 páginas
- Documentos fora do limite devem ser recusados com orientação para fracionar ou preencher manualmente.
- Sempre exigir revisão manual dos campos sugeridos antes de aplicar no cadastro.

### Regra 4: Tipos de Locação

- `fixa`: Locação de longa duração (mensal tradicional)
- `flexivel`: Airbnb/short-term

### Regra 4.1: Natureza da locação e aluguel mensal por imóvel

- `natureza_locacao` define a classificação tributária do imóvel (`residencial` ou `nao_residencial`).
- `valor_aluguel_mensal` é a receita base prioritária do imóvel.
- Na simulação por `property_ids`, quando não houver receita lançada no mês para um imóvel, o sistema usa `valor_aluguel_mensal` como fallback para compor o ano (12 meses).

### Regra 5: Categorias de Transações

- **Despesas dedutíveis (PF)**: IPTU, condomínio, taxa imobiliária, taxa plataforma (Lei 7.713/88)
- **Custos operacionais (créditos Reforma 2027)**: Reforma, mobília, limpeza, energia, internet, taxa intermediação
- **Airbnb / short stay (novas categorias)**: camareira, segurança, material de limpeza, lavanderia/enxoval, check-in/checkout de terceiros
- **Custos administrativos/financeiros**: taxas de meios de pagamento, tarifas bancárias, vacância estimada, inadimplência estimada
- **Custos de pessoal**: mão de obra operacional e encargos de folha
- **Classificação fiscal opcional por lançamento**: `gera_credito_ibs_cbs` e `tipo_credito` (`insumo`, `uso_consumo`, `nao_creditavel`)

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
- **Redutor para locação**: o setor imobiliário tem redução de 70% na alíquota (longa duração, > 90 dias — Art. 261 § único) e 40% (curta temporada, ≤ 90 dias, equiparada a hotelaria — Art. 281) → efetiva = nominal × (1 − redutor). Padrão `redutor_locacao_pct: 70`. Não residencial sempre usa 70%.
- **Redutor social (Art. 260 LC 214/2025, redação dada pela LC 227/2026)**: valor **nominal** R$ 600/mês por imóvel residencial de **longa duração** (> 90 dias). Curta temporada (≤ 90 dias) é equiparada a hotelaria (Arts. 253/278 LC 214/2025) e **não recebe** redutor social. Locação não residencial também não recebe.
- **Correção IPCA (parâmetros LC 214)**: o backend compõe fator acumulado a partir da **variação mensal % do IPCA** (BCB SGS, série 433), de **fev/2025** (mês seguinte à publicação da LC 214 em 16/01/2025) até o mês de referência derivado do **ano-calendário** da simulação (ex.: ano 2026 → IPCA até dez/2025; ano 2025 → até dez/2025). Esse fator atualiza o **redutor social mensal** e os **limites de receita** para enquadramento de PF contribuinte de IBS/CBS (nominais R$ 240k / R$ 288k na data de publicação). Cache TTL ~24h na API; se o BCB falhar, usa-se snapshot embutido (`ipca-fallback-series`) e `indices_lc214.ipca_fonte` indica `embutido` ou `cache`.
- **Overrides**: `opcoes_reforma` aceita `limite_receita_contribuinte_pf_manual`, `limite_receita_absoluto_contribuinte_pf_manual`, `redutor_social_mensal_manual` e o já existente `redutor_social_residencial_anual` (anual total). A resposta inclui `indices_lc214` com `parametros_origem` para transparência.
- **GET /properties/fiscal-indices/ipca?ano=** — preview dos índices para o ano-calendário (mesma lógica do cálculo).
- **Reforma PJ**: `reforma_2027_pj.imposto_total` = IBS/CBS + IRPJ + CSLL (PIS/COFINS substituídos por IBS/CBS; IRPJ e CSLL sobre lucro presumido).
- **Reforma PF**: quando a PF **não** é contribuinte de IBS/CBS (LC 214/2025: até 3 imóveis e receita ≤ limite absoluto indexado; ou receita ≤ limite “com mais de 3 imóveis” conforme regra), `reforma_2027_pf.imposto_total` = apenas IR (Carnê-Leão), `reforma_2027_pf.ibs_cbs_liquido` = 0. No comparativo de cenários do portal, a coluna Reforma PF exibe "—" (não se aplica) nesses casos.
- Créditos sobre custos operacionais deduzem do imposto sobre receita
- Opção `opcoes_reforma.redutor_locacao_pct` (0–100); se omitido, usa 70

### Regra 9: Resultado analítico de custos

- A resposta da simulação inclui bloco `analise_custos` com:
  - participação por categoria de custo
  - créditos IBS/CBS (potencial, aproveitado e não aproveitado)
  - indicadores de margem operacional (antes e após tributos)
  - sensibilidade de lucro com aumento de +10% nos custos
  - alertas quando `outros_custos` ultrapassa 30% do total

## Dependências

- **Módulos**: Feature toggle `GESTAO_IMOVEIS`
- **Repositories**: `ClientRepository` (validação de cliente)
- **Tabelas**: `properties`, `property_transactions`, `property_monthly_totals` (tenant), `clients` (tenant)
- **Migrations relevantes**: `036_properties.sql`, `038_property_monthly_totals.sql`, `046_property_simulations.sql`, `050_properties_defaults.sql`, `051_properties_rent_and_nature.sql`, `052_property_transactions_fiscal_credit.sql`

## Grid de cadastro (portal)

- **Duplicar linha**: ação apenas no frontend; insere um **rascunho** abaixo da linha de origem copiando aluguel, `tipo_locacao`, `natureza_locacao` e todos os *defaults* mensais (`*_mensal_padrao`). O **identificador** recebe sufixo ` (cópia)` quando havia texto. **Matrícula, inscrição IPTU e cartório não são copiados** — cada bem deve ter documentação própria (rastreabilidade e alinhamento com a Regra 3.2: revisão manual após OCR ou sugestões).
- **Seleção em massa**: checkbox no cabeçalho da grade marca ou desmarca todas as linhas **elegíveis para simulação** (`valor_aluguel_mensal` > 0), sem alterar linhas vazias ou sem aluguel.

## Matriz de Uso dos Campos de Cadastro

| Campo de cadastro | Impacto no cálculo | Nível de confiança |
| --- | --- | --- |
| `valor_aluguel_mensal` | Receita base mensal por imóvel; quando não há lançamento no mês, compõe a receita anual para PF/PJ/Reforma. | Alto |
| `natureza_locacao` | Segmenta receita residencial vs não residencial para Reforma (redutor social só residencial). | Alto |
| `tipo_locacao` | Direciona separação de receita carregada (`tradicional` vs `curto`) no preview agregado. | Médio (depende da qualidade do cadastro) |
| `iptu_mensal_padrao`, `condominio_mensal_padrao`, `seguro_mensal_padrao` | Complementam despesas dedutíveis por rubrica no carregamento da simulação. | Alto |
| `camareira_mensal_padrao`, `seguranca_mensal_padrao`, `material_limpeza_mensal_padrao`, `lavanderia_enxoval_mensal_padrao`, `checkin_checkout_mensal_padrao`, `taxas_pagamento_mensal_padrao`, `tarifas_bancarias_mensal_padrao`, `vacancia_mensal_padrao`, `inadimplencia_mensal_padrao` | Complementam custos operacionais por rubrica no carregamento da simulação. | Alto |
| `gera_credito_ibs_cbs`, `tipo_credito` (transações) | Ajustam fator de aproveitamento de crédito IBS/CBS no cenário de reforma para simulação por imóveis. | Médio/Alto (depende da classificação do usuário) |
| `matricula_imovel`, `inscricao_iptu`, `cartorio_registro` | Não alteram fórmula tributária; suportam rastreabilidade, compliance e qualidade cadastral. | Médio |
| Endereço (`cep`, `logradouro`, `numero`, `bairro`, `cidade`, `uf`) | Não altera cálculo tributário atualmente. | Baixo |

## Estado de Implementação (atual)

- `aggregate-preview` agora:
  - separa receita por `tipo_locacao` quando possível;
  - usa defaults por rubrica (não apenas em `outros`);
  - aplica complemento (fallback) com precedência prática: dado lançado/agregado + complemento por cadastro;
  - retorna metadado (`metadata.usou_defaults_cadastro`) para transparência no frontend.
- `calcularPJ` suporta `aplicar_equiparacao_hospitalar` na fórmula (8% IRPJ e 12% CSLL).
- `calcularReforma2027` aceita `fator_credito_custos_operacionais` para modular créditos por elegibilidade de lançamentos.
- **Modelo split (residencial + não residencial)**: quando há receita de ambos os tipos e redutor social > 0, o motor aplica os redutores de longa (70%, Art. 261) e curta (40%, Art. 281) duração proporcionalmente na receita residencial. Imóveis não residenciais sempre utilizam redutor 70% (longa duração). O retorno inclui `redutor_diferenciado_short: true` quando ambos os redutores são usados. Redutor social Art. 260 aplica-se **somente** a imóveis residenciais de longa duração (novo campo `quantidade_imoveis_residenciais_longa`).
- **Auto-detecção de perfil misto**: tanto `simulate` quanto `simulateStandalone` detectam automaticamente quando há receita longa e curta (e `perfil_locacao` não foi definido), ativando `usar_ambos_redutores = true`.
- **Projeção 2027-2033 (portal)**: a tabela ano-a-ano deriva o fator de redução diretamente do resultado do backend (`ibs_cbs_sobre_receita / receita / (aliquota_nominal / 100)`), garantindo que o valor de 2033 seja consistente com o card de resultado.

### Uso em `simulate` vs `aggregatePreview`

- **`aggregate-preview`** (e o carregamento da grade no portal) separa receita **tradicional** vs **curta temporada** por imóvel conforme `tipo_locacao` (`fixa` → tradicional; `flexivel` → curto).
- **`POST /properties/simulate`** (com `property_ids`) usa o mesmo agregado mensal: para cada mês e imóvel, a receita base segue a mesma regra (lançamento do mês ou `valor_aluguel_mensal`). Em seguida acumula **anualmente** `receita_longa_total` e `receita_short_total` (fixa → longa, flexível → curta) e repassa a `calcularReforma2027` com `usar_ambos_redutores` / `usar_redutor_diferenciado_short` coerentes com `opcoes_reforma.perfil_locacao`, alinhado ao `simulate-standalone`. Se `perfil_locacao` não for enviado e existir receita longa **e** curta derivadas do cadastro, o serviço assume perfil **ambos** para o motor da Reforma.
- **`POST /properties/simulate-standalone`**: mesma auto-detecção — se `perfil_locacao` não for enviado e `receita_aluguel_tradicional` + `receita_aluguel_curto` ambos > 0, assume perfil **ambos**.
- **`perfil_locacao` global** (residencial comum, hospedagem/temporada ou ambos) deve refletir a carteira: carteira mista fixa + flexível combina com **ambos**; o portal pré-seleciona **ambos** ao carregar imóveis nessa situação.

## Fluxos e Endpoints

### GET /properties

- Query: `client_id?`, `page`, `limit`
- Resposta: `{ data: { properties, total, page, limit } }`

### GET /properties/:id

- Resposta: `{ data: { property } }` (inclui campos opcionais de pré-cadastro)

### POST /properties

- Body: `CreatePropertySchema` (campos base + defaults opcionais)
- Resposta: `{ data: { property } }`

### PATCH /properties/:id

- Body: `UpdatePropertySchema` (inclui defaults opcionais)

### POST /properties/extract-property-doc

- Upload OCR mínimo para pré-cadastro de imóvel.
- Body `multipart/form-data`:
  - `file` (PDF)
  - `document_type` (`matricula` | `iptu`)
- Resposta: `{ data: { document_type, pages_estimated, suggested_fields, warnings } }`
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

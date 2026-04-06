# Módulo Simulador Nova IN 2.306/2026

## Descrição
Simulador para cálculos e cenários conforme a Nova Instrução Normativa RFB 2.306/2026:

1. **Comparativo tributário (Lucro Presumido)**: entrada de receitas por trimestre (produtos/mercadorias, serviços, serviços favorecida, serviços hospitalares, demais receitas); cálculo em 3 cenários (Cálculo 2025, Projeção 2026 com acréscimo IN 2.306, Cenário Equiparação Hospitalar (8% IRPJ/12% CSLL nos serviços) com regras LC 224/2025 — projeção 2026); ajuste anual (§ 5º); adicional de IRPJ 10% sobre lucro presumido > R$ 60.000/trimestre.
2. **Parcelamento simples**: simulação de valor financiado e parcelas (legado).

## Regras de Negócio

### Regra 1: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: Tabela `in_2306_simulations` reside no schema do tenant (`tenant_{company_id}`)
- **Processo**: Queries executadas no schema do tenant (isolamento automático via `search_path`)

### Regra 2: Simulação
- **Quando aplicar**: `POST /simulador-in-2306/simulate`
- **Entrada**: Competência (YYYY-MM), valores (total, entrada), número de parcelas, tipo de cálculo, opções extras
- **Processo**: Calcular valor financiado, valor da parcela, gerar array de parcelas; se `save_simulation = true` e `client_id` informado, persiste na tabela
- **Saída**: `input_data`, `result_data`, `simulation_id` (se salvo)

### Regra 3: Salvamento
- **Quando aplicar**: `save_simulation === true`
- **Exceção**: `client_id` é obrigatório ao salvar
- **Validação**: Cliente deve existir no tenant

### Regra 4: Listagem, visualização, edição e exclusão
- Filtros opcionais: `client_id`, `competence`, paginação (`page`, `limit`)
- `GET /:id` para visualizar detalhes
- `PATCH /:id` para atualizar (re-simula com os dados enviados)
- Delete por ID; apenas simulações do tenant (isoladas por schema)

## Dependências
- **Módulos**: Nenhum obrigatório além do feature toggle `SIMULADOR_IN_2306`
- **Repositories**: `ClientRepository` (validação de cliente ao salvar); `FiscalFileRepository` (prefill a partir de SPED processado: `extracted_fiscal_data` com `module_prefill_simulador_in2306`)
- **Tabelas**: `in_2306_simulations` (tenant), `clients` (tenant), `fiscal_files` / `extracted_fiscal_data` (tenant)

## Fluxos e Endpoints

### POST /simulador-in-2306/simulate-tributario
- **Descrição**: Simulação tributária comparativa (2025 x 2026 IN 2.306 x Equiparação Hospitalar com LC 224 — projeção 2026).
- **Body**: `SimulateTributarioIN2306InputSchema` (ano, trimestres[4] com receitas por tipo, deducoes_trimestrais?, retencoes_trimestrais?, aplicar_equiparacao_hospitalar?, save_simulation?, client_id?, title?).
- **Resposta**: `SimuladorTributarioResponse` (cenario_2025, cenario_2026, cenario_equiparacao, comparativo.imposto_a_maior_2026_vs_2025, economia_equiparacao_vs_2026, memoria_calculo).
- **Regras**: Limite trimestral R$ 1.250.000; acréscimo 10% na presunção sobre o excedente; ajuste anual § 5º; adicional IRPJ 10% sobre base > R$ 60.000/trimestre.

### POST /simulador-in-2306/simulate
- Body: `SimulateIN2306InputSchema` (competence, client_id?, valor_total?, valor_entrada?, numero_parcelas?, tipo_calculo?, save_simulation?, title?, opcoes?)
- Resposta: `{ data: { simulation_id?, input_data, result_data, is_simulation } }`
- Módulo: `SIMULADOR_IN_2306` ativo

### GET /simulador-in-2306
- Query: `client_id?`, `competence?`, `page`, `limit`
- Resposta: `{ data: { simulations, total, page, limit } }`

### GET /simulador-in-2306/processed-sped-competences
- **Query**: `client_id` (UUID)
- **Validação**: cliente deve existir no tenant (`404 CLIENT_NOT_FOUND` se inválido)
- **Resposta**: `{ data: { competences: string[] } }` — competências YYYY-MM com ao menos um arquivo fiscal processado e extração `module_prefill_simulador_in2306`

### GET /simulador-in-2306/prefill-by-competence
- **Query**: `client_id` (UUID), `competence` (YYYY-MM)
- **Validação**: cliente no tenant; deve existir linha consolidada em `extracted_fiscal_data` (`404 NO_EXTRACTED_DATA` se ausente)
- **Resposta**: `{ data: { client_id, competence, fiscal_file?, extracted_at, source_files[], prefill: { ano, trimestres[4], deducoes_trimestrais[4], retencoes_trimestrais[4], aplicar_equiparacao_hospitalar }, meta: { confidence?, origem? } } }`

### GET /simulador-in-2306/:id
- Resposta: `{ data: { simulation } }`

### PATCH /simulador-in-2306/:id
- Atualiza simulação existente. Re-simula com os dados enviados.
- Body: `UpdateIN2306SimulationInputSchema` (union: SimulateTributarioInput ou SimulateIN2306Input sem save_simulation)
- Resposta: `{ data: { simulation, result_data } }`

### DELETE /simulador-in-2306/:id
- Resposta: `{ data: { success: true } }`

## Próximos passos
- Alinhar fórmulas e regras exatas com o texto da IN 2.306/2026 (juros, descontos, prazos)
- Estender `input_data` e `result_data` conforme necessidade (tipos de débito, adesão, etc.)

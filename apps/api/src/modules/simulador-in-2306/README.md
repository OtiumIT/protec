# Módulo Simulador Nova IN 2.306/2026

## Descrição
Simulador para cálculos e cenários conforme a Nova Instrução Normativa RFB 2.306/2026:

1. **Comparativo tributário (Lucro Presumido)**: entrada de receitas por trimestre (produtos/mercadorias, serviços, serviços favorecida, serviços hospitalares, demais receitas); cálculo em 3 cenários (Cálculo 2025, Projeção 2026 com acréscimo IN 2.306, Cenário Equiparação Hospitalar); ajuste anual (§ 5º); adicional de IRPJ 10% sobre lucro presumido > R$ 60.000/trimestre.
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

### Regra 4: Listagem e exclusão
- Filtros opcionais: `client_id`, `competence`, paginação (`page`, `limit`)
- Delete por ID; apenas simulações do tenant (isoladas por schema)

## Dependências
- **Módulos**: Nenhum obrigatório além do feature toggle `SIMULADOR_IN_2306`
- **Repositories**: `ClientRepository` (validação de cliente ao salvar)
- **Tabelas**: `in_2306_simulations` (tenant), `clients` (tenant)

## Fluxos e Endpoints

### POST /simulador-in-2306/simulate-tributario
- **Descrição**: Simulação tributária comparativa (2025 x 2026 IN 2.306 x Equiparação Hospitalar).
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

### GET /simulador-in-2306/:id
- Resposta: `{ data: { simulation } }`

### DELETE /simulador-in-2306/:id
- Resposta: `{ data: { success: true } }`

## Próximos passos
- Alinhar fórmulas e regras exatas com o texto da IN 2.306/2026 (juros, descontos, prazos)
- Estender `input_data` e `result_data` conforme necessidade (tipos de débito, adesão, etc.)

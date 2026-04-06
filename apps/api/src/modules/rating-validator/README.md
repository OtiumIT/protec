# Módulo Rating Validator (CAPAG)

## Descrição
Valida o Rating PGFN (CAPAG) através de cálculo de indicadores financeiros baseados na Portaria PGFN nº 6.757/2022. O módulo oferece duas versões:
1. **Versão Simulação**: Usuário inputa parâmetros granulares manualmente
2. **Versão Real**: Leitura automática de dados de Balanço e DRE da ECD processada

## Regras de Negócio

### Regra 1: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: Schema-per-tenant (`tenant_{company_id}`)
- **Processo**: Todas as queries são executadas no schema do tenant (isolamento automático via `search_path`)
- **Nota**: Tabelas de tenant NÃO requerem `company_id` nas queries (isoladas por schema)

### Regra 2: Simulação com Campos Granulares
- **Quando aplicar**: Endpoint `POST /rating-validator/simulate`
- **Princípio**: Usuário preenche campos específicos da contabilidade (ex: "Caixa e equivalentes", "Fornecedores a pagar") sem precisar fazer cálculos manuais
- **Processo**:
  1. Validar dados de entrada (Zod - estrutura granular)
  2. Calcular valores agregados automaticamente (ex: somar todos os campos de Ativo Circulante)
  3. Calcular indicadores financeiros (Liquidez Corrente, Liquidez Geral, Solvência)
  4. Classificar Rating (A, B, C, D)
  5. Comparar com Rating Real (se fornecido)
  6. Salvar simulação (se `save_simulation = true`)
  7. Retornar resultado completo

### Regra 3: Indicadores Financeiros
Os três indicadores são calculados conforme Portaria PGFN 6.757/2022:

1. **Liquidez Corrente** = Ativo Circulante / Passivo Circulante
   - Mede a capacidade de pagar obrigações de curto prazo
   - Valores >= 1.0 indicam capacidade de pagamento

2. **Liquidez Geral** = (Ativo Circulante + Realizável a Longo Prazo) / (Passivo Circulante + Passivo Não Circulante)
   - Mede a capacidade de pagar todas as obrigações
   - Considera ativos e passivos de curto e longo prazo

3. **Solvência** = Patrimônio Líquido / Ativo Total
   - Mede a participação do capital próprio no ativo total
   - Valores mais altos indicam menor dependência de capital de terceiros

### Regra 4: Classificação de Rating
A classificação é baseada nos três indicadores calculados:

- **Rating A**: Excelente capacidade de pagamento
  - Score >= 7 (baseado na avaliação dos 3 indicadores)
  - Indicadores acima dos limites recomendados

- **Rating B**: Boa capacidade de pagamento
  - Score >= 5 e < 7
  - Indicadores dentro dos limites aceitáveis

- **Rating C**: Capacidade de pagamento regular
  - Score >= 3 e < 5
  - Indicadores próximos dos limites mínimos

- **Rating D**: Capacidade de pagamento insuficiente
  - Score < 3
  - Indicadores abaixo dos limites mínimos

**Critérios de Score** (podem ser ajustados conforme Portaria específica):
- Liquidez Corrente: >= 2.0 (3 pontos), >= 1.5 (2 pontos), >= 1.0 (1 ponto)
- Liquidez Geral: >= 1.5 (3 pontos), >= 1.2 (2 pontos), >= 1.0 (1 ponto)
- Solvência: >= 0.5 (3 pontos), >= 0.3 (2 pontos), >= 0.1 (1 ponto)

### Regra 5: Confronto Rating Estimado vs Real
- **Quando aplicar**: Quando `rating_real` é fornecido
- **Processo**:
  1. Comparar `rating_estimado` (calculado) com `rating_real` (informado)
  2. Se diferentes, marcar `has_discrepancy = true`
  3. Gerar `discrepancy_details` com mensagem explicativa
  4. Identificar erros de classificação para desconto em transações

### Regra 6: Validação Real (ECD)
- **Quando aplicar**: Fluxo principal por competência (`GET /prefill-by-competence`, `POST /validate-by-competence`); fluxo legado por arquivo (`GET /prefill/:fiscal_file_id`, `POST /validate/:fiscal_file_id`)
- **Status**: Implementado para ECD já processados e dados em `extracted_fiscal_data`
- **Processo**:
  1. Buscar linhas em `extracted_fiscal_data` para `client_id` + `competence` e tipos `module_prefill_rating_validator`, `balance_sheet`, `dre` (ordenadas por `created_at DESC`)
  2. **Consolidação**: para cada `data_type`, usar apenas o registro mais recente (primeiro da lista ordenada)
  3. Mapear JSONB para a estrutura da simulação (`buildInputFromExtractedData`) e aplicar `overrides` opcionais do body
  4. Calcular indicadores, classificar rating, gerar `indicator_analysis` (paridade com simulação)
  5. Persistir em `rating_validations` com `is_simulation = false`
  6. **`fiscal_file_id` na validação**: arquivo do bloco consolidado com `created_at` mais recente entre os tipos escolhidos (referência principal); metadados completos em `input_data._validation_sources` (`source_fiscal_file_ids`, `by_data_type`, `conflicts` quando houver mais de um arquivo por tipo)

### Regra 7: Conflitos entre arquivos na mesma competência
- Se existirem vários ECD com extrações para o mesmo `data_type`, o sistema mantém o mais recente e sinaliza conflito na resposta do prefill (`source_conflicts`, `multiple_sources_warning`)
- O usuário deve revisar/editar overrides antes de validar

## Dependências
- **Módulos**: 
  - `FISCAL_FILES` (para versão real - leitura de ECD)
  - `clients` (validação de cliente)
- **Services compartilhados**: 
  - `ClientRepository` (validação de cliente)
  - `FiscalFileRepository` (busca de arquivos ECD)
- **Tabelas**: 
  - `rating_validations` (schema do tenant)
  - `clients` (schema do tenant)
  - `fiscal_files` (schema do tenant)
  - `extracted_fiscal_data` (schema do tenant)

## Endpoints

### POST /rating-validator/simulate
- **Descrição**: Simular validação de rating com dados inputados manualmente
- **Body**: Estrutura granular de Balanço e DRE (ver schemas)
- **Validação**: 
  - Todos os campos granulares validados com Zod
  - Cliente deve existir no tenant
  - Competência no formato YYYY-MM
  - Valores numéricos >= 0 (exceto campos específicos como Prejuízos)
- **Resposta**: `{ data: { calculated_values, indicators, rating_estimado, rating_real?, has_discrepancy, discrepancy_details?, validation_id?, is_simulation } }`
- **Autenticação**: Requerida
- **Módulo**: Requer módulo `RATING_VALIDATOR` ativo

### POST /rating-validator/extract-from-ecd-pdf
- **Descrição**: Extrai dados de PDF contábil via OpenAI. Há **dois perfis de prompt** com o mesmo schema JSON: (1) **ECD/SPED** — recibo de entrega, páginas típicas de balanço e DRE; (2) **Balancete/balanço** — relatório de sistema contábil (Saldo Atual/Anterior, linhas sintéticas de grupo). Com texto extraível do PDF, o backend escolhe o perfil por heurística (`BALANCETE` + colunas de saldo vs. indícios de ECD/recibo). PDF escaneado (sem texto): um único prompt combina **ambos** os conjuntos de regras para o modelo decidir. A resposta pode incluir `extracao_perfil`: `ecd` | `balancete` | `pdf_escaneado_duplo`.
- **Body**: `multipart/form-data` com campo `file` (arquivo PDF).
- **Resposta**: `{ data: { ecd: EcdExtracted, simulação_prefill: Omit<SimulateRatingInput, client_id|rating_real|save_simulation> } }`
- **Autenticação**: Requerida
- **Módulo**: Requer módulo `RATING_VALIDATOR` ativo
- **Requisito**: `OPENAI_API_KEY` configurada no ambiente

### GET /rating-validator
- **Descrição**: Listar validações com filtros e paginação
- **Query params**: 
  - `client_id?`: UUID do cliente
  - `competence?`: YYYY-MM
  - `is_simulation?`: boolean
  - `rating_estimado?`: A, B, C, D
  - `page?`: Número da página (padrão: 1)
  - `limit?`: Itens por página (padrão: 20)
- **Resposta**: `{ data: { validations: [], total: number, page: number, limit: number } }`
- **Autenticação**: Requerida

### GET /rating-validator/processed-ecd-competences
- **Descrição**: Lista competências (`YYYY-MM`) **distintas** com ao menos um ECD `processed` para o cliente. Evita omitir competências quando `processed-ecd-files` usa `LIMIT` + `ORDER BY created_at` (muitos arquivos na mesma competência empurram outras para fora da janela).
- **Query**: `client_id` (UUID obrigatório)
- **Resposta**: `{ data: { competences: string[] } }`

### GET /rating-validator/processed-ecd-files
- **Descrição**: Lista arquivos ECD processados (com filtros opcionais e limite).
- **Query**: `client_id?`, `competence?`, `limit?` (máx. 200)
- **Resposta**: `{ data: { files: [] } }`

### GET /rating-validator/:id
- **Descrição**: Buscar validação por ID
- **Resposta**: `{ data: { validation } }`
- **Autenticação**: Requerida
- **Validação**: ID deve ser UUID válido

### DELETE /rating-validator/:id
- **Descrição**: Deletar validação
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida
- **Validação**: ID deve ser UUID válido

### POST /rating-validator/validate-by-competence
- **Descrição**: Validar rating consolidando dados extraídos de todos os ECD da competência (regra: último por `data_type`).
- **Body**: `{ client_id: UUID, competence: YYYY-MM, rating_real?: 'A'|'B'|'C'|'D', overrides?: RealValidationOverrides }`
- **Resposta**: `{ data: { calculated_values, indicators, indicator_analysis, rating_estimado, rating_real?, has_discrepancy, discrepancy_details?, validation_id, is_simulation: false } }`
- **Autenticação**: Requerida
- **Erros**: `CLIENT_NOT_FOUND`, `NO_EXTRACTED_DATA`

### POST /rating-validator/validate/:fiscal_file_id
- **Descrição**: Validar rating a partir de um único arquivo ECD processado (compatibilidade)
- **Body**: `{ rating_real?: 'A' | 'B' | 'C' | 'D', overrides?: { ativo_circulante_total?, realizavel_longo_prazo_total?, outros_ativos_nao_circulantes?, passivo_circulante_total?, passivo_nao_circulante_total?, patrimonio_liquido_total?, dre? } }`
- **Resposta**: `{ data: { calculated_values, indicators, indicator_analysis, rating_estimado, rating_real?, has_discrepancy, discrepancy_details?, validation_id, is_simulation: false } }`
- **Autenticação**: Requerida
- **Status**: Ativo para ECD processado
- **Validação**: 
  - Arquivo deve existir e ser do tipo 'ecd'
  - Arquivo deve ter status 'processed'
  - Dados extraídos devem existir em `extracted_fiscal_data`

### GET /rating-validator/prefill-by-competence
- **Descrição**: Pré-preenchimento consolidado por `client_id` + `competence` (query obrigatória).
- **Query**: `client_id`, `competence` (YYYY-MM)
- **Resposta**: `{ data: { client_id, competence, fiscal_file?, source_by_data_type, source_fiscal_file_ids, multiple_sources_warning, source_conflicts, prefill, prefilled_fields, source_data_types } }`

### GET /rating-validator/prefill/:fiscal_file_id
- **Descrição**: Retorna resumo dos campos pré-preenchidos para validação real com base em um ECD processado (legado).
- **Resposta**: `{ data: { fiscal_file, prefill, prefilled_fields, source_data_types } }`
- **Uso**: Frontend ou integrações que fixam um arquivo específico.

## Checklist de testes manuais (validação real por competência)

1. **Prefill**: cliente + competência com ECD processado e dados em `extracted_fiscal_data` → prefill carrega sem erro; campos editáveis.
2. **Conflito**: duas extrações do mesmo `data_type` em arquivos diferentes → aviso `multiple_sources_warning` / `source_conflicts` no portal; tabela “Origem por tipo”.
3. **Validar**: após ajustar overrides → `POST validate-by-competence` → redireciona ao relatório na aba simulação com `indicator_analysis`, memória de cálculo e quadro de conferência.
4. **PDF**: exportar PDF do resultado da validação real → conteúdo alinhado ao da simulação (sem versão reduzida por falta de `indicator_analysis`).
5. **Histórico**: nova entrada com `is_simulation = false`; `fiscal_file_name` coerente quando houver arquivo canônico vinculado.

## Estrutura de Dados de Entrada (Simulação)

### Campos Granulares
O usuário preenche campos específicos da contabilidade:

**Ativo Circulante:**
- caixa_equivalentes
- aplicacoes_financeiras
- contas_receber
- estoques
- tributos_recuperar
- despesas_antecipadas
- outros_ativos_circulantes

**Ativo Não Circulante:**
- realizavel_longo_prazo (contas_receber_lp, emprestimos_concedidos, outros_creditos_lp)
- investimentos
- imobilizado
- intangivel
- outros_ativos_nao_circulantes

**Passivo Circulante:**
- fornecedores
- emprestimos_financiamentos
- obrigacoes_trabalhistas
- tributos_pagar
- contas_pagar
- provisoes
- outros_passivos_circulantes

**Passivo Não Circulante:**
- emprestimos_financiamentos_lp
- obrigacoes_trabalhistas_lp
- tributos_pagar_lp
- provisoes_lp
- outros_passivos_nao_circulantes

**Patrimônio Líquido:**
- capital_social
- reservas_capital
- reservas_lucros
- lucros_prejuizos_acumulados (pode ser negativo)
- outros_ajustes

**DRE (Opcional):**
- receita_bruta
- deducoes_vendas
- receita_liquida (calculado automaticamente se não fornecido)
- custos_vendas
- despesas_operacionais
- resultado_financeiro (pode ser negativo)
- outros_resultados (pode ser negativo)

### Valores Agregados Calculados
O sistema calcula automaticamente:
- ativo_circulante_total (soma de todos os campos de Ativo Circulante)
- realizavel_longo_prazo_total (soma dos campos de Realizável LP)
- passivo_circulante_total (soma de todos os campos de Passivo Circulante)
- passivo_nao_circulante_total (soma de todos os campos de Passivo Não Circulante)
- patrimonio_liquido_total (soma de todos os campos de Patrimônio Líquido)
- ativo_total (soma de todos os ativos)
- passivo_total (soma de todos os passivos)

## Fluxos Importantes

### Fluxo de Simulação (manual)
1. Usuário preenche campos granulares no frontend
2. Frontend envia dados para `POST /rating-validator/simulate`
3. Backend valida dados (Zod)
4. Backend calcula valores agregados
5. Backend calcula indicadores (Liquidez Corrente, Liquidez Geral, Solvência)
6. Backend classifica Rating (A, B, C, D)
7. Backend compara com Rating Real (se fornecido)
8. Backend salva simulação (se solicitado)
9. Backend retorna resultado completo

### Fluxo de Simulação com PDF da ECD
1. Usuário envia o PDF do Recibo de Entrega da ECD (SPED) em `POST /rating-validator/extract-from-ecd-pdf`
2. Backend extrai texto do PDF (pdf-parse) ou usa visão (Files API) se for PDF escaneado
3. OpenAI retorna JSON estruturado (documento_info, entidade, demonstrativo_contabil)
4. Backend valida com `EcdExtractedSchema` e mapeia para entrada da simulação via `ecdExtractedToSimulateRatingInput`
5. Frontend recebe `ecd` e `simulação_prefill`, preenche o formulário; usuário revisa/ajusta e segue o fluxo de simulação (calcular classificação)

### Fluxo de Validação Real
1. Worker processa arquivo ECD e salva em `extracted_fiscal_data`
2. Usuário solicita validação via `POST /rating-validator/validate/:fiscal_file_id`
3. Backend busca arquivo ECD e dados extraídos
4. Backend prioriza `module_prefill_rating_validator` e aplica fallback para `balance_sheet` e `dre`
5. Backend reutiliza lógica de cálculo da simulação
6. Backend salva validação em `rating_validations`
7. Backend retorna resultado completo

## Casos Especiais
- **Divisão por zero**: Passivo Circulante e Passivo Total não podem ser zero para calcular Liquidez
- **Ativo Total zero**: Não pode ser zero para calcular Solvência
- **Valores negativos**: Permitidos apenas em campos específicos (Prejuízos Acumulados, Resultado Financeiro negativo)
- **Dados incompletos**: Validação retorna erro específico
- **Arquivo não processado**: Validação real retorna erro se arquivo não estiver 'processed'
- **Módulo desativado**: Retorna `402 Payment Required`

## Comparativo com Parcelamento PGFN

### Funcionalidade
O sistema permite comparar o rating calculado (baseado no Balanço Patrimonial) com o rating efetivamente aplicado no parcelamento concedido pela PGFN. Isso permite identificar divergências e potenciais oportunidades de revisão do enquadramento.

### Fluxo de Comparativo
1. Usuário faz upload do PDF do Recibo de Adesão PGFN em `POST /rating-validator/extract-from-pgfn-pdf`
2. Backend extrai dados via OCR (OpenAI GPT-4o)
3. Sistema infere o rating baseado na modalidade do parcelamento
4. Usuário inclui os dados do parcelamento na simulação (`parcelamento_pgfn`)
5. Backend calcula o comparativo com economia potencial e fundamentação jurídica

### Dados Extraídos do Recibo PGFN
- Número da conta de negociação
- CNPJ e razão social
- Modalidade e negociação
- Dívidas negociadas (principal, multa, juros, encargo legal)
- Capacidade de pagamento em 60 meses
- Demonstrativo de consolidação
- Valores de entrada e parcelas

### Benefícios por Rating
| Rating | Desconto Max. Multa/Juros | Prazo Max. | Entrada Min. | Redução Principal |
|--------|---------------------------|------------|--------------|-------------------|
| A      | 0%                        | 60 meses   | 6%           | Não               |
| B      | 50%                       | 84 meses   | 5%           | Não               |
| C      | 65%                       | 108 meses  | 4%           | Não               |
| D      | 70%                       | 120 meses  | 3%           | Sim (casos específicos) |

### Inferência de Rating pelo Parcelamento
- "SEM REDUCAO" ou desconto máximo 0% → Rating A
- Desconto máximo até 50% → Rating B
- Desconto máximo até 65% → Rating C
- Desconto máximo > 65% → Rating D

### Economia Potencial
Se o rating calculado for PIOR que o concedido (ex: D vs A), o sistema calcula:
- Economia potencial = Desconto adicional sobre multa e juros
- Parcelas extras disponíveis
- Valor excedente na entrada

### Endpoint de Extração PGFN

**POST /rating-validator/extract-from-pgfn-pdf**
- **Descrição**: Extrai dados do PDF do Recibo de Adesão PGFN via OCR
- **Body**: `multipart/form-data` com campo `file` (arquivo PDF)
- **Resposta**: `{ data: { parcelamento: ParcelamentoPGFN, confianca_extracao?: number, campos_incertos?: string[] } }`
- **Autenticação**: Requerida
- **Módulo**: Requer módulo `RATING_VALIDATOR` ativo

## Geração de Relatório

O sistema suporta geração de relatório em PDF para impressão contendo:
- Resumo do rating calculado vs informado
- Indicadores financeiros (LC, LG, Solvência)
- Valores do Balanço Patrimonial
- Comparativo com parcelamento PGFN (se disponível)
- Economia potencial identificada
- Fundamentação jurídica para revisão
- Base legal (Portaria PGFN 6.757/2022, Lei 13.988/2020)

## Próximos Passos
1. Obter exemplos de arquivos ECD reais
2. Mapear estrutura JSONB de `extracted_fiscal_data`
3. Implementar parser de dados ECD
4. Ajustar critérios de classificação conforme Portaria específica
5. Testar com múltiplos formatos de ECD
6. Implementar validações específicas por tipo de ECD

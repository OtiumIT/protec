# Módulo Rating Validator (CAPAG)

## Descrição
Valida o Rating PGFN (CAPAG) através de cálculo de indicadores financeiros baseados na Portaria PGFN nº 6.757/2022. O módulo oferece duas versões:
1. **Versão Simulação**: Usuário inputa parâmetros granulares manualmente
2. **Versão Real**: Leitura automática de dados de Balanço e DRE da ECD (preparado, aguarda exemplos)

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
- **Quando aplicar**: Endpoint `POST /rating-validator/validate/:fiscal_file_id`
- **Status**: Preparado, aguarda exemplos de arquivos ECD
- **Processo** (quando implementado):
  1. Buscar arquivo ECD com status 'processed'
  2. Buscar dados extraídos de `extracted_fiscal_data` (data_type: 'balance_sheet', 'dre')
  3. Mapear dados JSONB para estrutura esperada
  4. Reutilizar lógica de cálculo da simulação
  5. Salvar validação em `rating_validations`

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

### POST /rating-validator/validate/:fiscal_file_id
- **Descrição**: Validar rating a partir de arquivo ECD processado
- **Body**: `{ rating_real?: 'A' | 'B' | 'C' | 'D' }` (opcional)
- **Resposta**: `{ data: { calculated_values, indicators, rating_estimado, rating_real?, has_discrepancy, discrepancy_details?, validation_id, is_simulation: false } }`
- **Autenticação**: Requerida
- **Status**: Preparado, aguarda exemplos de dados ECD (retorna 501 NOT_IMPLEMENTED)
- **Validação**: 
  - Arquivo deve existir e ser do tipo 'ecd'
  - Arquivo deve ter status 'processed'
  - Dados extraídos devem existir em `extracted_fiscal_data`

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

### Fluxo de Simulação
1. Usuário preenche campos granulares no frontend
2. Frontend envia dados para `POST /rating-validator/simulate`
3. Backend valida dados (Zod)
4. Backend calcula valores agregados
5. Backend calcula indicadores (Liquidez Corrente, Liquidez Geral, Solvência)
6. Backend classifica Rating (A, B, C, D)
7. Backend compara com Rating Real (se fornecido)
8. Backend salva simulação (se solicitado)
9. Backend retorna resultado completo

### Fluxo de Validação Real (quando implementado)
1. Worker processa arquivo ECD e salva em `extracted_fiscal_data`
2. Usuário solicita validação via `POST /rating-validator/validate/:fiscal_file_id`
3. Backend busca arquivo ECD e dados extraídos
4. Backend mapeia dados JSONB para estrutura esperada
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

## Próximos Passos
1. Obter exemplos de arquivos ECD reais
2. Mapear estrutura JSONB de `extracted_fiscal_data`
3. Implementar parser de dados ECD
4. Ajustar critérios de classificação conforme Portaria específica
5. Testar com múltiplos formatos de ECD
6. Implementar validações específicas por tipo de ECD

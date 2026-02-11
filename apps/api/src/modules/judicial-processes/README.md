# Módulo Judicial Processes

## Descrição
Gerencia processos judiciais dos clientes relacionados a teses tributárias específicas. Esses processos são utilizados para validar a elegibilidade de clientes em editais de contencioso tributário (Edital 52/2025, 53/2025, 54/2025).

## Regras de Negócio

### Regra 1: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: Schema-per-tenant (`tenant_{company_id}`)
- **Processo**: Todas as queries são executadas no schema do tenant (isolamento automático via `search_path`)
- **Nota**: Tabelas de tenant NÃO requerem `company_id` nas queries (isoladas por schema)

### Regra 2: Validação de Elegibilidade
- **Quando aplicar**: Simulação de cenários no Rating Validator
- **Processo**: 
  1. Cliente deve ter processo judicial ativo (`status = 'active'`)
  2. Processo deve estar relacionado a uma das teses elegíveis:
     - `IPI_PRACA`: IPI - Conceito de Praça entre empresas interdependentes
     - `PRL`: Preço de Transferência (PRL)
     - `IRPJ_CSLL_DESMUTUALIZACAO`: IRPJ/CSLL sobre ganhos na desmutualização
  3. Apenas processos ativos são considerados para elegibilidade
  4. Se cliente não tiver processos ativos, modalidade CONTENCIOSO não aparece no simulador

### Regra 3: Criação de Processo
- **Quando aplicar**: Endpoint `POST /judicial-processes`
- **Validação**:
  - Cliente deve existir no tenant
  - Número do processo obrigatório
  - Tese jurídica deve ser uma das três permitidas
  - Status padrão: `active`
- **Processo**:
  1. Validar dados de entrada (Zod)
  2. Verificar se cliente existe
  3. Criar processo no banco
  4. Retornar processo criado

## Dependências
- **Módulos**: `clients` (para validar existência do cliente)
- **Tabelas**: `judicial_processes` (schema do tenant)

## Endpoints

### GET /judicial-processes/client/:clientId
- **Descrição**: Listar processos judiciais de um cliente
- **Resposta**: `{ data: { processes: JudicialProcess[] } }`
- **Autenticação**: Requerida
- **Multitenant**: Filtro automático por schema

### GET /judicial-processes/:id
- **Descrição**: Buscar processo por ID
- **Resposta**: `{ data: { process: JudicialProcess } }`
- **Autenticação**: Requerida
- **Validação**: Processo deve pertencer ao tenant

### GET /judicial-processes/client/:clientId/eligible-theses
- **Descrição**: Obter teses elegíveis para um cliente (processos ativos)
- **Resposta**: `{ data: { eligible_theses: LegalThesis[] } }`
- **Autenticação**: Requerida
- **Uso**: Utilizado pelo simulador para verificar elegibilidade em CONTENCIOSO

### POST /judicial-processes
- **Descrição**: Criar processo judicial
- **Body**: `{ client_id, process_number, court?, legal_thesis, case_value?, start_date?, status?, notes? }`
- **Resposta**: `{ data: { process: JudicialProcess } }`
- **Autenticação**: Requerida
- **Validação**: Cliente deve existir

### PUT /judicial-processes/:id
- **Descrição**: Atualizar processo judicial
- **Body**: `{ process_number?, court?, legal_thesis?, case_value?, start_date?, status?, notes? }`
- **Resposta**: `{ data: { process: JudicialProcess } }`
- **Autenticação**: Requerida

### DELETE /judicial-processes/:id
- **Descrição**: Deletar processo judicial
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida

## Integração com Rating Validator

O módulo é integrado ao simulador de rating para validar elegibilidade:

1. **Quando cliente é selecionado**: Sistema busca automaticamente teses elegíveis
2. **Na simulação**: Modalidade CONTENCIOSO só aparece se cliente tiver processos ativos
3. **Validação dinâmica**: `calculateModalitySimulation` verifica `eligibleTheses` antes de incluir CONTENCIOSO

## Tipos de Tese

- **IPI_PRACA**: Edital 52/2025 - IPI - Conceito de Praça entre empresas interdependentes
- **PRL**: Edital 53/2025 - Preço de Transferência (PRL)
- **IRPJ_CSLL_DESMUTUALIZACAO**: Edital 54/2025 - IRPJ/CSLL sobre ganhos na desmutualização

## Status de Processo

- **active**: Processo ativo (considerado para elegibilidade)
- **suspended**: Processo suspenso (não considerado)
- **closed**: Processo encerrado (não considerado)

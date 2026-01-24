# Módulo Plans

## Descrição
Gerencia planos de assinatura disponíveis no sistema. Planos são globais (não por tenant).

## Regras de Negócio

### Regra 1: Planos Globais
- **Quando aplicar**: Todas as operações
- **Validação**: Planos não requerem filtro de `company_id` (são globais)
- **Processo**: Planos são compartilhados entre todos os tenants

### Regra 2: Criação de Plano
- **Quando aplicar**: Endpoint `POST /plans` (apenas admin)
- **Validação**:
  - Nome: mínimo 3 caracteres
  - Preço: >= 0
  - Max Users: >= 1
  - Features: array de strings
- **Processo**:
  1. Validar dados de entrada (Zod)
  2. Criar plano no banco
  3. Retornar plano criado

### Regra 3: Atualização de Plano
- **Quando aplicar**: Endpoint `PUT /plans/:id` (apenas admin)
- **Validação**: Plano deve existir
- **Processo**:
  1. Verificar se plano existe
  2. Validar dados
  3. Atualizar no banco

## Dependências
- **Módulos**: Nenhum (módulo base)
- **Tabelas**: `plans`

## Endpoints

### GET /plans
- **Descrição**: Lista todos os planos disponíveis
- **Resposta**: `{ data: { plans: [] } }`
- **Autenticação**: Não requerida (planos são públicos)

### GET /plans/:id
- **Descrição**: Buscar plano por ID
- **Resposta**: `{ data: { plan } }`
- **Autenticação**: Não requerida

### POST /plans
- **Descrição**: Criar novo plano (apenas admin)
- **Body**: `{ name, maxUsers, price, billingCycle, features }`
- **Resposta**: `{ data: { plan } }`
- **Autenticação**: Requerida (admin)

### PUT /plans/:id
- **Descrição**: Atualizar plano (apenas admin)
- **Body**: `{ name?, maxUsers?, price?, billingCycle?, features?, status? }`
- **Resposta**: `{ data: { plan } }`
- **Autenticação**: Requerida (admin)

### DELETE /plans/:id
- **Descrição**: Deletar plano (apenas admin)
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida (admin)

## Fluxos Importantes

### Fluxo de Criação
1. Validar dados de entrada (Zod)
2. Criar plano no banco
3. Retornar plano criado

## Casos Especiais
- **Planos globais**: Não requerem filtro de tenant
- **Status**: Planos podem ser ativos ou inativos

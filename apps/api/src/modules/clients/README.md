# Módulo Clients

## Descrição
Gerencia clientes/empresas dos tenants. Cada tenant pode ter múltiplos clientes.

## Regras de Negócio

### Regra 1: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: `company_id` obrigatório em todas as queries
- **Processo**: Todas as queries devem incluir `WHERE company_id = $X`

### Regra 2: Criação de Cliente
- **Quando aplicar**: Endpoint `POST /clients`
- **Validação**:
  - Nome: mínimo 3 caracteres
  - CNPJ: formato válido e único por tenant
  - Email: formato válido
- **Processo**:
  1. Validar dados de entrada (Zod)
  2. Verificar se CNPJ já existe no tenant
  3. Criar cliente no banco
  4. Retornar cliente criado

### Regra 3: Atualização de Cliente
- **Quando aplicar**: Endpoint `PUT /clients/:id`
- **Validação**: Cliente deve pertencer ao tenant
- **Processo**:
  1. Verificar se cliente existe e pertence ao tenant
  2. Validar dados
  3. Atualizar no banco

## Dependências
- **Módulos**: Nenhum (módulo base)
- **Tabelas**: `clients` (precisa criar migration)

## Endpoints

### GET /clients
- **Descrição**: Lista clientes do tenant atual
- **Query params**: `?page=1&limit=20&status=active`
- **Resposta**: `{ data: { clients: [], total: number, page: number, limit: number } }`
- **Autenticação**: Requerida
- **Multitenant**: Filtro automático por company_id

### GET /clients/:id
- **Descrição**: Buscar cliente por ID
- **Resposta**: `{ data: { client } }`
- **Autenticação**: Requerida
- **Validação**: Cliente deve pertencer ao tenant

### POST /clients
- **Descrição**: Criar novo cliente
- **Body**: `{ name, cnpj, email }`
- **Resposta**: `{ data: { client } }`
- **Autenticação**: Requerida
- **Validação**: CNPJ único por tenant

### PUT /clients/:id
- **Descrição**: Atualizar cliente
- **Body**: `{ name?, cnpj?, email?, status? }`
- **Resposta**: `{ data: { client } }`
- **Autenticação**: Requerida

### DELETE /clients/:id
- **Descrição**: Deletar cliente
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida

## Fluxos Importantes

### Fluxo de Criação
1. Validar dados de entrada (Zod)
2. Verificar se CNPJ já existe no tenant
3. Criar cliente no banco
4. Retornar cliente criado

## Casos Especiais
- **CNPJ único**: CNPJ deve ser único por tenant (não globalmente)
- **Soft Delete**: Considerar soft delete ao invés de hard delete

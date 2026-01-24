# Módulo Companies

## Descrição
Gerencia empresas (tenants) do sistema. Cada empresa é um tenant isolado com seus próprios dados.

## Regras de Negócio

### Regra 1: Criação de Empresa
- **Quando aplicar**: Endpoint `POST /auth/register` (criação automática)
- **Validação**:
  - Nome: mínimo 3 caracteres
  - Domain: opcional, mas deve ser único se fornecido
- **Processo**:
  1. Criar empresa no banco
  2. Retornar empresa criada
- **Isolamento**: Empresas são completamente isoladas (multitenancy)

### Regra 2: Busca por Domínio
- **Quando aplicar**: Identificação de tenant via subdomínio
- **Validação**: Domain deve existir no banco
- **Processo**:
  1. Extrair subdomínio da URL
  2. Buscar empresa por domain
  3. Retornar company_id para uso no middleware

### Regra 3: Atualização de Empresa
- **Quando aplicar**: Endpoint `PUT /companies/:id`
- **Validação**:
  - Apenas admin da empresa pode atualizar
  - Domain deve ser único se alterado
- **Processo**:
  1. Verificar permissões
  2. Validar dados
  3. Atualizar no banco

## Dependências
- **Módulos**: Nenhum (módulo base)
- **Tabelas**: `companies`

## Endpoints

### GET /companies/:id
- **Descrição**: Buscar empresa por ID
- **Resposta**: `{ data: { company } }`
- **Autenticação**: Requerida
- **Validação**: Empresa deve pertencer ao tenant do usuário autenticado

### PUT /companies/:id
- **Descrição**: Atualizar dados da empresa
- **Body**: `{ name?, domain? }`
- **Resposta**: `{ data: { company } }`
- **Autenticação**: Requerida
- **Validação**: Apenas admin pode atualizar

## Fluxos Importantes

### Fluxo de Criação
1. Validar dados de entrada
2. Verificar se domain já existe (se fornecido)
3. Criar empresa no banco
4. Retornar empresa criada

### Fluxo de Identificação por Subdomínio
1. Extrair subdomínio do host header
2. Buscar empresa por domain
3. Retornar company_id
4. Usar no middleware de tenant

## Casos Especiais
- **Domain único**: Se domain fornecido, deve ser único no sistema
- **Isolamento**: Empresas não podem acessar dados de outras empresas

## Exemplos de Uso
```typescript
// Buscar empresa
const response = await fetch('/api/v1/companies/<id>', {
  headers: { 'Authorization': 'Bearer <token>', 'X-Tenant-ID': '<companyId>' }
});

// Atualizar empresa
const response = await fetch('/api/v1/companies/<id>', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer <token>', 'X-Tenant-ID': '<companyId>' },
  body: JSON.stringify({ name: 'Novo Nome' })
});
```

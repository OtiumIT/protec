# Módulo Feature Toggles

## Descrição
Sistema de módulos/feature toggles que permite ativar e desativar funcionalidades por tenant. Controla quais módulos estão disponíveis para cada empresa.

## Regras de Negócio

### Regra 1: Verificação de Módulo Ativo
- **Quando aplicar**: Antes de executar lógica de qualquer módulo
- **Validação**: 
  - Módulo deve existir na tabela `modules`
  - Módulo deve estar ativado para o tenant em `tenant_modules`
  - `enabled_until` deve ser NULL ou maior que NOW()
- **Processo**:
  1. Buscar módulo por key
  2. Verificar se está ativo para tenant
  3. Retornar true/false
- **Uso**: `FeatureToggleService.verify(companyId, 'MODULE_KEY')`

### Regra 2: Ativação de Módulo
- **Quando aplicar**: Endpoint `POST /modules/:id/activate`
- **Validação**:
  - Módulo deve existir
  - Tenant deve existir
  - `enabled_until` opcional (NULL = permanente)
- **Processo**:
  1. Verificar se módulo existe
  2. Criar ou atualizar registro em `tenant_modules`
  3. Retornar módulo ativado

### Regra 3: Desativação de Módulo
- **Quando aplicar**: Endpoint `POST /modules/:id/deactivate`
- **Validação**: Módulo deve estar ativo
- **Processo**:
  1. Verificar se módulo está ativo
  2. Deletar ou atualizar `enabled_until` em `tenant_modules`
  3. Retornar sucesso

### Regra 4: Listagem de Módulos
- **Módulos Disponíveis**: Todos os módulos cadastrados no sistema
- **Módulos Ativos**: Apenas módulos ativados para o tenant atual
- **Resposta**: Inclui informações de ativação (enabled_until)

## Dependências
- **Módulos**: Nenhum (módulo base)
- **Tabelas**: `modules`, `tenant_modules`, `companies`

## Endpoints

### GET /modules
- **Descrição**: Listar todos os módulos disponíveis no sistema
- **Resposta**: `{ data: { modules: [] } }`
- **Autenticação**: Requerida

### GET /modules/active
- **Descrição**: Listar módulos ativos do tenant atual
- **Resposta**: `{ data: { modules: [] } }`
- **Autenticação**: Requerida
- **Multitenant**: Filtro automático por company_id

### POST /modules/:id/activate
- **Descrição**: Ativar módulo para o tenant
- **Body**: `{ enabledUntil?: Date }`
- **Resposta**: `{ data: { module, enabledUntil } }`
- **Autenticação**: Requerida
- **Validação**: Apenas admin pode ativar módulos

### POST /modules/:id/deactivate
- **Descrição**: Desativar módulo para o tenant
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida
- **Validação**: Apenas admin pode desativar módulos

## Fluxos Importantes

### Fluxo de Verificação de Módulo
1. Receber companyId e moduleKey
2. Buscar módulo por key na tabela `modules`
3. Buscar ativação em `tenant_modules`
4. Verificar se `enabled_until` é NULL ou > NOW()
5. Retornar true/false

### Fluxo de Ativação
1. Validar dados de entrada
2. Verificar se módulo existe
3. Criar/atualizar registro em `tenant_modules`
4. Retornar módulo ativado

## Casos Especiais
- **Módulos Permanentes**: `enabled_until = NULL` significa módulo ativo permanentemente
- **Expiração Automática**: Módulos com `enabled_until` expiram automaticamente
- **Módulos do Sistema**: Alguns módulos podem ser obrigatórios e não podem ser desativados

## Exemplos de Uso
```typescript
// Verificar se módulo está ativo (no service)
const hasModule = await FeatureToggleService.verify(companyId, 'BILLING');
if (!hasModule) {
  throw new Error('BILLING module not active');
}

// Ativar módulo
const response = await fetch('/api/v1/modules/<id>/activate', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>', 'X-Tenant-ID': '<companyId>' },
  body: JSON.stringify({ enabledUntil: null }) // permanente
});

// Listar módulos ativos
const response = await fetch('/api/v1/modules/active', {
  headers: { 'Authorization': 'Bearer <token>', 'X-Tenant-ID': '<companyId>' }
});
```

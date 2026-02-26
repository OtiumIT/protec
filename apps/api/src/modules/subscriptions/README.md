# Módulo Subscriptions

## Descrição
Gerencia assinaturas das empresas, incluindo criação, atualização de status, verificação de limites (seats) e bloqueio de operações quando assinatura está inativa.

## Regras de Negócio

### Regra 1: Status de Assinatura
- **Status possíveis**: `active`, `past_due`, `canceled`, `trialing`
- **Quando aplicar**: Todas as operações de escrita
- **Validação**: 
  - `active` ou `trialing`: Permitir todas as operações
  - `past_due` ou `canceled`: Bloquear operações de escrita (com grace period)
- **Grace Period**: 7 dias após `past_due` ou `canceled` antes de bloquear completamente

### Regra 2: Verificação de Seats (Limite de Usuários)
- **Quando aplicar**: Ao criar novo usuário
- **Validação**: `count(users) < plan.max_users`
- **Processo**:
  1. Buscar assinatura da empresa
  2. Buscar plano associado
  3. Contar usuários ativos
  4. Comparar com `plan.max_users`
- **Erro**: Retorna 409 se limite atingido

### Regra 3: Bloqueio de Escrita
- **Quando aplicar**: Middleware `requireActiveSubscription`
- **Validação**: 
  - Apenas métodos de escrita (POST, PUT, PATCH, DELETE)
  - Verificar status da assinatura
  - Aplicar grace period
- **Processo**:
  1. Verificar método HTTP
  2. Buscar assinatura
  3. Verificar status
  4. Bloquear se necessário

### Regra 4: Plano Free – 7 dias de acesso
- **Quando aplicar**: Qualquer acesso a funcionalidades (módulos) e recursos do tenant.
- **Validação**: No plano Free, a data da primeira entrada é armazenada em `free_plan_started_at`. Após 7 dias, o tenant perde acesso a todas as funcionalidades (middleware retorna 402 `FREE_PLAN_EXPIRED`).
- **Exceção**: O tenant continua podendo acessar "Meu plano", listar planos e iniciar checkout para assinar plano pago.
- **Definição da data**: Ao criar assinatura no Free ou ao alterar plano para Free, `free_plan_started_at` é preenchido apenas na primeira vez (não é resetado se voltar ao Free depois de um plano pago).

### Regra 5: Plano Customizado (apenas admin geral)
- **Quando aplicar**: POST/PUT `/subscriptions` (rotas do tenant, não admin)
- **Validação**: O cliente (tenant) não pode criar nem alterar assinatura para plano com `is_custom = true`. Apenas super_admin, via POST/PUT `/subscriptions/admin`, pode associar plano customizado.
- **Erro**: 403 `CUSTOM_PLAN_FORBIDDEN` com mensagem "Apenas o administrador geral pode associar o plano customizado."

### Regra 5: Sincronização com Stripe
- **Quando aplicar**: Webhooks do Stripe
- **Validação**: Assinatura do webhook
- **Processo**:
  1. Receber evento do Stripe
  2. Validar assinatura
  3. Atualizar status no banco
  4. Processar eventos específicos (subscription.updated, invoice.payment_failed)

## Dependências
- **Módulos**: `billing` (integração Stripe), `plans` (buscar informações do plano)
- **Tabelas**: `subscriptions`, `plans`, `companies`

## Endpoints

### GET /subscriptions
- **Descrição**: Buscar assinatura do tenant atual
- **Resposta**: `{ data: { subscription, plan } }`
- **Autenticação**: Requerida
- **Multitenant**: Filtro automático por company_id

### POST /subscriptions
- **Descrição**: Criar assinatura (próprio tenant)
- **Body**: `{ planId }`
- **Resposta**: `{ data: { subscription } }`
- **Autenticação**: Requerida
- **Validação**: Plano deve existir; plano customizado não permitido (apenas super_admin via rota admin)

### PUT /subscriptions
- **Descrição**: Atualizar assinatura (próprio tenant)
- **Body**: `{ planId?, status? }`
- **Resposta**: `{ data: { subscription } }`
- **Autenticação**: Requerida
- **Validação**: Plano customizado não permitido (apenas super_admin via rota admin)

### GET/POST/PUT /subscriptions/admin?companyId=xxx
- **Descrição**: Buscar/criar/atualizar assinatura de uma empresa (apenas super_admin)
- **Permissão**: Apenas `role === 'super_admin'`
- **Permite**: Incluir plano customizado

### POST /subscriptions/cancel
- **Descrição**: Cancelar assinatura
- **Body**: `{ reason? }`
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida

## Fluxos Importantes

### Fluxo de Verificação de Seats
1. Buscar assinatura da empresa
2. Buscar plano associado
3. Contar usuários ativos
4. Comparar com `plan.max_users`
5. Retornar true/false ou erro

### Fluxo de Bloqueio de Escrita
1. Verificar método HTTP (apenas POST/PUT/PATCH/DELETE)
2. Buscar assinatura
3. Verificar status
4. Aplicar grace period (7 dias)
5. Bloquear se necessário

## Casos Especiais
- **Grace Period**: 7 dias após cancelamento antes de bloquear completamente
- **Trialing**: Status especial que permite todas as operações
- **Sincronização**: Webhooks do Stripe atualizam status automaticamente

## Exemplos de Uso
```typescript
// Verificar limite de seats
const subscription = await SubscriptionService.getByCompany(companyId);
const currentUsers = await UserRepository.countByCompany(companyId);
if (currentUsers >= subscription.plan.max_users) {
  throw new Error('User limit reached');
}

// Verificar se assinatura está ativa
const isActive = await SubscriptionService.isActive(companyId);
if (!isActive) {
  throw new Error('Subscription is not active');
}
```

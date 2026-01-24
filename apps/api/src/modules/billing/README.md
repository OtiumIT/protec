# Módulo Billing

## Descrição
Gerencia integração com Stripe para processamento de pagamentos, criação de customers, assinaturas e webhooks.

## Regras de Negócio

### Regra 1: Criação de Customer no Stripe
- **Quando aplicar**: Ao criar assinatura
- **Processo**:
  1. Criar customer no Stripe com email da empresa
  2. Armazenar `stripe_customer_id` no banco
  3. Retornar customer ID

### Regra 2: Webhooks do Stripe
- **Quando aplicar**: Eventos do Stripe
- **Validação**: Assinatura do webhook (Stripe signature)
- **Eventos processados**:
  - `subscription.updated`: Atualizar status da assinatura
  - `invoice.payment_failed`: Marcar assinatura como `past_due`
  - `customer.subscription.deleted`: Cancelar assinatura
- **Processo**:
  1. Validar assinatura do webhook
  2. Processar evento
  3. Atualizar banco de dados
  4. Retornar 200 OK

## Dependências
- **Serviços externos**: Stripe API
- **Módulos**: `subscriptions` (atualizar status)
- **Tabelas**: `subscriptions`, `plans`

## Endpoints

### POST /webhooks/stripe
- **Descrição**: Receber webhooks do Stripe
- **Headers**: `Stripe-Signature` (validação)
- **Body**: Evento do Stripe
- **Resposta**: `200 OK`
- **Autenticação**: Não requerida (validação via signature)

## Fluxos Importantes

### Fluxo de Webhook
1. Receber evento do Stripe
2. Validar signature
3. Processar evento específico
4. Atualizar banco de dados
5. Retornar 200 OK

## Casos Especiais
- **Idempotência**: Processar eventos apenas uma vez (usar event ID)
- **Retry**: Stripe retenta webhooks que falham

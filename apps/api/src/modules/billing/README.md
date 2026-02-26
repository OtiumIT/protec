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

### POST /api/v1/webhooks/stripe
- **Descrição**: Receber webhooks do Stripe (raw body para validação da assinatura)
- **Headers**: `Stripe-Signature` (obrigatório para validação)
- **Body**: Raw body do evento (não enviar como JSON no Content-Type para preservar assinatura)
- **Resposta**: `200 OK`
- **Autenticação**: Não requerida (validação via signature)

### GET /api/v1/billing/invoices (auth + tenant)
- **Descrição**: Lista faturas (invoices) do cliente no Stripe.
- **Query**: `limit` (opcional, 1–100, padrão 24)
- **Resposta**: `{ "data": { "invoices": [ { "id", "number", "status", "amountPaid", "currency", "createdAt", "hostedInvoiceUrl", "invoicePdf", "periodStart", "periodEnd" } ] } }`
- **Sem stripe_customer_id**: Retorna array vazio.

### POST /api/v1/billing/portal-session (auth + tenant)
- **Descrição**: Cria sessão do Stripe Customer Billing Portal (alterar forma de pagamento, cancelar assinatura, ver faturas).
- **Body**: `{ "returnUrl": "https://..." }`
- **Resposta**: `{ "data": { "url": "https://billing.stripe.com/..." } }`
- **Pré-requisito**: Assinatura do tenant deve ter `stripe_customer_id` (ex.: após pagar via Checkout).

### POST /api/v1/billing/checkout-session (auth + tenant)
- **Descrição**: Cria sessão do Stripe Checkout para assinar plano pago.
- **Body**: `{ "planId": "uuid", "successUrl": "https://...", "cancelUrl": "https://..." }`
- **Resposta**: `{ "data": { "url": "https://checkout.stripe.com/..." } }`
- **Pré-requisito**: Plano deve ter `stripe_price_id` configurado no banco.

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

# Módulo Split Payment

## Descrição

Simulador de impacto do Split Payment da reforma tributária no fluxo de caixa das empresas. Com o split payment, o IBS/CBS é retido automaticamente pelo banco/adquirente no momento do pagamento eletrônico (cartão/PIX), reduzindo imediatamente o caixa disponível da empresa.

## Regras de Negócio

- **Split Payment**: incide apenas sobre a parcela eletrônica (cartão/PIX) do faturamento, conforme `percentual_eletronico`.
- **Impostos retidos**: `parcela_eletronica * aliquota_ibs_cbs / 100` por mês.
- **Custo financeiro**: calculado como `impostos_retidos * (prazo_medio / 365) * (custo_capital / 100)` — representa o custo de antecipação ou empréstimo para compensar o caixa retido.
- **Capital de giro necessário**: média mensal dos impostos retidos via split.
- **Redução no caixa**: percentual total de impostos retidos sobre a receita bruta total.

### Multitenant

- Tabela `split_payment_simulations` no schema `tenant_{company_id}`.
- Repositório não filtra por `company_id` explícito; o isolamento é por schema.

### Cliente

- `client_id` obrigatório ao salvar; deve existir em `clients` do tenant (`404 CLIENT_NOT_FOUND` se inválido).

### Módulo de plano

- Rotas usam `requireModule('SPLIT_PAYMENT')`.

## Dependências

- `ClientRepository` para validar cliente.
- `@shared/core`: schemas Zod e função `simularSplitPayment`.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/simulate` | Simular sem persistir |
| POST | `/simulate-and-save` | Simular e salvar |
| GET | `/simulations` | Listar (`client_id`, `page`, `limit` opcionais) |
| GET | `/simulations/:id` | Obter por id |
| DELETE | `/simulations/:id` | Excluir |

Base: `/api/v1/split-payment`.

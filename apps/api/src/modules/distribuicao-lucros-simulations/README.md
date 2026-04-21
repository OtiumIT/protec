# Módulo Distribuição de lucros — simulações persistidas

## Descrição

Persistência de simulações **investimento na PJ x retenção na PF** (Lei 15.270/2025): parâmetros e resultado calculado no servidor via `runDistribuicaoLucrosSimulation` (`@shared/core`), alinhado ao comportamento do portal.

## Regras de negócio

### Multitenant

- Tabela `distribuicao_lucros_simulations` no schema `tenant_{company_id}`.
- Repositório não filtra por `company_id` explícito; o isolamento é por schema.

### Cliente

- `client_id` obrigatório na criação; deve existir em `clients` do tenant (`404 CLIENT_NOT_FOUND` se inválido).
- Atualização pode alterar `client_id` com a mesma validação.

### Cálculo

- `input_data` segue o schema Zod `DistribuicaoLucrosSimulationParamsSchema` (valor, meses, irpjRate, appKey).
- `result_data` é o retorno de `runDistribuicaoLucrosSimulation` (não confiar no JSON enviado pelo cliente para o resultado).

### Módulo de plano

- Rotas usam `tenantMiddleware`, `authMiddleware` e `requireModule('IRPF_ALTA_RENDA')`, alinhado ao submenu **IRPF** no portal (mesmo módulo que a tributação de dividendos).

## Dependências

- `ClientRepository` para validar cliente.
- `@shared/core`: cálculo e schemas Zod.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/` | Criar simulação |
| GET | `/` | Listar (`client_id`, `page`, `limit` opcionais) |
| GET | `/:id` | Obter por id |
| PATCH | `/:id` | Atualizar (título e/ou parâmetros; reprocessa resultado se `input` mudar) |
| DELETE | `/:id` | Excluir |

Base: `/api/v1/distribuicao-lucros-simulations`.

# Módulo Precificador com Custo Tributário

## Descrição

Calcula o preço de venda necessário para um serviço em cada regime tributário (Lucro Presumido, Lucro Real, Simples Nacional e Reforma IBS/CBS), dado um custo base e a margem desejada. Permite comparar o impacto tributário antes e depois da reforma.

## Regras de Negócio

### Cálculo central

```
preço_venda = (custo + margem_R$) / (1 - alíquota_efetiva_sobre_receita)
```

Onde `alíquota_efetiva_sobre_receita` varia por regime:
- **LP (serviços)**: ISS + PIS(0,65%) + COFINS(3%) + IRPJ efetivo (~4,8%) + CSLL efetivo (~2,88%)
- **LR**: ISS + PIS(1,65%) + COFINS(7,6%) - créditos estimados + IRPJ/CSLL sobre lucro
- **SN**: alíquota efetiva pelo Fator R (Anexo III ou V) e faixa de faturamento
- **Reforma IBS/CBS**: ~26,5% referência com redutor 30% para serviços (Art. 128 LC 214) ≈ 18,55%

### Multitenant

- Tabela `precificador_simulations` no schema `tenant_{company_id}`.
- Repositório não filtra por `company_id` explícito; isolamento por schema.

### Cliente

- `client_id` obrigatório ao salvar; deve existir em `clients` do tenant (404 se inválido).
- Simulação sem salvar (`POST /simulate`) não exige `client_id`.

### Módulo de plano

- Rotas usam `requireModule('PRECIFICADOR')`.

## Dependências

- `ClientRepository` para validar cliente.
- `@shared/core`: `simularPrecificador()` e schemas Zod.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/simulate` | Simular sem persistir |
| POST | `/simulate-and-save` | Simular e salvar |
| GET | `/simulations` | Listar (`client_id`, `page`, `limit` opcionais) |
| GET | `/simulations/:id` | Obter por id |
| DELETE | `/simulations/:id` | Excluir |

Base: `/api/v1/precificador`.

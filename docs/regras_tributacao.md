# Regras de Tributação da Alta Renda - Lei 15.270/2025

Este documento detalha as regras aplicadas ao motor de cálculo para simulação de impacto tributário.

## 1. Composição da Base de Cálculo

Conforme o **Art. 2º da Lei 15.270/2025**, a base para a tributação mínima da pessoa física é composta pela soma de:

- Rendimentos tributáveis na Declaração de Ajuste Anual (DAA).
- Lucros e dividendos distribuídos, inclusive por empresas do Simples Nacional.

## 2. Alíquotas Progressivas e Fixas

| Faixa de Renda Anual (BCC) | Alíquota | Tipo de Alíquota |
| :--- | :--- | :--- |
| Até R$ 600.000,00 | Isento | N/A |
| De R$ 600.000,01 a R$ 1.200.000,00 | Até 10% | Progressiva |
| Acima de R$ 1.200.000,00 | 10% | Fixa |

## 3. Antecipação Mensal (Gatilho de Retenção)

- **Regra**: Retenção de 10% na fonte sobre distribuições de dividendos.
- **Gatilho**: Pagamentos superiores a R$ 50.000,00 no mês.
- **Fundamentação**: Art. 5º da Lei 15.270/2025 (mecanismo de antecipação do imposto anual).

## 4. Implementação e regulamentação futura

- **Faixa progressiva (item 2)**: A lei não define tabela ou fórmula exata. O sistema usa **interpolação linear** (0% no limite de R$ 600.000 até 10% no limite de R$ 1.200.000). Quando a Receita Federal publicar regulamentação, os parâmetros e a fórmula devem ser ajustados no motor de cálculo (ver `apps/api/src/modules/irpf-alta-renda/calculations.ts`, objeto `CONFIG_LEI_15270_2025` e função `aplicarFaixas`).

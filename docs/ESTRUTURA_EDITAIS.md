# Estrutura de Editais PGFN

Este documento descreve a estrutura de dados centralizada para gerenciar os Editais PGFN de forma reutilizável.

## Localização

- **Tipos e Interfaces:** `packages/shared/src/types/edital.ts`
- **Funções de Cálculo:** `packages/shared/src/utils/edital-calculations.ts`
- **Utilitários Frontend:** `apps/portal/src/utils/edital-utils.ts`

## Estrutura de Dados

### Tipo `Edital`

```typescript
interface Edital {
  code: string;                    // Código único (ex: "PGDAU-11-2025")
  name: string;                    // Nome oficial
  description: string;             // Descrição
  startDate: string;              // Data início (ISO)
  endDate: string;                // Data término (ISO)
  extended?: boolean;              // Se foi prorrogado
  modality: TransactionModality;   // Modalidade
  paymentTerms: PaymentTerms;      // Condições de pagamento
  discountRules: Record<Rating, DiscountRules>; // Regras por rating
  eligibility: EligibilityCriteria; // Critérios de elegibilidade
  notes?: string;                  // Observações
  officialLink?: string;           // Link oficial
}
```

### Modalidades Disponíveis

- `CAPAG` - Transação por Capacidade de Pagamento
- `PEQUENO_VALOR` - Transação de Pequeno Valor
- `CONTENCIOSO` - Transação no Contencioso Tributário
- `IRRECUPERAVEIS` - Débitos Irrecuperáveis
- `DESENROLA_RURAL` - Programa Desenrola Rural
- `PTI` - Programa de Transação Integral

## Editais Cadastrados

### 1. Edital PGDAU 11/2025 - CAPAG
- **Código:** `PGDAU-11-2025`
- **Prazo:** Até 30/01/2026 (prorrogado)
- **Limite:** R$ 45 milhões
- **Ratings A/B:** Sem desconto
- **Ratings C/D:** Desconto até 65-70%

### 2. Edital PGDAU 11/2025 - Pequeno Valor
- **Código:** `PGDAU-11-2025-PEQUENO-VALOR`
- **Limite:** 60 salários mínimos
- **Descontos Progressivos:** 30-50%

### 3. Edital PGDAU 11/2025 - Débitos Irrecuperáveis
- **Código:** `PGDAU-11-2025-IRRECUPERAVEIS`
- **Desconto:** Até 70% (máximo permitido)

### 4. Editais de Contencioso
- **PGFN-52-2025:** IPI - Conceito de Praça
- **PGFN-53-2025:** Preço de Transferência (PRL)
- **PGFN-54-2025:** IRPJ/CSLL - Desmutualização

### 5. Programa Desenrola Rural
- **Código:** `PGFN-3-2025`
- **Foco:** Agronegócio

### 6. Programa de Transação Integral (PTI)
- **Código:** `PTI-2025`
- **Lançamento:** Setembro/2025

## Funções Utilitárias

### Buscar Editais

```typescript
import { getEligibleEditais, getEditaisByModality } from '@shared/core';

// Buscar editais elegíveis
const editais = getEligibleEditais({
  amount: 10000000, // R$ 100.000 em centavos
  rating: 'C',
  companyType: 'MEI',
});

// Buscar por modalidade
const capagEditais = getEditaisByModality('CAPAG');
```

### Calcular Simulação

```typescript
import { calculateEditalSimulation } from '@shared/core';

const simulation = calculateEditalSimulation(
  edital,
  10000000, // R$ 100.000 em centavos
  'C',
  {
    companyType: 'MEI',
    estimatedInterestPercent: 15,
    estimatedFeesPercent: 10,
  }
);
```

### Comparar Simulações

```typescript
import { compareSimulations } from '@shared/core';

const { best, comparisons } = compareSimulations([sim1, sim2, sim3]);
```

## Exemplo de Uso no Frontend

```typescript
import { compareModalities, getEditalInfo } from '../utils/edital-utils';

// Comparar modalidades
const comparison = compareModalities(100000, 'C', 'MEI');

// Obter informações formatadas
const edital = EDITAIS[0];
const info = getEditalInfo(edital);
console.log(`Faltam ${info.daysUntilEnd} dias para o prazo final`);
```

## Atualização de Editais

Para adicionar ou atualizar um edital:

1. Edite `packages/shared/src/types/edital.ts`
2. Adicione o novo edital no array `EDITAIS`
3. Siga a estrutura definida pela interface `Edital`
4. Atualize a documentação se necessário

## Valores em Centavos

⚠️ **Importante:** Todos os valores monetários são armazenados em **centavos** para evitar problemas de precisão com números decimais.

- Use `reaisToCents()` para converter reais → centavos
- Use `centsToReais()` para converter centavos → reais

## Benefícios da Estrutura

1. **Centralização:** Todos os editais em um único lugar
2. **Reutilização:** Funções utilitárias compartilhadas
3. **Manutenibilidade:** Fácil atualizar/editais
4. **Type Safety:** TypeScript garante consistência
5. **Testabilidade:** Estrutura facilita testes
6. **Escalabilidade:** Fácil adicionar novos editais

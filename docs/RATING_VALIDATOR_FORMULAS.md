# Documentação Completa: Validador de Rating PGFN (CAPAG)

## Base Legal
**Portaria PGFN nº 6.757/2022** - Define os critérios para classificação de capacidade de pagamento (Rating) para fins de parcelamento de débitos.

**Editais PGFN 2025:**
- **Edital nº 11/2025** - Transação conforme capacidade de pagamento (CAPAG) e Transação de Pequeno Valor
- **Editais de Contencioso Tributário 2025** - Transação no contencioso de relevante controvérsia jurídica

---

## Fase 1: Coleta de Dados do Balanço Patrimonial

### 1.1 Ativo Circulante (AC)

#### Campos Granulares:
| Campo | Descrição | Fórmula de Cálculo |
|-------|-----------|-------------------|
| `caixa_equivalentes` | Caixa e equivalentes de caixa | Valor direto do balanço |
| `aplicacoes_financeiras` | Aplicações financeiras de curto prazo | Valor direto do balanço |
| `contas_receber` | Contas a receber de curto prazo | Valor direto do balanço |
| `estoques` | Estoques | Valor direto do balanço |
| `tributos_recuperar` | Tributos a recuperar | Valor direto do balanço |
| `despesas_antecipadas` | Despesas antecipadas | Valor direto do balanço |
| `outros_ativos_circulantes` | Outros ativos circulantes | Valor direto do balanço |

#### Fórmula de Agregação:
```
Ativo Circulante Total (AC) = 
  caixa_equivalentes +
  aplicacoes_financeiras +
  contas_receber +
  estoques +
  tributos_recuperar +
  despesas_antecipadas +
  outros_ativos_circulantes
```

---

### 1.2 Ativo Não Circulante (ANC)

#### 1.2.1 Realizável a Longo Prazo (RLP)

| Campo | Descrição | Fórmula de Cálculo |
|-------|-----------|-------------------|
| `contas_receber_lp` | Contas a receber de longo prazo | Valor direto do balanço |
| `emprestimos_concedidos` | Empréstimos concedidos | Valor direto do balanço |
| `outros_creditos_lp` | Outros créditos de longo prazo | Valor direto do balanço |

**Fórmula:**
```
Realizável a Longo Prazo Total (RLP) = 
  contas_receber_lp +
  emprestimos_concedidos +
  outros_creditos_lp
```

#### 1.2.2 Outros Ativos Não Circulantes

| Campo | Descrição | Fórmula de Cálculo |
|-------|-----------|-------------------|
| `investimentos` | Investimentos permanentes | Valor direto do balanço |
| `imobilizado` | Imobilizado | Valor direto do balanço |
| `intangivel` | Intangível | Valor direto do balanço |
| `outros_ativos_nao_circulantes` | Outros ativos não circulantes | Valor direto do balanço |

#### Fórmula de Agregação do Ativo Total:
```
Ativo Total (AT) = 
  AC +
  RLP +
  investimentos +
  imobilizado +
  intangivel +
  outros_ativos_nao_circulantes
```

---

### 1.3 Passivo Circulante (PC)

#### Campos Granulares:
| Campo | Descrição | Fórmula de Cálculo |
|-------|-----------|-------------------|
| `fornecedores` | Fornecedores | Valor direto do balanço |
| `emprestimos_financiamentos` | Empréstimos e financiamentos de curto prazo | Valor direto do balanço |
| `obrigacoes_trabalhistas` | Obrigações trabalhistas | Valor direto do balanço |
| `tributos_pagar` | Tributos a pagar | Valor direto do balanço |
| `contas_pagar` | Contas a pagar | Valor direto do balanço |
| `provisoes` | Provisões | Valor direto do balanço |
| `outros_passivos_circulantes` | Outros passivos circulantes | Valor direto do balanço |

#### Fórmula de Agregação:
```
Passivo Circulante Total (PC) = 
  fornecedores +
  emprestimos_financiamentos +
  obrigacoes_trabalhistas +
  tributos_pagar +
  contas_pagar +
  provisoes +
  outros_passivos_circulantes
```

---

### 1.4 Passivo Não Circulante (PNC)

#### Campos Granulares:
| Campo | Descrição | Fórmula de Cálculo |
|-------|-----------|-------------------|
| `emprestimos_financiamentos_lp` | Empréstimos e financiamentos de longo prazo | Valor direto do balanço |
| `obrigacoes_trabalhistas_lp` | Obrigações trabalhistas de longo prazo | Valor direto do balanço |
| `tributos_pagar_lp` | Tributos a pagar de longo prazo | Valor direto do balanço |
| `provisoes_lp` | Provisões de longo prazo | Valor direto do balanço |
| `outros_passivos_nao_circulantes` | Outros passivos não circulantes | Valor direto do balanço |

#### Fórmula de Agregação:
```
Passivo Não Circulante Total (PNC) = 
  emprestimos_financiamentos_lp +
  obrigacoes_trabalhistas_lp +
  tributos_pagar_lp +
  provisoes_lp +
  outros_passivos_nao_circulantes
```

#### Fórmula do Passivo Total:
```
Passivo Total (PT) = PC + PNC
```

---

### 1.5 Patrimônio Líquido (PL)

#### Campos Granulares:
| Campo | Descrição | Fórmula de Cálculo | Observação |
|-------|-----------|-------------------|------------|
| `capital_social` | Capital social | Valor direto do balanço | |
| `reservas_capital` | Reservas de capital | Valor direto do balanço | |
| `reservas_lucros` | Reservas de lucros | Valor direto do balanço | |
| `lucros_prejuizos_acumulados` | Lucros ou prejuízos acumulados | Valor direto do balanço | **Pode ser negativo** |
| `outros_ajustes` | Outros ajustes | Valor direto do balanço | |

#### Fórmula de Agregação:
```
Patrimônio Líquido Total (PL) = 
  capital_social +
  reservas_capital +
  reservas_lucros +
  lucros_prejuizos_acumulados +
  outros_ajustes
```

**Nota:** O campo `lucros_prejuizos_acumulados` pode ser negativo, o que reduzirá o PL total.

---

### 1.6 DRE (Demonstração do Resultado do Exercício) - Opcional

#### Campos:
| Campo | Descrição | Fórmula de Cálculo |
|-------|-----------|-------------------|
| `receita_bruta` | Receita bruta | Valor direto da DRE |
| `deducoes_vendas` | Deduções de vendas | Valor direto da DRE |
| `receita_liquida` | Receita líquida | Calculado automaticamente se não fornecido |
| `custos_vendas` | Custos das vendas | Valor direto da DRE |
| `despesas_operacionais` | Despesas operacionais | Valor direto da DRE |
| `resultado_financeiro` | Resultado financeiro | Valor direto da DRE (pode ser negativo) |
| `outros_resultados` | Outros resultados | Valor direto da DRE (pode ser negativo) |

#### Fórmula de Receita Líquida (se não fornecida):
```
Receita Líquida = receita_bruta - deducoes_vendas
```

**Nota:** A DRE é opcional para o cálculo do Rating. Os indicadores principais são calculados apenas com dados do Balanço Patrimonial.

---

## Fase 2: Cálculo de Valores Agregados

Após coletar todos os campos granulares, o sistema calcula automaticamente os totais:

### Valores Agregados Calculados:

1. **Ativo Circulante Total (AC)**
   - Soma de todos os campos do ativo circulante

2. **Realizável a Longo Prazo Total (RLP)**
   - Soma dos campos de realizável a longo prazo

3. **Passivo Circulante Total (PC)**
   - Soma de todos os campos do passivo circulante

4. **Passivo Não Circulante Total (PNC)**
   - Soma de todos os campos do passivo não circulante

5. **Patrimônio Líquido Total (PL)**
   - Soma de todos os campos do patrimônio líquido

6. **Ativo Total (AT)**
   ```
   AT = AC + RLP + Investimentos + Imobilizado + Intangível + Outros ANC
   ```

7. **Passivo Total (PT)**
   ```
   PT = PC + PNC
   ```

---

## Fase 3: Cálculo dos Indicadores Financeiros

### 3.1 Liquidez Corrente (LC)

**Fórmula:**
```
Liquidez Corrente = Ativo Circulante (AC) / Passivo Circulante (PC)
```

**Interpretação:**
- **LC ≥ 1.0**: A empresa tem recursos suficientes para pagar suas obrigações de curto prazo
- **LC < 1.0**: A empresa pode ter dificuldades para honrar compromissos de curto prazo

**Validação:**
- Se PC = 0, o cálculo não pode ser realizado (erro: "Passivo Circulante não pode ser zero")

**Exemplo:**
```
AC = 100.000,00
PC = 50.000,00
LC = 100.000 / 50.000 = 2,0000
```

---

### 3.2 Liquidez Geral (LG)

**Fórmula:**
```
Liquidez Geral = (Ativo Circulante + Realizável a Longo Prazo) / (Passivo Circulante + Passivo Não Circulante)
```

Ou de forma simplificada:
```
LG = (AC + RLP) / (PC + PNC)
```

**Interpretação:**
- **LG ≥ 1.0**: A empresa tem capacidade de pagar todas as suas obrigações (curto e longo prazo)
- **LG < 1.0**: A empresa pode ter dificuldades para honrar compromissos totais

**Validação:**
- Se (PC + PNC) = 0, o cálculo não pode ser realizado (erro: "Passivo Total não pode ser zero")

**Exemplo:**
```
AC = 100.000,00
RLP = 50.000,00
PC = 60.000,00
PNC = 40.000,00
LG = (100.000 + 50.000) / (60.000 + 40.000) = 150.000 / 100.000 = 1,5000
```

---

### 3.3 Solvência (S)

**Fórmula:**
```
Solvência = Patrimônio Líquido (PL) / Ativo Total (AT)
```

**Interpretação:**
- **S ≥ 0.5 (50%)**: Excelente estrutura de capital próprio
- **S ≥ 0.3 (30%)**: Boa estrutura de capital próprio
- **S ≥ 0.1 (10%)**: Estrutura de capital próprio regular
- **S < 0.1 (10%)**: Estrutura de capital próprio insuficiente

**Validação:**
- Se AT = 0, o cálculo não pode ser realizado (erro: "Ativo Total não pode ser zero")

**Exemplo:**
```
PL = 200.000,00
AT = 500.000,00
S = 200.000 / 500.000 = 0,4000 (40%)
```

---

## Fase 4: Classificação de Rating

### 4.1 Sistema de Pontuação

O sistema atribui pontos para cada indicador conforme a tabela abaixo:

#### Tabela de Pontuação:

| Indicador | Condição | Pontos |
|-----------|----------|--------|
| **Liquidez Corrente** | ≥ 2.0 | 3 pontos |
| | ≥ 1.5 e < 2.0 | 2 pontos |
| | ≥ 1.0 e < 1.5 | 1 ponto |
| | < 1.0 | 0 pontos |
| **Liquidez Geral** | ≥ 1.5 | 3 pontos |
| | ≥ 1.2 e < 1.5 | 2 pontos |
| | ≥ 1.0 e < 1.2 | 1 ponto |
| | < 1.0 | 0 pontos |
| **Solvência** | ≥ 0.5 (50%) | 3 pontos |
| | ≥ 0.3 (30%) e < 0.5 | 2 pontos |
| | ≥ 0.1 (10%) e < 0.3 | 1 ponto |
| | < 0.1 (10%) | 0 pontos |

**Pontuação Total:** Soma dos pontos dos três indicadores (máximo 9 pontos)

---

### 4.2 Classificação Final

| Pontuação Total | Rating | Descrição |
|----------------|--------|-----------|
| **7 a 9 pontos** | **A** | Excelente capacidade de pagamento |
| **5 a 6 pontos** | **B** | Boa capacidade de pagamento |
| **3 a 4 pontos** | **C** | Capacidade de pagamento regular |
| **0 a 2 pontos** | **D** | Capacidade de pagamento insuficiente |

---

### 4.3 Exemplo de Classificação

**Cenário:**
- Liquidez Corrente: 2,5000 → **3 pontos**
- Liquidez Geral: 1,8000 → **3 pontos**
- Solvência: 0,4500 (45%) → **2 pontos**

**Total:** 3 + 3 + 2 = **8 pontos** → **Rating A**

---

## Fase 5: Comparação com Rating Real (Opcional)

### 5.1 Validação de Discrepância

Se o usuário informar um **Rating Real** (A, B, C ou D), o sistema compara com o **Rating Estimado** calculado.

**Fórmula de Comparação:**
```
has_discrepancy = (rating_estimado ≠ rating_real)
```

### 5.2 Detalhes da Discrepância

Se houver discrepância, o sistema gera:

```json
{
  "has_discrepancy": true,
  "discrepancy_details": {
    "rating_estimado": "A",
    "rating_real": "B",
    "message": "Discrepância detectada: Rating Estimado (A) diferente do Rating Real (B)"
  }
}
```

**Interpretação:**
- Uma discrepância pode indicar erro de classificação que pode resultar em desconto em transações
- O usuário deve revisar os dados informados ou a classificação manual

---

## Fase 6: Fórmulas Finais (Resumo)

### 6.1 Fórmulas de Agregação

```
AC = Σ (todos os campos de ativo circulante)
RLP = Σ (todos os campos de realizável a longo prazo)
PC = Σ (todos os campos de passivo circulante)
PNC = Σ (todos os campos de passivo não circulante)
PL = Σ (todos os campos de patrimônio líquido)
AT = AC + RLP + Investimentos + Imobilizado + Intangível + Outros ANC
PT = PC + PNC
```

### 6.2 Fórmulas de Indicadores

```
Liquidez Corrente = AC / PC
Liquidez Geral = (AC + RLP) / (PC + PNC)
Solvência = PL / AT
```

### 6.3 Fórmula de Classificação

```
Score = pontos(LC) + pontos(LG) + pontos(S)

Rating = {
  A: se Score ≥ 7
  B: se 5 ≤ Score < 7
  C: se 3 ≤ Score < 5
  D: se Score < 3
}
```

---

## Validações e Regras de Negócio

### Validações Obrigatórias:

1. **Passivo Circulante ≠ 0** (para calcular Liquidez Corrente)
2. **Passivo Total ≠ 0** (para calcular Liquidez Geral)
3. **Ativo Total ≠ 0** (para calcular Solvência)
4. **Competência no formato YYYY-MM** (ex: 2024-01)
5. **Cliente obrigatório apenas se `save_simulation = true`**

### Regras de Negócio:

1. **Campos monetários:** Aceitam valores não negativos com até 2 casas decimais
2. **Lucros/Prejuízos Acumulados:** Pode ser negativo
3. **Resultado Financeiro e Outros Resultados:** Podem ser negativos
4. **DRE é opcional:** Não afeta o cálculo do Rating
5. **Rating Real é opcional:** Usado apenas para comparação

---

## Exemplo Completo de Cálculo

### Dados de Entrada:

**Ativo Circulante:**
- Caixa e equivalentes: 50.000,00
- Aplicações financeiras: 30.000,00
- Contas a receber: 100.000,00
- Estoques: 80.000,00
- Tributos a recuperar: 10.000,00
- Despesas antecipadas: 5.000,00
- Outros: 5.000,00

**Ativo Não Circulante:**
- Realizável LP: 50.000,00
- Investimentos: 100.000,00
- Imobilizado: 200.000,00
- Intangível: 20.000,00
- Outros: 10.000,00

**Passivo Circulante:**
- Fornecedores: 60.000,00
- Empréstimos: 40.000,00
- Obrigações trabalhistas: 30.000,00
- Tributos a pagar: 20.000,00
- Contas a pagar: 10.000,00
- Provisões: 5.000,00
- Outros: 5.000,00

**Passivo Não Circulante:**
- Empréstimos LP: 80.000,00
- Obrigações trabalhistas LP: 20.000,00
- Tributos LP: 10.000,00
- Provisões LP: 5.000,00
- Outros: 5.000,00

**Patrimônio Líquido:**
- Capital social: 200.000,00
- Reservas de capital: 50.000,00
- Reservas de lucros: 30.000,00
- Lucros acumulados: 20.000,00
- Outros ajustes: 0,00

### Cálculos:

**1. Agregações:**
```
AC = 50.000 + 30.000 + 100.000 + 80.000 + 10.000 + 5.000 + 5.000 = 280.000,00
RLP = 50.000,00
PC = 60.000 + 40.000 + 30.000 + 20.000 + 10.000 + 5.000 + 5.000 = 170.000,00
PNC = 80.000 + 20.000 + 10.000 + 5.000 + 5.000 = 120.000,00
PL = 200.000 + 50.000 + 30.000 + 20.000 + 0 = 300.000,00
AT = 280.000 + 50.000 + 100.000 + 200.000 + 20.000 + 10.000 = 660.000,00
PT = 170.000 + 120.000 = 290.000,00
```

**2. Indicadores:**
```
LC = 280.000 / 170.000 = 1,6471
LG = (280.000 + 50.000) / (170.000 + 120.000) = 330.000 / 290.000 = 1,1379
S = 300.000 / 660.000 = 0,4545 (45,45%)
```

**3. Pontuação:**
- LC = 1,6471 → **2 pontos** (≥ 1.5 e < 2.0)
- LG = 1,1379 → **1 ponto** (≥ 1.0 e < 1.2)
- S = 0,4545 → **2 pontos** (≥ 0.3 e < 0.5)

**Total:** 2 + 1 + 2 = **5 pontos**

**4. Classificação:**
```
Score = 5 pontos → Rating B (Boa capacidade de pagamento)
```

---

## Modalidades de Transação (Editais 2025)

O sistema compara múltiplas modalidades de transação disponíveis nos Editais PGFN 2025:

### 1. CAPAG (Transação por Capacidade de Pagamento)
- **Edital:** PGDAU 11/2025 (Prazo prorrogado até 30/01/2026)
- **Entrada:** 6% (parcelável em até 12x)
- **Prazo:** Até 114 parcelas (133 para MEI/ME/EPP/Santas Casas)
- **Descontos:** 
  - **Rating A/B:** Apenas entrada facilitada e parcelamento (sem descontos no principal/juros)
  - **Rating C/D:** Descontos de até 65% do valor total da dívida (70% para ME/EPP/MEI/empresas em Recuperação Judicial)
- **Limite:** R$ 45 milhões consolidados
- **Importância Estratégica:** O edital mais importante de 2025, sucessor dos editais de 2024

### 2. Transação de Pequeno Valor
- **Edital:** PGDAU 11/2025
- **Elegibilidade:** Débitos até 60 salários mínimos
- **Foco:** Pessoas físicas e microempresas
- **Entrada:** 5% (parcelável em até 5x)
- **Prazo:** Até 55 meses
- **Descontos Progressivos:**
  - 50% para parcelamento até 7 meses
  - 45% para parcelamento até 12 meses
  - 40% para parcelamento até 30 meses
  - 30% para parcelamento até 55 meses

### 3. Transação Contencioso Tributário (Teses)
- **Editais:** 52/2025, 53/2025, 54/2025 (PGFN e Receita Federal)
- **Característica:** Desconto até 65% **independente de rating**
- **Prazo:** Até 60 meses
- **Condição:** Contribuinte desiste da ação judicial em troca de descontos
- **Teses específicas:** IPI (praça), Preço de Transferência (PRL), IRPJ/CSLL (desmutualização)

### 4. Débitos Irrecuperáveis
- **Edital:** PGDAU 11/2025
- **Elegibilidade:** 
  - Dívidas inscritas há mais de 15 anos
  - Devedores falidos
  - Empresas com atividades encerradas
- **Descontos:** Máximos permitidos por lei (até 70%)
- **Prazo:** Até 114 parcelas (133 para públicos especiais)

### 5. Programa Desenrola Rural
- **Edital:** 3/2025
- **Foco:** Setor do agronegócio, produtores rurais e cooperativas
- **Dívidas:** Inscritas na Dívida Ativa da União e do FGTS

### 6. Programa de Transação Integral (PTI)
- **Lançamento:** Setembro/2025
- **Modalidade:** PRJ (Potencial Razoável de Recuperação do Crédito Judicializado)
- **Característica:** Permite transacionar créditos ainda não inscritos em dívida ativa (em discussão judicial)

## Valor Estratégico da Ferramenta

### Análise de Discrepância de Rating
A ferramenta permite calcular o Rating **antes** do cliente entrar no sistema PGFN, identificando possíveis discrepâncias:

- **Cenário:** Sistema PGFN calcula Rating A, mas seu cálculo prova Rating C
- **Ação:** Solicitar revisão da Capag antes do prazo final (30/01/2026)
- **Benefício:** Aproveitar descontos de 65-70% disponíveis para Ratings C/D

### Simulação de Cenários
A tela de "Cenários" permite:
- Testar diferentes valores de dívida
- Comparar condições oferecidas para cada Rating (A, B, C, D)
- Identificar qual rating seria mais vantajoso
- Planejar estratégias de negociação antes do prazo final

O sistema identifica automaticamente qual modalidade é mais vantajosa para cada rating específico.

## Referências

- **Portaria PGFN nº 6.757/2022** - Critérios para classificação de capacidade de pagamento
- **Edital PGFN nº 11/2025** - Transação conforme capacidade de pagamento e pequeno valor
- **Editais PGFN 2025** - Transação no contencioso tributário
- **Normas Contábeis Brasileiras** - Estrutura do Balanço Patrimonial e DRE
- **Análise Financeira** - Indicadores de liquidez e solvência

---

**Última atualização:** Janeiro 2026
**Versão do Documento:** 2.0 (Atualizado com Editais 2025)

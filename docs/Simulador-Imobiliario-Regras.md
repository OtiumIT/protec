# Simulador Imobiliário – Regras, Inputs, Outputs e Embasamento Legal

Documento de referência das regras de negócio, inputs, outputs e fundamentação legal aplicados na tela **Simulador Imobiliário – PF vs PJ vs Reforma 2027**.

---

## 1. Objetivo da tela

Comparar a carga tributária sobre renda de locação de imóveis em três cenários:

- **Pessoa Física (PF)**: IR pela tabela progressiva mensal (Carnê-Leão), com deduções da Lei 7.713/88.
- **Pessoa Jurídica (PJ)**: Lucro Presumido (IRPJ, CSLL, PIS, COFINS), com regras da IN 2.306/2026 e presunção 16% quando aplicável.
- **Reforma 2027**: Cenário pós-vigência da Reforma Tributária (IBS/CBS), com redutor para locação e, na ótica PF, **IR (Carnê-Leão) + IBS/CBS**.

A tela permite simulação **standalone** (12 meses preenchidos manualmente, sem cadastro de imóveis) ou, via outro fluxo, simulação a partir de imóveis cadastrados.

---

## 2. Inputs

### 2.1 Modo standalone (tela do Simulador)

Endpoint: `POST /api/v1/properties/simulate-standalone`.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| **ano** | número (inteiro) | Sim | Ano da simulação. Intervalo: 2020–2030. |
| **meses** | array de 12 objetos | Sim | Um objeto por mês, na ordem Jan–Dez. Cada objeto segue o schema abaixo. |
| **opcoes_reforma** | objeto | Não | Parâmetros do cenário Reforma 2027 (ver 2.3). |

#### 2.1.1 Objeto por mês (`meses[]`)

Cada elemento deve ter `mes_referencia` no formato `YYYY-MM` (ex.: `2025-01`) e os campos abaixo. Valores monetários em reais; decimais com até 2 casas; padrão 0 quando omitido.

**Receitas (entram na base de cálculo e no faturamento):**

| Campo | Descrição | Base legal / uso |
|-------|------------|-------------------|
| **receita_aluguel_tradicional** | Aluguel de longo prazo (locação residencial mensal) | Receita bruta PF/PJ; base para presunção e IBS/CBS. |
| **receita_aluguel_curto** | Aluguel curto prazo (Airbnb, temporada, diárias) | Idem; usado ainda para elegibilidade à presunção 16% (serviços). |
| **receita_garagem** | Receita com vaga de garagem / estacionamento | Idem. |
| **receita_outras** | Outras receitas (lavanderia, depósito etc.) | Idem. |

**Despesas dedutíveis (PF – reduzem a base de cálculo do IR):**

| Campo | Descrição | Base legal |
|-------|------------|------------|
| **iptu** | IPTU do imóvel | Lei 7.713/88 – dedução da base do IR. |
| **condominio** | Condomínio | Lei 7.713/88. |
| **seguro_imovel** | Seguro do imóvel | Lei 7.713/88. |
| **juros_financiamento** | Juros de financiamento do imóvel | Lei 7.713/88. |
| **manutencao_conservacao** | Manutenção e conservação | Lei 7.713/88. |
| **outras_dedutiveis** | Outras despesas dedutíveis | Lei 7.713/88. |

**Custos operacionais (não deduzem IR PF; geram crédito IBS/CBS na Reforma 2027):**

| Campo | Descrição | Uso |
|-------|------------|-----|
| **reformas_melhorias** | Reformas e melhorias | Crédito IBS/CBS (Reforma 2027). |
| **mobilia_equipamentos** | Mobiliário e equipamentos | Idem. |
| **limpeza_higienizacao** | Limpeza e higienização | Idem. |
| **comissao_corretagem** | Comissão imobiliária / corretagem | Idem. |
| **taxa_plataforma** | Taxa de plataforma (Airbnb, Booking etc.) | Idem. |
| **outros_custos** | Outros custos operacionais | Idem. |

#### 2.1.2 Preenchimento rápido – Valores anuais (distribuição igualitária)

A interface oferece opções de **rateio anual** para reduzir o preenchimento manual mês a mês:

- **Receita anual**: radio "Mensal" vs "Anual". No modo Anual, o usuário informa aluguel tradicional e curto prazo anuais; ao clicar em "Aplicar rateio", o sistema divide por 12 e popula `receita_aluguel_tradicional` e `receita_aluguel_curto` de cada mês.
- **Despesas dedutíveis anuais**: checkbox "Despesas dedutíveis anuais (distribuição igualitária em todos os meses)". Quando marcado, o usuário informa o valor total anual; ao aplicar, divide por 12 e popula `outras_dedutiveis` de cada mês.
- **Custos operacionais / Créditos IBS/CBS anuais**: checkbox "Custos operacionais / Créditos IBS/CBS anuais (distribuição igualitária em todos os meses)". Quando marcado, o usuário informa o valor total anual; ao aplicar, divide por 12 e popula `outros_custos` de cada mês.

Em todos os casos, os valores mensais permanecem editáveis manualmente após o rateio. O rateio é puramente de interface; o payload enviado à API continua sendo o array de 12 objetos por mês.

A mesma funcionalidade está disponível na tela de **Detalhe do Imóvel** (modo reduzido), onde os totais mensais usam `receita_longa`, `receita_short`, `despesas_dedutiveis` e `custos_operacionais`.

### 2.2 Modo com imóveis cadastrados

Endpoint: `POST /api/v1/properties/simulate`.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| **ano** | número (inteiro) | Sim | Ano da simulação (2020–2030). |
| **property_ids** | array de UUID | Sim | Lista de IDs dos imóveis a agregar. |
| **aliquota_efetiva_dirpf** | número (0–100) | Não | Alíquota efetiva DIRPF (%) para substituir o cálculo progressivo na simulação PF. |
| **aplicar_presuncao_16_servicos** | booleano | Não (default: false) | Se true, aplica presunção 16% (serviços) quando elegível; caso contrário usa 32% (locação). |
| **opcoes_reforma** | objeto | Não | Mesmo de 2.3. |

### 2.3 Opções da Reforma 2027 (`opcoes_reforma`)

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| **aliquota_ibs_cbs_estimada** | número (0–100) | — | Alíquota nominal total (compatibilidade). Preferir `aliquota_ibs_plena` e `aliquota_cbs_estimada`. |
| **aliquota_ibs_plena** | número (0–100) | 19 | Alíquota plena IBS (%) para transição 2029+. Usado na tabela e no cálculo. |
| **aliquota_cbs_estimada** | número (0–100) | 9 | Alíquota CBS estimada (%). Em 2027/2028 e 2029+ somada ao IBS. Campos editáveis permitem simulações até definição legal. |
| **redutor_locacao_pct** | número (0–100) | 70 | Redutor para locação de longa duração (%). Ex.: 70 → paga 30% da alíquota nominal. |
| **redutor_short_stay_pct** | número (0–100) | 50 | Redutor para curta temporada / hospedagem (%). Usado quando o perfil é "hospedagem_temporada". |
| **contrato_antes_16012025** | booleano | false | Contrato firmado antes de 16/01/2025? Se true, aplica-se o regime de transição do Art. 487 LC 214/25: opção de 3,65% sobre faturamento bruto; o resultado é o menor entre esse valor e o regime normal (débito/crédito). |
| **perfil_locacao** | enum | — | `residencial_comum` (redutor 70%, locação longa duração) ou `hospedagem_temporada` (redutor 50%, curta temporada). Escolha explícita pelo usuário. |

---

## 3. Regras de negócio aplicadas

### 3.1 Agregação dos dados (standalone)

- **Receita total (mês)** = soma das quatro receitas do mês.
- **Despesas dedutíveis (mês)** = soma dos seis campos de despesas dedutíveis.
- **Custos operacionais (mês)** = soma dos seis campos de custos operacionais.
- Totais anuais = soma dos 12 meses.

### 3.2 Elegibilidade à presunção 16% (PJ – “serviços”)

Aplicada de forma automática (modo standalone e modo imóveis):

- **Receita anual conhecida &gt; R$ 120.000**: quando a receita total anual já é conhecida e superior a R$ 120.000, aplica-se **32% em todos os trimestres** desde o 1º (sem 16% e sem imposto postergado).
- **Receita anual ≤ R$ 120.000**: nos trimestres em que a **receita acumulada (jan–trim)** ≤ R$ 120.000, usa-se presunção de lucro **16%** para IRPJ (em vez de 32%). Acima de R$ 120.000 acumulados, passa a 32% e é calculado o **imposto postergado** dos trimestres que usaram 16%.
- **Base legal**: Lei 9.249/95 (Lucro Presumido); interpretação para prestadora de serviços em geral (receita limitada e predominância de curto prazo).

### 3.3 Cenário A – Pessoa Física (Carnê-Leão)

**Base de cálculo (mensal):**

- Base mensal = máx(0, receita do mês − despesas dedutíveis do mês).
- Base anual = soma das bases mensais (equivalente à soma do IR mensal calculado sobre cada mês).

**Imposto:**

- Tabela progressiva **mensal** (Carnê-Leão), faixas 2026 utilizadas no motor:

| Faixa (base mensal até) | Alíquota | Parcela a deduzir |
|-------------------------|----------|-------------------|
| R$ 2.428,80             | 0%       | R$ 0,00           |
| R$ 2.826,65             | 7,5%     | R$ 182,16         |
| R$ 3.751,05             | 15%      | R$ 394,16         |
| R$ 4.664,68             | 22,5%    | R$ 675,49         |
| Acima                   | 27,5%    | R$ 908,73         |

- Fórmula por mês: `IR = base_mes × aliquota − deducao` (arredondado 2 decimais).
- **Alíquota efetiva anual**: (imposto total / base total) × 100, ou valor informado em `aliquota_efetiva_dirpf` quando fornecido (modo com imóveis).

**Leis/normas consideradas:** Lei 7.713/88 (deduções), Lei 9.250/95 e legislação do IR (tabela progressiva, Carnê-Leão).

### 3.4 Cenário B – Pessoa Jurídica (Lucro Presumido)

**Presunções de lucro:**

- **Locação de imóveis**: 32% para IRPJ e 32% para CSLL.
- **Serviços (quando elegível)**: 16% para IRPJ até o limite de receita acumulada (R$ 120.000); CSLL mantém 32%.

**Alíquotas aplicadas:**

- IRPJ: 15% sobre a base presumida.
- IRPJ adicional: 10% sobre a parcela da base presumida que exceder R$ 60.000 por trimestre.
- CSLL: 9% sobre a base presumida.
- PIS: 0,65% sobre a receita do trimestre.
- COFINS: 3% sobre a receita do trimestre.

**IN RFB 2.306/2026:**

- Se **receita trimestral** &gt; R$ 1.250.000 **ou** **receita anual acumulada** &gt; R$ 5.000.000: acréscimo de **10%** na presunção (base × 1,1) para aquele trimestre (e seguintes, quando aplicável).
- Indicador `aplicou_in_2306` = true quando esse acréscimo for aplicado.

**Imposto postergado (presunção 16%):**

- No primeiro trimestre em que a receita acumulada ultrapassa R$ 120.000 e passa a usar 32%, calcula-se a diferença de imposto dos trimestres anteriores que usaram 16%: (base 32% − base 16%) × alíquotas. Esse valor é o `irpj_postergado`.

**Leis/normas:** Lei 9.249/95 (arts. 15 e 16), IN RFB 2.306/2026, Lei 10.637/02 e 10.833/03 (PIS/COFINS).

### 3.5 Cenário C – Reforma 2027 (IBS/CBS)

**Escalonamento da alíquota (2027/2028 vs 2029+):** 2027 e 2028 = IBS 0,1% (fixo) + CBS (editável, default 9%); 2029+ = IBS (transição com alíquota plena editável) + CBS (editável). **Redutor:** longa duração 70%; curta temporada 50% (aplicado conforme perfil escolhido).

**Ótica PJ (somente IBS/CBS sobre a atividade):**

- Alíquota efetiva conforme redutor(es). **IBS/CBS sobre receita** e **Créditos IBS/CBS** conforme taxa efetiva (ou parcelas long/short quando redutor diferenciado).
- **IBS/CBS líquido** = máx(0, IBS/CBS sobre receita − Créditos).
- **Regime de transição Art. 487:** se contrato antes 16/01/2025, imposto = min(3,65% sobre receita, IBS/CBS líquido).
- **Imposto total (PJ)** = IBS/CBS líquido (ou 3,65% se transição aplicada).

**Ótica PF (IR + IBS/CBS):**

- **Imposto total PF 2027** = **IR (Carnê-Leão, mesmo valor do cenário PF atual)** + **IBS/CBS líquido**.
- O IR considerado é o do cenário “Pessoa Física (Carnê-Leão)” da mesma simulação; em 2027 a PF continua pagando IR sobre a renda e ainda paga IBS/CBS sobre a atividade.
- **PF não contribuinte de IBS/CBS** (LC 214/2025: até 3 imóveis e receita ≤ R$ 288k; ou receita ≤ R$ 240k): o cenário Reforma PF equivale ao cenário PF atual (só IR). No **comparativo de cenários**, a coluna "Reforma LC 214/2025 PF" exibe **"—"** (não se aplica) para imposto total, alíquota efetiva e diferença.

**Leis/normas:** LC 214/2025 (Art. 261 – redutor 70%; Art. 487 – transição 3,65%); transição 2027-2029 (CBS 9%); redutor 50% hospedagem; EC 132/2023.

### 3.6 Break-even

- **Condição**: carga tributária efetiva PJ &lt; carga efetiva PF (em %).
- **Saída**: valor mensal aproximado (típico R$ 12.000) onde a PJ se torna mais vantajosa, com descrição textual. Conceitual para exibição.

---

## 4. Outputs (estrutura da resposta)

A resposta da API (`PropertyTaxSimulationResponse`) tem a forma geral abaixo. Todos os valores monetários em reais; percentuais em número (ex.: 18,9 para 18,9%).

### 4.1 Raiz

| Campo | Tipo | Descrição |
|-------|------|------------|
| **ano** | number | Ano simulado. |
| **cenarios** | object | Contém `pf`, `pj`, `reforma_2027_pf`, `reforma_2027_pj`, `reforma_2027`. |
| **break_even** | object \| undefined | Ver 4.2. |
| **fluxo_caixa** | array | Ver 4.3. |
| **memoria_calculo** | object \| undefined | Detalhes para memória de cálculo. |
| **embasamentos_legais** | array \| undefined | Lista de normas por cenário. |

### 4.2 break_even

| Campo | Descrição |
|-------|-----------|
| **valor_mensal_break_even** | Valor mensal aproximado (ex.: 12000) onde PJ vence PF. |
| **descricao** | Texto explicando o ponto de equilíbrio. |

### 4.3 fluxo_caixa[]

Por item (imóvel ou “Simulação” no standalone):

| Campo | Descrição |
|-------|-----------|
| **property_id** | UUID do imóvel ou dummy no standalone. |
| **identificador** | Nome/identificador do imóvel ou "Simulação". |
| **receita_total** | Receita bruta anual. |
| **despesas_total** | Despesas dedutíveis + custos operacionais. |
| **impostos_pf** | Imposto total cenário PF. |
| **impostos_pj** | Imposto total cenário PJ. |
| **lucro_liquido_pf** | Receita − despesas − impostos_pf. |
| **lucro_liquido_pj** | Receita − despesas − impostos_pj. |

### 4.4 cenarios.pf (Pessoa Física – Carnê-Leão)

| Campo | Descrição |
|-------|------------|
| **receita_bruta_total** | Soma das receitas do ano. |
| **despesas_dedutiveis_total** | Soma das despesas dedutíveis. |
| **base_calculo_total** | Base do IR (receita − despesas dedutíveis). |
| **imposto_total** | IR total anual (soma dos IR mensais). |
| **aliquota_efetiva_anual** | (imposto_total / base_calculo_total) × 100 ou valor informado. |
| **trimestres** | Array de 4 itens: trimestre (1–4), receita, despesas_dedutiveis, base_calculo, imposto. |

### 4.5 cenarios.pj (Pessoa Jurídica – Lucro Presumido)

| Campo | Descrição |
|-------|------------|
| **receita_bruta_total** | Receita anual. |
| **base_presumida_irpj** | Soma das bases presumidas IRPJ por trimestre. |
| **base_presumida_csll** | Soma das bases presumidas CSLL por trimestre. |
| **irpj** | IRPJ total. |
| **irpj_adicional** | Adicional 10% sobre base &gt; R$ 60k/trimestre. |
| **irpj_postergado** | Diferença de IRPJ dos trimestres que usaram 16% quando passa a 32%. |
| **csll** | CSLL total. |
| **pis** | PIS total. |
| **cofins** | COFINS total. |
| **imposto_total** | irpj + irpj_adicional + irpj_postergado + csll + pis + cofins. |
| **aliquota_efetiva** | (imposto_total / receita_bruta_total) × 100. |
| **aplicou_in_2306** | true se IN 2.306/2026 (acréscimo 10% na presunção) foi aplicado. |
| **trimestres** | Por trimestre: trimestre, receita, base_irpj, base_csll, presuncao_irpj_pct, irpj, irpj_adicional, irpj_postergado, csll, pis, cofins. |

### 4.6 cenarios.reforma_2027_pf (Reforma 2027 – ótica PF)

| Campo | Descrição |
|-------|------------|
| **receita_bruta_total** | Receita anual. |
| **custos_operacionais_total** | Custos operacionais. |
| **creditos_ibs_cbs** | Créditos sobre custos. |
| **ibs_cbs_sobre_receita** | IBS/CBS bruto sobre receita. |
| **ibs_cbs_liquido** | IBS/CBS sobre receita − créditos (≥ 0). |
| **imposto_total** | **IR (Carnê-Leão) + ibs_cbs_liquido**. |
| **aliquota_efetiva** | (imposto_total / receita_bruta_total) × 100. |
| **aliquota_nominal_ibs_cbs** | Alíquota nominal usada (9 em 2027/2028, 26,5 em 2029+). |
| **redutor_locacao_aplicado_pct** | Redutor aplicado (ex.: 70). |
| **ir_pf** | Valor do IR PF (Carnê-Leão) usado na soma. |
| **imposto_transicao_365** | (opcional) Valor do imposto a 3,65% (Art. 487) quando elegível. |
| **aplicou_transicao_art487** | (opcional) true se o regime 3,65% foi aplicado por ser menor. |
| **redutor_diferenciado_short** | (opcional) true quando foi aplicado redutor 50% na parte short stay. |

### 4.7 cenarios.reforma_2027_pj (Reforma 2027 – ótica PJ)

| Campo | Descrição |
|-------|------------|
| Mesmos de reforma (receita, custos, creditos_ibs_cbs, ibs_cbs_sobre_receita, ibs_cbs_liquido). |
| **imposto_total** | **ibs_cbs_liquido + irpj + irpj_adicional + irpj_postergado + csll** (tributação total da holding na Reforma). |
| **aliquota_efetiva** | (imposto_total / receita_bruta_total) × 100. |
| **irpj** | (opcional) IRPJ + adicional + postergado usados na soma (quando ótica PJ). |
| **csll** | (opcional) CSLL usado na soma (quando ótica PJ). |
| **aliquota_nominal_ibs_cbs**, **redutor_locacao_aplicado_pct** | Para exibição. |
| **imposto_transicao_365**, **aplicou_transicao_art487**, **redutor_diferenciado_short** | (opcionais) Idem 4.6. |

### 4.8 memoria_calculo (opcional)

Objeto com detalhes para memória de cálculo, por exemplo:

- **ano**, **modo** (standalone/imoveis), **aplicar_presuncao_16_servicos**, **aliquota_ibs_cbs_reforma**, **redutor_locacao_pct**
- **receita_total**, **despesas_dedutiveis_total**, **custos_operacionais_total**
- **cenario_32_fixo_imposto** (quando há presunção 16%: imposto se fosse 32% fixo)
- **detalhe_pf**: receita_bruta_total, despesas_dedutiveis_total, base_calculo_total, imposto_total, aliquota_efetiva_anual, trimestres
- **detalhe_pj**: receita_bruta_total, presuncao_irpj_pct, base_presumida_irpj, base_presumida_csll, irpj, csll, pis, cofins, imposto_total, aplicou_in_2306, trimestres
- **detalhe_reforma**: aliquota_nominal_ibs_cbs, redutor_locacao_pct, aliquota_efetiva, receita_bruta_total, custos_operacionais_total, creditos_ibs_cbs, ibs_cbs_sobre_receita, ibs_cbs_liquido, imposto_total, ir_pf (quando ótica PF); **imposto_transicao_365**, **aplicou_transicao_art487**, **redutor_diferenciado_short** (quando aplicável)

---

## 5. Embasamento legal (leis e normas consideradas)

Lista utilizada na tela e na API para o simulador.

### 5.1 Pessoa Física (PF)

| Norma | Artigo | Descrição |
|-------|--------|-----------|
| **Lei 7.713/88** | Art. 3º e seguintes | Deduções de despesas com imóveis de uso residencial (IPTU, condomínio, juros, manutenção etc.) da base de cálculo do IR. |
| **Lei 9.250/95 e legislação do IR** | — | Imposto de Renda sobre rendimentos de locação: tabela progressiva mensal (Carnê-Leão), aplicável à base líquida após deduções. |
| **EC 132/2023** | — | Reforma Tributária: previsão do IBS e da CBS no âmbito do consumo. |

### 5.2 Pessoa Jurídica (PJ)

| Norma | Artigo | Descrição |
|-------|--------|-----------|
| **Lei 9.249/95** | Art. 15 e 16 | Lucro Presumido: presunção de lucro para IRPJ e CSLL (32% para locação de imóveis; 16% para serviços em condições legais). |
| **IN RFB 2.306/2026** | — | Acréscimo de 10% na presunção quando receita trimestral &gt; R$ 1,25 mi ou anual &gt; R$ 5 mi. |
| **Lei 10.637/02 e 10.833/03** | — | PIS e COFINS sobre faturamento (cumulativos no Lucro Presumido). |

### 5.3 Reforma 2027 (IBS/CBS)

| Norma | Artigo | Descrição |
|-------|--------|-----------|
| **LC 214/2025** | Art. 261, parágrafo único | Redução de 70% nas alíquotas do IBS e da CBS nas operações de locação, cessão onerosa e arrendamento de bens imóveis. |
| **LC 214/2025** | Arts. 257 e 258 | Redutor de ajuste vinculado ao imóvel para reduzir a base de cálculo nas operações de alienação (venda). |
| **LC 214/2025** | Art. 487 | Opção de 3,65% sobre faturamento bruto para contratos de locação firmados até 16/01/2025 (regime de transição até fim do contrato ou 31/12/2028). |
| **Transição 2027-2029** | — | Vigência isolada da CBS (9%) em 2027 e 2028; o IBS passa a vigorar a partir de 2029, quando a alíquota nominal IBS+CBS atinge a faixa de 26,5% a 28%. |
| **Redutor diferenciado** | LC 214/2025 | Redução de 50% nas alíquotas do IBS/CBS para operações de hospedagem e locação de curtíssima temporada (short stay). |

---

## 6. Constantes e parâmetros do motor de cálculo

- **IRPF (faixas 2026)**: limites e deduções conforme tabela da seção 3.3.
- **Presunção locação**: IRPJ 32%, CSLL 32%.
- **Presunção serviços (16%)**: IRPJ 16%; limite receita acumulada R$ 120.000.
- **IRPJ**: 15%; adicional 10% sobre base &gt; R$ 60.000/trimestre.
- **CSLL**: 9%.
- **PIS**: 0,65% sobre receita; **COFINS**: 3% sobre receita.
- **IN 2.306/2026**: limite trimestral R$ 1.250.000; limite anual R$ 5.000.000; fator de acréscimo 1,1 (10%).
- **Reforma**: redutor locação longa duração 70%; redutor curta temporada 50%; 2027/2028 IBS 0,1% + CBS (editável); 2029+ IBS (transição) + CBS (editável); regime de transição Art. 487 = 3,65% sobre receita bruta.

---

## 7. Observações da tela (UI)

- **Opções da Reforma 2027**: a tela exibe um card com (1) checkbox **"Contrato firmado antes de 16/01/2025? (Regime de Transição Art. 487)"** e (2) seletor **Perfil de locação**: Locação de longa duração (Redutor 70%), Locação de curta temporada (Redutor 50%). Em 2027/2028 incide IBS e CBS; a partir de 2029, IBS + CBS.
- **Alíquotas editáveis**: campos para **Alíquota plena IBS (%)** e **Alíquota CBS estimada (%)** permitem simulações até a definição legal (previsão fim de 2026).
- No card **Reforma 2027 – Pessoa Física**, o total e a alíquota são calculados no front como **IR (cenário PF atual) + IBS/CBS líquido**, para garantir consistência.
- O breakdown exibido é: **IR (Carnê-Leão, mesmo de hoje): X + IBS/CBS: Y = total acima.**
- Quando o IR da PF é zero (base zero ou deduções altas), é exibida mensagem explicando que o total da PF coincide com o valor só de IBS/CBS.
- **Pessoa Jurídica (Lucro Presumido)**: exibição explícita do **Adicional IRPJ (10% sobre parcela que excedeu R$ 60 mil/trimestre – Lei 9.249/95)** e, quando houver **recolhimento da diferença postergada (16% → 32%)**, aviso explicando que a receita ultrapassou R$ 120 mil no ano e que a diferença de imposto dos trimestres que usaram 16% foi recolhida.
- Nos cards da Reforma, quando aplicado o regime de transição Art. 487 ou o redutor diferenciado para short stay, a tela exibe mensagens informativas.
- Recomendações e avisos (ex.: receita ≥ R$ 240 mil/ano e múltiplos imóveis, limites IN 2.306, regime de transição) são exibidos com base nos cenários e em `memoria_calculo`.

---

*Documento gerado com base no código do módulo `properties` (API), schemas em `@shared/core` e tela `SimuladorImoveis` do portal. Última atualização referente às regras vigentes no código.*




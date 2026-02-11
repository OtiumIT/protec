# Plano: Melhorias no Simulador IN 2.306/2026 (Tributário, Jurídico e UX)

Plano gerado a partir da discussão entre especialista tributário, jurídico e UX sobre a tela do Simulador Nova IN 2.306/2026.

---

## 1. Objetivos

- Reforçar **segurança jurídica e tributária** com disclaimers e citações normativas.
- Melhorar **clareza do impacto** (resumo no topo, percentual de aumento).
- Reduzir **carga cognitiva** e melhorar **fluxo** (modo rápido, estado vazio, acesso a simulações salvas).
- Tornar a **memória de cálculo** e os **gráficos** mais usáveis (responsivo, acessibilidade).

---

## 2. Bloco Jurídico e Tributário (disclaimers e precisão)

### 2.1 Avisos e disclaimers

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| J1 | **Disclaimer geral** | Texto fixo na tela (ex.: no topo da aba tributário ou em card de “Aviso”): “Este simulador tem finalidade apenas informativa e de planejamento. Não constitui parecer jurídico nem consultoria tributária. Para decisões que envolvam contestação judicial ou adesão a teses, consulte um advogado.” | [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) – aba tributário |
| J2 | **Disclaimer no cenário Equiparação** | No card ou na seção do cenário Equiparação: “O cenário ‘Equiparação hospitalar’ reflete a aplicação de **tese jurídica**. Sua aceitação pela Receita depende de interpretação e de eventual decisão judicial (ex.: liminares/mandados de segurança em casos análogos). Cenário ilustrativo para discussão com advogado e contador.” | Mesmo arquivo – card/seção Equiparação |
| T1 | **Aviso tributário** | Uma linha ou bloco curto: “Simulação com base na IN RFB 2.306/2026 e legislação vigente. Não substitui a apuração oficial nem consultoria tributária.” | Pode ficar junto ao disclaimer geral ou no rodapé do resultado |

### 2.2 Referência normativa

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| J3 | **Citação da norma** | Texto pequeno (ex.: “Saiba mais” expansível ou rodapé): “IN RFB nº 2.306, de 22/01/2026; Lei Complementar nº 224/2025; Decreto nº 12.808/2025.” | Mesma página – link “Referência normativa” ou rodapé do card de resultado |

**Nota:** Se no futuro houver exportação em PDF da memória de cálculo, os disclaimers (J1, J2, T1) e a citação (J3) devem constar no PDF (cabeçalho/rodapé).

---

## 3. Bloco Tributário (precisão e completude)

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| T2 | **Total com PIS/COFINS** | Incluir no comparativo a opção de ver “Total de tributos” (IRPJ + CSLL + PIS + COFINS) por cenário. Os dados já existem na resposta da API (`pis_a_rec_total`, `cofins_a_rec_total`). Pode ser: toggle “Incluir PIS/COFINS no total” ou sempre mostrar uma linha “Total tributos (IRPJ + CSLL + PIS + COFINS)” nos cards e no gráfico de barras. | [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) – cards, gráfico de barras, comparativo |
| T3 | **Percentual de aumento** | No comparativo, além de “Imposto a maior (2026 vs 2025)” em R$, mostrar “+X% em relação a 2025” (ou “-X%” se for o caso). Fórmula: `(total2026 - total2025) / total2025 * 100`. | Mesmo arquivo – card Comparativo |
| T4 | **Retenções (IRRF e órgãos públicos)** | Hoje o backend aceita `retencoes_trimestrais` mas o front não exibe esses campos. Opção A: adicionar na UI campos opcionais por trimestre (IRRF, retenções órgãos públicos) e enviar no payload. Opção B: manter como está e acrescentar na memória de cálculo ou em texto de ajuda: “Valores ‘a rec.’ consideram que retenções (IRRF, 4,65% órgãos públicos) já foram informadas; se não, preencha quando disponível.” Decisão: implementar Opção A (campos opcionais) ou só Opção B (texto). | Se A: formulário por trimestre + envio no `SimulateTributarioInput`. Se B: apenas texto em [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) |

---

## 4. Bloco UX (fluxo, resumo e usabilidade)

### 4.1 Resumo do impacto no topo do resultado

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| U1 | **Bloco “Resumo do impacto”** | Antes dos 3 cards de cenários, exibir um único bloco em destaque, por exemplo: “Com a IN 2.306/2026 você pagaria **R$ X a mais** em relação a 2025. No cenário de equiparação hospitalar, a economia em relação a 2026 seria de **R$ Y**.” Opcional: “Receita total informada: R$ Z.” Assim o usuário vê o principal sem precisar comparar os três cards. | [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) – logo após `tributarioResult &&`, antes do grid dos 3 cards |

### 4.2 Modo rápido (receita anual)

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| U2 | **Modo “Receita anual única”** | Opção no formulário: “Preencher por trimestre” (atual) ou “Receita anual única”. No modo anual, o usuário informa um valor total anual por tipo (Comércio, Serviços, etc.); o sistema distribui igualmente entre os 4 trimestres (ou proporcional, conforme regra definida) e chama a mesma API. Exibir aviso: “Distribuição uniforme entre trimestres. Para perfil com receita concentrada em alguns trimestres, use o preenchimento por trimestre.” | [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) – formulário; lógica de distribuição no front ou no backend (preferível no front para não alterar contrato da API) |

### 4.3 Estado vazio e confirmação de contexto

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| U3 | **Estado vazio** | Quando ainda não há resultado, exibir uma linha ou card curto: “Preencha as receitas por trimestre (Comércio e Serviços) e clique em **Comparar cenários** para ver o impacto da IN 2.306/2026.” | Mesma página – acima ou dentro do card do formulário |
| U4 | **Confirmação de contexto após simular** | Além do toast, exibir no topo da área de resultado uma linha: “Simulação calculada para ano **{ano}**. Receita total informada: **{formatMoney(receitaTotal)}**.” | Mesma página – no bloco de resultado, logo abaixo ou dentro do “Resumo do impacto” (U1) |

### 4.4 Memória de cálculo e tabelas

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| U5 | **Memória de cálculo em abas ou responsiva** | Em telas pequenas, três tabelas empilhadas geram muito scroll. Opções: (A) Abas “2025 | 2026 | Equiparação” e uma tabela por aba; (B) Uma única tabela comparativa com colunas colapsáveis em mobile. Priorizar (A) por simplicidade. | [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) – seção Memória de Cálculo |

### 4.5 Acesso rápido às simulações salvas

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| U6 | **Link “Ver simulações salvas”** | A lista de simulações salvas hoje fica no final da página. Adicionar no topo (ou ao lado da aba “Comparativo tributário”) um link “Ver simulações salvas” que leva à lista (âncora na mesma página ou scroll até a seção). Alternativa: drawer/modal com a lista. | Mesma página – próximo ao título ou às abas |

### 4.6 Gráficos e acessibilidade

| # | Item | Descrição | Onde |
|---|------|-----------|------|
| U7 | **Pizza: labels pequenos** | Quando uma fatia for muito pequena (&lt; 5% ou similar), o label na pizza pode sobrepor ou ficar ilegível. Usar fallback: esconder label no segmento e garantir que a legenda ao lado mostre nome e valor/percentual para todas as fatias. | [SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx) – gráfico de composição (PieChart) |
| U8 | **Acessibilidade** | Garantir: (1) contraste adequado nos textos “imposto a maior” (vermelho) e “economia” (verde); (2) descrição breve para gráficos (aria-label ou título) para leitores de tela. | Mesmo arquivo – cards Comparativo e componentes Recharts |

---

## 5. Ordem sugerida de implementação

| Fase | Itens | Motivo |
|------|--------|--------|
| **1 – Jurídico/Tributário (urgente)** | J1, J2, T1, J3 | Reduzem risco e deixam claro o caráter informativo e de tese. |
| **2 – UX de alto impacto** | U1 (resumo do impacto), T3 (percentual), U3 (estado vazio), U4 (confirmação) | Melhoram a primeira impressão e a leitura do resultado. |
| **3 – Completude tributária** | T2 (PIS/COFINS no total), T4 (retenções: texto ou campos) | Deixam o comparativo completo e a memória alinhada à prática. |
| **4 – UX avançada** | U2 (modo receita anual), U5 (memória em abas), U6 (acesso simulações salvas), U7, U8 | Refinam fluxo e acessibilidade. |

---

## 6. Arquivos principais

- **Frontend:** [apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx](apps/portal/src/modules/simulador-in-2306/pages/SimuladorIN2306.tsx)
- **Serviço (tipos/API):** [apps/portal/src/modules/simulador-in-2306/services/simulador-in-2306.service.ts](apps/portal/src/modules/simulador-in-2306/services/simulador-in-2306.service.ts)
- **Backend (se T4 Opção A ou alterações em resposta):** [apps/api/src/modules/simulador-in-2306/](apps/api/src/modules/simulador-in-2306/)

---

## 7. Escopo fora deste plano

- Exportação da memória de cálculo em PDF (incluir disclaimers e referência normativa quando existir).
- Alterações no motor de cálculo (fórmulas da IN), salvo correções de bugs.
- Nova funcionalidade de “comparativo por atividade” (Comércio vs Serviços) no backend; o plano considera apenas o que já existe na API e na tela.

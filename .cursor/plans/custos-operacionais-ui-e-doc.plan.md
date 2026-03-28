---
name: Custos operacionais — UI e orientação
overview: Documentar o uso tributário dos custos operacionais e melhorar o simulador imobiliário com quadro recolhível, ícone de informação e estado inicial conforme dados já lançados no imóvel.
todos:
  - id: locate-section
    content: Localizar no SimuladorImoveis o bloco de Custos operacionais (e modo anual) e o fluxo de dados vindos de imóveis/property monthly
  - id: collapsible-details
    content: Envolver o quadro em `<details>`/accordion ou padrão já usado no portal; título clicável com label clara
  - id: info-icon-copy
    content: Adicionar ícone info (tooltip ou popover) explicando por que preencher (créditos IBS/CBS na Reforma; não afeta PF/PJ atual no modelo; despesas dedutíveis vs custos)
  - id: default-expanded
    content: "Estado inicial: expandido se houver custos operacionais já informados no(s) imóvel(is) da simulação; recolhido caso contrário, com opção de expandir"
isProject: true
---

# Plano: Custos operacionais — contexto tributário + UX

## Contexto (resumo analítico)

- **Despesas dedutíveis**: entram na base do **IRPF (Carnê-Leão)** na simulação.
- **Custos operacionais** (agregados): alimentam **créditos IBS/CBS** no cenário **Reforma LC 214/2025**; **não** alteram PF nem PJ (Lucro Presumido) no motor atual.
- Preencher custos operacionais é **relevante** para o cenário Reforma e para análises; para comparar só PF vs PJ “atual”, o impacto está nas despesas dedutíveis, não nos custos operacionais.

Referências de código: [`packages/shared/src/schemas/property.schema.ts`](packages/shared/src/schemas/property.schema.ts) (campos), [`apps/api/src/modules/properties/calculations.ts`](apps/api/src/modules/properties/calculations.ts) (`calcularPF`, `calcularPJ`, `calcularReforma2027`).

---

## Novos requisitos de interface (a implementar)

### 1. Ícone de informação (info)

- Incluir um **ícone “i” ou de ajuda** ao lado do título da secção **Custos operacionais** (ou equivalente).
- Ao interagir (hover + foco para acessibilidade, ou clique conforme padrão do projeto), mostrar texto curto explicando **por que preencher**, por exemplo:
  - Na **Reforma (IBS/CBS)**, esses valores permitem estimar **créditos** sobre custos elegíveis (carga líquida mais realista).
  - No **IRPF e no Lucro Presumido** deste simulador, **não** reduzem base/dedução — para isso usam-se as **despesas dedutíveis** (PF).
  - Evitar duplicar a mesma despesa nas duas rubricas sem critério.
- Reutilizar componente existente de tooltip/popover do portal, se houver (`title`, Radix, etc.).

### 2. Quadro recolhível (collapsible)

- Toda a área de **Custos operacionais** deve ficar num **bloco recolhível** (ex.: `<details>`/`<summary>` nativo, ou `Card` + botão expandir, ou componente `Accordion` já usado no projeto).
- O utilizador deve conseguir **expandir/recolher** sem perder dados já introduzidos.

### 3. Estado inicial (expandido vs recolhido)

- **Expandido por defeito** quando existir **algum valor já preenchido** nos custos operacionais vindos do **contexto do imóvel** (ex.: dados mensais agregados / rascunho carregado do imóvel que já tenha custos operacionais lançados). Critério técnico a fechar na implementação: detetar soma ou qualquer campo `> 0` nos campos de custo operacional após hidratar o formulário a partir dos imóveis selecionados.
- **Recolhido por defeito** quando **não** houver esses dados (simulação “em branco” ou só receita/despesas dedutíveis), mantendo **sempre** a possibilidade de expandir manualmente.

### 4. Ficheiros prováveis

- [`apps/portal/src/modules/properties/pages/SimuladorImoveis.tsx`](apps/portal/src/modules/properties/pages/SimuladorImoveis.tsx) — secção de custos, estado `open` do `<details>` ou `defaultOpen` do accordion derivado dos dados.
- Possível helper: ver como o grid inline / property draft injeta `custos_operacionais` por mês ([`PropertiesInlineGrid.tsx`](apps/portal/src/modules/properties/components/PropertiesInlineGrid.tsx) ou serviços relacionados)) para a regra “já preenchido no imóvel”.

---

## Fora de escopo deste plano

- Alterar fórmulas tributárias na API (só UX e copy).
- Atualizar `rules-imoveis.ts` — opcional numa fase posterior se quiserem a mesma explicação na documentação interna.

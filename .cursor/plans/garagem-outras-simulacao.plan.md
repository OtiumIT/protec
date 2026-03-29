# Garagem / Outras e cadastro de imóveis — plano revisado

## O que é importante de fato para a simulação (motor)

No backend, em [`property.service.ts`](apps/api/src/modules/properties/property.service.ts) (`simulateStandalone`), a **receita mensal** usada para PF/PJ é:

- `receita_aluguel_tradicional` + `receita_aluguel_curto` + **`receita_garagem`** + **`receita_outras`**

Ou seja: **qualquer valor nesses quatro campos aumenta a mesma base de receita** do mês para o fluxo agregado.

Já a **Reforma (LC 214)** usa `receita_longa_total` e `receita_short_total` calculados **somente** a partir de:

- `receita_aluguel_tradicional` → conta como “longa”
- `receita_aluguel_curto` → conta como “curta”

**`receita_garagem` e `receita_outras` não entram nesse split longo/curto** — entram na receita total geral do cenário, mas **não** na proporção longa vs curta usada em trechos da lógica da reforma (redutor, etc.). Isso é comportamento atual do código, não do cadastro.

### “Outras” ≠ aluguel não residencial de longo prazo

No produto **hoje**, o rótulo **“Outras (lavanderia, depósito, etc.)”** (`receita_outras`) foi pensado para **rendas acessórias** ligadas ao imóvel, **não** para substituir o conceito de **locação não residencial / comercial**.

O **aluguel não residencial de longo prazo** entra, na regra atual, como **aluguel tradicional** (mensal) quando o imóvel está com **natureza da locação = não residencial** no cadastro: o fluxo usa `valor_aluguel_mensal` e `tipo_locacao` (fixa → `receita_aluguel_tradicional`, flexível → `receita_aluguel_curto`). Em carteira **mista** residencial + não residencial, ainda há os campos anuais **`receita_locacao_residencial_anual`** e **`receita_locacao_nao_residencial_anual`** para segregação na LC — isso é **eixo residencial vs não residencial**, não o campo “Outras” da grade mensal.

Resumo para comunicação:

| Conceito | Onde aparece no simulador |
|----------|---------------------------|
| Aluguel longo **não residencial** (sala, loja, etc.) | Coluna **Aluguel tradicional** nos meses + imóvel com natureza **não residencial**; totais anuais segregados quando há misto. |
| **Outras** receitas (lavanderia, depósito, taxas acessórias…) | Campo **`receita_outras`** por mês (separado do aluguel “principal”). |

Se a equipe quiser que **uma única linha** na UI signifique “comercial longo prazo”, isso é decisão de **rótulo/UX** (renomear ou fundir campos), não o significado atual de `receita_outras` no código.

**Conclusão para priorização:**

| Objetivo | O que precisa estar certo |
|----------|---------------------------|
| Não subestimar receita (IRPF, PJ, totais) | Toda renda locável deve aparecer em **algum** campo de receita do mês (pode ser só “tradicional” + “curto”). |
| Transparência / conferência com contrato | Separar garagem e “outras” na UI ajuda o usuário, mas **não é obrigatório** para o número bater se o total já estiver em aluguel. |
| Alinhamento fino LC 214 (longo vs curto) | Depende de **tradicional vs curto**; garagem/outras hoje **não** alimentam esse eixo — se no futuro a regra fiscal exigir tratar garagem como “longa”, aí sim faria sentido mapear categoria ou campo específico. |

---

## O que está “a mais” e poderia ser simplificado

1. **Quatro linhas de receita na grade mensal**  
   Se a decisão de produto for **simplicidade**, pode-se orientar o usuário a colocar **tudo em aluguel tradicional e/ou curto** (conforme o tipo de locação), e tratar garagem/outras como **opcionais** ou esconder atrás de “Avançado”. O resultado de **receita total** permanece correto **desde que o valor entre na soma**.

2. **Plano anterior (categorias de transação + colunas no cadastro)**  
   **Mínimo viável** para “carregar só pelo cadastro”: garantir que **valor de aluguel** (e, se existir renda extra, o total) esteja refletido — hoje o cadastro já leva `valor_aluguel_mensal` para tradicional/curto; o que **falta** para garagem/outras é **só relevante** se quisermos esses valores separados **sem** digitar na grade.

3. **Modo reduzido (`property_monthly_totals`)**  
   Só longa + curta: para “simulação completa só com imóvel”, ou aceita-se que garagem/outras entram no **mesmo** total de longa/curta, ou amplia-se o modelo (fase 2).

---

## O que está acontecendo (texto para explicar a equipe / cliente)

- O simulador trabalha com **várias rubricas de receita por mês** (tradicional, curto, garagem, outras).
- O **cadastro de imóveis na grade** (e o fluxo que **agrega** imóveis para a simulação) hoje **preenche sobretudo aluguel tradicional/curto** a partir do valor mensal e dos lançamentos; **garagem e outras ficam zeradas** nesse fluxo automático porque **não há campos no cadastro** nem **mapeamento das categorias de lançamento** para essas rubricas.
- Por isso **não existe “opção escondida”** no cadastro: **ainda não foi ligado** cadastro/lançamentos → `receita_garagem` / `receita_outras`.
- Se o usuário informar **só** o aluguel “cheio” (incluindo garagem) no campo de aluguel, a **receita total** do cenário pode estar correta; o que falta é **destaque contábil** nas colunas garagem/outras, não necessariamente o total.

---

## Como pretendemos resolver (opções claras)

**Opção A — Comunicação + mínimo técnico (rápido)**  
- Documentar na UI: “Renda de garagem e demais pode ser lançada em aluguel tradicional/curto ou preenchida manualmente nas colunas garagem/outras.”  
- Nenhuma mudança grande no banco; opcional: tooltip na grade mensal.

**Opção B — Cadastro completo sem depender da grade manual**  
- Adicionar no cadastro (ou nas categorias de **modo detalhado**) valores ou categorias que alimentem garagem/outras **ou** que **somem no aluguel** de forma explícita na documentação.  
- Implementação conforme plano técnico anterior (agregação por categoria e/ou colunas padrão no imóvel).

**Opção C — Simplificar a UI**  
- Reduzir a superfície: fundir mentalmente “garagem/outras” em “demais receitas” num único campo opcional, ou ocultar colunas até o usuário expandir “Detalhar receitas”.

Recomendação: **começar por A + decisão de produto (B ou C)** conforme prioridade de transparência vs simplicidade.

---

## Tarefas técnicas (ajustadas ao escopo)

Se executarmos **Opção B** (cadastro/lançamentos → rubricas):

1. Documentar no [`README.md`](apps/api/src/modules/properties/README.md) do módulo o comportamento **receita total vs split LC** (tradicional/curto).
2. Agregar receitas por **categoria** no repositório OU adicionar campos padrão em `properties` + `tenant-migrations`.
3. Portal: categorias e/ou colunas na grade de imóveis.
4. Revisar se, para a Reforma, garagem deve **proporcionalmente** entrar em “longa” (regra de negócio — hoje não entra no split).

Se executarmos **só Opção A**:

1. Textos de ajuda no Portal + eventual ajuste de README.

---

## To-dos (referência)

- [ ] Decisão de produto: manter 4 rubricas na UI, fundir, ou só documentar (A / B / C).
- [ ] Se B: implementar pipeline cadastro → `receita_garagem` / `receita_outras` (ou renunciar e mapear tudo para tradicional).
- [ ] Documentar para stakeholders o parágrafo “O que está acontecendo” acima.

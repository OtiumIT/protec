---
name: IATax v1 e v2 — alunos Pablo Arruda
overview: Lançar o IATax para advogados e contadores alunos do Pablo. A v1 liga o que já existe (imóveis, LC 224, IRPF, mapeamento, comparativo de regimes), constrói ITBI, ITCMD e o relatório único, e esconde CAPAG/PGFN. A v2 aprofunda reforma, sucessão e transações imobiliárias no mesmo público.
todos:
  - id: pack-constante
    content: Extrair PABLO_MODULE_KEYS e ligar GESTAO_IMOVEIS, SIMULADOR_IN_2306, IRPF_ALTA_RENDA, MAPEAMENTO_DESPESAS_PJ, COMPARATIVO_REGIMES no auth e na access-list
    status: completed
  - id: pack-backfill
    content: Migration/SQL de backfill para tenants source PabloArruda/EPS — ativar os 5 módulos sem desligar o que o tenant já comprou
    status: completed
  - id: unhide-comparativo
    content: Reexibir COMPARATIVO_REGIMES (hidden=false) e incluir no menu do aluno
    status: completed
  - id: hide-erp-tabs
    content: Esconder aba Notas Fiscais da gestão imobiliária; manter financeiro/operação/alertas/integrações ocultos
    status: completed
  - id: motor-itbi
    content: Motor ITBI com fato gerador (integralizacao | permuta | onerosa); tela v1 só integralização; Tema 796; alíquota informada; PDF
    status: completed
  - id: motor-itcmd
    content: "Motor ITCMD: 8 estados + usufruto sim/não + idade; demais UFs com alíquota manual; PDF"
    status: completed
  - id: relatorio-projeto
    content: Relatório único white-label juntando simulações salvas (locação, GC, ITBI, ITCMD, IRPF, LC 224, regime) + parágrafo editável
    status: completed
  - id: menu-landing
    content: Sidebar com ITBI/ITCMD/Relatório; landing Pablo com as ferramentas; /EPS → /PabloArruda; O Produto sem CAPAG
    status: completed
  - id: docs-regras
    content: Documentar regras de ITBI e ITCMD em documentacao/data e README dos motores
    status: completed
isProject: true
---

# Plano completo — IATax v1 e v2 (alunos Pablo Arruda)

## 1. Quem compra

Todo aluno do Pablo é **advogado ou contador**. Ele faz dois trabalhos no mesmo escritório:

1. **Patrimônio e sucessão** — holding, doação, ITBI, ITCMD, aluguel PF×PJ, dividendos do sócio (EPS, Societário Total, S.A. de A a Z).
2. **Empresa do cliente** — lucro presumido com a LC 224/2025, regime LP×LR×Simples, o que sobe da PF para a PJ, reforma.

A v1 serve os dois. Não é um produto “só imobiliário” nem “só PGFN”.

Canal de lançamento: [`/PabloArruda`](apps/portal/src/landing/pages/PabloArrudaLanding.tsx). Um canal só (`/EPS` redireciona).

## 2. Tese

O IATax entrega **número para a reunião** (imposto, custo, comparativo, PDF com a marca do aluno). O aluno estrutura o instrumento (contrato, acordo, testamento). Não construir ERP, boleto, minuta nem CRM de unidades.

## 3. O que já está feito (não refazer)

| Item | Estado | Onde |
|------|--------|------|
| Flag `modules.hidden` + aba Visibilidade no menu | Feito (085) | `public.modules`, Gerenciar Módulos |
| Menu só mostra módulo ativo e visível | Feito | [`Sidebar.tsx`](apps/portal/src/shared/components/layout/Sidebar.tsx) |
| LC 224 / IN 2.306 reexibida | Feito (086) | `SIMULADOR_IN_2306` |
| Locação PF×PJ, ganho de capital, imóveis, import IRPF | Pronto | `GESTAO_IMOVEIS` |
| IRPF alta renda + distribuição de lucros | Pronto, **fora do pack Pablo** | `IRPF_ALTA_RENDA` |
| Mapeamento PF→PJ | Pronto, **fora do pack Pablo** | `MAPEAMENTO_DESPESAS_PJ` |
| Comparativo LP×LR×Simples | Pronto, **escondido** | `COMPARATIVO_REGIMES` |
| Precificador e split | Pronto, escondido | v2.1 — só reexibir |
| CAPAG, editais, SPED no menu | Escondidos | Permanecem fora da v1 |
| Cadastro Pablo liga só 2 módulos | Desatualizado | [`auth.service.ts`](apps/api/src/modules/auth/auth.service.ts) L114–121 |

## 4. v1 — o que entra

### 4.1 Pack Pablo (ligar o que já existe)

Constante única `PABLO_MODULE_KEYS` usada em auth, access-list e README:

```
GESTAO_IMOVEIS
SIMULADOR_IN_2306
IRPF_ALTA_RENDA
MAPEAMENTO_DESPESAS_PJ
COMPARATIVO_REGIMES
```

Arquivos:

- [`apps/api/src/modules/auth/auth.service.ts`](apps/api/src/modules/auth/auth.service.ts)
- [`apps/api/src/modules/access-list/access-list.service.ts`](apps/api/src/modules/access-list/access-list.service.ts) (hoje só `GESTAO_IMOVEIS`)
- [`apps/api/src/modules/auth/README.md`](apps/api/src/modules/auth/README.md)
- Migration pública `087_pablo_pack_v1.sql`:
  - `hidden = false` em `COMPARATIVO_REGIMES`
  - `INSERT` em `tenant_modules` dos 5 módulos para `companies.source IN ('PabloArruda','EPS')`
  - **Não** desligar módulo extra que o tenant já tenha

Reexibir `COMPARATIVO_REGIMES` no menu (já entra no `moduleOrder` da Sidebar quando ativo).

### 4.2 Menu do aluno (v1)

Ordem em Gestão Imobiliária:

1. Imóveis  
2. Locação PF vs PJ vs Reforma  
3. Venda — ganho de capital  
4. ITBI na integralização *(novo)*  
5. ITCMD na doação *(novo)*  
6. Relatório do projeto *(novo)*  
7. Portfólio  
8. Contratos  

Categorias irmãs (se ativas): LC 224, IRPF, Mapeamento PF→PJ, Comparativo de regimes.

Esconder de vez a aba **Notas Fiscais** em [`GestaoImobiliaria.tsx`](apps/portal/src/modules/gestao-imobiliaria/pages/GestaoImobiliaria.tsx) (`HIDDEN_SECTIONS`). Financeiro, operação, alertas e integrações já estão ocultos. Não apagar API.

### 4.3 ITBI na integralização *(construir)*

Padrão já usado em locação/GC: motor em `packages/shared`, Zod, persistência em `property_simulations`, tela em `modules/properties/pages`, PDF em `lib/report-pdf`, `requireModule('GESTAO_IMOVEIS')`.

Estender `SimulationKindSchema` com `itbi_integralizacao`.

**Motor com fato gerador** `integralizacao | permuta | onerosa` desde a v1. A tela da v1 expõe só integralização. Permuta (v2.2) reusa o motor sem refazer.

**Entra**

- Cliente + imóvel (ou valor avulso)
- UF, município (texto)
- Valor venal, valor de mercado, valor de integralização, % do imóvel
- Atividade da PJ: holding patrimonial × operacional (Tema 796)
- Alíquota informada pelo aluno (default 2%)
- Checkbox terreno de marinha → alerta de laudêmio, sem calcular
- Saída: incidência / imunidade total / imunidade parcial, base, ITBI, memória
- Salvar + PDF

**Não entra**

- Consulta de alíquota na prefeitura
- ITBI de compra e venda na UI
- Cálculo de laudêmio
- Jurisprudência por município

Arquivos novos (sugeridos):

- `packages/shared/src/utils/itbi-calculations.ts`
- `packages/shared/src/schemas/itbi.schema.ts`
- `apps/portal/src/modules/properties/pages/SimuladorItbi.tsx`
- `apps/portal/src/modules/documentacao/data/rules-itbi.ts`

### 4.4 ITCMD na doação *(construir)*

Kind `itcmd_doacao`. Mesmo padrão de persistência e PDF.

**Entra**

- UF, tipo (imóvel ou quotas), valor
- Parentesco (ascendente / descendente / outros)
- Reserva de usufruto: sim/não + idade do usufrutuário
- Tabelas embutidas: SP, RJ, MG, RS, PR, SC, GO, DF
- Demais UFs: aluno informa a alíquota
- Saída: base, alíquota, ITCMD, efeito do usufruto
- Aviso: simulação, não substitui a guia estadual
- Salvar + PDF

**Não entra**

- 27 estados com tabela completa (v2.1)
- Causa mortis / inventário (v2.1)
- Otimizador de domicílio (v2.1)
- Cláusulas de inalienabilidade

Arquivos novos (sugeridos):

- `packages/shared/src/utils/itcmd-calculations.ts`
- `packages/shared/src/schemas/itcmd.schema.ts`
- tabelas por UF versionadas no shared
- `apps/portal/src/modules/properties/pages/SimuladorItcmd.tsx`
- `apps/portal/src/modules/documentacao/data/rules-itcmd.ts`

### 4.5 Relatório único do projeto *(construir)*

Kind `projeto_pps` (ou tela que só agrega, sem motor novo).

**Entra**

- Escolhe o cliente
- Marca simulações já salvas: locação, GC, ITBI, ITCMD, IRPF, LC 224, comparativo de regimes
- Parágrafo de recomendação editável
- Um PDF white-label (logo do tenant)
- Capa + memória resumida + aviso legal

**Não entra**

- Rodar todos os cálculos se não houver simulação salva
- Proposta comercial com honorários
- Word/Docx

Arquivo: `apps/portal/src/modules/properties/pages/RelatorioProjeto.tsx`

### 4.6 Landing e vitrine

- [`PabloArrudaLanding.tsx`](apps/portal/src/landing/pages/PabloArrudaLanding.tsx): trocar os 3 bullets genéricos pelas ferramentas da v1 (locação, LC 224, regime, ITBI, ITCMD, PDF).
- [`App.tsx`](apps/portal/src/App.tsx): `/EPS` → `/PabloArruda`.
- [`OProduto.tsx`](apps/portal/src/landing/pages/OProduto.tsx) e Quem Somos: tirar CAPAG, processos e arquivos fiscais da vitrine deste lançamento. Deixar imóveis, LC 224, IRPF, regime, ITBI, ITCMD.

### 4.7 v1 — continua escondido

- `RATING_VALIDATOR` (CAPAG / transação PGFN)
- `FISCAL_FILES` (menu; infra fica no código)
- `PRECIFICADOR`, `SPLIT_PAYMENT` (v2.1)
- `REPORTS`, `ANALYTICS`, `BILLING`
- Editais e processos judiciais (super admin interno)

### 4.8 Aceite da v1

Aluno novo em `/PabloArruda`:

1. Vê no menu só imóveis, LC 224, IRPF, mapeamento, comparativo de regimes (e ITBI/ITCMD/relatório quando prontos).
2. Não vê CAPAG, SPED, precificador, split, NF, boleto.
3. Em uma sessão: importa IRPF → cadastra imóveis → simula locação → estima ITBI e ITCMD → compara LC 224 e regime da PJ → baixa um PDF com a logo dele.

## 5. v2 — mesmo aluno, próxima camada

Não misturar com o sprint da v1. A v1 precisa do fato gerador no motor de ITBI para a v2.2 não refazer.

### v2.1 — aprofunda o que a v1 começou

| Item | O que fazer | Depende de |
|------|-------------|------------|
| Precificador + split | Reexibir (`hidden = false`). Sem módulo novo. | v1 no ar |
| Arquivos fiscais / SPED | Menu só quando o upload preencher IN 2306 e comparativo sem dor | Prefill já existe em parte |
| Usufruto completo | Estender o motor do ITCMD (constituição, extinção, IR dos frutos) | ITCMD v1 |
| GC na integralização | Novo kind; reusa ganho de capital; fica ao lado do ITBI | ITBI v1 |
| Imóvel financiado / na planta | Campos em `properties` + regra no ITBI | ITBI v1 |
| Holding rural | Tipo rural + ITR / parceria × arrendamento. Sem folha/CAEPF | Imóveis |
| Inventário × holding × doação | Compõe ITCMD + cartório informado. PDF de fechamento | ITCMD v1 |
| ITCMD demais UFs + domicílio | Dados no motor; comparar dois estados | ITCMD v1 |

### v2.2 — transação imobiliária

| Item | Escopo | Reusa |
|------|--------|-------|
| Permuta | Imóvel×imóvel; imóvel×torna; terreno×unidades. ITBI nas duas pontas | Motor ITBI (fato gerador `permuta`) + GC |
| Cessão de direitos | Compromisso (ágio=GC); direitos hereditários (ITCMD vs IR); quotas PF×PF / PF×PJ | GC + ITCMD |

### v2.3 — desenvolvimento (nicho)

Módulo comercial novo `INCORPORACAO`. **Não** entra no pack Pablo.

- RET 4% × RET 1% × LP × LR, SPE, afetação, POC simples
- Parcelamento de solo como aba (loteamento × desmembramento)
- Fora: ERP de obra, CRM de unidades, memorial, minuta

## 6. Fora das duas versões

- Wizard LTDA vs S.A., gerador de acordo de sócios, contrato social
- Testamento, gerador de inventário
- ERP imobiliário (NF, boleto, PIX, WhatsApp, operação)
- Scanner de editais PGFN, processos judiciais no menu do aluno
- Consulta automática de alíquota municipal / SEFAZ / cartório

## 7. Ordem de execução da v1

```
1. Pack + backfill + reexibir comparativo     (curto, muda o login)
2. Esconder NF + landing/menu                 (curto)
3. Motor + tela ITBI                          (núcleo)
4. Motor + tela ITCMD                         (núcleo)
5. Relatório único                            (depende de 3 e 4)
6. Documentação de regras + copy da landing
```

Não abrir precificador, split, SPED, usufruto ou incorporação no mesmo sprint.

## 8. Regras de implementação

- Sem módulo comercial novo na v1. ITBI, ITCMD e relatório vivem em `GESTAO_IMOVEIS` e `property_simulations`.
- Cálculo no shared (função pura). API valida Zod e persiste. Portal não inventa alíquota.
- Toda regra nova vai para `apps/portal/src/modules/documentacao/data/` ([documentacao-regras](.cursor/rules/documentacao-regras/rule.mdc)).
- Aviso em tela e PDF: simulação, não substitui guia, DAA nem parecer.
- Migration pública para pack/hidden. Não editar 085/086 já aplicadas.
- Super admin reexibe módulo pela aba Visibilidade, sem deploy, se precisar furar o recorte.

## 9. Referências

- Recorte revisado: canvas `iatax-v1-v2-advogados-contadores.canvas.tsx`
- Escopo fino anterior: canvas `iatax-escopo-entrega-v1-v2.canvas.tsx`
- Cursos: EPS, Societário Total, S.A. de A a Z, Globo da Morte
- Código: monorepo `/Volumes/Work/protec`

# Relatórios PDF (Portal)

## Motor

Todos os relatórios usam `window.print()` com `@page institutional-report`, header/footer fixos via CSS e capa institucional na primeira página.

| Produto | Motor | Componentes |
|---------|--------|-------------|
| Transação Tributária | `window.print()` | `ReportPrintHeader` + `ReportCoverSection` + `ReportPrintFooter` |
| IRPF Alta Renda | `window.print()` | idem |
| Simulador IN 2306 | `window.print()` | idem |
| Simulador Imobiliário | `window.print()` | idem |

## Componentes compartilhados

### `useReportPrint(wrapperId)`
Hook que encapsula a lógica de mover o wrapper para `document.body`, chamar `window.print()` e restaurar após a impressão. Aceita callbacks `beforePrint` e `afterPrint`.

### `ReportPrintHeader` / `ReportPrintFooter`
Cabeçalho e rodapé institucionais. Duas variantes:
- `printSheet` — oculto na tela, fixo ao imprimir (1.8 cm / 1 cm)
- `previewModal` — visível no modal de pré-visualização

### `ReportCoverSection`
Capa institucional na primeira página: título do relatório, nome do cliente, subtítulo e detalhes (ano, receita etc.). Duas variantes: `printSheet` (hidden na tela, block ao imprimir) e `previewModal` (sempre visível).

### `stripReportExcludedFromClone`
Remove nós marcados com `data-report-exclude="pdf"` ou `"preview"` de um clone do DOM.

### `buildReportPdfFilename`
Gera nome padronizado: `IATax-{produto}-{extra}-{data}.pdf`.

## Área segura (CSS)

O CSS em `index.css` define:

```
@page institutional-report {
  margin: 2.2cm 0.8cm 1.3cm 0.8cm;
}
```

- **Header fixo**: 1.8 cm (logo + título + meta + marca)
- **Footer fixo**: 1 cm (marca + data)
- **Área útil de conteúdo**: ~17.4 cm largura x 25.2 cm altura

A classe `.report-print-wrapper` aplica `page: institutional-report` automaticamente.

## Blocos do documento

- **Bloco A — Capa**: `ReportCoverSection` (nome do cliente, dados contextuais)
- **Bloco B — Corpo**: resultado da simulação (cards, tabelas, gráficos); use `.keep` / `.pdf-keep-together` para evitar cortes
- **Bloco C — Encerramento**: `ReportPrintFooter` (marca + data)

## Convenções

- **Nome de arquivo**: `buildReportPdfFilename` em `filename.ts`
- **Exclusão de nós**: `data-report-exclude="pdf"` | `"preview"`; helper `stripReportExcludedFromClone`
- **Conteúdo do resultado**: adicionar classe `report-resultado-content` no div interno do resultado

## Checklist (novo relatório ou ajuste de layout)

- [ ] Wrapper com classe `report-print-wrapper`
- [ ] `ReportPrintHeader` + `ReportPrintFooter` com `variant="printSheet"`
- [ ] `ReportCoverSection` com dados do módulo
- [ ] Div interno do resultado com classe `report-resultado-content`
- [ ] `useReportPrint(wrapperId)` no handler de exportação
- [ ] Modal de preview com variante `previewModal` nos mesmos componentes
- [ ] Elementos não-impressos com `print:hidden` e `data-report-exclude="preview"`

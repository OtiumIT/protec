# Relatórios PDF (Portal)

## Motores (híbrido)

| Produto | Motor | Motivo |
|---------|--------|--------|
| Transação Tributária | `html2pdf.js` | Clone off-screen + tabelas; cabeçalho/rodapé institucional via `wrapHtml2PdfInstitutionalClone` (alinhado ao modal de preview) |
| IRPF Alta Renda | `window.print()` | Relatório longo + Recharts; cabeçalho/rodapé fixos por página; área segura com `@page institutional-report` |
| Simulador IN 2306 | `window.print()` | Relatório longo + cabeçalho/rodapé por página; `@page institutional-report` |
| Simulador Imobiliário | `window.print()` | Idem + pré-visualização antes de imprimir; `@page institutional-report` |

Detalhes em [`engines.ts`](./engines.ts).

## Área segura multipágina (`window.print`)

Relatórios com `ReportPrintHeader` / `ReportPrintFooter` em `position: fixed` precisam de **margens em `@page` nomeado** (ex.: `institutional-report` em [`index.css`](../../index.css)), repetidas em **todas** as folhas. `padding-top` no wrapper só afeta o início do fluxo; nas páginas seguintes o conteúdo pode ficar sob o cabeçalho fixo se a margem de página não reservar a faixa.

## Blocos do documento (spec)

- **Bloco A — Capa / contexto**: logo, título do relatório, linha de contexto (ano, receita, cliente quando houver), marca IATax (`ReportPrintHeader`).
- **Bloco B — Corpo**: resultado da simulação (cards, tabelas, gráficos); evitar corte com `.keep` / `.pdf-keep-together`.
- **Bloco C — Encerramento**: rodapé institucional com data (`ReportPrintFooter`); disclaimers e base legal permanecem no corpo quando específicos do módulo.

## Convenções

- **Nome de arquivo**: `buildReportPdfFilename` em [`filename.ts`](./filename.ts).
- **html2pdf**: `getDefaultReportHtml2PdfOptions` em [`html2pdf-defaults.ts`](./html2pdf-defaults.ts); clone institucional em [`html2pdf-institutional-wrap.ts`](./html2pdf-institutional-wrap.ts).
- **Exclusão de nós**: `data-report-exclude="pdf"` | `"preview"`; helper `stripReportExcludedFromClone` em [`strip-report-excluded.ts`](./strip-report-excluded.ts).

## Checklist de impressão (novo relatório ou ajuste de layout)

- [ ] Multipágina: conteúdo na página 2+ não coberto pelo cabeçalho/rodapé fixos (`@page` + `index.css`).
- [ ] Preview: clone + `stripReportExcludedFromClone` coerente com o que vai para PDF/impressão.
- [ ] Exportar: `window.print` com wrapper movido para `document.body` + `afterprint` onde aplicável.

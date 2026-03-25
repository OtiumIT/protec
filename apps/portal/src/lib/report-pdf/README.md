# Relatórios PDF (Portal)

## Motores (híbrido)

| Produto | Motor | Motivo |
|---------|--------|--------|
| Transação Tributária | `html2pdf.js` | Clone off-screen + tabelas; alinhado ao layout da tela |
| IRPF Alta Renda | `html2pdf.js` | Gráficos Recharts + largura A4 fixa (`report-html2pdf-root`) |
| Simulador IN 2306 | `window.print()` | Relatório longo + cabeçalho/rodapé por página |
| Simulador Imobiliário | `window.print()` | Idem + pré-visualização antes de imprimir |

Detalhes em [`engines.ts`](./engines.ts).

## Blocos do documento (spec)

- **Bloco A — Capa / contexto**: logo, título do relatório, linha de contexto (ano, receita, cliente quando houver), marca IATax (`ReportPrintHeader`).
- **Bloco B — Corpo**: resultado da simulação (cards, tabelas, gráficos); evitar corte com `.keep` / `.pdf-keep-together`.
- **Bloco C — Encerramento**: rodapé institucional com data (`ReportPrintFooter`); disclaimers e base legal permanecem no corpo quando específicos do módulo.

## Convenções

- **Nome de arquivo**: `buildReportPdfFilename` em [`filename.ts`](./filename.ts).
- **html2pdf**: `getDefaultReportHtml2PdfOptions` em [`html2pdf-defaults.ts`](./html2pdf-defaults.ts).
- **Exclusão de nós**: `data-report-exclude="pdf"` | `"preview"`; helper `stripReportExcludedFromClone` em [`strip-report-excluded.ts`](./strip-report-excluded.ts).

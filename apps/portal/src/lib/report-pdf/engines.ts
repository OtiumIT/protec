/**
 * Matriz de motores de exportação para PDF no Portal.
 * Estratégia híbrida (mantida): impressão nativa para relatórios longos com cabeçalho/rodapé
 * por página; html2pdf quando o layout depende de canvas (gráficos) ou clone off-screen.
 */
export const REPORT_PDF_ENGINES = {
  'transacao-tributaria': 'html2pdf.js',
  /** Gráficos Recharts + `@page institutional-report` no print; ver README. */
  'irpf-alta-renda': 'window.print',
  'in-2306-tributario': 'window.print',
  'simulador-imobiliario': 'window.print',
} as const;

export type ReportPdfProductKey = keyof typeof REPORT_PDF_ENGINES;

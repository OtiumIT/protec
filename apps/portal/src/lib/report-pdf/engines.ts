/**
 * Matriz de motores de exportação para PDF no Portal.
 * Todos os relatórios agora usam window.print() com header/footer fixos e @page institutional-report.
 */
export const REPORT_PDF_ENGINES = {
  'transacao-tributaria': 'window.print',
  'irpf-alta-renda': 'window.print',
  'in-2306-tributario': 'window.print',
  'simulador-imobiliario': 'window.print',
} as const;

export type ReportPdfProductKey = keyof typeof REPORT_PDF_ENGINES;

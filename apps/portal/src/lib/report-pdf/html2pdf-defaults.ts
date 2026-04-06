/** Margem em mm (jsPDF): respiro para quebras multipágina e bloco institucional no topo/rodapé. */
export const REPORT_HTML2PDF_MARGIN_MM = 10;

/** Opções passadas a html2pdf.js (sem tipagem estrita da lib). */
export type ReportHtml2PdfOptions = Record<string, unknown>;

/**
 * Opções para exportação html2pdf (Transação Tributária e rotas que usam o mesmo fluxo).
 * Sobrescreva apenas o necessário (filename, html2canvas.width, etc.).
 */
export function getDefaultReportHtml2PdfOptions(overrides: ReportHtml2PdfOptions = {}): ReportHtml2PdfOptions {
  const base: ReportHtml2PdfOptions = {
    margin: REPORT_HTML2PDF_MARGIN_MM,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    pagebreak: { mode: ['css', 'legacy'] as const, avoid: ['.keep', '.pdf-keep-together', 'tr', 'table'] },
  };
  return { ...base, ...overrides };
}

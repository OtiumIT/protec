/** Remove caracteres inválidos para nome de arquivo (Windows/macOS/Linux). */
export function sanitizeReportFileSegment(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 96);
}

/**
 * Padrão: IATax-{produto}-{extraOpcional}-{YYYY-MM-DD}.pdf
 * Ex.: IATax-IRPF-Alta-Renda-2025-Joao_Silva-2025-03-24.pdf
 */
export function buildReportPdfFilename(parts: {
  productSlug: string;
  /** Ex.: ano, nome do cliente, "simulacao" */
  extra?: string;
  date?: Date;
}): string {
  const d = (parts.date ?? new Date()).toISOString().slice(0, 10);
  const product = sanitizeReportFileSegment(parts.productSlug);
  const extra = parts.extra ? sanitizeReportFileSegment(parts.extra) : '';
  const base = extra ? `IATax-${product}-${extra}-${d}.pdf` : `IATax-${product}-${d}.pdf`;
  return base;
}

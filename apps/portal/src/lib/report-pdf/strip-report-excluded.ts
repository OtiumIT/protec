/**
 * Remove nós marcados para não entrarem no PDF ou no preview de impressão.
 * - `data-report-exclude="pdf"` — clone para html2pdf
 * - `data-report-exclude="preview"` — clone para modal de pré-visualização (print)
 *
 * Mantém compatibilidade com atributos legados `data-pdf-exclude` e `data-preview-exclude`.
 */
export function stripReportExcludedFromClone(clone: ParentNode, mode: 'pdf' | 'preview'): void {
  const sel =
    mode === 'pdf'
      ? '[data-report-exclude="pdf"], [data-pdf-exclude]'
      : '[data-report-exclude="preview"], [data-preview-exclude]';
  clone.querySelectorAll(sel).forEach((n) => n.remove());
}

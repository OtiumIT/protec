export { REPORT_PDF_ENGINES, type ReportPdfProductKey } from './engines';
export { buildReportPdfFilename, sanitizeReportFileSegment } from './filename';
export { getDefaultReportHtml2PdfOptions, REPORT_HTML2PDF_MARGIN_MM, type ReportHtml2PdfOptions } from './html2pdf-defaults';
export { stripReportExcludedFromClone } from './strip-report-excluded';
export { ReportPrintHeader, ReportPrintFooter, formatDatePtBr, BRAND } from './ReportPrintChrome';
export type { ReportPrintChromeVariant } from './ReportPrintChrome';
export { ReportExportChoiceModal } from './ReportExportChoiceModal';
export type { ReportExportChoiceOption } from './ReportExportChoiceModal';

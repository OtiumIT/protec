const DEFAULT_BRAND = 'IATax Soluções Inteligentes';
const DEFAULT_LOGO = '/logo-iatax.png';

export type ReportPrintChromeVariant = 'printSheet' | 'previewModal';

function formatDatePtBr(d = new Date()): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type HeaderProps = {
  variant: ReportPrintChromeVariant;
  reportTitle: string;
  /** Linha abaixo do título: ex. cliente, data, métricas */
  metaLine?: string;
  logoUrl?: string | null;
  brandName?: string | null;
};

/** Cabeçalho institucional: logo + título + linha de contexto + marca. */
export function ReportPrintHeader({ variant, reportTitle, metaLine, logoUrl, brandName }: HeaderProps) {
  const brand = brandName || DEFAULT_BRAND;
  const logo = logoUrl || DEFAULT_LOGO;

  const inner = (
    <>
      <img src={logo} alt="" className="h-8 w-8 object-contain" aria-hidden />
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-slate-900 leading-tight">{reportTitle}</h2>
        {metaLine ? <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{metaLine}</p> : null}
        <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{brand}</p>
      </div>
    </>
  );

  if (variant === 'printSheet') {
    return (
      <header className="print-report-header report-print-header hidden print:flex" aria-hidden="true">
        {inner}
      </header>
    );
  }

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-4">
      {inner}
    </header>
  );
}

type FooterProps = {
  variant: ReportPrintChromeVariant;
  brandName?: string | null;
};

/** Rodapé institucional: marca + data. */
export function ReportPrintFooter({ variant, brandName }: FooterProps) {
  const brand = brandName || DEFAULT_BRAND;
  const dateStr = formatDatePtBr();
  if (variant === 'printSheet') {
    return (
      <footer className="print-report-footer report-print-footer hidden print:flex" aria-hidden="true">
        <span className="text-[9px] text-slate-500">{brand}</span>
        <span className="text-[9px] text-slate-500">{dateStr}</span>
      </footer>
    );
  }

  return (
    <footer className="flex items-center justify-between pt-3 mt-4 border-t border-slate-200 text-[10px] text-slate-500">
      <span>{brand}</span>
      <span>{dateStr}</span>
    </footer>
  );
}

export { formatDatePtBr, DEFAULT_BRAND as BRAND };

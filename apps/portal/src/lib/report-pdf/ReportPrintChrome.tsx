const BRAND = 'IATax Soluções Inteligentes';

export type ReportPrintChromeVariant = 'printSheet' | 'previewModal';

function formatDatePtBr(d = new Date()): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type HeaderProps = {
  variant: ReportPrintChromeVariant;
  reportTitle: string;
  /** Linha abaixo do título: ex. cliente, data, métricas */
  metaLine?: string;
};

/** Cabeçalho institucional: logo + título + linha de contexto + marca. */
export function ReportPrintHeader({ variant, reportTitle, metaLine }: HeaderProps) {
  const inner = (
    <>
      <img src="/logo-iatax.png" alt="" className="h-9 w-9 object-contain" aria-hidden />
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-slate-900">{reportTitle}</h2>
        {metaLine ? <p className="text-xs text-slate-600">{metaLine}</p> : null}
        <p className="text-[10px] text-slate-500">{BRAND}</p>
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
};

/** Rodapé institucional: marca + data. */
export function ReportPrintFooter({ variant }: FooterProps) {
  const dateStr = formatDatePtBr();
  if (variant === 'printSheet') {
    return (
      <footer className="print-report-footer report-print-footer hidden print:flex" aria-hidden="true">
        <span className="text-[10px] text-slate-500">{BRAND}</span>
        <span className="text-[10px] text-slate-500">{dateStr}</span>
      </footer>
    );
  }

  return (
    <footer className="flex items-center justify-between pt-3 mt-4 border-t border-slate-200 text-[10px] text-slate-500">
      <span>{BRAND}</span>
      <span>{dateStr}</span>
    </footer>
  );
}

export { formatDatePtBr, BRAND };

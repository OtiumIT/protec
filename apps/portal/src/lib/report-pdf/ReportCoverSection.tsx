const DEFAULT_BRAND = 'IATax Soluções Inteligentes';

type CoverDetail = { label: string; value: string };

type ReportCoverSectionProps = {
  /** Título principal do relatório (ex.: "Simulador tributário – LC 224/2025") */
  title: string;
  /** Nome do cliente — exibido em destaque quando presente */
  clientName?: string;
  /** Subtítulo opcional abaixo do nome do cliente (ex.: "CPF: 123.456.789-00") */
  subtitle?: string;
  /** Linhas de detalhe no rodapé da capa (ex.: Ano-base, Receita) */
  details?: CoverDetail[];
  /** Variante de exibição — 'printSheet' fica oculto na tela; 'previewModal' sempre visível */
  variant: 'printSheet' | 'previewModal';
  brandName?: string | null;
};

/**
 * Seção de capa institucional exibida na primeira página do relatório.
 * No modo `printSheet`, fica `hidden` na tela e `block` ao imprimir.
 */
export function ReportCoverSection({ title, clientName, subtitle, details, variant, brandName }: ReportCoverSectionProps) {
  const visibilityCls = variant === 'printSheet' ? 'hidden print:block' : 'block';
  const brand = brandName || DEFAULT_BRAND;

  return (
    <section
      className={`${visibilityCls} break-inside-avoid mb-4`}
      aria-hidden={variant === 'printSheet' ? 'true' : undefined}
    >
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-white pl-5 pr-4 py-5 sm:pl-6 sm:pr-5 border-l-[3px] border-l-brand shadow-sm print:shadow-none print:border-slate-300 print:from-slate-50 print:to-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-2">{title}</p>

        {clientName ? (
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-[1.15] print:text-[20pt] print:leading-[1.15]">
            {clientName}
          </h2>
        ) : (
          <p className="text-base text-slate-500 leading-snug">
            Nome do cliente não informado
          </p>
        )}

        {subtitle && <p className="text-sm text-slate-600 mt-2 font-medium">{subtitle}</p>}

        {details && details.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200/90 flex flex-col gap-1 text-xs text-slate-600 print:text-[10px]">
            {details.map((d) => (
              <p key={d.label}>
                <span className="font-semibold text-slate-700">{d.label}</span>{' '}
                <span className="text-slate-800">{d.value}</span>
              </p>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-3">{brand}</p>
      </div>
    </section>
  );
}

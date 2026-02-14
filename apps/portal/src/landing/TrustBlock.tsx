/**
 * Bloco de confiança – demonstração gratuita, LGPD, suporte, normas.
 * Usado quando não há depoimentos/clientes; reforça transparência e baixo risco.
 */
const items = [
  {
    label: 'Demonstração gratuita, sem compromisso',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Dados protegidos em conformidade com a LGPD',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    label: 'Suporte especializado',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: 'Normas vigentes: Portaria 6.757/2022, IN 2.306/2026',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export function TrustBlock() {
  return (
    <section className="py-10 sm:py-12 bg-slate-50 border-y border-slate-200/60" aria-label="Confiança e transparência">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-landing-accent/10 text-landing-accent"
                aria-hidden
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium text-slate-700 leading-snug">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

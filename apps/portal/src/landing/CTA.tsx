import { Link } from 'react-router-dom';

export function CTA() {
  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[12px] bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center sm:px-14 sm:py-14 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pronto para transformar?
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-slate-600 text-base">
            Agende uma demonstração gratuita ou comece agora. Estamos à disposição para tirar dúvidas.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Demonstração gratuita, sem compromisso. Dados protegidos em conformidade com a LGPD.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/fale-conosco"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-landing-cta focus:ring-offset-2"
            >
              Agendar demonstração
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-landing-accent focus:ring-offset-2"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

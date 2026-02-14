import type { ProblemaItem, SolucaoCard } from './types';

const problemaItems: ProblemaItem[] = [
  {
    label: 'Análise manual e lenta',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Oportunidades perdidas em labirintos fiscais',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    label: 'Custo elevado para escalar times de caça',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Risco de passivo por erro humano: A conferência manual gera insegurança jurídica e possíveis multas',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

const solucaoCards: SolucaoCard[] = [
  {
    title: 'Validador de Rating (CAPAG)',
    description: 'Reenquadramento e descontos conforme Portaria 6.757/2022.',
    icon: (
      <svg className="h-6 w-6 flex-shrink-0 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Simulador IN 2.306/2026',
    description: 'Compare regimes e projeções da nova instrução normativa.',
    icon: (
      <svg className="h-6 w-6 flex-shrink-0 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function ProblemaSolucao() {
  return (
    <section className="py-12 sm:py-16 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-stretch">
          {/* Coluna esquerda: O Problema – mesma altura que a direita */}
          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/50 p-8 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              O Problema: Oportunidades Escapam
            </h2>
            <ul className="mt-6 space-y-5">
              {problemaItems.map((item) => (
                <li key={item.label} className="flex items-start gap-3 leading-relaxed">
                  <span
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <span className="text-slate-600">{item.label}</span>
                </li>
              ))}
            </ul>
            <blockquote className="mt-8 rounded-r-xl border-l-4 border-landing-cta bg-blue-50/80 py-4 pl-5 pr-4">
              <p className="text-[1.1rem] font-medium italic leading-relaxed text-slate-700">
                &ldquo;Você tem uma base limpa. O que falta é um sistema que encontre, em segundos, o valor.&rdquo;
              </p>
            </blockquote>
          </div>

          {/* Coluna direita: A Solução IATax – mesma altura que a esquerda */}
          <div className="flex flex-col rounded-2xl bg-[#0f172a] p-8 shadow-xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              A Solução: IATax
            </h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Uma plataforma que processa e cruza dados fiscais e contábeis existentes, em segundos, para revelar o valor escondido na sua base.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-1">
              {solucaoCards.map((card) => (
                <div
                  key={card.title}
                  className="flex gap-4 rounded-xl border-2 border-slate-200/80 bg-white p-5 shadow-md transition-all duration-200 hover:border-[#FF6B00] hover:-translate-y-1"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{card.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


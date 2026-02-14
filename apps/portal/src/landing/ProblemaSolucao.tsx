const problemaItems = [
  'Análise manual e lenta',
  'Oportunidades perdidas em labirintos fiscais',
  'Custo elevado para escalar times de caça',
];

const solucaoCards = [
  {
    title: 'Reenquadramento de Rating (CAPAG)',
    description: 'Reenquadramento e descontos conforme Portaria 6.757/2022.',
    icon: (
      <svg className="h-6 w-6 flex-shrink-0 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Simulador de Regime e IN 2.306/2026',
    description: 'Compare regimes e projeções da nova instrução normativa.',
    icon: (
      <svg className="h-6 w-6 flex-shrink-0 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Scanner de Editais PGFN',
    description: 'Identifique clientes e editais elegíveis ao contencioso.',
    icon: (
      <svg className="h-6 w-6 flex-shrink-0 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
];

export function ProblemaSolucao() {
  return (
    <section className="py-16 sm:py-24 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          {/* Coluna esquerda: O Problema */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              O Problema: Oportunidades Escapam
            </h2>
            <ul className="mt-6 space-y-3">
              {problemaItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600"
                    aria-hidden
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
            <blockquote className="mt-8 rounded-xl border-l-4 border-landing-accent bg-slate-50 py-4 pl-5 pr-4">
              <p className="text-lg font-medium italic text-slate-700">
                &ldquo;Você tem uma base limpa. O que falta é um sistema que encontre, em segundos, o valor.&rdquo;
              </p>
            </blockquote>
          </div>

          {/* Coluna direita: A Solução (fundo escuro, cards brancos) */}
          <div className="rounded-2xl bg-slate-800 p-6 sm:p-8 lg:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              A Solução: IATax
            </h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Uma plataforma que processa e cruza dados fiscais e contábeis existentes, em segundos, para revelar o valor escondido na sua base.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-1">
              {solucaoCards.map((card) => (
                <div
                  key={card.title}
                  className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-md"
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

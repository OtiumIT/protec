const features = [
  {
    id: 'gestao-clientes',
    title: 'Gestão de clientes',
    description: 'Cadastro por cliente e por empresa. CNPJ, contato e dados no mesmo lugar – sem perder tempo procurando.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'arquivos-fiscais',
    title: 'Arquivos fiscais',
    description: 'SPED, ECD, PGDAS, XML e PDF organizados por cliente e competência. Armazene, liste e acesse em um só lugar.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'validador-rating',
    title: 'Validador de Rating (CAPAG)',
    description: 'Informe os dados do balanço e da DRE; o sistema calcula Liquidez Corrente, Liquidez Geral e Solvência conforme Portaria 6.757/2022 e classifica o rating. Confronte estimado x real. Ferramenta de apoio à decisão.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'simulador-in2306',
    title: 'Simulador IN 2.306/2026',
    description: 'Compare cenários: cálculo 2025, projeção 2026 (IN 2.306) e Equiparação Hospitalar. Planejamento para Lucro Presumido com ajuste anual e adicional de IRPJ.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'dashboard-usuarios',
    title: 'Dashboard e usuários',
    description: 'Visão da carteira e controle de usuários e acessos em um painel central.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            O que está disponível para você
          </h2>
          <p className="mt-2 text-slate-600">
            Ferramentas para organizar clientes, arquivos e simular cenários tributários.
          </p>
        </div>
        <ul className="mx-auto mt-12 grid max-w-2xl gap-8 sm:mt-16 lg:max-w-none lg:grid-cols-2 lg:gap-x-12 lg:gap-y-8">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 shadow-sm transition-shadow duration-200 hover:shadow-lg"
            >
              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

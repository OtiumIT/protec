import { Link } from 'react-router-dom';

const modulosPrincipais = [
  {
    id: 'validador-rating',
    title: 'Validador de Rating (CAPAG)',
    description: 'Informe os dados do balanço e da DRE; o sistema calcula Liquidez Corrente, Liquidez Geral e Solvência conforme Portaria 6.757/2022 e classifica o rating. Confronte estimado x real para decisões mais seguras.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'simulador-in2306',
    title: 'Simulador IN 2.306/2026',
    description: 'Compare cenários em minutos: cálculo 2025, projeção 2026 (IN 2.306) e Equiparação Hospitalar. Planejamento para Lucro Presumido com ajuste anual e adicional de IRPJ – sem horas de planilha.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'editais-escritorios',
    title: 'Ideal para escritórios de contabilidade e advocacia',
    description: 'Cadastro de processos e teses tributárias. O sistema indica a elegibilidade a editais de contencioso, para você saber quais clientes e editais fazem sentido.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9a9 9 0 009 9" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="py-16 sm:py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Como Funciona – Módulos
          </h2>
          <p className="mt-2 text-slate-600">
            Ferramentas para organizar clientes, arquivos e simular cenários tributários.
          </p>
        </div>
        <ul className="mx-auto mt-12 grid gap-8 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {modulosPrincipais.map((mod) => (
            <li
              key={mod.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-landing-accent">
                {mod.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{mod.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{mod.description}</p>
              <Link
                to="/o-produto"
                className="mt-4 inline-block text-sm font-semibold text-landing-accent hover:text-landing-accent-hover transition-colors"
              >
                Saiba mais →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

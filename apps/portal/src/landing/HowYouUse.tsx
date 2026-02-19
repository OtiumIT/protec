import { Link } from 'react-router-dom';

const steps = [
  {
    step: 1,
    title: 'Cadastre seus clientes',
    description: 'Um cadastro por cliente, com CNPJ e contato no mesmo lugar.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Organize arquivos fiscais por cliente e competência',
    description: 'SPED, ECD, PGDAS, XML e PDF organizados para achar rápido.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Simule cenários tributários quando precisar',
    description: 'Análise da capacidade de pagamento, simulação LC 224/2025 e tributação da alta renda (IRPFM).',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function HowYouUse() {
  return (
    <section id="como-usar" className="py-12 sm:py-16 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Como você usa no dia a dia
          </h2>
          <p className="mt-2 text-slate-600">
            Três passos para organizar a carteira e simular quando precisar.
          </p>
        </div>
        <ul className="mx-auto mt-10 grid gap-6 sm:mt-12 sm:grid-cols-3 lg:items-stretch">
          {steps.map((item) => (
            <li
              key={item.step}
              className="group flex flex-col rounded-[12px] border border-slate-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50/90 text-blue-700 transition-colors duration-200 group-hover:bg-orange-50 group-hover:text-landing-cta" aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 flex-1 min-h-0 text-sm text-slate-600 leading-relaxed">{item.description}</p>
              <Link
                to="/o-produto"
                className="mt-5 inline-flex items-center text-sm font-semibold text-landing-accent transition-colors duration-200 group-hover:text-landing-cta"
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

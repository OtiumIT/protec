import { Link } from 'react-router-dom';
import type { ModuloItem } from './types';

const modulosPrincipais: ModuloItem[] = [
  {
    id: 'transacao-tributaria',
    title: 'Transação Tributária - Análise da capacidade de pagamento',
    description: 'Avalie se a classificação da capacidade de pagamento feita pela Receita Federal está correta, com revisão do enquadramento a partir dos dados contábeis analisados pelo sistema e emissão de relatório para fundamentação.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'simulador-in2306',
    title: 'Simulação do aumento da tributação do lucro presumido - LC 224/2025',
    description: 'Compare a tributação do lucro presumido antes e depois da alteração trazida pela LC 224/2025 e identifique quanto será o aumento para o contribuinte.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'irpf-alta-renda',
    title: 'Tributação da alta renda/dividendos - IRPFM - Lei 15.270/2025',
    description: 'Análise da declaração do IR e simulação da nova tributação da alta renda, com alíquota aplicável e valor a pagar, comparando cenários antes e depois da nova legislação e apontando possíveis soluções para redução.',
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="funcionalidades" className="py-12 sm:py-16 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Como Funciona – Módulos
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            Ferramentas para organizar clientes, arquivos e simular cenários tributários.
          </p>
        </div>
        <ul className="mx-auto mt-14 grid gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
          {modulosPrincipais.map((mod) => (
            <li
              key={mod.id}
              className="group flex flex-col rounded-[12px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50/90 text-blue-700 transition-colors duration-200 group-hover:bg-orange-50 group-hover:text-landing-cta">
                {mod.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{mod.title}</h3>
              <p className="mt-3 flex-1 min-h-0 text-sm text-slate-600 leading-relaxed">{mod.description}</p>
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

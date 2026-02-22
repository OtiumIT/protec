import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { planService } from '../modules/plans/services/plan.service';

/** Ícone minimalista documento/plano */
function PlanIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

const PLANO_PADRAO_FEATURES = [
  'Até 5 clientes cadastrados',
  'Transação Tributária - Análise da capacidade de pagamento',
  'Simulação do aumento da tributação do lucro presumido - LC 224/2025',
  'Tributação da alta renda/dividendos - IRPFM - Lei 15.270/2025',
  'Suporte por e-mail',
  'Relatórios básicos',
];

export function PricingSection() {
  const [mainPlanFeatures, setMainPlanFeatures] = useState<string[]>(PLANO_PADRAO_FEATURES);

  useEffect(() => {
    let cancelled = false;
    planService
      .list()
      .then((list) => {
        if (cancelled) return;
        const standardPlan = list.find((p) => p.status !== 'inactive' && !p.isCustom && !p.isManaged);
        if (standardPlan && standardPlan.features?.length) {
          setMainPlanFeatures(standardPlan.features);
        }
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="planos" className="pt-8 sm:pt-10 pb-6 sm:pb-8 bg-slate-50" aria-labelledby="planos-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="planos-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Nossos Planos
          </h2>
        </div>
        <div className="mx-auto mt-8 flex flex-col sm:flex-row items-stretch justify-center gap-6 sm:gap-8 max-w-5xl">
          {/* Card 01 – Plano IATax (Enterprise) – principal */}
          <article
            className="flex flex-col flex-1 min-w-0 sm:max-w-[400px] rounded-2xl border-2 border-landing-cta/30 bg-white p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl ring-2 ring-landing-cta/20"
            aria-labelledby="plano-padrao-title"
          >
            <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 p-2.5 w-10 h-10">
              <PlanIcon className="h-5 w-5" />
            </div>
            <h3 id="plano-padrao-title" className="mt-3 text-lg font-bold text-slate-900">
              Plano IATax
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              Ideal para pequenas e médias empresas
            </p>
            <p className="mt-3 text-xl font-bold text-slate-900">R$ X,XX/mês</p>
            <p className="mt-0.5 text-xs text-slate-500">Pagamento mensal</p>
            <ul className="mt-4 flex-1 space-y-2" aria-label="Benefícios incluídos">
              {mainPlanFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                    aria-hidden
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-slate-600 text-sm leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center rounded-lg bg-landing-cta px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors min-h-[44px]"
              >
                Experimente grátis por 7 dias
              </Link>
            </div>
          </article>

          {/* Card 02 – Customizado */}
          <article
            className="flex flex-col flex-1 min-w-0 sm:max-w-[400px] rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md transition-shadow duration-200 hover:shadow-xl"
            aria-labelledby="plano-custom-title"
          >
            <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 p-2.5 w-10 h-10">
              <PlanIcon className="h-5 w-5" />
            </div>
            <h3 id="plano-custom-title" className="mt-3 text-lg font-bold text-slate-900">
              Customizado
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              Soluções sob medida para grandes volumes e integrações específicas
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-900">Sob consulta</p>
            <ul className="mt-4 flex-1 space-y-2" aria-label="Benefícios incluídos">
              <li className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                  aria-hidden
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-slate-600 text-sm leading-snug">Todas as funcionalidades fiscais</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                  aria-hidden
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-slate-600 text-sm leading-snug">Integração com múltiplos CNPJs</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                  aria-hidden
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-slate-600 text-sm leading-snug">Integração via API</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"
                  aria-hidden
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-slate-600 text-sm leading-snug">Suporte prioritário e consultoria especializada</span>
              </li>
            </ul>
            <div className="mt-5">
              <Link
                to="/fale-conosco"
                className="w-full inline-flex items-center justify-center rounded-lg border-2 border-landing-accent bg-white px-5 py-3 text-sm font-semibold text-landing-accent hover:bg-indigo-50 transition-colors min-h-[44px]"
              >
                Falar com especialista
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

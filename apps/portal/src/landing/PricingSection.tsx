import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { planService, type Plan } from '../modules/plans/services/plan.service';

/** Ícone minimalista documento/plano */
function PlanIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBillingCycle(cycle: 'monthly' | 'yearly'): string {
  return cycle === 'yearly' ? 'Pagamento anual' : 'Pagamento mensal';
}

/** Card de um plano (nome, preço, ciclo, features) vindo da API */
function PlanCard({ plan, isHighlighted }: { plan: Plan; isHighlighted: boolean }) {
  const features = Array.isArray(plan.features) ? plan.features : [];
  const priceLabel = plan.billingCycle === 'yearly' ? '/ano' : '/mês';
  return (
    <article
      className={`flex flex-col flex-1 min-w-0 sm:max-w-[400px] rounded-2xl border-2 bg-white p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl ${
        isHighlighted
          ? 'border-landing-cta/30 ring-2 ring-landing-cta/20'
          : 'border-slate-200/80 shadow-md'
      }`}
      aria-labelledby={`plano-${plan.id}-title`}
    >
      <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 p-2.5 w-10 h-10">
        <PlanIcon className="h-5 w-5" />
      </div>
      <h3 id={`plano-${plan.id}-title`} className="mt-3 text-lg font-bold text-slate-900">
        {plan.name}
      </h3>
      <p className="mt-1.5 text-sm text-slate-600">
        Até {plan.maxUsers} usuário{plan.maxUsers > 1 ? 's' : ''}
      </p>
      <p className="mt-3 text-xl font-bold text-slate-900">
        {formatPrice(plan.price)}
        <span className="text-sm font-normal text-slate-500">{priceLabel}</span>
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{formatBillingCycle(plan.billingCycle)}</p>
      <ul className="mt-4 flex-1 space-y-2" aria-label="Benefícios incluídos">
        {features.map((feature) => (
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
          to="/fale-conosco"
          className="w-full inline-flex items-center justify-center rounded-lg bg-landing-cta px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors min-h-[44px]"
        >
          Solicitar acesso
        </Link>
      </div>
    </article>
  );
}

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    planService
      .list()
      .then((list) => {
        if (cancelled) return;
        setPlans(list.filter((p) => p.status !== 'inactive'));
      })
      .catch(() => setPlans([]))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const standardPlans = plans.filter((p) => !p.isCustom && !p.isManaged);
  const customPlan = plans.find((p) => p.isCustom || p.isManaged);

  return (
    <section id="planos" className="pt-8 sm:pt-10 pb-6 sm:pb-8 bg-slate-50" aria-labelledby="planos-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="planos-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Nossos Planos
          </h2>
        </div>
        {isLoading ? (
          <div className="mx-auto mt-8 text-center text-slate-500">Carregando planos...</div>
        ) : (
          <div className="mx-auto mt-8 flex flex-col sm:flex-row flex-wrap items-stretch justify-center gap-6 sm:gap-8 max-w-5xl">
            {/* Cards dos planos vindos da API (não custom) */}
            {standardPlans.map((plan, index) => (
              <PlanCard key={plan.id} plan={plan} isHighlighted={index === 0} />
            ))}

            {/* Card Customizado (da API ou estático) */}
            <article
              className="flex flex-col flex-1 min-w-0 sm:max-w-[400px] rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md transition-shadow duration-200 hover:shadow-xl"
              aria-labelledby="plano-custom-title"
            >
              <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 p-2.5 w-10 h-10">
                <PlanIcon className="h-5 w-5" />
              </div>
              <h3 id="plano-custom-title" className="mt-3 text-lg font-bold text-slate-900">
                {customPlan?.name ?? 'Customizado'}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">
                Soluções sob medida para grandes volumes e integrações específicas
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">Sob consulta</p>
              <ul className="mt-4 flex-1 space-y-2" aria-label="Benefícios incluídos">
                {(customPlan && Array.isArray(customPlan.features) && customPlan.features.length > 0
                  ? customPlan.features
                  : [
                      'Todas as funcionalidades fiscais',
                      'Integração com múltiplos CNPJs',
                      'Integração via API',
                      'Suporte prioritário e consultoria especializada',
                    ]
                ).map((feature) => (
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
                  to="/fale-conosco"
                  className="w-full inline-flex items-center justify-center rounded-lg border-2 border-landing-accent bg-white px-5 py-3 text-sm font-semibold text-landing-accent hover:bg-indigo-50 transition-colors min-h-[44px]"
                >
                  Falar com especialista
                </Link>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

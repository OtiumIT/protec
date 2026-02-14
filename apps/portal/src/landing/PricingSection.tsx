import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Plan } from '../modules/plans/services/plan.service';
import { planService } from '../modules/plans/services/plan.service';

/** Ícone minimalista documento/plano */
function PlanIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

/** Fallback estático quando API falha ou retorna vazio */
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'fallback-padrao',
    name: 'Plano Padrão',
    maxUsers: 5,
    price: 997,
    billingCycle: 'monthly',
    features: [
      'Até 5 clientes cadastrados',
      'Validador de Rating (CAPAG)',
      'Simulador IN 2.306/2026',
      'Suporte por e-mail',
      'Relatórios básicos',
    ],
    isCustom: false,
    isManaged: false,
    status: 'active',
  },
  {
    id: 'fallback-consulta',
    name: 'Sob Consulta',
    maxUsers: 0,
    price: 0,
    billingCycle: 'monthly',
    features: [
      'Todas as funcionalidades fiscais',
      'Integração com múltiplos CNPJs',
      'Integração via API',
      'Suporte prioritário via chat e telefone',
      'Consultoria especializada',
    ],
    isCustom: true,
    isManaged: true,
    status: 'active',
  },
];

function formatPrice(price: number, billingCycle: 'monthly' | 'yearly'): string {
  if (billingCycle === 'yearly') {
    return `R$ ${price.toLocaleString('pt-BR')}/mês`;
  }
  return `R$ ${price.toLocaleString('pt-BR')}/mês`;
}

function formatBillingLabel(billingCycle: 'monthly' | 'yearly'): string {
  return billingCycle === 'yearly' ? 'Pagamento anual' : 'Pagamento mensal';
}

function isSobConsulta(plan: Plan): boolean {
  return Boolean(plan.isCustom || plan.isManaged);
}

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    planService
      .list()
      .then((list) => {
        if (cancelled) return;
        const active = list.filter((p) => p.status !== 'inactive');
        if (active.length >= 1) {
          setPlans(active);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setPlans(FALLBACK_PLANS);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPlans = loading ? FALLBACK_PLANS : plans;

  return (
    <section id="planos" className="pt-8 sm:pt-10 pb-6 sm:pb-8 bg-slate-50" aria-labelledby="planos-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="planos-title" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Nossos Planos
        </h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2">
          {displayPlans.map((plan) => {
            const sobConsulta = isSobConsulta(plan);
            return (
              <article
                key={plan.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md transition-shadow duration-200 hover:shadow-xl"
              >
                <div className="flex flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 p-2.5 w-10 h-10">
                  <PlanIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  {sobConsulta
                    ? 'Soluções personalizadas para grandes empresas'
                    : 'Ideal para pequenas e médias empresas'}
                </p>
                {sobConsulta ? (
                  <p className="mt-3 text-sm font-semibold text-slate-900">Entre em contato</p>
                ) : (
                  <>
                    <p className="mt-3 text-xl font-bold text-slate-900">
                      {formatPrice(plan.price, plan.billingCycle)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatBillingLabel(plan.billingCycle)}</p>
                  </>
                )}
                <ul className="mt-4 flex-1 space-y-2" aria-label="Benefícios incluídos">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"
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
                  {sobConsulta ? (
                    <Link
                      to="/fale-conosco"
                      className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-lg border-2 border-landing-accent bg-transparent px-5 py-2.5 text-sm font-semibold text-landing-accent hover:bg-indigo-50 transition-colors"
                    >
                      Falar com especialista
                    </Link>
                  ) : (
                    <Link
                      to="/register"
                      className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                    >
                      Experimente grátis por 7 dias
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {loading && (
          <p className="mt-3 text-center text-sm text-slate-500">Carregando planos...</p>
        )}
      </div>
    </section>
  );
}

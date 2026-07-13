import type { Plan } from '../services/plan.service';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type PlanPromoPriceProps = {
  plan: Pick<Plan, 'price' | 'originalPrice' | 'billingCycle'>;
  size?: 'md' | 'lg';
  className?: string;
};

export function PlanPromoPrice({ plan, size = 'lg', className = '' }: PlanPromoPriceProps) {
  const promotional = plan.price;
  const full = plan.originalPrice ?? promotional;
  const hasPromo = promotional > 0 && full > promotional;
  const cycleLabel = plan.billingCycle === 'yearly' ? 'ano' : 'mês';
  const promoSize = size === 'lg' ? 'text-3xl' : 'text-2xl';
  const fullSize = size === 'lg' ? 'text-lg' : 'text-base';

  if (!hasPromo) {
    return (
      <p className={className}>
        <span className={`${promoSize} font-bold text-slate-900`}>
          {formatCurrency(promotional)}
        </span>
        <span className="text-sm font-normal text-slate-500">/{cycleLabel}</span>
      </p>
    );
  }

  const discountPct = Math.round(((full - promotional) / full) * 100);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          Oferta · {discountPct}% off
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valor cheio</p>
          <p className={`${fullSize} text-slate-400 line-through`}>
            {formatCurrency(full)}
            <span className="text-sm font-normal">/{cycleLabel}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Valor promocional</p>
          <p>
            <span className={`${promoSize} font-bold text-emerald-700`}>
              {formatCurrency(promotional)}
            </span>
            <span className="text-sm font-normal text-slate-500">/{cycleLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

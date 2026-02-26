function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type Props = {
  impostoComplementar: number;
  impostoMinimo?: number;
  deducoes?: number;
  economiaPotencial?: number;
  riscoRetencaoMensal?: boolean;
};

export function IrpfKpiCards({ impostoComplementar, impostoMinimo = 0, deducoes = 0, economiaPotencial = 0, riscoRetencaoMensal = false }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs text-slate-500">Imposto mínimo</p>
        <p className="text-lg font-semibold text-slate-800">{formatCurrency(impostoMinimo)}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-xs text-slate-500">Deduções compensáveis</p>
        <p className="text-lg font-semibold text-slate-800">{formatCurrency(deducoes)}</p>
      </div>
      <div className={`rounded-md border p-3 ${riscoRetencaoMensal ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300/50' : 'border-amber-200 bg-amber-50'}`}>
        <p className="text-xs text-amber-700 flex items-center gap-1.5">
          Valor a complementar
          {riscoRetencaoMensal && (
            <span
              className="inline-flex items-center rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-900"
              title="Possível retenção 10% na fonte (pagamento mensal &gt; R$ 50.000)"
            >
              Atenção
            </span>
          )}
        </p>
        <p className="text-lg font-semibold text-amber-800">{formatCurrency(impostoComplementar)}</p>
      </div>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-xs text-emerald-700">Economia potencial (otimização)</p>
        <p className="text-lg font-semibold text-emerald-800">{formatCurrency(Math.max(0, economiaPotencial))}</p>
      </div>
    </div>
  );
}


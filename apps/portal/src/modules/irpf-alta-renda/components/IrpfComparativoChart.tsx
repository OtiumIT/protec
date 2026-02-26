import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = {
  atual: {
    base: number;
    impostoComplementar: number;
  };
  otimizado?: {
    base: number;
    impostoComplementar: number;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function IrpfComparativoChart({ atual, otimizado }: Props) {
  if (!otimizado) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-3">
        <p className="text-xs font-medium text-slate-600 mb-2">Situação atual</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-slate-500">Base:</span>
            <span className="ml-1 font-mono font-medium text-slate-800">{formatCurrency(atual.base)}</span>
          </div>
          <div>
            <span className="text-slate-500">A complementar:</span>
            <span className="ml-1 font-mono font-medium text-slate-800">{formatCurrency(atual.impostoComplementar)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Para ver otimização, preencha &quot;Outros isentos que entram na base&quot; ou &quot;Lei 7.713&quot;.
        </p>
      </div>
    );
  }

  const formatCurrencyCompact = (value: number): string => {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace('.', ',')} mi`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)} mil`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const data = [
    {
      metrica: 'Base',
      atual: atual.base,
      otimizado: otimizado.base,
    },
    {
      metrica: 'A complementar',
      atual: atual.impostoComplementar,
      otimizado: otimizado.impostoComplementar,
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-slate-200 bg-slate-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Situação atual</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Base:</span>
              <span className="font-mono font-medium text-slate-800">{formatCurrency(atual.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">A complementar:</span>
              <span className="font-mono font-medium text-slate-800">{formatCurrency(atual.impostoComplementar)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Situação otimizada</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Base:</span>
              <span className="font-mono font-medium text-slate-800">{formatCurrency(otimizado.base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">A complementar:</span>
              <span className="font-mono font-medium text-slate-800">{formatCurrency(otimizado.impostoComplementar)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-72 min-h-[280px] w-full" role="img" aria-label="Gráfico comparativo entre situação atual e otimizada">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 16, right: 24, left: 56, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrencyCompact(Number(v))}
              tick={{ fontSize: 12 }}
            />
            <YAxis type="category" dataKey="metrica" width={80} tick={{ fontSize: 13 }} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <Legend />
            <Bar dataKey="atual" fill="#0ea5e9" name="Situação atual" radius={[0, 4, 4, 0]} />
            <Bar dataKey="otimizado" fill="#22c55e" name="Situação otimizada" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


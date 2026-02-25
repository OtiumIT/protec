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
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white text-sm">
        <table className="w-full min-w-[280px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-left font-medium text-slate-700"></th>
              <th className="px-3 py-2 text-right font-medium text-slate-700">Situação atual</th>
              <th className="px-3 py-2 text-right font-medium text-slate-700">Situação otimizada</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-700">Base</td>
              <td className="px-3 py-2 text-right font-mono text-slate-800">{formatCurrency(atual.base)}</td>
              <td className="px-3 py-2 text-right font-mono text-slate-800">{formatCurrency(otimizado.base)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium text-slate-700">A complementar</td>
              <td className="px-3 py-2 text-right font-mono text-slate-800">{formatCurrency(atual.impostoComplementar)}</td>
              <td className="px-3 py-2 text-right font-mono text-slate-800">{formatCurrency(otimizado.impostoComplementar)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="h-64 w-full" role="img" aria-label="Gráfico comparativo entre situação atual e otimizada">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 80, left: 90, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrencyCompact(Number(v))}
              tick={{ fontSize: 11 }}
              width={70}
            />
            <YAxis type="category" dataKey="metrica" width={100} tick={{ fontSize: 12 }} />
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


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

export function IrpfComparativoChart({ atual, otimizado }: Props) {
  if (!otimizado) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-600">
        Sem cenário otimizado disponível para comparação. Preencha itens de otimização para visualizar o gráfico.
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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


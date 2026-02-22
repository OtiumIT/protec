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
    <div className="h-72 w-full" role="img" aria-label="Gráfico comparativo entre situação atual e otimizada">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metrica" />
          <YAxis tickFormatter={(v) => formatCurrency(Number(v))} />
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
          <Legend />
          <Bar dataKey="atual" fill="#0ea5e9" name="Situação atual" />
          <Bar dataKey="otimizado" fill="#22c55e" name="Situação otimizada" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


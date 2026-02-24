import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type Props = {
  composicao?: {
    tributaveis: number;
    isentos_que_entram_base: number;
    isentos_excluidos: number;
  };
};

const COLOR_BY_NAME: Record<string, string> = {
  Tributáveis: '#0ea5e9',
  'Isentos que entram na base': '#f59e0b',
  'Isentos excluídos (Art. 16-A §1º)': '#10b981',
  'Outros (<2%)': '#a855f7',
};

export function IrpfComposicaoChart({ composicao }: Props) {
  if (!composicao) return null;
  const total = composicao.tributaveis + composicao.isentos_que_entram_base + composicao.isentos_excluidos;
  if (total <= 0) return null;

  const base = [
    { name: 'Tributáveis', value: composicao.tributaveis },
    { name: 'Isentos que entram na base', value: composicao.isentos_que_entram_base },
    { name: 'Isentos excluídos (Art. 16-A §1º)', value: composicao.isentos_excluidos },
  ].filter((x) => x.value > 0);

  const principal = base.filter((x) => (x.value / total) * 100 >= 2);
  const residual = base
    .filter((x) => (x.value / total) * 100 < 2)
    .reduce((acc, item) => acc + item.value, 0);
  const data = residual > 0 ? [...principal, { name: 'Outros (<2%)', value: residual }] : principal;

  return (
    <div className="h-72 w-full" role="img" aria-label="Gráfico de composição da renda para base de cálculo">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={105}
            label={({ name, percent }) => (percent >= 0.02 ? `${(percent * 100).toFixed(0)}%` : '')}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLOR_BY_NAME[entry.name] ?? '#64748b'} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


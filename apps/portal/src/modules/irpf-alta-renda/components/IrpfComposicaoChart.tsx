import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type Props = {
  composicao?: {
    tributaveis: number;
    isentos_que_entram_base: number;
    dividendos_09_13?: number;
    isentos_excluidos: number;
    tributacao_exclusiva_lei_7713?: number;
  };
};

const COLOR_BY_NAME: Record<string, string> = {
  Tributáveis: '#0ea5e9',
  'Dividendos/Lucros (09 e 13)': '#f59e0b',
  'Outros isentos na base': '#eab308',
  'Isentos que entram na base': '#f59e0b',
  'Isentos excluídos (CRI/LCI/LCA/Art. 16-A)': '#10b981',
  'Tributação exclusiva Lei 7.713': '#8b5cf6',
  'Outros (<2%)': '#a855f7',
};

export function IrpfComposicaoChart({ composicao }: Props) {
  if (!composicao) return null;
  const dividendos = composicao.dividendos_09_13 ?? 0;
  const outrosIsentosBase = Math.max(0, (composicao.isentos_que_entram_base ?? 0) - dividendos);
  const lei7713 = composicao.tributacao_exclusiva_lei_7713 ?? 0;
  const total =
    composicao.tributaveis +
    composicao.isentos_que_entram_base +
    composicao.isentos_excluidos +
    lei7713;
  if (total <= 0) return null;

  const hasSplit =
    composicao.dividendos_09_13 !== undefined &&
    (composicao.dividendos_09_13 > 0 || outrosIsentosBase > 0);
  const base = [
    { name: 'Tributáveis', value: composicao.tributaveis },
    ...(hasSplit && dividendos > 0 ? [{ name: 'Dividendos/Lucros (09 e 13)', value: dividendos }] : []),
    ...(hasSplit && outrosIsentosBase > 0 ? [{ name: 'Outros isentos na base', value: outrosIsentosBase }] : []),
    ...(!hasSplit && composicao.isentos_que_entram_base > 0
      ? [{ name: 'Isentos que entram na base', value: composicao.isentos_que_entram_base }]
      : []),
    { name: 'Isentos excluídos (CRI/LCI/LCA/Art. 16-A)', value: composicao.isentos_excluidos },
    ...(lei7713 > 0 ? [{ name: 'Tributação exclusiva Lei 7.713', value: lei7713 }] : []),
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
            label={({ percent }) => (percent >= 0.02 ? `${(percent * 100).toFixed(0)}%` : '')}
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


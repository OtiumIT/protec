import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ComparativoPfPj } from '@shared/core';

type Props = {
  comparativo?: ComparativoPfPj | null;
};

export function IrpfCustoPfPjChart({ comparativo }: Props) {
  if (!comparativo) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Comparativo PF vs PJ</p>
        <p className="mt-1 text-xs">
          Preencha &quot;Valor hipotético para comparativo&quot; ou inclua rendimentos Lei 7.713 para exibir o gráfico.
        </p>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const data = [
    {
      cenario: 'PF (trib. exclusiva)',
      imposto: comparativo.cenario_pf_tributacao_exclusiva.imposto_total,
      liquido: comparativo.cenario_pf_tributacao_exclusiva.rendimento_liquido,
      irrf: comparativo.cenario_pf_tributacao_exclusiva.irrf,
    },
    {
      cenario: 'PF (entra na base)',
      imposto: comparativo.cenario_pf_entra_base.imposto_total,
      liquido: comparativo.cenario_pf_entra_base.rendimento_liquido,
      irrf: comparativo.cenario_pf_entra_base.irrf_compensavel,
    },
    {
      cenario: 'Pessoa Jurídica (PJ)',
      imposto:
        comparativo.cenario_pj.irpj +
        comparativo.cenario_pj.adicional_irpj +
        comparativo.cenario_pj.csll,
      liquido: comparativo.cenario_pj.rendimento_liquido,
      irrf: 0,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        PF (trib. exclusiva): CDB/JCP — IRRF na fonte, sem impacto na BCC. PF (entra na base): aplicação aumenta IRPFM.
        Base: {formatCurrency(comparativo.rendimento_bruto)}.
      </p>
      <div className="h-56 w-full" role="img" aria-label="Comparativo custo tributário PF vs PJ">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="cenario" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) =>
                v >= 1_000_000
                  ? `R$ ${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000
                    ? `R$ ${(v / 1_000).toFixed(0)}k`
                    : formatCurrency(v)
              }
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend />
            <Bar dataKey="imposto" fill="#dc2626" name="Imposto total" radius={[4, 4, 0, 0]} />
            <Bar dataKey="liquido" fill="#16a34a" name="Rendimento líquido" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Carga PJ (Lucro Presumido): {comparativo.cenario_pj.carga_efetiva_percentual.toFixed(1)}%
        (IRPJ + Adicional + CSLL). A PJ paga{' '}
        {comparativo.diferenca_percentual_pj_mais_caro > 0
          ? `${comparativo.diferenca_percentual_pj_mais_caro.toFixed(1)}% a mais`
          : 'o mesmo ou menos'}
        {' '}de imposto em relação ao cenário PF (tributação exclusiva) para esta aplicação.
      </div>
      <p className="text-xs text-slate-500">
        Escopo: comparativo considera apenas receitas financeiras em Lucro Presumido (100% na base, sem presunção).
        LC 224/2025 altera presunção para receita operacional &gt; R$ 5 MM; não afeta receitas financeiras.
      </p>
    </div>
  );
}

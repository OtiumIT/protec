import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import type { ComparativoParcelamento as ComparativoType, ParcelamentoPGFN } from '../services/rating-validator.service';

interface Props {
  comparativo: ComparativoType;
  parcelamento: ParcelamentoPGFN;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2).replace('.', ',')}%`;

const getRatingColor = (rating: 'A' | 'B' | 'C' | 'D') => {
  switch (rating) {
    case 'A':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'B':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'C':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'D':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

const getRatingLabel = (rating: 'A' | 'B' | 'C' | 'D') => {
  switch (rating) {
    case 'A':
      return 'Excelente';
    case 'B':
      return 'Boa';
    case 'C':
      return 'Regular';
    case 'D':
      return 'Insuficiente';
    default:
      return '';
  }
};

export function ComparativoParcelamento({ comparativo, parcelamento }: Props) {
  const { divergencia, cenario_calculado, cenario_pgfn, diferenca_financeira } = comparativo;

  return (
    <div className="space-y-6 pdf-keep-together">
      {/* Header com ratings lado a lado */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Comparativo: Enquadramento Revisado vs PGFN</h2>
        
        <div className="flex flex-wrap items-center justify-center gap-8 mb-6">
          {/* Rating Calculado */}
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-2">Enquadramento Revisado</p>
            <div className={`rounded-xl border-2 px-8 py-4 ${getRatingColor(comparativo.rating_calculado)}`}>
              <span className="block text-4xl font-bold">{comparativo.rating_calculado}</span>
              <span className="text-sm opacity-90">{getRatingLabel(comparativo.rating_calculado)}</span>
            </div>
          </div>

          <span className="text-slate-400 text-3xl font-light">vs</span>

          {/* Rating PGFN */}
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-2">Enquadramento PGFN</p>
            <div className={`rounded-xl border-2 px-8 py-4 ${getRatingColor(comparativo.rating_pgfn)} ${
              divergencia ? 'ring-2 ring-rose-300' : ''
            }`}>
              <span className="block text-4xl font-bold">{comparativo.rating_pgfn}</span>
              <span className="text-sm opacity-90">{getRatingLabel(comparativo.rating_pgfn)}</span>
            </div>
          </div>
        </div>

        {divergencia && (
          <div className="py-3 px-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3">
            <span className="text-rose-500 text-xl" aria-hidden>!</span>
            <p className="text-sm text-rose-800">
              <strong>Divergencia detectada:</strong> O rating calculado ({comparativo.rating_calculado}) 
              difere do rating do parcelamento PGFN ({comparativo.rating_pgfn}). 
              Isso pode indicar oportunidade de revisao do enquadramento.
            </p>
          </div>
        )}
      </Card>

      {/* Dados do Parcelamento PGFN */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Dados do Parcelamento PGFN</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600"><strong>Razao Social:</strong> {parcelamento.razao_social}</p>
            <p className="text-sm text-slate-600"><strong>CNPJ:</strong> {parcelamento.cnpj}</p>
            <p className="text-sm text-slate-600"><strong>Data de Adesao:</strong> {parcelamento.data_adesao}</p>
            <p className="text-sm text-slate-600"><strong>Modalidade:</strong> {parcelamento.modalidade}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600"><strong>Capacidade em 60 meses:</strong> {formatCurrency(parcelamento.capacidade_pagamento.capacidade_60_meses)}</p>
            <p className="text-sm text-slate-600"><strong>Permite Desconto:</strong> {parcelamento.capacidade_pagamento.permite_desconto ? 'Sim' : 'Nao'}</p>
            <p className="text-sm text-slate-600"><strong>Desconto Maximo:</strong> {formatPercent(parcelamento.capacidade_pagamento.desconto_maximo_pct)}</p>
          </div>
        </div>
      </Card>

      {/* Tabela Comparativa de Cenarios */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo de Cenarios</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left p-3 font-semibold text-slate-700">Indicador</th>
                <th className="text-center p-3 font-semibold text-emerald-700 bg-emerald-50">
                  Cenario Calculado ({comparativo.rating_calculado})
                </th>
                <th className="text-center p-3 font-semibold text-blue-700 bg-blue-50">
                  Cenario PGFN ({comparativo.rating_pgfn})
                </th>
                <th className="text-center p-3 font-semibold text-slate-700">Diferenca</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-3 text-slate-700">Desconto Max. Multa/Juros</td>
                <td className="p-3 text-center font-medium text-emerald-700 bg-emerald-50/50">
                  {formatPercent(cenario_calculado.desconto_maximo_multa_juros_pct)}
                </td>
                <td className="p-3 text-center font-medium text-blue-700 bg-blue-50/50">
                  {formatPercent(cenario_pgfn.desconto_aplicado_pct)}
                </td>
                <td className="p-3 text-center">
                  {cenario_calculado.desconto_maximo_multa_juros_pct > cenario_pgfn.desconto_aplicado_pct ? (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      +{formatPercent(cenario_calculado.desconto_maximo_multa_juros_pct - cenario_pgfn.desconto_aplicado_pct)}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-3 text-slate-700">Prazo Maximo (meses)</td>
                <td className="p-3 text-center font-medium text-emerald-700 bg-emerald-50/50">
                  {cenario_calculado.prazo_maximo_meses}
                </td>
                <td className="p-3 text-center font-medium text-blue-700 bg-blue-50/50">
                  {cenario_pgfn.parcelas_qtd}
                </td>
                <td className="p-3 text-center">
                  {diferenca_financeira.parcelas_extras_disponiveis > 0 ? (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      +{diferenca_financeira.parcelas_extras_disponiveis} parcelas
                    </Badge>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="p-3 text-slate-700">Entrada Minima</td>
                <td className="p-3 text-center font-medium text-emerald-700 bg-emerald-50/50">
                  {formatPercent(cenario_calculado.entrada_minima_pct)}
                </td>
                <td className="p-3 text-center font-medium text-blue-700 bg-blue-50/50">
                  {formatPercent(cenario_pgfn.entrada_pct)}
                </td>
                <td className="p-3 text-center">
                  {diferenca_financeira.valor_excedente_entrada > 0 ? (
                    <Badge className="bg-amber-100 text-amber-700">
                      Excesso: {formatCurrency(diferenca_financeira.valor_excedente_entrada)}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Valores do Parcelamento */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Valores do Parcelamento Concedido</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Valor Total Divida</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(cenario_pgfn.valor_total_divida)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Entrada</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(cenario_pgfn.entrada_total)}</p>
            <p className="text-xs text-slate-500">({parcelamento.pagamento.entrada_qtd}x {formatCurrency(parcelamento.pagamento.entrada_valor)})</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Parcelas</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(cenario_pgfn.parcelas_valor)}</p>
            <p className="text-xs text-slate-500">({cenario_pgfn.parcelas_qtd}x)</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total a Pagar</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(cenario_pgfn.total_a_pagar)}</p>
          </div>
        </div>
      </Card>

      {/* Economia Potencial */}
      {diferenca_financeira.economia_potencial > 0 && (
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <h3 className="text-lg font-semibold text-emerald-800 mb-2">Economia Potencial Identificada</h3>
          <p className="text-3xl font-bold text-emerald-700">{formatCurrency(diferenca_financeira.economia_potencial)}</p>
          <p className="text-sm text-emerald-600 mt-2">
            Valor estimado de economia caso o rating correto ({comparativo.rating_calculado}) fosse aplicado, 
            considerando o desconto maximo de {formatPercent(cenario_calculado.desconto_maximo_multa_juros_pct)} sobre multa e juros.
          </p>
        </Card>
      )}

      {/* Fundamentacao Juridica */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Fundamentacao Juridica</h3>
        <div className="prose prose-sm prose-slate max-w-none">
          {comparativo.fundamentacao_juridica.split('\n').map((paragraph, idx) => (
            <p key={idx} className="text-slate-700 mb-2 whitespace-pre-wrap">{paragraph}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}

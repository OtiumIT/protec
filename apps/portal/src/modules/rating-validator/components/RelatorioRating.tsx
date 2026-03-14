import { forwardRef } from 'react';
import type { 
  RatingSimulationResult, 
  ComparativoParcelamento as ComparativoType, 
  ParcelamentoPGFN 
} from '../services/rating-validator.service';

interface Props {
  result: RatingSimulationResult;
  parcelamento?: ParcelamentoPGFN;
  comparativo?: ComparativoType;
  clientName?: string;
  competencia?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => `${(value * 100).toFixed(2).replace('.', ',')}%`;

const formatNumber = (value: number, decimals = 2) => 
  value.toFixed(decimals).replace('.', ',');

const getRatingLabel = (rating: 'A' | 'B' | 'C' | 'D') => {
  switch (rating) {
    case 'A': return 'Excelente';
    case 'B': return 'Boa';
    case 'C': return 'Regular';
    case 'D': return 'Insuficiente';
    default: return '';
  }
};

export const RelatorioRating = forwardRef<HTMLDivElement, Props>(
  ({ result, parcelamento, comparativo, clientName, competencia }, ref) => {
    const hoje = new Date().toLocaleDateString('pt-BR');

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
        {/* Cabecalho */}
        <header className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Relatorio de Analise de Capacidade de Pagamento</h1>
              <p className="text-sm text-slate-600">Rating PGFN (CAPAG) - Portaria PGFN n. 6.757/2022</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>Data: {hoje}</p>
              {competencia && <p>Competencia: {competencia}</p>}
            </div>
          </div>
          {clientName && (
            <p className="mt-2 text-lg font-medium text-slate-800">Cliente: {clientName}</p>
          )}
        </header>

        {/* Resumo do Rating */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            1. Resultado da Analise
          </h2>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Enquadramento Revisado</p>
              <div className="w-20 h-20 rounded-lg border-2 border-slate-800 flex items-center justify-center">
                <span className="text-4xl font-bold">{result.rating_estimado}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{getRatingLabel(result.rating_estimado)}</p>
            </div>
            {result.rating_real && (
              <>
                <span className="text-2xl text-slate-400">vs</span>
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-1">Enquadramento RF</p>
                  <div className={`w-20 h-20 rounded-lg border-2 flex items-center justify-center ${
                    result.has_discrepancy ? 'border-red-500' : 'border-slate-800'
                  }`}>
                    <span className="text-4xl font-bold">{result.rating_real}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{getRatingLabel(result.rating_real)}</p>
                </div>
              </>
            )}
          </div>
          {result.has_discrepancy && (
            <p className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded">
              <strong>Atencao:</strong> Divergencia detectada entre o rating calculado e o informado.
            </p>
          )}
        </section>

        {/* Indicadores Financeiros */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            2. Indicadores Financeiros
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">Indicador</th>
                <th className="border border-slate-300 p-2 text-center">Formula</th>
                <th className="border border-slate-300 p-2 text-center">Valor</th>
                <th className="border border-slate-300 p-2 text-center">Classificacao</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2">Liquidez Corrente</td>
                <td className="border border-slate-300 p-2 text-center">AC / PC</td>
                <td className="border border-slate-300 p-2 text-center font-mono">
                  {formatNumber(result.indicators.liquidez_corrente)}
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {result.indicator_analysis?.find(i => i.id === 'liquidez_corrente')?.level || '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">Liquidez Geral</td>
                <td className="border border-slate-300 p-2 text-center">(AC + RLP) / (PC + PNC)</td>
                <td className="border border-slate-300 p-2 text-center font-mono">
                  {formatNumber(result.indicators.liquidez_geral)}
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {result.indicator_analysis?.find(i => i.id === 'liquidez_geral')?.level || '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">Solvencia</td>
                <td className="border border-slate-300 p-2 text-center">PL / AT</td>
                <td className="border border-slate-300 p-2 text-center font-mono">
                  {formatPercent(result.indicators.solvencia)}
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {result.indicator_analysis?.find(i => i.id === 'solvencia')?.level || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Valores do Balanco */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">
            3. Valores do Balanco Patrimonial
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-slate-700 mb-2">Ativo</h3>
              <table className="w-full">
                <tbody>
                  <tr><td>Ativo Circulante</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.ativo_circulante_total)}</td></tr>
                  <tr><td>Realizavel LP</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.realizavel_longo_prazo_total)}</td></tr>
                  <tr className="font-semibold border-t border-slate-300"><td>Ativo Total</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.ativo_total)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="font-medium text-slate-700 mb-2">Passivo e PL</h3>
              <table className="w-full">
                <tbody>
                  <tr><td>Passivo Circulante</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.passivo_circulante_total)}</td></tr>
                  <tr><td>Passivo Nao Circulante</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.passivo_nao_circulante_total)}</td></tr>
                  <tr><td>Patrimonio Liquido</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.patrimonio_liquido_total)}</td></tr>
                  <tr className="font-semibold border-t border-slate-300"><td>Passivo Total</td><td className="text-right font-mono">{formatCurrency(result.calculated_values.passivo_total)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Comparativo PGFN (se disponivel) */}
        {comparativo && parcelamento && (
          <section className="mb-6 break-before-page print:break-before-page">
            <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">
              4. Comparativo com Parcelamento PGFN
            </h2>
            
            <div className="mb-4">
              <p className="text-sm"><strong>Razao Social:</strong> {parcelamento.razao_social}</p>
              <p className="text-sm"><strong>CNPJ:</strong> {parcelamento.cnpj}</p>
              <p className="text-sm"><strong>Modalidade:</strong> {parcelamento.modalidade}</p>
              <p className="text-sm"><strong>Data de Adesao:</strong> {parcelamento.data_adesao}</p>
            </div>

            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Indicador</th>
                  <th className="border border-slate-300 p-2 text-center">Cenario Calculado ({comparativo.rating_calculado})</th>
                  <th className="border border-slate-300 p-2 text-center">Cenario PGFN ({comparativo.rating_pgfn})</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2">Desconto Max. Multa/Juros</td>
                  <td className="border border-slate-300 p-2 text-center">{comparativo.cenario_calculado.desconto_maximo_multa_juros_pct}%</td>
                  <td className="border border-slate-300 p-2 text-center">{comparativo.cenario_pgfn.desconto_aplicado_pct.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2">Prazo Maximo (meses)</td>
                  <td className="border border-slate-300 p-2 text-center">{comparativo.cenario_calculado.prazo_maximo_meses}</td>
                  <td className="border border-slate-300 p-2 text-center">{comparativo.cenario_pgfn.parcelas_qtd}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2">Entrada Minima</td>
                  <td className="border border-slate-300 p-2 text-center">{comparativo.cenario_calculado.entrada_minima_pct}%</td>
                  <td className="border border-slate-300 p-2 text-center">{comparativo.cenario_pgfn.entrada_pct.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>

            {comparativo.diferenca_financeira.economia_potencial > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded mb-4">
                <p className="text-green-800 font-semibold">
                  Economia Potencial: {formatCurrency(comparativo.diferenca_financeira.economia_potencial)}
                </p>
              </div>
            )}

            <div className="text-sm text-slate-700">
              <h3 className="font-medium mb-2">Fundamentacao Juridica:</h3>
              {comparativo.fundamentacao_juridica.split('\n').map((p, i) => (
                <p key={i} className="mb-1">{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Rodape */}
        <footer className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-500">
          <p><strong>Base Legal:</strong> Portaria PGFN n. 6.757, de 29 de julho de 2022 - Regulamenta a transacao na cobranca de creditos da Uniao.</p>
          <p><strong>Lei n. 13.988/2020:</strong> Institui a transacao tributaria na esfera federal.</p>
          <p className="mt-2 italic">Este relatorio foi gerado automaticamente com base nos dados fornecidos e nao substitui a analise tecnica de um profissional.</p>
        </footer>
      </div>
    );
  }
);

RelatorioRating.displayName = 'RelatorioRating';

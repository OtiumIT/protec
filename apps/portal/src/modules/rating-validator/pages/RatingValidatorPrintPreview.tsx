import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { ReportCoverSection } from '../../../lib/report-pdf/ReportCoverSection';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';
import type { RatingSimulationResult } from '../services/rating-validator.service';

const FALLBACK_THRESHOLDS: Record<string, { D: string; C: string; B: string; A: string }> = {
  liquidez_corrente: { D: '≥ 0', C: '≥ 1,00', B: '≥ 1,50', A: '≥ 2,00' },
  liquidez_geral: { D: '≥ 0', C: '≥ 1,00', B: '≥ 1,20', A: '≥ 1,50' },
  solvencia: { D: '≥ 0', C: '≥ 10%', B: '≥ 30%', A: '≥ 50%' },
};
const THRESHOLD_MINS: Record<string, { D: number; C: number; B: number; A: number }> = {
  liquidez_corrente: { D: 0, C: 1, B: 1.5, A: 2 },
  liquidez_geral: { D: 0, C: 1, B: 1.2, A: 1.5 },
  solvencia: { D: 0, C: 0.1, B: 0.3, A: 0.5 },
};
const EPS = 1e-9;

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function formatNumber(v: number, d = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
}
function formatPercent(v: number) {
  return `${formatNumber(v * 100, 2)}%`;
}
function getRatingColor(r: 'A' | 'B' | 'C' | 'D') {
  const c: Record<string, string> = { A: 'bg-emerald-100 text-emerald-800 border-emerald-300', B: 'bg-sky-100 text-sky-800 border-sky-300', C: 'bg-amber-100 text-amber-800 border-amber-300', D: 'bg-rose-100 text-rose-800 border-rose-300' };
  return c[r] || '';
}

interface PrintState {
  simulationResult: RatingSimulationResult;
  debtAmount?: number;
  debtSimulations?: Record<'A' | 'B' | 'C' | 'D', { entryAmount: number; monthlyPayment: number; savings: number; maxMonths: number }>;
}

export function RatingValidatorPrintPreview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [printing, setPrinting] = useState(false);
  const data = state as PrintState | null;
  const { print } = useReportPrint('rating-print-wrapper');

  const handlePrint = () => {
    setPrinting(true);
    print({ afterPrint: () => setPrinting(false) });
  };

  if (!data?.simulationResult) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <p className="text-slate-600 mb-4">Execute uma simulação primeiro para ver o layout de impressão.</p>
          <button onClick={() => navigate('/rating-validator')} className="text-brand font-medium hover:underline">
            ← Voltar ao Transação Tributária
          </button>
        </div>
      </div>
    );
  }

  const res = data.simulationResult;
  const real = res.rating_real;
  const estimado = res.rating_estimado;
  const atendeNivel = (item: { id: string; value: number }, lvl: 'D' | 'C' | 'B' | 'A') => {
    const mins = THRESHOLD_MINS[item.id];
    return mins ? item.value >= mins[lvl] - EPS : lvl === 'D';
  };
  const getThreshold = (item: { id: string; thresholds_by_level?: { D?: string; C?: string; B?: string; A?: string } }, lvl: 'D' | 'C' | 'B' | 'A') =>
    item.thresholds_by_level?.[lvl] ?? FALLBACK_THRESHOLDS[item.id]?.[lvl] ?? '-';
  const colsToShow =
    real && real !== estimado
      ? [
          { key: 'revisado' as const, label: `Revisado (${estimado})`, level: estimado },
          { key: 'rf' as const, label: `RF (${real})`, level: real },
        ]
      : [{ key: 'revisado' as const, label: `Revisado (${estimado})`, level: estimado }];

  return (
    <div className="min-h-screen bg-slate-200 py-4">
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg">
        {/* Barra de ações */}
        <div className="sticky top-0 z-10 bg-slate-800 text-white px-4 py-2 flex items-center justify-between gap-4 print:hidden">
          <button onClick={() => navigate('/rating-validator', { state })} className="text-sm font-medium hover:underline">
            ← Voltar
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="px-4 py-2 rounded-lg bg-brand text-white font-medium hover:opacity-90 disabled:opacity-60"
          >
            {printing ? 'Preparando...' : 'Imprimir / Exportar PDF'}
          </button>
        </div>

        <div id="rating-print-wrapper" className="report-print-wrapper">
          <ReportPrintHeader
            variant="printSheet"
            reportTitle="Transação Tributária — Rating Validator"
            metaLine={[
              `Rating estimado: ${estimado}`,
              real ? `Rating RF: ${real}` : null,
              `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            ].filter(Boolean).join(' · ')}
          />
          <ReportCoverSection
            variant="previewModal"
            title="Transação Tributária — Análise da capacidade de pagamento"
            details={[
              { label: 'Rating estimado', value: estimado },
              ...(real ? [{ label: 'Rating RF', value: real }] : []),
              ...(res.has_discrepancy ? [{ label: 'Discrepância', value: 'Sim — fundamenta revisão' }] : []),
            ]}
          />

          <div className="report-resultado-content space-y-4 p-4">
            {/* Indicadores */}
            <div className="keep grid grid-cols-3 gap-2 mb-3">
              <div className="rounded border border-slate-200 p-2">
                <p className="text-[10px] uppercase text-slate-500 font-medium">Liquidez Corrente</p>
                <p className="text-xl font-bold">{formatNumber(res.indicators.liquidez_corrente, 2)}</p>
                <p className="text-[10px] text-slate-500">AC ÷ PC</p>
              </div>
              <div className="rounded border border-slate-200 p-2">
                <p className="text-[10px] uppercase text-slate-500 font-medium">Liquidez Geral</p>
                <p className="text-xl font-bold">{formatNumber(res.indicators.liquidez_geral, 2)}</p>
                <p className="text-[10px] text-slate-500">(AC+RLP)÷(PC+PNC)</p>
              </div>
              <div className="rounded border border-slate-200 p-2">
                <p className="text-[10px] uppercase text-slate-500 font-medium">Solvência</p>
                <p className="text-xl font-bold">{formatPercent(res.indicators.solvencia)}</p>
                <p className="text-[10px] text-slate-500">PL ÷ Ativo</p>
              </div>
            </div>

            {/* Rating */}
            <div className="keep flex flex-wrap items-center gap-3 mb-3">
              <div className={`rounded border-2 px-4 py-2 ${getRatingColor(estimado)}`}>
                <span className="block text-xl font-bold">{estimado}</span>
                <span className="block text-[10px]">Revisado</span>
              </div>
              {real && (
                <>
                  <span className="text-slate-400 text-sm">vs</span>
                  <div className={`rounded border-2 px-4 py-2 ${getRatingColor(real)} ${res.has_discrepancy ? 'ring-2 ring-rose-400' : ''}`}>
                    <span className="block text-xl font-bold">{real}</span>
                    <span className="block text-[10px]">RF</span>
                  </div>
                </>
              )}
            </div>

            {res.has_discrepancy && real && (
              <div className="keep py-2 px-3 rounded bg-rose-50 border border-rose-200 mb-3">
                <p className="text-xs text-rose-800 font-medium">
                  Discrepância: indicadores sustentam Revisado ({estimado}), distinto da RF ({real}). Fundamenta revisão (art. 30, Portaria 6.757/2022).
                </p>
              </div>
            )}

            {/* Comparativo */}
            {res.indicator_analysis && res.indicator_analysis.length > 0 && (
              <div className="keep mb-3">
                <h3 className="text-sm font-semibold mb-1">Comparativo Revisado vs RF</h3>
                <table className="w-full text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-2 font-semibold border-b border-r border-slate-200">Indicador</th>
                      <th className="text-center p-2 font-semibold border-b border-r border-slate-200">Valor</th>
                      {colsToShow.map((c) => (
                        <th key={c.key} className="text-center p-2 font-semibold border-b border-slate-200">
                          {c.label}
                        </th>
                      ))}
                      <th className="text-left p-2 font-semibold border-b border-slate-200">Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.indicator_analysis.map((item) => {
                      const discrepante = real && real !== estimado && !atendeNivel(item, real);
                      const obs = discrepante ? 'Não atende RF' : real && real !== estimado ? 'Atende ambos' : 'Atende';
                      return (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="p-2 border-r border-slate-100">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-[10px] text-slate-500">{item.formula}</div>
                          </td>
                          <td className="p-2 text-center font-mono font-bold border-r border-slate-100">
                            {item.id === 'solvencia' ? formatPercent(item.value) : formatNumber(item.value, 2)}
                          </td>
                          {colsToShow.map((c) => {
                            const atende = c.key === 'revisado' ? atendeNivel(item, estimado) : atendeNivel(item, real!);
                            return (
                              <td key={c.key} className={`p-2 text-center border-r border-slate-100 ${discrepante && c.key === 'rf' ? 'bg-rose-50' : ''}`}>
                                <div className="font-medium">{getThreshold(item, c.level)}</div>
                                <div className={`text-[10px] ${atende ? 'text-emerald-600' : 'text-rose-600'}`}>{atende ? '✓' : '✗'}</div>
                              </td>
                            );
                          })}
                          <td className={`p-2 text-[10px] ${discrepante ? 'text-rose-700 font-medium' : 'text-slate-600'}`}>{obs}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-600 mt-1">
                  Uso jurídico: Revisado ({estimado}). {real && real !== estimado && `Divergência com RF (${real}) fundamenta pedido de revisão.`}
                </p>
              </div>
            )}

            {/* Memória de Cálculo */}
            <div className="keep mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Memória de Cálculo</h3>
              <p className="text-[10px] text-slate-600 mb-2">
                Metodologia baseada na <strong>Portaria PGFN nº 6.757, de 29 de julho de 2022</strong>, que regulamenta a transação na cobrança de créditos da União e do FGTS e dispõe sobre a aferição da capacidade de pagamento para fins de negociação.
              </p>
              <div className="space-y-3">
                <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
                  <p className="font-medium text-slate-800 text-xs mb-1">Liquidez Corrente</p>
                  <div className="font-mono text-[10px] bg-white rounded p-1.5 border border-slate-200">
                    {formatCurrency(res.calculated_values.ativo_circulante_total)}
                    <span className="text-slate-400 mx-1">÷</span>
                    {formatCurrency(res.calculated_values.passivo_circulante_total)}
                    <span className="text-slate-400 mx-1">=</span>
                    <strong className="text-emerald-700">{formatNumber(res.indicators.liquidez_corrente, 2)}</strong>
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
                  <p className="font-medium text-slate-800 text-xs mb-1">Liquidez Geral</p>
                  <div className="font-mono text-[10px] bg-white rounded p-1.5 border border-slate-200">
                    ({formatCurrency(res.calculated_values.ativo_circulante_total)} + {formatCurrency(res.calculated_values.realizavel_longo_prazo_total)})
                    <span className="text-slate-400 mx-1">÷</span>
                    ({formatCurrency(res.calculated_values.passivo_circulante_total)} + {formatCurrency(res.calculated_values.passivo_nao_circulante_total)})
                    <span className="text-slate-400 mx-1">=</span>
                    <strong className="text-emerald-700">{formatNumber(res.indicators.liquidez_geral, 2)}</strong>
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
                  <p className="font-medium text-slate-800 text-xs mb-1">Solvência</p>
                  <div className="font-mono text-[10px] bg-white rounded p-1.5 border border-slate-200">
                    {formatCurrency(res.calculated_values.patrimonio_liquido_total)}
                    <span className="text-slate-400 mx-1">÷</span>
                    {formatCurrency(res.calculated_values.ativo_total)}
                    <span className="text-slate-400 mx-1">=</span>
                    <strong className="text-emerald-700">{formatPercent(res.indicators.solvencia)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Embasamento Legal */}
            <div className="keep mb-4 bg-slate-50/80 border border-slate-200 rounded p-3">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Embasamento legal</h3>
              <div className="space-y-2 text-[10px] text-slate-700 leading-relaxed">
                <p>
                  Metodologia alinhada à <strong>Portaria PGFN nº 6.757/2022</strong>. Classificações C/D: possibilidade de descontos e prazo ampliado. Base: Lei 13.988/2020, Portaria PGFN 6.757/2022, Portaria PGFN 1.241/2023.
                </p>
              </div>
            </div>

            {/* Impacto parcelamento */}
            {data.debtAmount && data.debtAmount > 0 && data.debtSimulations && real && real !== estimado && (
              <div className="keep">
                <h3 className="text-sm font-semibold mb-1">Impacto no Parcelamento</h3>
                <p className="text-[10px] text-slate-600 mb-1">Dívida: {formatCurrency(data.debtAmount)}</p>
                <table className="w-full text-xs border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-2 font-semibold border-b border-r border-slate-200">Condição</th>
                      <th className="text-center p-2 font-semibold border-b border-r border-slate-200">Revisado</th>
                      <th className="text-center p-2 font-semibold border-b border-slate-200">RF</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-2 border-r border-slate-100">Entrada</td>
                      <td className="p-2 text-center border-r border-slate-100 font-mono">{formatCurrency(data.debtSimulations[estimado].entryAmount)}</td>
                      <td className="p-2 text-center font-mono">{formatCurrency(data.debtSimulations[real].entryAmount)}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-2 border-r border-slate-100">Parcela</td>
                      <td className="p-2 text-center border-r border-slate-100 font-mono">{formatCurrency(data.debtSimulations[estimado].monthlyPayment)}</td>
                      <td className="p-2 text-center font-mono">{formatCurrency(data.debtSimulations[real].monthlyPayment)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-100">Economia</td>
                      <td className="p-2 text-center border-r border-slate-100 font-mono text-emerald-600">{formatCurrency(data.debtSimulations[estimado].savings)}</td>
                      <td className="p-2 text-center font-mono text-emerald-600">{formatCurrency(data.debtSimulations[real].savings)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <ReportPrintFooter variant="printSheet" />
        </div>
      </div>
    </div>
  );
}

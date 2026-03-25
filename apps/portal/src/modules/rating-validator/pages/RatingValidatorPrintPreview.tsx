import { useLocation, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useState } from 'react';
import { buildReportPdfFilename, getDefaultReportHtml2PdfOptions } from '../../../lib/report-pdf';
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
  const [pdfExporting, setPdfExporting] = useState(false);
  const data = state as PrintState | null;

  const handleExportPdf = async () => {
    const el = document.getElementById('rating-print-content');
    if (!el) return;
    setPdfExporting(true);
    try {
      const filename = buildReportPdfFilename({ productSlug: 'Transacao-Tributaria' });
      const opt = getDefaultReportHtml2PdfOptions({ filename });
      await html2pdf().set(opt as any).from(el).save();
    } catch (e) {
      console.error(e);
    } finally {
      setPdfExporting(false);
    }
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
        {/* Barra de ações - fora do conteúdo impresso */}
        <div className="sticky top-0 z-10 bg-slate-800 text-white px-4 py-2 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/rating-validator', { state })} className="text-sm font-medium hover:underline">
            ← Voltar
          </button>
          <button
            onClick={handleExportPdf}
            disabled={pdfExporting}
            className="px-4 py-2 rounded-lg bg-brand text-white font-medium hover:opacity-90 disabled:opacity-60"
          >
            {pdfExporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>

        {/* Conteúdo para impressão - layout compacto */}
        <div
          id="rating-print-content"
          className="p-4 bg-white text-slate-900"
          style={{
            width: '210mm',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div className="keep flex items-center gap-3 border-b border-slate-200 pb-2 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">IATax — Transação Tributária</h1>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

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
                Uso jurídico: Revisado ({estimado}). {real && real !== estimado && `Divergência com RF ({real}) fundamenta pedido de revisão.`}
              </p>
            </div>
          )}

          {/* Memória de Cálculo - conforme tela principal */}
          <div className="keep mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Memória de Cálculo</h3>
            <p className="text-[10px] text-slate-600 mb-2">
              Metodologia baseada na <strong>Portaria PGFN nº 6.757, de 29 de julho de 2022</strong>, que regulamenta a transação na cobrança de créditos da União e do FGTS e dispõe sobre a aferição da capacidade de pagamento para fins de negociação.
            </p>
            <p className="text-[10px] text-slate-600 mb-3">
              Indicadores calculados a partir dos demonstrativos contábeis (Balanço Patrimonial) conforme critérios utilizados na análise de Capag Efetiva (arts. 30 e seguintes da Portaria 6.757/2022).
            </p>
            <div className="space-y-3">
              <div className="rounded border border-slate-200 bg-slate-50/50 p-2">
                <p className="font-medium text-slate-800 text-xs mb-1">Liquidez Corrente</p>
                <p className="text-[10px] text-slate-600 mb-1">
                  <strong>Fórmula:</strong> Ativo Circulante ÷ Passivo Circulante — mede a capacidade de pagar obrigações de curto prazo. Valores ≥ 1,0 indicam capacidade adequada.
                </p>
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
                <p className="text-[10px] text-slate-600 mb-1">
                  <strong>Fórmula:</strong> (Ativo Circulante + Realizável a LP) ÷ (Passivo Circulante + Passivo Não Circulante) — mede a capacidade de pagar todas as obrigações (curto e longo prazo).
                </p>
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
                <p className="text-[10px] text-slate-600 mb-1">
                  <strong>Fórmula:</strong> Patrimônio Líquido ÷ Ativo Total — mede a participação do capital próprio no ativo total. Valores mais altos indicam menor dependência de capital de terceiros.
                </p>
                <div className="font-mono text-[10px] bg-white rounded p-1.5 border border-slate-200">
                  {formatCurrency(res.calculated_values.patrimonio_liquido_total)}
                  <span className="text-slate-400 mx-1">÷</span>
                  {formatCurrency(res.calculated_values.ativo_total)}
                  <span className="text-slate-400 mx-1">=</span>
                  <strong className="text-emerald-700">{formatPercent(res.indicators.solvencia)}</strong>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded border border-amber-200 bg-amber-50/50 p-2">
              <p className="font-medium text-slate-800 text-xs mb-2">Regras de enquadramento (classificação A, B, C, D)</p>
              <p className="text-[10px] text-slate-600 mb-2">
                A classificação para transação segue critérios baseados na pontuação dos três indicadores (Portaria PGFN 6.757/2022). Cada indicador atribui pontos conforme o valor obtido:
              </p>
              <ul className="text-[10px] text-slate-700 space-y-0.5 list-disc list-inside">
                <li><strong>Liquidez Corrente:</strong> ≥ 2,0 (3 pts), ≥ 1,5 (2 pts), ≥ 1,0 (1 pt)</li>
                <li><strong>Liquidez Geral:</strong> ≥ 1,5 (3 pts), ≥ 1,2 (2 pts), ≥ 1,0 (1 pt)</li>
                <li><strong>Solvência:</strong> ≥ 0,5 (3 pts), ≥ 0,3 (2 pts), ≥ 0,1 (1 pt)</li>
              </ul>
              <p className="text-[10px] text-slate-600 mt-2">
                <strong>Classificação final:</strong> A (≥ 7 pts), B (5–6 pts), C (3–4 pts), D (&lt; 3 pts). As classificações A e B indicam capacidade de cumprir obrigações; C e D indicam dificuldade de quitação do passivo, com possibilidade de descontos e parcelamento ampliado.
              </p>
            </div>
          </div>

          {/* Embasamento Legal - conforme tela principal */}
          <div className="keep mb-4 bg-slate-50/80 border border-slate-200 rounded p-3">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Embasamento legal</h3>
            <p className="text-[9px] uppercase tracking-wide text-slate-500 mb-2">Fundamentação normativa para uso em peças e pareceres</p>
            <div className="space-y-2 text-[10px] text-slate-700 leading-relaxed">
              <p>
                O presente relatório utiliza metodologia alinhada à <strong>Portaria PGFN nº 6.757, de 29 de julho de 2022</strong>, que regulamenta a transação na cobrança de créditos da União e do FGTS. A capacidade de pagamento é o critério previsto em lei e utilizado pela Procuradoria-Geral da Fazenda Nacional (PGFN) e Receita Federal para conceder benefícios em negociações — como descontos e prazo alongado para pagamento (consultar: gov.br/pgfn — Serviços de orientação ao contribuinte).
              </p>
              <p>
                O contribuinte que discorda da classificação atribuída pela Receita Federal pode apresentar <strong>pedido de revisão de capacidade de pagamento</strong>, nos termos dos arts. 30 e seguintes da Portaria PGFN nº 6.757/2022, no prazo de 30 dias contados da ciência da classificação. O requerimento deve indicar o valor que entende correto, a metodologia de cálculo e comprovar com documentação (Balanço Patrimonial, DRE, DFC, relação de bens e direitos, extratos bancários e demais exigências do art. 30).
              </p>
              <p>
                As classificações <strong>A e B</strong> são atribuídas aos devedores que têm condições de cumprir as obrigações (negociação em até 60 meses, sem descontos). As classificações <strong>C e D</strong> aplicam-se quando a capacidade de pagamento não é suficiente para liquidar todo o passivo fiscal; nesses casos, a Fazenda Nacional pode conceder descontos e prazo ampliado, pois a dívida é considerada de difícil recuperação ou irrecuperável.
              </p>
              <p>
                Base legal: <strong>Lei nº 13.988/2020</strong> (transação tributária); <strong>Portaria PGFN nº 6.757/2022</strong> (regulamentação da transação e critérios de capacidade de pagamento); <strong>Portaria PGFN nº 1.241/2023</strong> (alterações); normas disponíveis em normas.receita.fazenda.gov.br.
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
      </div>
    </div>
  );
}

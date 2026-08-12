import { useState, useEffect, useCallback } from 'react';
import {
  comparativoRegimesService,
  type ComparativoRegimesInput,
} from '../services/comparativo-regimes.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { ShareSimulationButton } from '../../../shared/components/ui/ShareSimulationButton';
import { Modal } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { useToast } from '../../../shared/components/ui/Toast';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';
import { useBranding } from '../../../shared/hooks/useBranding';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ComparativoRegimesResult, ComparativoRegimesSimulation } from '@shared/core';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const REGIME_LABELS: Record<string, string> = {
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  simples_nacional: 'Simples Nacional',
};

const REGIME_COLORS: Record<string, string> = {
  lucro_presumido: '#3b82f6',
  lucro_real: '#10b981',
  simples_nacional: '#f59e0b',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function ComparativoRegimes() {
  const { success, error: showError, ToastContainer } = useToast();
  const branding = useBranding();
  const { print: doPrint } = useReportPrint('comparativo-regimes-print-wrapper');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(ComparativoRegimesResult & { simulation_id?: string }) | null>(null);
  const [simulations, setSimulations] = useState<ComparativoRegimesSimulation[]>([]);
  const [viewSimulation, setViewSimulation] = useState<ComparativoRegimesSimulation | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Input state
  const [ano, setAno] = useState(2026);
  const [faturamentoMensal, setFaturamentoMensal] = useState<number[]>(Array(12).fill(0));
  const [folhaMensal, setFolhaMensal] = useState<number[]>(Array(12).fill(0));
  const [custosDedutiveis, setCustosDedutiveis] = useState(0);
  const [cnae, setCnae] = useState('');
  const [issAliquota, setIssAliquota] = useState(5);
  const [regimeAtual, setRegimeAtual] = useState<'lucro_presumido' | 'lucro_real' | 'simples_nacional' | ''>('');
  const [title, setTitle] = useState('');

  const loadSimulations = useCallback(async () => {
    try {
      const data = await comparativoRegimesService.list({ limit: 50 });
      setSimulations(data.simulations);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  function buildInput(): ComparativoRegimesInput {
    return {
      faturamento_mensal: faturamentoMensal,
      folha_mensal: folhaMensal,
      custos_dedutiveis_mensal: custosDedutiveis,
      cnae: cnae || undefined,
      iss_aliquota: issAliquota,
      regime_atual: regimeAtual || undefined,
      ano,
      title: title || undefined,
    };
  }

  async function handleSimulate() {
    setLoading(true);
    try {
      const data = await comparativoRegimesService.simulate(buildInput());
      setResult(data);
      success('Simulação realizada com sucesso!');
    } catch (err: any) {
      showError(err.message || 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateAndSave() {
    setLoading(true);
    try {
      const data = await comparativoRegimesService.simulateAndSave(buildInput());
      setResult(data);
      success('Simulação salva com sucesso!');
      loadSimulations();
    } catch (err: any) {
      showError(err.message || 'Erro ao salvar simulação');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await comparativoRegimesService.delete(id);
      success('Simulação excluída');
      setDeleteConfirmId(null);
      loadSimulations();
    } catch (err: any) {
      showError(err.message || 'Erro ao excluir');
    }
  }

  function handleViewSimulation(sim: ComparativoRegimesSimulation) {
    setViewSimulation(sim);
  }

  function handleLoadSimulation(sim: ComparativoRegimesSimulation) {
    const input = sim.input_data as ComparativoRegimesInput;
    if (input.faturamento_mensal) setFaturamentoMensal(input.faturamento_mensal);
    if (input.folha_mensal) setFolhaMensal(input.folha_mensal);
    if (input.custos_dedutiveis_mensal !== undefined) setCustosDedutiveis(input.custos_dedutiveis_mensal);
    if (input.cnae) setCnae(input.cnae);
    if (input.iss_aliquota !== undefined) setIssAliquota(input.iss_aliquota);
    if (input.regime_atual) setRegimeAtual(input.regime_atual);
    if (input.ano) setAno(input.ano);
    setResult(sim.result_data as unknown as ComparativoRegimesResult);
    setViewSimulation(null);
    success('Dados carregados da simulação');
  }

  function setUniformValue(setter: React.Dispatch<React.SetStateAction<number[]>>, value: number) {
    setter(Array(12).fill(value));
  }

  const faturamentoAnual = faturamentoMensal.reduce((s, v) => s + v, 0);
  const folhaAnual = folhaMensal.reduce((s, v) => s + v, 0);

  const chartData = result
    ? [
        { regime: 'Lucro Presumido', carga: result.lucro_presumido.carga_total_anual, fill: REGIME_COLORS.lucro_presumido },
        { regime: 'Lucro Real', carga: result.lucro_real.carga_total_anual, fill: REGIME_COLORS.lucro_real },
        { regime: 'Simples Nacional', carga: result.simples_nacional.carga_total_anual, fill: REGIME_COLORS.simples_nacional },
      ]
    : [];

  const bestRegime = result?.regime_mais_economico as 'lucro_presumido' | 'lucro_real' | 'simples_nacional' | undefined;
  const worstRegime = result
    ? (['lucro_presumido', 'lucro_real', 'simples_nacional'] as const).reduce((worst, key) =>
        result[key].carga_total_anual > result[worst].carga_total_anual ? key : worst
      , 'lucro_presumido' as 'lucro_presumido' | 'lucro_real' | 'simples_nacional')
    : null;
  const economiaAnual = result && bestRegime && worstRegime
    ? result[worstRegime].carga_total_anual - result[bestRegime].carga_total_anual
    : 0;

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Comparativo de Regimes Tributários</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Compare a carga tributária entre Lucro Presumido, Lucro Real e Simples Nacional
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Lei 9.718/98
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              RIR/2018
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              LC 123/2006
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              LC 214/2025
            </span>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dados da Empresa</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-400">Ano:</label>
              <Input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-24"
                min={2020}
                max={2035}
              />
            </div>
          </div>

          {/* Faturamento Mensal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Faturamento Mensal (R$)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Preencher todos:</span>
                <MoneyInput
                  value={0}
                  onChange={(v) => setUniformValue(setFaturamentoMensal, v)}
                  className="w-36"
                  placeholder="Valor uniforme"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {MESES.map((mes, i) => (
                <div key={`fat-${i}`}>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{mes}</label>
                  <MoneyInput
                    value={faturamentoMensal[i]}
                    onChange={(v) => {
                      const next = [...faturamentoMensal];
                      next[i] = v;
                      setFaturamentoMensal(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total anual: <strong>{formatCurrency(faturamentoAnual)}</strong>
            </p>
          </div>

          {/* Folha Mensal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Folha de Pagamento Mensal (R$)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Preencher todos:</span>
                <MoneyInput
                  value={0}
                  onChange={(v) => setUniformValue(setFolhaMensal, v)}
                  className="w-36"
                  placeholder="Valor uniforme"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {MESES.map((mes, i) => (
                <div key={`folha-${i}`}>
                  <label className="text-xs text-gray-500 dark:text-gray-400">{mes}</label>
                  <MoneyInput
                    value={folhaMensal[i]}
                    onChange={(v) => {
                      const next = [...folhaMensal];
                      next[i] = v;
                      setFolhaMensal(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total anual: <strong>{formatCurrency(folhaAnual)}</strong>
              {faturamentoAnual > 0 && (
                <span className="ml-2">
                  (Fator R: {((folhaAnual / faturamentoAnual) * 100).toFixed(1)}%)
                </span>
              )}
            </p>
          </div>

          {/* Other inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Custos Dedutíveis (mensal)
              </label>
              <MoneyInput value={custosDedutiveis} onChange={setCustosDedutiveis} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CNAE</label>
              <Input
                value={cnae}
                onChange={(e) => setCnae(e.target.value)}
                placeholder="Ex: 6201-5/01"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Alíquota ISS (%)
              </label>
              <Input
                type="number"
                value={issAliquota}
                onChange={(e) => setIssAliquota(Number(e.target.value))}
                min={0}
                max={5}
                step={0.5}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Regime Atual
              </label>
              <select
                value={regimeAtual}
                onChange={(e) => setRegimeAtual(e.target.value as typeof regimeAtual)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
                <option value="simples_nacional">Simples Nacional</option>
              </select>
            </div>
          </div>

          {/* Title + Actions */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Título (opcional)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Empresa ABC - Análise 2026"
              />
            </div>
            <Button onClick={handleSimulate} disabled={loading || faturamentoAnual <= 0}>
              {loading ? 'Simulando...' : 'Simular'}
            </Button>
            <Button
              onClick={handleSimulateAndSave}
              disabled={loading || faturamentoAnual <= 0}
              variant="secondary"
            >
              {loading ? 'Salvando...' : 'Simular e Salvar'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <div id="comparativo-regimes-print-wrapper" className="report-print-wrapper space-y-4">
          <ReportPrintHeader
            variant="printSheet"
            reportTitle="Comparativo de Regimes Tributários"
            metaLine={`Ano: ${ano} · Faturamento anual: ${formatCurrency(faturamentoAnual)} · Folha anual: ${formatCurrency(folhaAnual)}`}
            logoUrl={branding?.report_logo_url}
            brandName={branding?.report_brand_name}
          />

          <div className="flex justify-end print:hidden" data-report-exclude="preview">
            <Button
              type="button"
              variant="primary"
              onClick={() => doPrint()}
              className="shrink-0 inline-flex items-center gap-2"
              aria-label="Exportar resultado para PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar para PDF
            </Button>
          </div>

          {/* Comparison Chart */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Comparativo de Carga Tributária Anual
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="regime" />
                    <YAxis tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Carga Total']}
                    />
                    <Legend />
                    <Bar dataKey="carga" name="Carga Tributária Anual" fill="#3b82f6">
                      {chartData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Regime Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['lucro_presumido', 'lucro_real', 'simples_nacional'] as const).map((key) => {
              const regime = result[key];
              const isBest = result.regime_mais_economico === key;
              const isExceedLimit = key === 'simples_nacional' && result.simples_nacional.excede_limite;
              const diffFromBest = isBest ? 0 : regime.carga_total_anual - (bestRegime ? result[bestRegime].carga_total_anual : 0);

              return (
                <Card
                  key={key}
                  className={`relative ${
                    isBest
                      ? 'ring-2 ring-green-500 dark:ring-green-400'
                      : ''
                  }`}
                >
                  <div className="p-6">
                    {isBest && (
                      <span className="absolute top-3 right-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Mais Econômico
                      </span>
                    )}
                    {isExceedLimit && (
                      <span className="absolute top-3 right-3 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-semibold px-2 py-1 rounded-full">
                        Excede limite
                      </span>
                    )}

                    <h3
                      className="text-lg font-semibold mb-1"
                      style={{ color: REGIME_COLORS[key] }}
                    >
                      {REGIME_LABELS[key]}
                    </h3>

                    {key === 'simples_nacional' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Fator R: {formatPct(regime.fator_r)} | {regime.anexo}
                      </p>
                    )}

                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Carga Total Anual
                        </span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(regime.carga_total_anual)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Alíquota Efetiva
                        </span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatPct(regime.aliquota_efetiva)}
                        </span>
                      </div>
                      {!isBest && diffFromBest > 0 && (
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-rose-600 dark:text-rose-400">
                            Diferença vs melhor regime
                          </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            +{formatCurrency(diffFromBest)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Impostos detalhados */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Detalhamento
                      </h4>
                      {regime.impostos_detalhados.map((imp, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm group relative"
                        >
                          <span className="text-gray-600 dark:text-gray-400">
                            {imp.nome}
                            {imp.aliquota !== undefined && (
                              <span className="text-xs text-gray-400 ml-1">
                                ({formatPct(imp.aliquota)})
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(imp.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Economia anual */}
          {result && bestRegime && economiaAnual > 0 && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="p-6 text-center">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Economia anual potencial ao optar por {REGIME_LABELS[bestRegime]}
                  {regimeAtual ? ` vs ${REGIME_LABELS[regimeAtual]}` : ` vs regime mais caro (${REGIME_LABELS[worstRegime!]})`}
                </p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {formatCurrency(regimeAtual && result.economia_vs_atual ? result.economia_vs_atual : economiaAnual)}/ano
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Equivale a {formatCurrency((regimeAtual && result.economia_vs_atual ? result.economia_vs_atual : economiaAnual) / 12)}/mês
                </p>
              </div>
            </Card>
          )}

          <ReportPrintFooter variant="printSheet" brandName={branding?.report_brand_name} />
        </div>
      )}

      {/* History Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Simulações Salvas
          </h2>
          {simulations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma simulação salva. Use "Simular e Salvar" para criar uma.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 font-medium">Título</th>
                    <th className="pb-2 font-medium">Ano</th>
                    <th className="pb-2 font-medium">Regime Indicado</th>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {simulations.map((sim) => {
                    const rd = sim.result_data as Record<string, unknown>;
                    const regimeKey = (rd.regime_mais_economico as string) || '';
                    return (
                      <tr key={sim.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 text-gray-900 dark:text-white">
                          {sim.title || 'Sem título'}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">{sim.ano}</td>
                        <td className="py-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${REGIME_COLORS[regimeKey] || '#6b7280'}20`,
                              color: REGIME_COLORS[regimeKey] || '#6b7280',
                            }}
                          >
                            {REGIME_LABELS[regimeKey] || regimeKey}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-400">
                          {new Date(sim.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => handleViewSimulation(sim)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => handleLoadSimulation(sim)}
                            >
                              Editar
                            </Button>
                            <ShareSimulationButton
                              simulationId={sim.id}
                              simulationType="comparativo_regimes"
                              title={sim.title || undefined}
                              size="sm"
                            />
                            <Button
                              variant="tertiary"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteConfirmId(sim.id)}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* View Simulation Modal */}
      {viewSimulation && (
        <Modal
          isOpen={!!viewSimulation}
          onClose={() => setViewSimulation(null)}
          title={viewSimulation.title || 'Simulação'}
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Ano: {viewSimulation.ano}</p>
              <p>Criada em: {new Date(viewSimulation.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            {(() => {
              const rd = viewSimulation.result_data as unknown as ComparativoRegimesResult;
              if (!rd?.lucro_presumido) return <p className="text-sm text-gray-500">Dados indisponíveis</p>;
              return (
                <div className="space-y-3">
                  {(['lucro_presumido', 'lucro_real', 'simples_nacional'] as const).map((key) => {
                    const r = rd[key];
                    const isBest = rd.regime_mais_economico === key;
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border ${
                          isBest
                            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {REGIME_LABELS[key]}
                            {isBest && (
                              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                Mais econômico
                              </span>
                            )}
                          </span>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {formatCurrency(r.carga_total_anual)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Alíquota: {formatPct(r.aliquota_efetiva)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setViewSimulation(null)}>
                Fechar
              </Button>
              <Button onClick={() => handleLoadSimulation(viewSimulation)}>
                Carregar Dados
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Confirmar Exclusão"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tem certeza que deseja excluir esta simulação? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { ClientFormModal } from '../../clients/components/ClientFormModal';
import { distribuicaoLucrosSimulationsService } from '../services/distribuicao-lucros-simulations.service';
import {
  APP_KEYS,
  type AppKey,
  fmt,
  fmtPct,
  runSimulation,
  TAXAS,
  type DistribuicaoLucrosSimulation,
} from '@shared/core';
import {
  ReportPrintFooter,
  ReportPrintHeader,
  buildReportPdfFilename,
} from '../../../lib/report-pdf';
import { ReportCoverSection } from '../../../lib/report-pdf/ReportCoverSection';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';

const REPORT_PRODUCT_TITLE = 'Simulação de investimento na PJ x retenção na PF';

function sanitizePdfDocumentTitle(raw: string): string {
  return (
    raw
      .replace(/[<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'Simulacao-distribuicao-lucros'
  );
}

const CHART_H = 300;
const COLOR_PJ = '#1351b4';
const COLOR_PF = '#3d7c1a';
const COLOR_DIFF_POS = 'rgba(61,124,26,0.75)';
const COLOR_DIFF_NEG = 'rgba(220,76,70,0.75)';
const COLOR_EQ = '#b45309';

type ChartTab = 1 | 2 | 3;

const selectClass =
  'w-full bg-white border border-[#d2dae2] rounded-md px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/20';

function HighlightBox({
  variant,
  children,
}: {
  variant: 'blue' | 'green' | 'amber';
  children: ReactNode;
}) {
  const cls =
    variant === 'green'
      ? 'border-l-[#3d7c1a] bg-emerald-50 text-emerald-900'
      : variant === 'amber'
        ? 'border-amber-600 bg-amber-50 text-amber-900'
        : 'border-[#1351b4] bg-[#ebf5ff] text-slate-800';
  return (
    <div className={`border-l-4 rounded-r-md py-2.5 px-3.5 text-sm leading-relaxed ${cls}`}>{children}</div>
  );
}

function parseStoredInput(raw: Record<string, unknown>): {
  valor: number;
  meses: number;
  irpjRate: number;
  appKey: AppKey;
} {
  return {
    valor: Number(raw.valor),
    meses: Number(raw.meses),
    irpjRate: Number(raw.irpjRate),
    appKey: raw.appKey as AppKey,
  };
}

export function SimuladorDistribuicaoLucros() {
  const { success, error: showError, ToastContainer } = useToast();
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientId, setClientId] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  const [simulations, setSimulations] = useState<DistribuicaoLucrosSimulation[]>([]);
  const [loadingSims, setLoadingSims] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSimulationId, setEditingSimulationId] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState('');

  const [valor, setValor] = useState(200_000);
  const [meses, setMeses] = useState(24);
  const [irpjRate, setIrpjRate] = useState(0.34);
  const [appKey, setAppKey] = useState<AppKey>('cdb_pre');
  const [chartTab, setChartTab] = useState<ChartTab>(1);

  const loadClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const list = await clientService.list();
      setClients(Array.isArray(list) ? list : []);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar clientes');
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const loadSimulations = useCallback(async () => {
    if (!clientId) {
      setSimulations([]);
      return;
    }
    setLoadingSims(true);
    try {
      const res = await distribuicaoLucrosSimulationsService.list({
        client_id: clientId,
        page: 1,
        limit: 50,
      });
      setSimulations(res.simulations);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar simulações salvas');
      setSimulations([]);
    } finally {
      setLoadingSims(false);
    }
  }, [clientId, showError]);

  useEffect(() => {
    void loadSimulations();
  }, [loadSimulations]);

  const buildInput = useCallback(
    () => ({
      valor,
      meses,
      irpjRate,
      appKey,
    }),
    [valor, meses, irpjRate, appKey]
  );

  const handleSave = async () => {
    if (!clientId) {
      showError('Selecione um cliente para salvar.');
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      const titleNorm = saveTitle.trim() || null;
      if (editingSimulationId) {
        await distribuicaoLucrosSimulationsService.update(editingSimulationId, {
          input,
          title: titleNorm,
        });
        success('Simulação atualizada.');
      } else {
        await distribuicaoLucrosSimulationsService.create({
          client_id: clientId,
          title: titleNorm,
          input,
        });
        success('Simulação salva.');
      }
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!clientId) {
      showError('Selecione um cliente para salvar.');
      return;
    }
    setSaving(true);
    try {
      await distribuicaoLucrosSimulationsService.create({
        client_id: clientId,
        title: saveTitle.trim() || null,
        input: buildInput(),
      });
      success('Nova simulação salva.');
      setEditingSimulationId(null);
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSimulation = (s: DistribuicaoLucrosSimulation) => {
    try {
      const p = parseStoredInput(s.input_data as Record<string, unknown>);
      setValor(p.valor);
      setMeses(p.meses);
      setIrpjRate(p.irpjRate);
      setAppKey(p.appKey);
      setSaveTitle(s.title || '');
      setEditingSimulationId(s.id);
      setChartTab(1);
    } catch {
      showError('Não foi possível carregar os parâmetros desta simulação.');
    }
  };

  const handleDeleteSimulation = async (id: string) => {
    if (!window.confirm('Excluir esta simulação salva?')) return;
    try {
      await distribuicaoLucrosSimulationsService.delete(id);
      success('Simulação excluída.');
      if (editingSimulationId === id) {
        setEditingSimulationId(null);
        setSaveTitle('');
      }
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const selectedClientName = useMemo(
    () => (clientId ? clients.find((c) => c.id === clientId)?.name : undefined),
    [clients, clientId]
  );

  const { print: doPrintReport } = useReportPrint('simulador-distrib-lucros-print-wrapper');

  const reportMetaLine = useMemo(
    () =>
      [
        'Lei 15.270/2025',
        `Distribuição: ${fmt(valor)}`,
        `${meses} meses`,
        TAXAS[appKey].nomeApp,
        selectedClientName ? `Cliente: ${selectedClientName}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    [valor, meses, appKey, selectedClientName]
  );

  const coverDetails = useMemo(
    () => [
      { label: 'Valor bruto da distribuição', value: fmt(valor) },
      { label: 'Horizonte', value: `${meses} meses` },
      { label: 'Tipo de aplicação', value: TAXAS[appKey].nomeApp },
      { label: 'IRPJ+CSLL efetiva (PJ)', value: `${Math.round(irpjRate * 100)}%` },
    ],
    [valor, meses, appKey, irpjRate]
  );

  const handleExportPdf = useCallback(() => {
    const prevTitle = document.title;
    document.title = sanitizePdfDocumentTitle(
      buildReportPdfFilename({
        productSlug: 'Simulacao-Distrib-Lucros-Lei-15270',
        extra: selectedClientName ?? undefined,
      })
    );
    doPrintReport({
      afterPrint: () => {
        document.title = prevTitle;
      },
    });
  }, [doPrintReport, selectedClientName]);

  const sim = useMemo(
    () =>
      runSimulation({
        valor,
        meses,
        irpjRate,
        appKey,
      }),
    [valor, meses, irpjRate, appKey]
  );

  const {
    app,
    retencao,
    liquidoPF,
    aliqPF,
    chartData,
    breakEvenMes,
    saldoPJFinal,
    saldoPFFinal,
    diff,
    pfGanha,
    breakEvenLabel,
    vantagemSub,
  } = sim;

  const beLineX =
    breakEvenMes !== null && breakEvenMes > 0 && breakEvenMes <= meses
      ? chartData[breakEvenMes]?.name
      : undefined;

  const yTickFmt = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;

  const conclusionBlocks = useMemo(() => {
    const blocks: Array<{ variant: 'blue' | 'green' | 'amber'; node: ReactNode }> = [];
    blocks.push({
      variant: 'blue',
      node: (
        <>
          Retenção de <strong>10% sobre o total distribuído de {fmt(valor)}</strong> = <strong>{fmt(retencao)}</strong>. A
          PF aplica {fmt(liquidoPF)} com tributação{' '}
          {app.isentoIRPF ? 'isenta' : (
            <>
              de {fmtPct(aliqPF)} ao final
            </>
          )}
          , contra {Math.round(irpjRate * 100)}% sobre os rendimentos mensais na PJ.
        </>
      ),
    });

    const beMesStr =
      breakEvenMes !== null
        ? breakEvenMes === 0
          ? 'imediatamente'
          : `em ${breakEvenMes} meses`
        : `não ocorre nos ${meses} meses analisados`;

    if (breakEvenMes !== null && breakEvenMes <= meses) {
      blocks.push({
        variant: 'green',
        node: (
          <>
            O ponto de equilíbrio é atingido {beMesStr}. A partir daí, manter o dinheiro na PF é mais vantajoso.
          </>
        ),
      });
    } else {
      blocks.push({
        variant: 'amber',
        node: (
          <>
            No horizonte de {meses} meses analisado, a PJ permanece à frente. A retenção de 10% sobre o total
            distribuído não é recuperada neste prazo.
          </>
        ),
      });
    }

    if (pfGanha) {
      blocks.push({
        variant: 'green',
        node: (
          <>
            Ao final dos {meses} meses, distribuir os lucros resulta em <strong>{fmt(Math.abs(diff))} a mais</strong> do
            que manter na PJ.
          </>
        ),
      });
    } else {
      blocks.push({
        variant: 'amber',
        node: (
          <>
            Ao final dos {meses} meses, manter na PJ resulta em <strong>{fmt(Math.abs(diff))} a mais</strong> do que
            distribuir e sofrer a retenção.
          </>
        ),
      });
    }

    return blocks;
  }, [
    valor,
    retencao,
    liquidoPF,
    app.isentoIRPF,
    aliqPF,
    irpjRate,
    breakEvenMes,
    meses,
    pfGanha,
    diff,
  ]);

  return (
    <>
      <ToastContainer />
      <div className="space-y-5 max-w-5xl mx-auto px-1 pb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            {REPORT_PRODUCT_TITLE}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Lei nº 15.270/2025 — Retenção de 10% de IR sobre distribuições acima de R$ 50.000/mês
          </p>
          {selectedClientName ? (
            <p className="text-sm font-medium text-[#1351b4] mt-2">
              Cliente: {selectedClientName}
            </p>
          ) : null}
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4">
            <div className="flex-1 min-w-[260px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isLoadingClients}
                className={selectClass}
              >
                <option value="">
                  {isLoadingClients ? 'Carregando clientes...' : 'Selecione o cliente'}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="sm:self-end shrink-0 border-[#1351b4] text-[#1351b4] hover:bg-[#1351b4]/5"
              onClick={() => setShowClientModal(true)}
            >
              <svg className="w-4 h-4 mr-2 inline-block -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo cliente
            </Button>
          </div>
        </Card>

        <div
          id="simulador-distrib-lucros-print-wrapper"
          className="report-print-wrapper space-y-5"
        >
          <ReportPrintHeader
            variant="printSheet"
            reportTitle={REPORT_PRODUCT_TITLE}
            metaLine={reportMetaLine}
          />
          <ReportCoverSection
            variant="printSheet"
            title={REPORT_PRODUCT_TITLE}
            clientName={selectedClientName}
            subtitle="Lei nº 15.270/2025 — Retenção de 10% sobre distribuições acima de R$ 50.000/mês"
            details={coverDetails}
          />

          <div id="simulador-distrib-lucros-resultado-print" className="report-resultado-content space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Parâmetros da simulação">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor bruto da distribuição de lucros
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">R$ 50k</span>
                  <input
                    type="range"
                    min={50_000}
                    max={1_000_000}
                    step={10_000}
                    value={valor}
                    onChange={(e) => setValor(Number(e.target.value))}
                    className="flex-1 min-w-0 accent-[#1351b4] h-2"
                  />
                  <span className="text-xs text-slate-500 shrink-0">R$ 1mi</span>
                </div>
                <p className="text-center text-sm font-semibold text-slate-900 mt-1">
                  {fmt(valor)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Horizonte de análise (meses)</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">1</span>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    step={1}
                    value={meses}
                    onChange={(e) => setMeses(Number(e.target.value))}
                    className="flex-1 min-w-0 accent-[#1351b4] h-2"
                  />
                  <span className="text-xs text-slate-500 shrink-0">60</span>
                </div>
                <p className="text-center text-sm font-semibold text-slate-900 mt-1">{meses} meses</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de aplicação financeira</label>
                <select
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value as AppKey)}
                  className={selectClass}
                >
                  {APP_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {TAXAS[k].nomeApp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alíquota IR PJ sobre rendimentos (IRPJ+CSLL efetiva)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">20%</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.45}
                    step={0.01}
                    value={irpjRate}
                    onChange={(e) => setIrpjRate(Number(e.target.value))}
                    className="flex-1 min-w-0 accent-[#1351b4] h-2"
                  />
                  <span className="text-xs text-slate-500 shrink-0">45%</span>
                </div>
                <p className="text-center text-sm font-semibold text-slate-900 mt-1">
                  {Math.round(irpjRate * 100)}%{' '}
                  <span className="text-xs font-normal text-slate-500">(ex.: IRPJ 25% + CSLL 9%)</span>
                </p>
              </div>
            </div>
          </Card>

          <Card title="Tributação IR PF sobre rendimentos">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 mb-3">
              <span>Até 6 meses</span>
              <span className="font-semibold text-slate-900 text-right">22,5%</span>
              <span>6 a 12 meses</span>
              <span className="font-semibold text-slate-900 text-right">20,0%</span>
              <span>12 a 24 meses</span>
              <span className="font-semibold text-slate-900 text-right">17,5%</span>
              <span>Acima de 24 meses</span>
              <span className="font-semibold text-slate-900 text-right">15,0%</span>
            </div>
            {app.isentoIRPF ? (
              <HighlightBox variant="green">Esta aplicação é isenta de IR na PF</HighlightBox>
            ) : (
              <HighlightBox variant="blue">
                Alíquota PF aplicável ({meses} meses): <strong>{fmtPct(aliqPF)}</strong>
              </HighlightBox>
            )}
            <div className="border-t border-slate-200 my-4" />
            <p className="text-xs font-bold text-[#0c326f] uppercase tracking-wider mb-3">Resumo do custo inicial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-100 border border-slate-200/80 p-3">
                <p className="text-xs text-slate-600 mb-1">Retenção (10% sobre total)</p>
                <p className="text-lg font-semibold text-slate-900">{fmt(retencao)}</p>
                <p className="text-xs text-slate-500 mt-0.5">incide sobre o valor total distribuído</p>
              </div>
              <div className="rounded-lg bg-slate-100 border border-slate-200/80 p-3">
                <p className="text-xs text-slate-600 mb-1">Líquido PF após retenção</p>
                <p className="text-lg font-semibold text-slate-900">{fmt(liquidoPF)}</p>
                <p className="text-xs text-slate-500 mt-0.5">disponível para aplicar</p>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Projeção patrimonial acumulada" className="pdf-keep-together">
          <div className="flex flex-wrap gap-2 mb-4">
            {(
              [
                [1, 'Valor acumulado'],
                [2, 'Diferença PF vs PJ'],
                [3, 'Ponto de equilíbrio'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setChartTab(id)}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  chartTab === id
                    ? 'bg-[#ebf5ff] text-[#1351b4] border-[#1351b4] font-semibold'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-[300px] w-full" style={{ minHeight: CHART_H }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 1 ? (
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `R$ ${Number(v).toLocaleString('pt-BR')}`,
                      name === 'pj' ? 'PJ' : 'PF',
                    ]}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pj"
                    name="pj"
                    stroke={COLOR_PJ}
                    fill={COLOR_PJ}
                    fillOpacity={0.12}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pf"
                    name="pf"
                    stroke={COLOR_PF}
                    fill={COLOR_PF}
                    fillOpacity={0.12}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </AreaChart>
              ) : chartTab === 2 ? (
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(v: number) => [`Dif: R$ ${Number(v).toLocaleString('pt-BR')}`, 'PF − PJ']}
                  />
                  <Bar dataKey="diff" radius={[2, 2, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={`c-${i}`}
                        fill={entry.diff >= 0 ? COLOR_DIFF_POS : COLOR_DIFF_NEG}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `R$ ${Number(v).toLocaleString('pt-BR')}`,
                      name === 'pj' ? 'PJ' : 'PF',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="pj"
                    stroke={COLOR_PJ}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 3"
                  />
                  <Line type="monotone" dataKey="pf" stroke={COLOR_PF} strokeWidth={2} dot={false} />
                  {beLineX ? (
                    <ReferenceLine
                      x={beLineX}
                      stroke={COLOR_EQ}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: `Equilíbrio: ${breakEvenMes}m`,
                        position: 'top',
                        fill: COLOR_EQ,
                        fontSize: 11,
                      }}
                    />
                  ) : null}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
            {chartTab === 1 && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PJ }} />
                  PJ (aplicação na empresa)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PF }} />
                  PF (após retenção + aplicação)
                </span>
              </>
            )}
            {chartTab === 2 && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_DIFF_POS }} />
                  PF acima da PJ
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_DIFF_NEG }} />
                  PJ acima da PF
                </span>
              </>
            )}
            {chartTab === 3 && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PJ }} />
                  PJ acumulado
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLOR_PF }} />
                  PF acumulado
                </span>
                {beLineX ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5" style={{ background: COLOR_EQ }} />
                    Ponto de equilíbrio
                  </span>
                ) : null}
              </>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Saldo PJ ao final', sub: 'rendimento líquido na empresa', v: fmt(saldoPJFinal) },
            { label: 'Saldo PF ao final', sub: 'após retenção + rendimentos', v: fmt(saldoPFFinal) },
            { label: 'Ponto de equilíbrio', sub: 'PF supera PJ', v: breakEvenLabel },
            { label: 'Vantagem ao final', sub: vantagemSub, v: fmt(Math.abs(diff)) },
          ].map((row) => (
            <div key={row.label} className="rounded-lg bg-slate-100 border border-slate-200/80 p-3">
              <p className="text-xs text-slate-600 mb-1">{row.label}</p>
              <p className="text-lg font-semibold text-slate-900 break-words">{row.v}</p>
              <p className="text-xs text-slate-500 mt-0.5">{row.sub}</p>
            </div>
          ))}
        </div>

        <Card title="Análise e recomendação">
          <div className="space-y-3">
            {conclusionBlocks.map((b, i) => (
              <HighlightBox key={i} variant={b.variant}>
                {b.node}
              </HighlightBox>
            ))}
          </div>
        </Card>

        <p className="text-xs text-center text-slate-500">
          Simulação para fins ilustrativos. Consulte um advogado ou contador para orientação específica ao seu caso.
        </p>

        <div className="flex justify-center sm:justify-end pt-3 print:hidden">
          <Button
            type="button"
            variant="secondary"
            className="inline-flex items-center gap-2 border-[#1351b4] text-[#1351b4] hover:bg-[#1351b4]/5"
            onClick={handleExportPdf}
            aria-label="Exportar simulação para PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar para PDF
          </Button>
        </div>
          </div>

          <ReportPrintFooter variant="printSheet" />
        </div>

        <Card title="Salvar simulação no histórico">
          <p className="text-sm text-slate-600 mb-4">
            Associe um cliente acima e grave os parâmetros atuais para consultar depois na lista.
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="min-w-[200px] flex-1">
              <Input
                label="Título (opcional)"
                placeholder="Ex.: Cenário distribuição 2026"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="primary"
              disabled={saving || !clientId}
              onClick={() => void handleSave()}
            >
              {saving ? 'Salvando...' : editingSimulationId ? 'Atualizar' : 'Salvar'}
            </Button>
            {editingSimulationId ? (
              <>
                <Button type="button" variant="secondary" disabled={saving || !clientId} onClick={() => void handleSaveAsNew()}>
                  Salvar como nova
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingSimulationId(null);
                    setSaveTitle('');
                  }}
                >
                  Nova simulação (limpar edição)
                </Button>
              </>
            ) : null}
          </div>
          {editingSimulationId ? (
            <p className="text-xs text-slate-500 mb-3">
              Editando simulação salva. Use &quot;Atualizar&quot; para sobrescrever ou &quot;Salvar como nova&quot; para criar outro registro.
            </p>
          ) : null}

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Simulações salvas deste cliente</h3>
            {!clientId ? (
              <p className="text-sm text-slate-500">Selecione um cliente para listar o histórico.</p>
            ) : loadingSims ? (
              <p className="text-sm text-slate-500">Carregando...</p>
            ) : simulations.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma simulação salva para este cliente.</p>
            ) : (
              <ul className="space-y-2">
                {simulations.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900">{s.title?.trim() || 'Sem título'}</span>
                      <span className="text-slate-500">
                        {' '}
                        · {new Date(s.created_at).toLocaleString('pt-BR')}
                        {editingSimulationId === s.id ? (
                          <span className="ml-1 text-[#1351b4] font-medium">(editando)</span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button type="button" variant="secondary" className="text-xs py-1.5" onClick={() => handleLoadSimulation(s)}>
                        Carregar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs py-1.5 text-rose-700 border-rose-200 hover:bg-rose-50"
                        onClick={() => void handleDeleteSimulation(s.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={(client) => {
          void loadClients();
          setClientId(client.id);
        }}
      />
    </>
  );
}

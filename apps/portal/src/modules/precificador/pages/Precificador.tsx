import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { useToast } from '../../../shared/components/ui/Toast';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { ClientFormModal } from '../../clients/components/ClientFormModal';
import { ShareSimulationButton } from '../../../shared/components/ui/ShareSimulationButton';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';
import { useBranding } from '../../../shared/hooks/useBranding';
import { precificadorService } from '../services/precificador.service';
import {
  simularPrecificador,
  type PrecificadorInput,
  type PrecificadorResult,
  type PrecificadorSimulation,
  type PrecificadorRegimeResult,
} from '@shared/core';

const selectClass =
  'w-full bg-white border border-[#d2dae2] rounded-md px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/20';

const REGIME_COLORS: Record<string, string> = {
  'Lucro Presumido': '#1351b4',
  'Lucro Real': '#0c326f',
  'Simples Nacional': '#3d7c1a',
  'Reforma IBS/CBS': '#b45309',
};

const ISS_OPTIONS = [
  { label: '2%', value: 2 },
  { label: '3%', value: 3 },
  { label: '4%', value: 4 },
  { label: '5%', value: 5 },
];

function fmt(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number): string {
  return `${v.toFixed(2)}%`;
}

function RegimeCard({
  regime,
  isBest,
}: {
  regime: PrecificadorRegimeResult;
  isBest: boolean;
}) {
  const borderColor = REGIME_COLORS[regime.regime] ?? '#64748b';
  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${
        isBest
          ? 'ring-2 ring-emerald-400 border-emerald-500 bg-emerald-50/40'
          : 'border-slate-200 bg-white'
      }`}
      style={!isBest ? { borderTopColor: borderColor, borderTopWidth: 3 } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{regime.regime}</h3>
        {isBest && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            Melhor margem
          </span>
        )}
      </div>

      <p className="text-2xl font-bold text-slate-900 mb-1">{fmt(regime.preco_sugerido)}</p>
      <p className="text-xs text-slate-500 mb-4">Preço de venda sugerido</p>

      <div className="space-y-1.5 mb-4">
        {regime.impostos_detalhados.map((imp) => (
          <div key={imp.nome} className="flex justify-between text-sm">
            <span className="text-slate-600">{imp.nome}</span>
            <span className="font-medium text-slate-800">
              {fmt(imp.valor)}{' '}
              <span className="text-xs text-slate-400">({fmtPct(imp.aliquota)})</span>
            </span>
          </div>
        ))}
        <div className="flex justify-between text-sm border-t border-slate-200 pt-1.5 font-semibold">
          <span className="text-slate-700">Total impostos</span>
          <span className="text-slate-900">{fmt(regime.total_impostos)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-slate-50 border border-slate-100 p-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Alíq. efetiva</p>
          <p className="text-sm font-semibold text-slate-900">{fmtPct(regime.aliquota_efetiva_sobre_receita)}</p>
        </div>
        <div className="rounded-md bg-slate-50 border border-slate-100 p-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Margem líq.</p>
          <p className="text-sm font-semibold text-slate-900">
            {fmt(regime.margem_liquida_resultante)}{' '}
            <span className="text-xs text-slate-500">({fmtPct(regime.margem_liquida_percentual)})</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Precificador() {
  const { success, error: showError, ToastContainer } = useToast();
  const branding = useBranding();
  const { print: doPrint } = useReportPrint('precificador-print-wrapper');

  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientId, setClientId] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  const [simulations, setSimulations] = useState<PrecificadorSimulation[]>([]);
  const [loadingSims, setLoadingSims] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');

  const [custoServico, setCustoServico] = useState(5000);
  const [margemDesejada, setMargemDesejada] = useState(30);
  const [margemTipo, setMargemTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [issAliquota, setIssAliquota] = useState(5);
  const [faturamentoMensal, setFaturamentoMensal] = useState(50000);
  const [folhaMensal, setFolhaMensal] = useState(15000);
  const [ano, setAno] = useState(new Date().getFullYear());

  const loadClients = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsLoadingClients(true);
    try {
      const list = await clientService.list();
      setClients(Array.isArray(list) ? list : []);
    } catch (e) {
      if (!options?.silent) {
        showError(e instanceof Error ? e.message : 'Erro ao carregar clientes');
        setClients([]);
      }
    } finally {
      if (!options?.silent) setIsLoadingClients(false);
    }
  }, [showError]);

  useEffect(() => { void loadClients(); }, [loadClients]);

  const loadSimulations = useCallback(async () => {
    if (!clientId) { setSimulations([]); return; }
    setLoadingSims(true);
    try {
      const res = await precificadorService.list({ client_id: clientId, page: 1, limit: 50 });
      setSimulations(res.simulations);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar simulações');
      setSimulations([]);
    } finally {
      setLoadingSims(false);
    }
  }, [clientId, showError]);

  useEffect(() => { void loadSimulations(); }, [loadSimulations]);

  const buildInput = useCallback((): PrecificadorInput => ({
    custo_servico: custoServico,
    margem_desejada: margemDesejada,
    margem_tipo: margemTipo,
    iss_aliquota: issAliquota,
    faturamento_mensal_estimado: faturamentoMensal,
    folha_mensal: folhaMensal,
    ano,
  }), [custoServico, margemDesejada, margemTipo, issAliquota, faturamentoMensal, folhaMensal, ano]);

  const result: PrecificadorResult = useMemo(
    () => simularPrecificador(buildInput()),
    [buildInput]
  );

  const regimes = useMemo(
    () => [result.lucro_presumido, result.lucro_real, result.simples_nacional, result.reforma_ibs_cbs],
    [result]
  );

  const chartData = useMemo(() => {
    return regimes.map((r) => ({
      name: r.regime.replace('Reforma IBS/CBS', 'IBS/CBS'),
      custo: custoServico,
      impostos: r.total_impostos,
      margem: r.margem_liquida_resultante,
    }));
  }, [regimes, custoServico]);

  const handleSave = async () => {
    if (!clientId) { showError('Selecione um cliente para salvar.'); return; }
    setSaving(true);
    try {
      await precificadorService.simulateAndSave({
        client_id: clientId,
        title: saveTitle.trim() || null,
        input: buildInput(),
      });
      success('Simulação salva.');
      setSaveTitle('');
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSimulation = (s: PrecificadorSimulation) => {
    try {
      const raw = s.input_data as Record<string, unknown>;
      setCustoServico(Number(raw.custo_servico));
      setMargemDesejada(Number(raw.margem_desejada));
      setMargemTipo(raw.margem_tipo as 'percentual' | 'fixo');
      setIssAliquota(Number(raw.iss_aliquota));
      setFaturamentoMensal(Number(raw.faturamento_mensal_estimado));
      setFolhaMensal(Number(raw.folha_mensal));
      setAno(Number(raw.ano));
      setSaveTitle(s.title || '');
    } catch {
      showError('Não foi possível carregar os parâmetros desta simulação.');
    }
  };

  const handleDeleteSimulation = async (id: string) => {
    if (!window.confirm('Excluir esta simulação salva?')) return;
    try {
      await precificadorService.delete(id);
      success('Simulação excluída.');
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const yTickFmt = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;

  return (
    <>
      <ToastContainer />
      <div className="space-y-5 max-w-6xl mx-auto px-1 pb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            Precificador com Custo Tributário
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Calcule o preço de venda ideal em cada regime, considerando custo + impostos + margem desejada
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Lei 9.718/98
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              LC 123/2006
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              LC 214/2025
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              RIR/2018
            </span>
          </div>
        </div>

        <div className="border-l-4 border-[#1351b4] bg-[#ebf5ff] rounded-r-md py-2.5 px-3.5 text-sm leading-relaxed text-slate-800">
          <strong>Como funciona:</strong> O preço sugerido é calculado pela fórmula{' '}
          <code className="bg-white/60 px-1 rounded text-xs font-mono">Preço = (Custo + Margem) / (1 - Alíquota Efetiva)</code>,
          onde a alíquota efetiva varia conforme o regime tributário, garantindo que a margem desejada seja preservada após o pagamento dos impostos.
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
                  <option key={c.id} value={c.id}>{c.name}</option>
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

        <Card title="Parâmetros da simulação">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MoneyInput
              label="Custo do serviço"
              value={custoServico}
              onChange={setCustoServico}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Margem desejada</label>
              <div className="flex gap-2">
                <select
                  value={margemTipo}
                  onChange={(e) => setMargemTipo(e.target.value as 'percentual' | 'fixo')}
                  className={`${selectClass} w-24 shrink-0`}
                >
                  <option value="percentual">%</option>
                  <option value="fixo">R$</option>
                </select>
                {margemTipo === 'fixo' ? (
                  <MoneyInput value={margemDesejada} onChange={setMargemDesejada} />
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={200}
                    step={1}
                    value={String(margemDesejada)}
                    onChange={(e) => setMargemDesejada(Number(e.target.value))}
                  />
                )}
              </div>
            </div>

            <MoneyInput
              label="Faturamento mensal estimado"
              value={faturamentoMensal}
              onChange={setFaturamentoMensal}
            />

            <MoneyInput
              label="Folha de pagamento mensal"
              value={folhaMensal}
              onChange={setFolhaMensal}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alíquota ISS</label>
              <select
                value={issAliquota}
                onChange={(e) => setIssAliquota(Number(e.target.value))}
                className={selectClass}
              >
                {ISS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ano</label>
              <Input
                type="number"
                min={2024}
                max={2035}
                value={String(ano)}
                onChange={(e) => setAno(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        <div id="precificador-print-wrapper" className="report-print-wrapper space-y-5">
          <ReportPrintHeader
            variant="printSheet"
            reportTitle="Precificador com Custo Tributário"
            metaLine={`Custo: ${fmt(custoServico)} · Margem: ${margemDesejada}${margemTipo === 'percentual' ? '%' : ' R$'} · Faturamento: ${fmt(faturamentoMensal)}/mês · ISS: ${fmtPct(issAliquota)}`}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {regimes.map((r) => (
            <RegimeCard key={r.regime} regime={r} isBest={r.regime === result.melhor_regime} />
          ))}
        </div>

        {/* Price difference comparison */}
        <Card title="Diferença de preço entre regimes">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-3 font-semibold text-slate-700">Regime</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Preço sugerido</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Diferença vs melhor</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Margem líquida</th>
                </tr>
              </thead>
              <tbody>
                {regimes.map((r) => {
                  const best = regimes.find((x) => x.regime === result.melhor_regime)!;
                  const diff = r.preco_sugerido - best.preco_sugerido;
                  const isBest = r.regime === result.melhor_regime;
                  return (
                    <tr key={r.regime} className={`border-b border-slate-100 ${isBest ? 'bg-emerald-50/50' : ''}`}>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {r.regime}
                        {isBest && <span className="ml-2 text-[10px] font-bold uppercase text-emerald-700">Melhor</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">{fmt(r.preco_sugerido)}</td>
                      <td className={`py-2 px-3 text-right font-medium ${diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {diff === 0 ? '—' : `+${fmt(diff)}`}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {fmt(r.margem_liquida_resultante)} ({fmtPct(r.margem_liquida_percentual)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Composição do preço por regime (Custo + Impostos + Margem)">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    fmt(v),
                    name === 'custo' ? 'Custo' : name === 'impostos' ? 'Impostos' : 'Margem Líquida',
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend
                  formatter={(v: string) =>
                    v === 'custo' ? 'Custo' : v === 'impostos' ? 'Impostos' : 'Margem Líquida'
                  }
                />
                <Bar dataKey="custo" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="impostos" stackId="a" fill="#dc4c46" radius={[0, 0, 0, 0]} />
                <Bar dataKey="margem" stackId="a" fill="#3d7c1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

          <ReportPrintFooter variant="printSheet" brandName={branding?.report_brand_name} />
        </div>

        <Card title="Salvar simulação no histórico">
          <p className="text-sm text-slate-600 mb-4">
            Associe um cliente acima e grave os parâmetros atuais para consultar depois.
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="min-w-[200px] flex-1">
              <Input
                label="Título (opcional)"
                placeholder="Ex.: Preço consultoria 2026"
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
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

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
                        {' '}· {new Date(s.created_at as string).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs py-1.5"
                        onClick={() => handleLoadSimulation(s)}
                      >
                        Carregar
                      </Button>
                      <ShareSimulationButton
                        simulationId={s.id}
                        simulationType="precificador"
                        title={s.title || undefined}
                        size="sm"
                      />
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

        <p className="text-xs text-center text-slate-500">
          Simulação para fins ilustrativos. Consulte um profissional para orientação específica ao seu caso.
        </p>
      </div>

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={(client) => {
          setClients((prev) => (prev.some((c) => c.id === client.id) ? prev : [...prev, client]));
          setClientId(client.id);
          void loadClients({ silent: true });
        }}
      />
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { splitPaymentService } from '../services/split-payment.service';
import { simularSplitPayment } from '@shared/core';
import type { SplitPaymentInput, SplitPaymentResult, SplitPaymentSimulation } from '@shared/core';

const MESES_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const REGIME_OPTIONS = [
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
  { value: 'simples_nacional', label: 'Simples Nacional' },
] as const;

const selectClass =
  'w-full bg-white border border-[#d2dae2] rounded-md px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4]/20';

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-100 border border-slate-200/80 p-3">
      <p className="text-xs text-slate-600 mb-1">{label}</p>
      <p className="text-lg font-semibold text-slate-900 break-words">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function SplitPaymentSimulador() {
  const { success, error: showError, ToastContainer } = useToast();

  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientId, setClientId] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  const [simulations, setSimulations] = useState<SplitPaymentSimulation[]>([]);
  const [loadingSims, setLoadingSims] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');

  const [faturamento, setFaturamento] = useState<number[]>(Array(12).fill(100_000));
  const [regime, setRegime] = useState<SplitPaymentInput['regime_tributario']>('lucro_presumido');
  const [pctEletronico, setPctEletronico] = useState(80);
  const [prazoMedio, setPrazoMedio] = useState(30);
  const [custoCapital, setCustoCapital] = useState(13.75);
  const [aliquotaIbsCbs, setAliquotaIbsCbs] = useState(26.5);

  const loadClients = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoadingClients(true);
    try {
      const list = await clientService.list();
      setClients(Array.isArray(list) ? list : []);
    } catch (e) {
      if (!opts?.silent) {
        showError(e instanceof Error ? e.message : 'Erro ao carregar clientes');
        setClients([]);
      }
    } finally {
      if (!opts?.silent) setIsLoadingClients(false);
    }
  }, [showError]);

  useEffect(() => { void loadClients(); }, [loadClients]);

  const loadSimulations = useCallback(async () => {
    if (!clientId) { setSimulations([]); return; }
    setLoadingSims(true);
    try {
      const res = await splitPaymentService.list({ client_id: clientId, page: 1, limit: 50 });
      setSimulations(res.simulations);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar simulações');
      setSimulations([]);
    } finally {
      setLoadingSims(false);
    }
  }, [clientId, showError]);

  useEffect(() => { void loadSimulations(); }, [loadSimulations]);

  const buildInput = useCallback((): SplitPaymentInput => ({
    faturamento_mensal: faturamento,
    regime_tributario: regime,
    percentual_eletronico: pctEletronico,
    prazo_medio_recebimento_dias: prazoMedio,
    custo_capital_anual: custoCapital,
    aliquota_ibs_cbs: aliquotaIbsCbs,
  }), [faturamento, regime, pctEletronico, prazoMedio, custoCapital, aliquotaIbsCbs]);

  const result: SplitPaymentResult = useMemo(() => simularSplitPayment(buildInput()), [buildInput]);

  const chartData = useMemo(() =>
    result.projecao_mensal.map((m) => ({
      name: MESES_LABELS[m.mes - 1],
      antes: m.receita_liquida_antes,
      depois: m.receita_liquida_depois,
    })),
  [result]);

  const handleSave = async () => {
    if (!clientId) { showError('Selecione um cliente para salvar.'); return; }
    setSaving(true);
    try {
      await splitPaymentService.simulateAndSave({
        client_id: clientId,
        title: saveTitle.trim() || null,
        input: buildInput(),
      });
      success('Simulação salva.');
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSimulation = (s: SplitPaymentSimulation) => {
    try {
      const inp = s.input_data as Record<string, unknown>;
      setFaturamento(inp.faturamento_mensal as number[]);
      setRegime(inp.regime_tributario as SplitPaymentInput['regime_tributario']);
      setPctEletronico(Number(inp.percentual_eletronico));
      setPrazoMedio(Number(inp.prazo_medio_recebimento_dias));
      setCustoCapital(Number(inp.custo_capital_anual));
      setAliquotaIbsCbs(Number(inp.aliquota_ibs_cbs));
      setSaveTitle(s.title || '');
    } catch {
      showError('Não foi possível carregar os parâmetros desta simulação.');
    }
  };

  const handleDeleteSimulation = async (id: string) => {
    if (!window.confirm('Excluir esta simulação?')) return;
    try {
      await splitPaymentService.delete(id);
      success('Simulação excluída.');
      await loadSimulations();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const setFaturamentoMes = (idx: number, val: number) => {
    setFaturamento((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleFillAllMonths = () => {
    const first = faturamento[0] || 0;
    setFaturamento(Array(12).fill(first));
  };

  const yTickFmt = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;

  return (
    <>
      <ToastContainer />
      <div className="space-y-5 max-w-5xl mx-auto px-1 pb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            Simulador de Impacto do Split Payment
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Reforma Tributária — Retenção automática de IBS/CBS no pagamento eletrônico
          </p>
        </div>

        {/* Client selector */}
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

        {/* Input form */}
        <Card title="Parâmetros da simulação">
          <div className="space-y-5">
            {/* Monthly revenue grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Faturamento mensal (12 meses)</label>
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs py-1 px-2"
                  onClick={handleFillAllMonths}
                >
                  Replicar janeiro para todos
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MESES_LABELS.map((mes, idx) => (
                  <MoneyInput
                    key={idx}
                    label={mes}
                    value={faturamento[idx]}
                    onChange={(v) => setFaturamentoMes(idx, v)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Regime tributário</label>
                <select
                  value={regime}
                  onChange={(e) => setRegime(e.target.value as SplitPaymentInput['regime_tributario'])}
                  className={selectClass}
                >
                  {REGIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  % recebimento eletrônico (cartão/PIX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pctEletronico}
                    onChange={(e) => setPctEletronico(Number(e.target.value))}
                    className="flex-1 min-w-0 accent-[#1351b4] h-2"
                  />
                  <span className="text-sm font-semibold text-slate-900 w-12 text-right">{pctEletronico}%</span>
                </div>
              </div>

              <Input
                label="Prazo médio de recebimento (dias)"
                type="number"
                min={0}
                max={365}
                value={String(prazoMedio)}
                onChange={(e) => setPrazoMedio(Number(e.target.value))}
              />

              <Input
                label="Custo de capital anual (% a.a.)"
                type="number"
                min={0}
                step={0.25}
                value={String(custoCapital)}
                onChange={(e) => setCustoCapital(Number(e.target.value))}
              />

              <Input
                label="Alíquota IBS/CBS (%)"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={String(aliquotaIbsCbs)}
                onChange={(e) => setAliquotaIbsCbs(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Capital de Giro Necessário"
            value={fmtBRL(result.resumo.capital_giro_necessario)}
            sub="média mensal retida"
          />
          <KpiCard
            label="Custo Financeiro Mensal"
            value={fmtBRL(result.resumo.custo_financeiro_mensal)}
            sub="custo de antecipação"
          />
          <KpiCard
            label="Custo Financeiro Anual"
            value={fmtBRL(result.resumo.custo_financeiro_anual)}
            sub="soma dos 12 meses"
          />
          <KpiCard
            label="Redução no Caixa"
            value={fmtPct(result.resumo.reducao_caixa_percentual)}
            sub="% da receita retida"
          />
        </div>

        {/* Chart */}
        <Card title="Receita líquida: Antes vs Depois do Split Payment">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={yTickFmt} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    fmtBRL(v),
                    name === 'antes' ? 'Antes do Split' : 'Depois do Split',
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="antes"
                  name="antes"
                  stroke="#1351b4"
                  fill="#1351b4"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="depois"
                  name="depois"
                  stroke="#dc4c46"
                  fill="#dc4c46"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#1351b4' }} />
              Receita líquida antes do Split
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#dc4c46' }} />
              Receita líquida depois do Split
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm opacity-30" style={{ background: '#dc4c46' }} />
              Diferença (impostos retidos)
            </span>
          </div>
        </Card>

        {/* Monthly table */}
        <Card title="Projeção mensal detalhada">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-3 font-semibold text-slate-700">Mês</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Receita</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Impostos Retidos</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Líquido Antes</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Líquido Depois</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Diferença</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Custo Financeiro</th>
                </tr>
              </thead>
              <tbody>
                {result.projecao_mensal.map((m) => (
                  <tr key={m.mes} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-800">{MESES_LABELS[m.mes - 1]}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{fmtBRL(m.receita_bruta)}</td>
                    <td className="py-2 px-3 text-right text-rose-700 font-medium">{fmtBRL(m.impostos_retidos_split)}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{fmtBRL(m.receita_liquida_antes)}</td>
                    <td className="py-2 px-3 text-right text-slate-700">{fmtBRL(m.receita_liquida_depois)}</td>
                    <td className="py-2 px-3 text-right text-rose-700">{fmtBRL(m.diferenca_caixa)}</td>
                    <td className="py-2 px-3 text-right text-amber-700">{fmtBRL(m.custo_financeiro_mes)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="py-2 px-3 text-slate-800">Total</td>
                  <td className="py-2 px-3 text-right text-slate-800">
                    {fmtBRL(result.projecao_mensal.reduce((s, m) => s + m.receita_bruta, 0))}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-700">
                    {fmtBRL(result.projecao_mensal.reduce((s, m) => s + m.impostos_retidos_split, 0))}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-800">
                    {fmtBRL(result.projecao_mensal.reduce((s, m) => s + m.receita_liquida_antes, 0))}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-800">
                    {fmtBRL(result.projecao_mensal.reduce((s, m) => s + m.receita_liquida_depois, 0))}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-700">
                    {fmtBRL(result.projecao_mensal.reduce((s, m) => s + m.diferenca_caixa, 0))}
                  </td>
                  <td className="py-2 px-3 text-right text-amber-700">
                    {fmtBRL(result.projecao_mensal.reduce((s, m) => s + m.custo_financeiro_mes, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Analysis */}
        <Card title="Análise de impacto">
          <div className="space-y-3">
            <div className="border-l-4 border-[#1351b4] bg-[#ebf5ff] rounded-r-md py-2.5 px-3.5 text-sm leading-relaxed text-slate-800">
              Com {pctEletronico}% do faturamento recebido eletronicamente e alíquota IBS/CBS de{' '}
              {fmtPct(aliquotaIbsCbs)}, o split payment reteria em média{' '}
              <strong>{fmtBRL(result.resumo.capital_giro_necessario)}/mês</strong> do caixa da empresa.
            </div>
            <div className="border-l-4 border-amber-600 bg-amber-50 rounded-r-md py-2.5 px-3.5 text-sm leading-relaxed text-amber-900">
              O custo financeiro anual estimado é de <strong>{fmtBRL(result.resumo.custo_financeiro_anual)}</strong>,
              considerando um custo de capital de {fmtPct(custoCapital)} a.a. e prazo médio de {prazoMedio} dias.
            </div>
            {result.resumo.reducao_caixa_percentual > 15 && (
              <div className="border-l-4 border-rose-600 bg-rose-50 rounded-r-md py-2.5 px-3.5 text-sm leading-relaxed text-rose-900">
                A redução de <strong>{fmtPct(result.resumo.reducao_caixa_percentual)}</strong> no caixa é significativa.
                Recomenda-se provisionar reserva de capital de giro e renegociar prazos com fornecedores.
              </div>
            )}
          </div>
        </Card>

        <p className="text-xs text-center text-slate-500">
          Simulação para fins ilustrativos. Consulte um contador para orientação específica ao seu caso.
        </p>

        {/* Save & History */}
        <Card title="Salvar simulação no histórico">
          <p className="text-sm text-slate-600 mb-4">
            Associe um cliente acima e grave os parâmetros atuais para consultar depois.
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="min-w-[200px] flex-1">
              <Input
                label="Título (opcional)"
                placeholder="Ex.: Cenário Split 80% eletrônico"
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
                        {' · '}
                        {new Date(s.created_at).toLocaleString('pt-BR')}
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
                        simulationType="split_payment"
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

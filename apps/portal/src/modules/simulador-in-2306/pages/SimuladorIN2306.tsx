import { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  simuladorIN2306Service,
  type SimulateTributarioInput,
  type SimulateIN2306Input,
  type IN2306SimulationResult,
} from '../services/simulador-in-2306.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { IN2306Simulation } from '@shared/core';
import type { ReceitasTrimestre, SimuladorTributarioResponse, TrimestreCenario } from '../services/simulador-in-2306.service';

const EMPTY_TRIMESTRE: ReceitasTrimestre = {
  produtos_mercadorias: 0,
  servicos: 0,
  servicos_favorecida: 0,
  servicos_hospitalares: 0,
  demais_receitas: 0,
};

type Tab = 'tributario' | 'parcelamento';

export function SimuladorIN2306() {
  const { success, error: showError, ToastContainer } = useToast();
  const [tab, setTab] = useState<Tab>('tributario');
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [simulations, setSimulations] = useState<IN2306Simulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [tributarioResult, setTributarioResult] = useState<(SimuladorTributarioResponse & { simulation_id?: string }) | null>(null);
  const [parcelamentoResult, setParcelamentoResult] = useState<IN2306SimulationResult | null>(null);

  const [ano, setAno] = useState(2025);
  const [trimestres, setTrimestres] = useState<ReceitasTrimestre[]>(() =>
    Array(4).fill(null).map(() => ({ ...EMPTY_TRIMESTRE }))
  );
  const [receitaAnual, setReceitaAnual] = useState<ReceitasTrimestre>({ ...EMPTY_TRIMESTRE });
  const [equiparacao, setEquiparacao] = useState(false);
  const [saveTrib, setSaveTrib] = useState(false);
  const [titleTrib, setTitleTrib] = useState('');
  const [clientIdTrib, setClientIdTrib] = useState('');
  const [includePisCofins, setIncludePisCofins] = useState(false);
  const [modoAnual, setModoAnual] = useState(false);
  const [refNormativaExpanded, setRefNormativaExpanded] = useState(false);
  const [memoriaTab, setMemoriaTab] = useState<0 | 1 | 2>(0);
  const simulacoesSalvasRef = useRef<HTMLDivElement>(null);

  const [formParcel, setFormParcel] = useState<SimulateIN2306Input>({
    competence: '',
    valor_total: 0,
    valor_entrada: 0,
    numero_parcelas: 12,
    tipo_calculo: 'simulacao',
    save_simulation: false,
    title: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientsRes, listRes] = await Promise.all([
          clientService.list(),
          simuladorIN2306Service.list({ page: 1, limit: 20 }),
        ]);
        if (!cancelled) {
          setClients(Array.isArray(clientsRes) ? clientsRes : []);
          setSimulations(listRes.simulations);
        }
      } catch (e) {
        if (!cancelled) showError(e instanceof Error ? e.message : 'Erro ao carregar');
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  const updateTrimestre = (index: number, field: keyof ReceitasTrimestre, value: number) => {
    setTrimestres((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const handleSimulateTributario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTributarioResult(null);
    try {
      const trimestresParaEnvio = modoAnual
        ? Array(4)
            .fill(null)
            .map(() => ({
              produtos_mercadorias: (receitaAnual.produtos_mercadorias ?? 0) / 4,
              servicos: (receitaAnual.servicos ?? 0) / 4,
              servicos_favorecida: (receitaAnual.servicos_favorecida ?? 0) / 4,
              servicos_hospitalares: (receitaAnual.servicos_hospitalares ?? 0) / 4,
              demais_receitas: (receitaAnual.demais_receitas ?? 0) / 4,
            }))
        : trimestres;
      const input: SimulateTributarioInput = {
        ano,
        trimestres: trimestresParaEnvio,
        aplicar_equiparacao_hospitalar: equiparacao,
        save_simulation: saveTrib,
        title: titleTrib || undefined,
        client_id: clientIdTrib || undefined,
      };
      const res = await simuladorIN2306Service.simulateTributario(input);
      setTributarioResult(res);
      if (res.simulation_id) {
        success('Simulação tributária salva.');
        const listRes = await simuladorIN2306Service.list({ page: 1, limit: 20 });
        setSimulations(listRes.simulations);
      } else {
        success('Comparativo calculado.');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateParcelamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formParcel.competence.match(/^\d{4}-\d{2}$/)) {
      showError('Competência deve ser YYYY-MM');
      return;
    }
    setLoading(true);
    setParcelamentoResult(null);
    try {
      const res = await simuladorIN2306Service.simulate(formParcel);
      setParcelamentoResult(res);
      success('Simulação concluída.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta simulação?')) return;
    try {
      await simuladorIN2306Service.delete(id);
      success('Simulação excluída.');
      setSimulations((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const scrollToSimulacoesSalvas = () => {
    simulacoesSalvasRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const receitaTotalInformada = useMemo(() => {
    if (modoAnual) {
      return (
        (receitaAnual.produtos_mercadorias ?? 0) +
        (receitaAnual.servicos ?? 0) +
        (receitaAnual.servicos_favorecida ?? 0) +
        (receitaAnual.servicos_hospitalares ?? 0) +
        (receitaAnual.demais_receitas ?? 0)
      );
    }
    return trimestres.reduce(
      (s, t) =>
        s +
        (t?.produtos_mercadorias ?? 0) +
        (t?.servicos ?? 0) +
        (t?.servicos_favorecida ?? 0) +
        (t?.servicos_hospitalares ?? 0) +
        (t?.demais_receitas ?? 0),
      0
    );
  }, [modoAnual, receitaAnual, trimestres]);

  const barChartData = useMemo(() => {
    if (!tributarioResult) return [];
    const c25 = tributarioResult.cenario_2025;
    const c26 = tributarioResult.cenario_2026;
    const cEq = tributarioResult.cenario_equiparacao;
    const pis = (c: typeof c25) => c.pis_a_rec_total ?? 0;
    const cof = (c: typeof c25) => c.cofins_a_rec_total ?? 0;
    return [
      {
        name: 'Cálculo 2025',
        total: c25.irpj_a_rec_total + c25.csll_a_rec_total + pis(c25) + cof(c25),
        irpj: c25.irpj_a_rec_total,
        csll: c25.csll_a_rec_total,
        pis: pis(c25),
        cofins: cof(c25),
      },
      {
        name: 'Projeção 2026',
        total: c26.irpj_a_rec_total + c26.csll_a_rec_total + pis(c26) + cof(c26),
        irpj: c26.irpj_a_rec_total,
        csll: c26.csll_a_rec_total,
        pis: pis(c26),
        cofins: cof(c26),
      },
      {
        name: 'Cenário Equiparação',
        total: cEq ? cEq.irpj_a_rec_total + cEq.csll_a_rec_total + pis(cEq) + cof(cEq) : 0,
        irpj: cEq?.irpj_a_rec_total ?? 0,
        csll: cEq?.csll_a_rec_total ?? 0,
        pis: cEq ? pis(cEq) : 0,
        cofins: cEq ? cof(cEq) : 0,
      },
    ];
  }, [tributarioResult]);

  const composicaoReceitaData = useMemo(() => {
    const comercio = modoAnual
      ? (receitaAnual.produtos_mercadorias ?? 0)
      : trimestres.reduce((s, t) => s + (t?.produtos_mercadorias ?? 0), 0);
    const servicos = modoAnual
      ? (receitaAnual.servicos ?? 0) + (receitaAnual.servicos_favorecida ?? 0) + (receitaAnual.servicos_hospitalares ?? 0)
      : trimestres.reduce((s, t) => s + (t?.servicos ?? 0) + (t?.servicos_favorecida ?? 0) + (t?.servicos_hospitalares ?? 0), 0);
    const demais = modoAnual ? (receitaAnual.demais_receitas ?? 0) : trimestres.reduce((s, t) => s + (t?.demais_receitas ?? 0), 0);
    const total = comercio + servicos + demais;
    if (total === 0) return [];
    return [
      { name: 'Comércio (8% IRPJ / 12% CSLL)', value: comercio, color: '#3b82f6' },
      { name: 'Serviços (até 32% IRPJ/CSLL)', value: servicos, color: '#10b981' },
      { name: 'Demais receitas (100%)', value: demais, color: '#8b5cf6' },
    ].filter((d) => d.value > 0);
  }, [modoAnual, receitaAnual, trimestres]);

  return (
    <Layout>
      <ToastContainer />
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Simulador Nova IN 2.306/2026</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('tributario')}
            className={`px-4 py-2 font-medium rounded-t-lg ${tab === 'tributario' ? 'bg-slate-100 text-brand border-b-2 border-brand' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Comparativo tributário (2025 x 2026)
          </button>
          <button
            type="button"
            onClick={() => setTab('parcelamento')}
            className={`px-4 py-2 font-medium rounded-t-lg ${tab === 'parcelamento' ? 'bg-slate-100 text-brand border-b-2 border-brand' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Parcelamento
          </button>
        </div>
        <button
          type="button"
          onClick={scrollToSimulacoesSalvas}
          className="text-sm text-brand hover:underline"
        >
          Ver simulações salvas
        </button>
      </div>

      {tab === 'tributario' && (
        <>
          <Card className="bg-amber-50/80 border-amber-200">
            <p className="text-sm text-slate-700 mb-1">
              <strong>Aviso:</strong> Este simulador tem finalidade apenas informativa e de planejamento. Não constitui parecer jurídico nem consultoria tributária. Para decisões que envolvam contestação judicial ou adesão a teses, consulte um advogado.
            </p>
            <p className="text-sm text-slate-600">
              Simulação com base na IN RFB 2.306/2026 e legislação vigente. Não substitui a apuração oficial nem consultoria tributária.
            </p>
            <details className="mt-3" open={refNormativaExpanded} onToggle={() => setRefNormativaExpanded((v) => !v)}>
              <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800">Referência normativa</summary>
              <p className="mt-1 text-xs text-slate-500">
                IN RFB nº 2.306, de 22/01/2026; Lei Complementar nº 224/2025; Decreto nº 12.808/2025.
              </p>
            </details>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Simulação tributária – Lucro Presumido</h2>
            <p className="text-sm text-slate-600 mb-2">
              Receitas por trimestre (R$). Limite isento: R$ 1.250.000/trimestre (R$ 5 MM/ano). Acréscimo de 10% na presunção sobre o excedente (IN 2.306/2026).
            </p>
            <p className="text-sm text-slate-500 mb-2">
              Comércio e Serviços possuem alíquotas de presunção diferentes (8%/12% vs 32% IRPJ/CSLL).
            </p>
            {!tributarioResult && (
              <p className="text-sm text-slate-600 mb-4 p-3 bg-slate-100 rounded-lg">
                Preencha as receitas por trimestre (Comércio e Serviços) e clique em <strong>Comparar cenários</strong> para ver o impacto da IN 2.306/2026.
              </p>
            )}
            <form onSubmit={handleSimulateTributario} className="space-y-6">
              <div className="flex flex-wrap gap-4 items-end">
                <Input
                  label="Ano"
                  type="number"
                  min={2020}
                  max={2030}
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={equiparacao}
                    onChange={(e) => setEquiparacao(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Equiparação hospitalar (8% IRPJ / 12% CSLL em serviços)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={modoAnual}
                    onChange={(e) => setModoAnual(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Receita anual única (distribuição uniforme)</span>
                </label>
              </div>

              {modoAnual ? (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <p className="text-sm text-amber-700 mb-3">
                    Distribuição uniforme entre trimestres. Para perfil com receita concentrada em alguns trimestres, use o preenchimento por trimestre.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Comércio – 8% IRPJ / 12% CSLL</p>
                      <Input label="Produtos / Mercadorias (ano)" type="number" step="0.01" min="0" value={receitaAnual.produtos_mercadorias ?? ''} onChange={(e) => setReceitaAnual((r) => ({ ...r, produtos_mercadorias: Number(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Serviços</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input label="Serviços (geral) – ano" type="number" step="0.01" min="0" value={receitaAnual.servicos ?? ''} onChange={(e) => setReceitaAnual((r) => ({ ...r, servicos: Number(e.target.value) || 0 }))} />
                        <Input label="Serv. favorecida – ano" type="number" step="0.01" min="0" value={receitaAnual.servicos_favorecida ?? ''} onChange={(e) => setReceitaAnual((r) => ({ ...r, servicos_favorecida: Number(e.target.value) || 0 }))} />
                        <Input label="Serv. hospitalares – ano" type="number" step="0.01" min="0" value={receitaAnual.servicos_hospitalares ?? ''} onChange={(e) => setReceitaAnual((r) => ({ ...r, servicos_hospitalares: Number(e.target.value) || 0 }))} />
                      </div>
                    </div>
                    <div>
                      <Input label="Demais receitas (ano)" type="number" step="0.01" min="0" value={receitaAnual.demais_receitas ?? ''} onChange={(e) => setReceitaAnual((r) => ({ ...r, demais_receitas: Number(e.target.value) || 0 }))} />
                    </div>
                  </div>
                </div>
              ) : (
              <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <h3 className="font-medium text-slate-800 mb-3">{i + 1}º Trimestre</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Comércio (Prod./Merc.) – 8% IRPJ / 12% CSLL</p>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                        <Input
                          label="Produtos / Mercadorias"
                          type="number"
                          step="0.01"
                          min="0"
                          value={trimestres[i]?.produtos_mercadorias ?? ''}
                          onChange={(e) => updateTrimestre(i, 'produtos_mercadorias', Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Serviços – alíquotas diferentes</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                          label="Serviços (geral) – 32% IRPJ / 32% CSLL"
                          type="number"
                          step="0.01"
                          min="0"
                          value={trimestres[i]?.servicos ?? ''}
                          onChange={(e) => updateTrimestre(i, 'servicos', Number(e.target.value) || 0)}
                        />
                        <Input
                          label="Serviços alíquota favorecida – 16% IRPJ"
                          type="number"
                          step="0.01"
                          min="0"
                          value={trimestres[i]?.servicos_favorecida ?? ''}
                          onChange={(e) => updateTrimestre(i, 'servicos_favorecida', Number(e.target.value) || 0)}
                        />
                        <Input
                          label="Serviços hospitalares – 8% IRPJ / 12% CSLL"
                          type="number"
                          step="0.01"
                          min="0"
                          value={trimestres[i]?.servicos_hospitalares ?? ''}
                          onChange={(e) => updateTrimestre(i, 'servicos_hospitalares', Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Demais receitas – 100% presunção</p>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                        <Input
                          label="Demais receitas / Ganhos de capital"
                          type="number"
                          step="0.01"
                          min="0"
                          value={trimestres[i]?.demais_receitas ?? ''}
                          onChange={(e) => updateTrimestre(i, 'demais_receitas', Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </>
              )}

              <p className="text-xs text-slate-500">
                Valores &quot;a rec.&quot; consideram retenções (IRRF, 4,65% órgãos públicos). Se não informadas, preencha quando disponível nas opções futuras.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={saveTrib} onChange={(e) => setSaveTrib(e.target.checked)} className="rounded border-slate-300" />
                  <span className="text-sm">Salvar simulação</span>
                </label>
                {saveTrib && (
                  <>
                    <Input
                      label="Título"
                      value={titleTrib}
                      onChange={(e) => setTitleTrib(e.target.value)}
                      className="max-w-xs"
                    />
                    <div className="min-w-[200px]">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                      <select
                        className="w-full border border-slate-200 rounded-md px-4 py-2"
                        value={clientIdTrib}
                        onChange={(e) => setClientIdTrib(e.target.value)}
                        required={saveTrib}
                      >
                        <option value="">Selecione</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} – {c.cnpj}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <Button type="submit" disabled={loading}>{loading ? 'Calculando...' : 'Comparar cenários'}</Button>
              </div>
            </form>
          </Card>

          {tributarioResult && (
            <>
              <Card className="bg-slate-50 border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Simulação calculada para ano <strong>{tributarioResult.ano}</strong>. Receita total informada: <strong>{formatMoney(receitaTotalInformada)}</strong>.</p>
                <p className="text-base font-semibold text-slate-800 mt-2">
                  Com a IN 2.306/2026 você pagaria <span className="text-red-700">{formatMoney(tributarioResult.comparativo.imposto_a_maior_2026_vs_2025)} a mais</span> em relação a 2025.
                  {tributarioResult.cenario_equiparacao && (
                    <> No cenário de equiparação hospitalar, a economia em relação a 2026 seria de <span className="text-green-700">{formatMoney(tributarioResult.comparativo.economia_equiparacao_vs_2026 ?? 0)}</span>.</>
                  )}
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-slate-400">
                  <h3 className="font-semibold text-slate-800 mb-2">Cálculo 2025 (sem aumento)</h3>
                  <p className="text-sm text-slate-500 mb-2">Receita bruta: {formatMoney(tributarioResult.cenario_2025.receita_bruta_total)}</p>
                  <p className="text-slate-700">IRPJ a rec.: <strong>{formatMoney(tributarioResult.cenario_2025.irpj_a_rec_total)}</strong></p>
                  <p className="text-slate-700">CSLL a rec.: <strong>{formatMoney(tributarioResult.cenario_2025.csll_a_rec_total)}</strong></p>
                  {includePisCofins && (
                    <>
                      <p className="text-slate-600 text-sm">PIS a rec.: {formatMoney(tributarioResult.cenario_2025.pis_a_rec_total ?? 0)}</p>
                      <p className="text-slate-600 text-sm">COFINS a rec.: {formatMoney(tributarioResult.cenario_2025.cofins_a_rec_total ?? 0)}</p>
                    </>
                  )}
                  <p className="text-slate-600 text-sm mt-2">
                    Total {includePisCofins ? 'tributos' : 'IRPJ+CSLL'}: {formatMoney(
                      tributarioResult.cenario_2025.irpj_a_rec_total + tributarioResult.cenario_2025.csll_a_rec_total +
                      (includePisCofins ? (tributarioResult.cenario_2025.pis_a_rec_total ?? 0) + (tributarioResult.cenario_2025.cofins_a_rec_total ?? 0) : 0)
                    )}
                  </p>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <h3 className="font-semibold text-slate-800 mb-2">Projeção 2026 (IN 2.306)</h3>
                  <p className="text-sm text-slate-500 mb-2">Receita bruta: {formatMoney(tributarioResult.cenario_2026.receita_bruta_total)}</p>
                  <p className="text-slate-700">IRPJ a rec.: <strong>{formatMoney(tributarioResult.cenario_2026.irpj_a_rec_total)}</strong></p>
                  <p className="text-slate-700">CSLL a rec.: <strong>{formatMoney(tributarioResult.cenario_2026.csll_a_rec_total)}</strong></p>
                  {includePisCofins && (
                    <>
                      <p className="text-slate-600 text-sm">PIS a rec.: {formatMoney(tributarioResult.cenario_2026.pis_a_rec_total ?? 0)}</p>
                      <p className="text-slate-600 text-sm">COFINS a rec.: {formatMoney(tributarioResult.cenario_2026.cofins_a_rec_total ?? 0)}</p>
                    </>
                  )}
                  <p className="text-slate-600 text-sm mt-2">
                    Total {includePisCofins ? 'tributos' : 'IRPJ+CSLL'}: {formatMoney(
                      tributarioResult.cenario_2026.irpj_a_rec_total + tributarioResult.cenario_2026.csll_a_rec_total +
                      (includePisCofins ? (tributarioResult.cenario_2026.pis_a_rec_total ?? 0) + (tributarioResult.cenario_2026.cofins_a_rec_total ?? 0) : 0)
                    )}
                  </p>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                  <h3 className="font-semibold text-slate-800 mb-2">Cenário Equiparação</h3>
                  <p className="text-xs text-slate-600 mb-2">O cenário &quot;Equiparação hospitalar&quot; reflete a aplicação de <strong>tese jurídica</strong>. Sua aceitação pela Receita depende de interpretação e de eventual decisão judicial (ex.: liminares/mandados de segurança em casos análogos). Cenário ilustrativo para discussão com advogado e contador.</p>
                  <p className="text-sm text-slate-500 mb-2">Receita bruta: {formatMoney(tributarioResult.cenario_equiparacao!.receita_bruta_total)}</p>
                  <p className="text-slate-700">IRPJ a rec.: <strong>{formatMoney(tributarioResult.cenario_equiparacao!.irpj_a_rec_total)}</strong></p>
                  <p className="text-slate-700">CSLL a rec.: <strong>{formatMoney(tributarioResult.cenario_equiparacao!.csll_a_rec_total)}</strong></p>
                  {includePisCofins && (
                    <>
                      <p className="text-slate-600 text-sm">PIS a rec.: {formatMoney(tributarioResult.cenario_equiparacao!.pis_a_rec_total ?? 0)}</p>
                      <p className="text-slate-600 text-sm">COFINS a rec.: {formatMoney(tributarioResult.cenario_equiparacao!.cofins_a_rec_total ?? 0)}</p>
                    </>
                  )}
                  <p className="text-slate-600 text-sm mt-2">
                    Total {includePisCofins ? 'tributos' : 'IRPJ+CSLL'}: {formatMoney(
                      tributarioResult.cenario_equiparacao!.irpj_a_rec_total + tributarioResult.cenario_equiparacao!.csll_a_rec_total +
                      (includePisCofins ? (tributarioResult.cenario_equiparacao!.pis_a_rec_total ?? 0) + (tributarioResult.cenario_equiparacao!.cofins_a_rec_total ?? 0) : 0)
                    )}
                  </p>
                </Card>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={includePisCofins} onChange={(e) => setIncludePisCofins(e.target.checked)} className="rounded border-slate-300" />
                  Incluir PIS e COFINS no total de tributos
                </label>
              </div>

              {barChartData.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-slate-800 mb-3">
                    {includePisCofins ? 'Total de tributos por cenário (IRPJ + CSLL + PIS + COFINS)' : 'Imposto total por cenário (IRPJ + CSLL a rec.)'}
                  </h3>
                  <div className="h-72 w-full" role="img" aria-label="Gráfico de barras comparando impostos por cenário: 2025, 2026 e Equiparação">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 12, right: 24, left: 24, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatMoney(v)} />
                        <Legend />
                        <Bar dataKey="irpj" name="IRPJ a rec." fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="csll" name="CSLL a rec." fill="#6366f1" radius={[4, 4, 0, 0]} />
                        {includePisCofins && <Bar dataKey="pis" name="PIS a rec." fill="#14b8a6" radius={[4, 4, 0, 0]} />}
                        {includePisCofins && <Bar dataKey="cofins" name="COFINS a rec." fill="#a855f7" radius={[4, 4, 0, 0]} />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {composicaoReceitaData.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-slate-800 mb-3">Composição da receita anual – Comércio vs Serviços</h3>
                  <p className="text-sm text-slate-500 mb-2">Comércio e Serviços têm alíquotas de presunção diferentes (8%/12% vs até 32%). Fatias pequenas aparecem apenas na legenda.</p>
                  <div className="h-72 w-full max-w-md mx-auto" role="img" aria-label="Gráfico de pizza com composição da receita: Comércio, Serviços e Demais">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={composicaoReceitaData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => (percent >= 0.05 ? `${name}: ${(percent * 100).toFixed(1)}%` : '')}
                        >
                          {composicaoReceitaData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatMoney(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              <Card>
                <h3 className="font-semibold text-slate-800 mb-3">Comparativo</h3>
                <p className="text-sm text-slate-500 mb-3">
                  Comércio (8% IRPJ / 12% CSLL) e Serviços (até 32% IRPJ/CSLL) têm alíquotas de presunção diferentes; o impacto do aumento em 2026 depende da composição da receita.
                </p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Imposto a maior (2026 vs 2025)</p>
                    <p className={`text-lg font-bold ${tributarioResult.comparativo.imposto_a_maior_2026_vs_2025 >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatMoney(tributarioResult.comparativo.imposto_a_maior_2026_vs_2025)}
                    </p>
                    {(() => {
                      const t25 = tributarioResult.cenario_2025.irpj_a_rec_total + tributarioResult.cenario_2025.csll_a_rec_total;
                      const t26 = tributarioResult.cenario_2026.irpj_a_rec_total + tributarioResult.cenario_2026.csll_a_rec_total;
                      if (t25 > 0) {
                        const pct = ((t26 - t25) / t25) * 100;
                        return <p className="text-sm text-slate-600">{pct >= 0 ? '+' : ''}{pct.toFixed(1)}% em relação a 2025</p>;
                      }
                      return null;
                    })()}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Economia com equiparação (vs 2026)</p>
                    <p className="text-lg font-bold text-green-700">
                      {formatMoney(tributarioResult.comparativo.economia_equiparacao_vs_2026 ?? 0)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-800 mb-2">Memória de Cálculo</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Limite isento: R$ 1.250.000/trimestre (R$ 5 MM/ano). O acréscimo de 10% na presunção incide apenas sobre a parcela da receita que exceder o limite (IN 2.306/2026). No 4º trimestre aplica-se o ajuste anual (§ 5º).
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Valores &quot;a rec.&quot; consideram retenções (IRRF, 4,65% órgãos públicos). Se não informadas, os valores podem ser superiores ao efetivamente devido.
                </p>
                <div className="flex gap-2 border-b border-slate-200 mb-4">
                  {(['Cálculo 2025', 'Projeção 2026', 'Cenário Equiparação'] as const).map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setMemoriaTab(idx as 0 | 1 | 2)}
                      className={`px-3 py-2 text-sm font-medium rounded-t-lg ${memoriaTab === idx ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  {(() => {
                    const cenarios = [
                      { label: 'Cálculo 2025 (sem aumento)', cenario: tributarioResult.cenario_2025 },
                      { label: 'Projeção 2026 (IN 2.306)', cenario: tributarioResult.cenario_2026 },
                      { label: 'Cenário Equiparação', cenario: tributarioResult.cenario_equiparacao },
                    ].filter((x) => x.cenario) as { label: string; cenario: typeof tributarioResult.cenario_2025 }[];
                    const { cenario } = cenarios[memoriaTab] ?? cenarios[0]!;
                    return (
                      <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Trim.</th>
                            <th className="px-3 py-2 text-right">Receita bruta</th>
                            <th className="px-3 py-2 text-right">B.C. IRPJ</th>
                            <th className="px-3 py-2 text-right">B.C. CSLL</th>
                            <th className="px-3 py-2 text-right">IRPJ</th>
                            <th className="px-3 py-2 text-right">Adic. IRPJ</th>
                            <th className="px-3 py-2 text-right">CSLL</th>
                            <th className="px-3 py-2 text-right">IRPJ a rec.</th>
                            <th className="px-3 py-2 text-right">CSLL a rec.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(cenario.trimestres as TrimestreCenario[])?.map((t) => (
                            <tr key={t.trimestre} className="border-t border-slate-200">
                              <td className="px-3 py-2">{t.trimestre}º</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.receita_bruta)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.base_calculo_irpj)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.base_calculo_csll)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.irpj)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.irpj_adicional ?? 0)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.csll)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.irpj_a_rec)}</td>
                              <td className="px-3 py-2 text-right">{formatMoney(t.csll_a_rec)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-300 bg-slate-50 font-medium">
                            <td className="px-3 py-2">ANUAL</td>
                            <td className="px-3 py-2 text-right">{formatMoney(cenario.receita_bruta_total)}</td>
                            <td className="px-3 py-2 text-right">–</td>
                            <td className="px-3 py-2 text-right">–</td>
                            <td className="px-3 py-2 text-right">{formatMoney(cenario.irpj_total)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(cenario.irpj_adicional_total ?? 0)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(cenario.csll_total)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(cenario.irpj_a_rec_total)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(cenario.csll_a_rec_total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {tab === 'parcelamento' && (
        <>
          <Card>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Simulação de parcelamento</h2>
            <form onSubmit={handleSimulateParcelamento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Competência (YYYY-MM)" value={formParcel.competence} onChange={(e) => setFormParcel((f) => ({ ...f, competence: e.target.value }))} placeholder="2026-01" />
              <Input label="Valor total (R$)" type="number" step="0.01" min="0" value={formParcel.valor_total || ''} onChange={(e) => setFormParcel((f) => ({ ...f, valor_total: Number(e.target.value) || 0 }))} />
              <Input label="Valor entrada (R$)" type="number" step="0.01" min="0" value={formParcel.valor_entrada || ''} onChange={(e) => setFormParcel((f) => ({ ...f, valor_entrada: Number(e.target.value) || 0 }))} />
              <Input label="Número de parcelas" type="number" min="1" max="360" value={formParcel.numero_parcelas ?? ''} onChange={(e) => setFormParcel((f) => ({ ...f, numero_parcelas: Number(e.target.value) || 1 }))} />
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading}>{loading ? 'Calculando...' : 'Simular'}</Button>
              </div>
            </form>
          </Card>
          {parcelamentoResult && (
            <Card>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Resultado</h2>
              <p>Valor financiado: {formatMoney(parcelamentoResult.result_data.valor_financiado)}</p>
              <p>Parcela: {parcelamentoResult.result_data.valor_parcela != null ? formatMoney(parcelamentoResult.result_data.valor_parcela) : '-'}</p>
            </Card>
          )}
        </>
      )}

      <div ref={simulacoesSalvasRef} id="simulacoes-salvas">
      <Card>
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Simulações salvas</h2>
        {simulations.length === 0 ? (
          <p className="text-slate-500">Nenhuma simulação salva.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {simulations.map((s) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-800">{s.title || `Simulação ${s.competence}`}</span>
                  <span className="text-slate-500 text-sm ml-2">{s.competence}</span>
                </div>
                <Button variant="tertiary" size="sm" onClick={() => handleDelete(s.id)} className="text-red-600 border-red-200 hover:bg-red-50">Excluir</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </Layout>
  );
}

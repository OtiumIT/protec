import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
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

const EMPTY_DEDUCOES = { pis_cofins_zero: 0, icms_destacado: 0 };
const EMPTY_RETENCOES = { irrf: 0, orgaos_publicos: 0 };

/** Exemplo 1: Serviços + O.Rec. por trimestre (planilha 2025) — Ctrl+D+1 */
const DEMO_1_TRIMESTRES: ReceitasTrimestre[] = [
  { produtos_mercadorias: 0, servicos: 1_706_814.36, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 2_872.02 },
  { produtos_mercadorias: 0, servicos: 2_026_790.17, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 8_499.24 },
  { produtos_mercadorias: 0, servicos: 1_123_393.84, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 34_678.22 },
  { produtos_mercadorias: 0, servicos: 1_690_008.22, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 43_038.42 },
];
/** Retenções ano 2025 (planilha Ex.1): IRRF 114.651,37 e 4,65% 304.435,81 — distribuídas por trimestre */
const DEMO_1_RETENCOES = [
  { irrf: 114_651.37 / 4, orgaos_publicos: 304_435.81 / 4 },
  { irrf: 114_651.37 / 4, orgaos_publicos: 304_435.81 / 4 },
  { irrf: 114_651.37 / 4, orgaos_publicos: 304_435.81 / 4 },
  { irrf: 114_651.37 / 4, orgaos_publicos: 304_435.81 / 4 },
];

/** Exemplo 2: Mesmos totais anuais distribuídos uniformemente nos 4 trimestres — Ctrl+D+2 */
const DEMO_2_TRIMESTRES: ReceitasTrimestre[] = [
  { produtos_mercadorias: 0, servicos: 6_547_006.59 / 4, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 89_087.9 / 4 },
  { produtos_mercadorias: 0, servicos: 6_547_006.59 / 4, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 89_087.9 / 4 },
  { produtos_mercadorias: 0, servicos: 6_547_006.59 / 4, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 89_087.9 / 4 },
  { produtos_mercadorias: 0, servicos: 6_547_006.59 / 4, servicos_favorecida: 0, servicos_hospitalares: 0, demais_receitas: 89_087.9 / 4 },
];
const DEMO_2_RETENCOES = DEMO_1_RETENCOES;

/** Exemplo 3: Serviços hospitalares + O.Rec. no 4º trim (planilha Serv.Hospit. 2025) — Ctrl+D+3 */
const DEMO_3_TRIMESTRES: ReceitasTrimestre[] = [
  { produtos_mercadorias: 0, servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 910_515, demais_receitas: 0 },
  { produtos_mercadorias: 0, servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 2_044_593.1, demais_receitas: 0 },
  { produtos_mercadorias: 0, servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 1_740_642.2, demais_receitas: 0 },
  { produtos_mercadorias: 0, servicos: 0, servicos_favorecida: 0, servicos_hospitalares: 1_616_806.7, demais_receitas: 121_426.37 },
];
const DEMO_3_RETENCOES = DEMO_1_RETENCOES;

const DEMO_KEY_WINDOW_MS = 1500;

/** Arredonda para 2 decimais (API exige .multipleOf(0.01)) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const simulacoesSalvasRef = useRef<HTMLDivElement>(null);
  const waitingDemoDigitRef = useRef<number>(0);
  const demoKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [deducoesTrimestrais, setDeducoesTrimestrais] = useState<{ pis_cofins_zero: number; icms_destacado: number }[]>(() =>
    Array(4).fill(null).map(() => ({ ...EMPTY_DEDUCOES }))
  );
  const [retencoesTrimestrais, setRetencoesTrimestrais] = useState<{ irrf: number; orgaos_publicos: number }[]>(() =>
    Array(4).fill(null).map(() => ({ ...EMPTY_RETENCOES }))
  );
  const [deducoesAnual, setDeducoesAnual] = useState(EMPTY_DEDUCOES);
  const [retencoesAnual, setRetencoesAnual] = useState(EMPTY_RETENCOES);

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

  const fillDemo1 = useCallback(() => {
    setTrimestres(DEMO_1_TRIMESTRES.map((t) => ({ ...t })));
    setRetencoesTrimestrais(DEMO_1_RETENCOES.map((r) => ({ ...r })));
    setDeducoesTrimestrais(() => Array(4).fill(null).map(() => ({ ...EMPTY_DEDUCOES })));
    setModoAnual(false);
    setAno(2025);
    setEquiparacao(false);
    setTributarioResult(null);
    setDetalhesAbertos(true);
    success('Exemplo 1: Serviços + O.Rec. + retenções. Clique em "Comparar cenários".');
  }, [success]);

  const fillDemo2 = useCallback(() => {
    setTrimestres(DEMO_2_TRIMESTRES.map((t) => ({ ...t })));
    setRetencoesTrimestrais(DEMO_2_RETENCOES.map((r) => ({ ...r })));
    setDeducoesTrimestrais(() => Array(4).fill(null).map(() => ({ ...EMPTY_DEDUCOES })));
    setModoAnual(false);
    setAno(2025);
    setEquiparacao(false);
    setTributarioResult(null);
    setDetalhesAbertos(true);
    success('Exemplo 2: Totais distribuídos + retenções. Clique em "Comparar cenários".');
  }, [success]);

  const fillDemo3 = useCallback(() => {
    setTrimestres(DEMO_3_TRIMESTRES.map((t) => ({ ...t })));
    setRetencoesTrimestrais(DEMO_3_RETENCOES.map((r) => ({ ...r })));
    setDeducoesTrimestrais(() => Array(4).fill(null).map(() => ({ ...EMPTY_DEDUCOES })));
    setModoAnual(false);
    setAno(2025);
    setEquiparacao(false);
    setTributarioResult(null);
    setDetalhesAbertos(true);
    success('Exemplo 3: Serviços hospitalares + O.Rec. 4º trim + retenções. Clique em "Comparar cenários".');
  }, [success]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (waitingDemoDigitRef.current && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault();
        const which = e.key === '1' ? 1 : e.key === '2' ? 2 : 3;
        waitingDemoDigitRef.current = 0;
        if (demoKeyTimeoutRef.current) {
          clearTimeout(demoKeyTimeoutRef.current);
          demoKeyTimeoutRef.current = null;
        }
        if (which === 1) fillDemo1();
        else if (which === 2) fillDemo2();
        else fillDemo3();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (demoKeyTimeoutRef.current) clearTimeout(demoKeyTimeoutRef.current);
        waitingDemoDigitRef.current = Date.now();
        demoKeyTimeoutRef.current = setTimeout(() => {
          waitingDemoDigitRef.current = 0;
          demoKeyTimeoutRef.current = null;
        }, DEMO_KEY_WINDOW_MS);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (demoKeyTimeoutRef.current) clearTimeout(demoKeyTimeoutRef.current);
    };
  }, [fillDemo1, fillDemo2, fillDemo3]);

  const updateTrimestre = (index: number, field: keyof ReceitasTrimestre, value: number) => {
    setTrimestres((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const updateDeducoes = (index: number, field: 'pis_cofins_zero' | 'icms_destacado', value: number) => {
    setDeducoesTrimestrais((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const updateRetencoes = (index: number, field: 'irrf' | 'orgaos_publicos', value: number) => {
    setRetencoesTrimestrais((prev) => {
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
      const trimestresParaEnvio = (modoAnual
        ? Array(4)
            .fill(null)
            .map(() => ({
              produtos_mercadorias: round2((receitaAnual.produtos_mercadorias ?? 0) / 4),
              servicos: round2((receitaAnual.servicos ?? 0) / 4),
              servicos_favorecida: round2((receitaAnual.servicos_favorecida ?? 0) / 4),
              servicos_hospitalares: round2((receitaAnual.servicos_hospitalares ?? 0) / 4),
              demais_receitas: round2((receitaAnual.demais_receitas ?? 0) / 4),
            }))
        : trimestres
      ).map((t) => ({
        produtos_mercadorias: round2(t?.produtos_mercadorias ?? 0),
        servicos: round2(t?.servicos ?? 0),
        servicos_favorecida: round2(t?.servicos_favorecida ?? 0),
        servicos_hospitalares: round2(t?.servicos_hospitalares ?? 0),
        demais_receitas: round2(t?.demais_receitas ?? 0),
      }));
      const deducoes = (modoAnual
        ? Array(4).fill(null).map(() => ({
            pis_cofins_zero: round2(deducoesAnual.pis_cofins_zero / 4),
            icms_destacado: round2(deducoesAnual.icms_destacado / 4),
          }))
        : deducoesTrimestrais
      ).map((d) => ({
        pis_cofins_zero: round2(d?.pis_cofins_zero ?? 0),
        icms_destacado: round2(d?.icms_destacado ?? 0),
      }));
      const retencoes = (modoAnual
        ? Array(4).fill(null).map(() => ({
            irrf: round2(retencoesAnual.irrf / 4),
            orgaos_publicos: round2(retencoesAnual.orgaos_publicos / 4),
          }))
        : retencoesTrimestrais
      ).map((r) => ({
        irrf: round2(r?.irrf ?? 0),
        orgaos_publicos: round2(r?.orgaos_publicos ?? 0),
      }));
      const input: SimulateTributarioInput = {
        ano,
        trimestres: trimestresParaEnvio,
        deducoes_trimestrais: deducoes,
        retencoes_trimestrais: retencoes,
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

  const renderMemoriaTabela = (cenario: { trimestres?: unknown; receita_bruta_total: number; irpj_total: number; irpj_adicional_total?: number; csll_total: number; irpj_a_rec_total: number; csll_a_rec_total: number }) => (
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Simulação LC 224/2025 – Lucro Presumido</h1>
        <p className="text-sm text-slate-600 mt-1">
          Compare a tributação antes e depois da alteração e veja o aumento para o contribuinte.
        </p>
      </div>
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
          <Card className="overflow-hidden">
            <form onSubmit={handleSimulateTributario} className="space-y-5">
              {/* Opções em linha única */}
              <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Ano</span>
                  <Input
                    type="number"
                    min={2020}
                    max={2030}
                    value={ano}
                    onChange={(e) => setAno(Number(e.target.value))}
                    className="w-28 min-w-[7rem] h-9 text-center"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={modoAnual} onChange={(e) => setModoAnual(e.target.checked)} className="rounded border-slate-300" />
                  Receita anual (distribuição uniforme)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={equiparacao} onChange={(e) => setEquiparacao(e.target.checked)} className="rounded border-slate-300" />
                  Equiparação hospitalar
                </label>
              </div>

              {modoAnual ? (
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MoneyInput label="Produtos / Mercadorias" value={receitaAnual.produtos_mercadorias ?? 0} onChange={(v) => setReceitaAnual((r) => ({ ...r, produtos_mercadorias: v }))} />
                    <MoneyInput label="Serviços (geral)" value={receitaAnual.servicos ?? 0} onChange={(v) => setReceitaAnual((r) => ({ ...r, servicos: v }))} />
                    <MoneyInput label="Serv. favorecida" value={receitaAnual.servicos_favorecida ?? 0} onChange={(v) => setReceitaAnual((r) => ({ ...r, servicos_favorecida: v }))} />
                    <MoneyInput label="Serv. hospitalares" value={receitaAnual.servicos_hospitalares ?? 0} onChange={(v) => setReceitaAnual((r) => ({ ...r, servicos_hospitalares: v }))} />
                    <MoneyInput label="Demais receitas" value={receitaAnual.demais_receitas ?? 0} onChange={(v) => setReceitaAnual((r) => ({ ...r, demais_receitas: v }))} className="sm:col-span-2" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                    <MoneyInput label="PIS/COFINS alíq. zero" value={deducoesAnual.pis_cofins_zero ?? 0} onChange={(v) => setDeducoesAnual((d) => ({ ...d, pis_cofins_zero: v }))} />
                    <MoneyInput label="ICMS destacado" value={deducoesAnual.icms_destacado ?? 0} onChange={(v) => setDeducoesAnual((d) => ({ ...d, icms_destacado: v }))} />
                    <MoneyInput label="IRRF" value={retencoesAnual.irrf ?? 0} onChange={(v) => setRetencoesAnual((r) => ({ ...r, irrf: v }))} />
                    <MoneyInput label="Órgãos públicos 4,65%" value={retencoesAnual.orgaos_publicos ?? 0} onChange={(v) => setRetencoesAnual((r) => ({ ...r, orgaos_publicos: v }))} />
                  </div>
                </div>
              ) : (
              <>
                {/* Tabela: uma linha por tipo de receita, colunas = T1..T4 */}
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="text-left py-2.5 px-3 font-medium w-48">Receita</th>
                        <th className="text-right py-2.5 px-2 font-medium">1º Trim</th>
                        <th className="text-right py-2.5 px-2 font-medium">2º Trim</th>
                        <th className="text-right py-2.5 px-2 font-medium">3º Trim</th>
                        <th className="text-right py-2.5 px-2 font-medium">4º Trim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Produtos / Mercadorias</td>
                        {[0, 1, 2, 3].map((i) => (
                          <td key={i} className="py-1.5 px-2">
                            <MoneyInput value={trimestres[i]?.produtos_mercadorias ?? 0} onChange={(v) => updateTrimestre(i, 'produtos_mercadorias', v)} className="text-right text-sm" />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Serviços (geral)</td>
                        {[0, 1, 2, 3].map((i) => (
                          <td key={i} className="py-1.5 px-2">
                            <MoneyInput value={trimestres[i]?.servicos ?? 0} onChange={(v) => updateTrimestre(i, 'servicos', v)} className="text-right text-sm" />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Serv. favorecida</td>
                        {[0, 1, 2, 3].map((i) => (
                          <td key={i} className="py-1.5 px-2">
                            <MoneyInput value={trimestres[i]?.servicos_favorecida ?? 0} onChange={(v) => updateTrimestre(i, 'servicos_favorecida', v)} className="text-right text-sm" />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Serv. hospitalares</td>
                        {[0, 1, 2, 3].map((i) => (
                          <td key={i} className="py-1.5 px-2">
                            <MoneyInput value={trimestres[i]?.servicos_hospitalares ?? 0} onChange={(v) => updateTrimestre(i, 'servicos_hospitalares', v)} className="text-right text-sm" />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 px-3 text-slate-600">Demais receitas</td>
                        {[0, 1, 2, 3].map((i) => (
                          <td key={i} className="py-1.5 px-2">
                            <MoneyInput value={trimestres[i]?.demais_receitas ?? 0} onChange={(v) => updateTrimestre(i, 'demais_receitas', v)} className="text-right text-sm" />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400 px-3 py-2 bg-slate-50/80 border-t border-slate-100">Limite isento: R$ 1.250.000/trim (R$ 5 MM/ano). Acréscimo 10% sobre o excedente (LC 224/2025).</p>
                </div>

                {/* Deduções e retenções: recolhível */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDetalhesAbertos((b) => !b)}
                    className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700"
                  >
                    <span>Deduções e retenções (opcional)</span>
                    <span className="text-slate-400">{detalhesAbertos ? '▲' : '▼'}</span>
                  </button>
                  {detalhesAbertos && (
                    <div className="p-3 bg-white border-t border-slate-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-left">
                            <th className="py-1.5 px-3 font-normal w-44"></th>
                            <th className="text-right py-1.5 px-2 font-normal">1º</th>
                            <th className="text-right py-1.5 px-2 font-normal">2º</th>
                            <th className="text-right py-1.5 px-2 font-normal">3º</th>
                            <th className="text-right py-1.5 px-2 font-normal">4º</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          <tr>
                            <td className="py-1 px-3 text-slate-600">PIS/COFINS alíq. zero</td>
                            {[0, 1, 2, 3].map((i) => (
                              <td key={i} className="py-1 px-2">
                                <MoneyInput value={deducoesTrimestrais[i]?.pis_cofins_zero ?? 0} onChange={(v) => updateDeducoes(i, 'pis_cofins_zero', v)} className="text-right text-sm" />
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-1 px-3 text-slate-600">ICMS destacado</td>
                            {[0, 1, 2, 3].map((i) => (
                              <td key={i} className="py-1 px-2">
                                <MoneyInput value={deducoesTrimestrais[i]?.icms_destacado ?? 0} onChange={(v) => updateDeducoes(i, 'icms_destacado', v)} className="text-right text-sm" />
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-1 px-3 text-slate-600">IRRF</td>
                            {[0, 1, 2, 3].map((i) => (
                              <td key={i} className="py-1 px-2">
                                <MoneyInput value={retencoesTrimestrais[i]?.irrf ?? 0} onChange={(v) => updateRetencoes(i, 'irrf', v)} className="text-right text-sm" />
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-1 px-3 text-slate-600">Órgãos públicos 4,65%</td>
                            {[0, 1, 2, 3].map((i) => (
                              <td key={i} className="py-1 px-2">
                                <MoneyInput value={retencoesTrimestrais[i]?.orgaos_publicos ?? 0} onChange={(v) => updateRetencoes(i, 'orgaos_publicos', v)} className="text-right text-sm" />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
                <Button type="submit" disabled={loading} className="bg-brand hover:bg-brand/90 text-white font-medium">
                  {loading ? 'Calculando...' : 'Comparar cenários'}
                </Button>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={saveTrib} onChange={(e) => setSaveTrib(e.target.checked)} className="rounded border-slate-300" />
                  Salvar simulação
                </label>
                {saveTrib && (
                  <>
                    <Input placeholder="Título" value={titleTrib} onChange={(e) => setTitleTrib(e.target.value)} className="w-40 h-9 text-sm" />
                    <select
                      className="h-9 min-w-[180px] border border-slate-200 rounded-md px-3 text-sm text-slate-700"
                      value={clientIdTrib}
                      onChange={(e) => setClientIdTrib(e.target.value)}
                      required={saveTrib}
                    >
                      <option value="">Cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </form>
          </Card>

          {tributarioResult && (
            <>
              <div id="simulador-tributario-resultado-print" className="space-y-6">
                {/* Cabeçalho do resultado: título + resumo + botão PDF */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Resultado da simulação</h2>
                    <p className="text-sm text-slate-600">
                      Ano <strong>{tributarioResult.ano}</strong> · Receita total informada: <strong>{formatMoney(receitaTotalInformada)}</strong>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <span>
                        Aumento (2026 vs 2025): <strong className="text-red-700">{formatMoney(tributarioResult.comparativo.imposto_a_maior_2026_vs_2025)}</strong>
                      </span>
                      {tributarioResult.cenario_equiparacao && (
                        <span>
                          Economia equiparação: <strong className="text-violet-700">{formatMoney(tributarioResult.comparativo.economia_equiparacao_vs_2026 ?? 0)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.print()}
                    className="print:hidden shrink-0 inline-flex items-center gap-2"
                    aria-label="Exportar resultado para PDF"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar para PDF
                  </Button>
                </div>

                {/* Cards dos 3 cenários — cores alinhadas ao gráfico */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Card className="border-l-4 border-l-slate-500 bg-slate-50/50 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Cálculo 2025 (sem aumento)</h3>
                    <p className="text-xs text-slate-500 mb-3">Receita bruta: {formatMoney(tributarioResult.cenario_2025.receita_bruta_total)}</p>
                    <p className="text-slate-700 text-sm">IRPJ a rec.: <strong className="text-slate-900">{formatMoney(tributarioResult.cenario_2025.irpj_a_rec_total)}</strong></p>
                    <p className="text-slate-700 text-sm">CSLL a rec.: <strong className="text-slate-900">{formatMoney(tributarioResult.cenario_2025.csll_a_rec_total)}</strong></p>
                    {includePisCofins && (
                      <>
                        <p className="text-slate-600 text-xs">PIS: {formatMoney(tributarioResult.cenario_2025.pis_a_rec_total ?? 0)} · COFINS: {formatMoney(tributarioResult.cenario_2025.cofins_a_rec_total ?? 0)}</p>
                      </>
                    )}
                    <p className="mt-3 pt-3 border-t border-slate-200 text-base font-bold text-slate-800">
                      Total {includePisCofins ? 'tributos' : 'IRPJ+CSLL'}: {formatMoney(
                        tributarioResult.cenario_2025.irpj_a_rec_total + tributarioResult.cenario_2025.csll_a_rec_total +
                        (includePisCofins ? (tributarioResult.cenario_2025.pis_a_rec_total ?? 0) + (tributarioResult.cenario_2025.cofins_a_rec_total ?? 0) : 0)
                      )}
                    </p>
                  </Card>
                  <Card className="border-l-4 border-l-amber-500 bg-amber-50/30 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">Projeção 2026 (LC 224/2025)</h3>
                    <p className="text-xs text-slate-500 mb-3">Receita bruta: {formatMoney(tributarioResult.cenario_2026.receita_bruta_total)}</p>
                    <p className="text-slate-700 text-sm">IRPJ a rec.: <strong className="text-slate-900">{formatMoney(tributarioResult.cenario_2026.irpj_a_rec_total)}</strong></p>
                    <p className="text-slate-700 text-sm">CSLL a rec.: <strong className="text-slate-900">{formatMoney(tributarioResult.cenario_2026.csll_a_rec_total)}</strong></p>
                    {includePisCofins && (
                      <p className="text-slate-600 text-xs">PIS: {formatMoney(tributarioResult.cenario_2026.pis_a_rec_total ?? 0)} · COFINS: {formatMoney(tributarioResult.cenario_2026.cofins_a_rec_total ?? 0)}</p>
                    )}
                    <p className="mt-3 pt-3 border-t border-amber-200 text-base font-bold text-slate-800">
                      Total {includePisCofins ? 'tributos' : 'IRPJ+CSLL'}: {formatMoney(
                        tributarioResult.cenario_2026.irpj_a_rec_total + tributarioResult.cenario_2026.csll_a_rec_total +
                        (includePisCofins ? (tributarioResult.cenario_2026.pis_a_rec_total ?? 0) + (tributarioResult.cenario_2026.cofins_a_rec_total ?? 0) : 0)
                      )}
                    </p>
                  </Card>
                  <Card className="border-l-4 border-l-violet-500 bg-violet-50/30 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-violet-800 uppercase tracking-wider mb-3">Cenário Equiparação</h3>
                    <p className="text-xs text-slate-600 mb-3">Tese jurídica. Aceitação pela Receita depende de interpretação e eventual decisão judicial. Ilustrativo para discussão com advogado e contador.</p>
                    <p className="text-xs text-slate-500 mb-2">Receita bruta: {formatMoney(tributarioResult.cenario_equiparacao!.receita_bruta_total)}</p>
                    <p className="text-slate-700 text-sm">IRPJ a rec.: <strong className="text-slate-900">{formatMoney(tributarioResult.cenario_equiparacao!.irpj_a_rec_total)}</strong></p>
                    <p className="text-slate-700 text-sm">CSLL a rec.: <strong className="text-slate-900">{formatMoney(tributarioResult.cenario_equiparacao!.csll_a_rec_total)}</strong></p>
                    {includePisCofins && (
                      <p className="text-slate-600 text-xs">PIS: {formatMoney(tributarioResult.cenario_equiparacao!.pis_a_rec_total ?? 0)} · COFINS: {formatMoney(tributarioResult.cenario_equiparacao!.cofins_a_rec_total ?? 0)}</p>
                    )}
                    <p className="mt-3 pt-3 border-t border-violet-200 text-base font-bold text-slate-800">
                      Total {includePisCofins ? 'tributos' : 'IRPJ+CSLL'}: {formatMoney(
                        tributarioResult.cenario_equiparacao!.irpj_a_rec_total + tributarioResult.cenario_equiparacao!.csll_a_rec_total +
                        (includePisCofins ? (tributarioResult.cenario_equiparacao!.pis_a_rec_total ?? 0) + (tributarioResult.cenario_equiparacao!.cofins_a_rec_total ?? 0) : 0)
                      )}
                    </p>
                  </Card>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={includePisCofins} onChange={(e) => setIncludePisCofins(e.target.checked)} className="rounded border-slate-300" />
                  Incluir PIS e COFINS no total de tributos
                </label>
              </div>

              {barChartData.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-800 mb-3">
                    {includePisCofins ? 'Total de tributos por cenário' : 'Imposto total por cenário (IRPJ + CSLL a rec.)'}
                  </h3>
                  <div className="h-64 w-full" role="img" aria-label="Gráfico comparando total de impostos: 2025, 2026 e Equiparação">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 12, right: 24, left: 24, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatMoney(v)} />
                        <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                          {barChartData.map((_, index) => (
                            <Cell key={index} fill={['#64748b', '#f59e0b', '#7c3aed'][index]} />
                          ))}
                        </Bar>
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
                    <p className={`text-lg font-bold ${tributarioResult.comparativo.imposto_a_maior_2026_vs_2025 >= 0 ? 'text-red-700' : 'text-indigo-600'}`}>
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
                    <p className="text-lg font-bold text-indigo-600">
                      {formatMoney(tributarioResult.comparativo.economia_equiparacao_vs_2026 ?? 0)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold text-slate-800 mb-2">Memória de Cálculo</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Limite isento: R$ 1.250.000/trimestre (R$ 5 MM/ano). O acréscimo de 10% na presunção incide apenas sobre a parcela da receita que exceder o limite (LC 224/2025 – IN 2.306/2026). No 4º trimestre aplica-se o ajuste anual (§ 5º).
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Valores &quot;a rec.&quot; consideram retenções (IRRF, 4,65% órgãos públicos). Se não informadas, os valores podem ser superiores ao efetivamente devido.
                </p>

                {/* Tela: abas + uma tabela por vez */}
                <div className="print:hidden">
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
                        { label: 'Projeção 2026 (LC 224/2025)', cenario: tributarioResult.cenario_2026 },
                        { label: 'Cenário Equiparação', cenario: tributarioResult.cenario_equiparacao },
                      ].filter((x) => x.cenario) as { label: string; cenario: typeof tributarioResult.cenario_2025 }[];
                      const { cenario } = cenarios[memoriaTab] ?? cenarios[0]!;
                      return renderMemoriaTabela(cenario);
                    })()}
                  </div>
                </div>

                {/* Impressão: as 3 tabelas exibidas em sequência */}
                <div className="hidden print:block space-y-6">
                  {[
                    { label: 'Cálculo 2025 (sem aumento)', cenario: tributarioResult.cenario_2025 },
                    { label: 'Projeção 2026 (LC 224/2025)', cenario: tributarioResult.cenario_2026 },
                    { label: 'Cenário Equiparação', cenario: tributarioResult.cenario_equiparacao },
                  ]
                    .filter((x): x is { label: string; cenario: NonNullable<typeof x.cenario> } => !!x.cenario)
                    .map(({ label, cenario }) => (
                      <div key={label}>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">{label}</h4>
                        {renderMemoriaTabela(cenario)}
                      </div>
                    ))}
                </div>
              </Card>
              </div>
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
              <MoneyInput label="Valor total (R$)" value={formParcel.valor_total ?? 0} onChange={(v) => setFormParcel((f) => ({ ...f, valor_total: v }))} />
              <MoneyInput label="Valor entrada (R$)" value={formParcel.valor_entrada ?? 0} onChange={(v) => setFormParcel((f) => ({ ...f, valor_entrada: v }))} />
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

      <Card className="mt-6 bg-amber-50/80 border-amber-200">
        <p className="text-sm text-slate-700 mb-1">
          <strong>Aviso:</strong> Este simulador tem finalidade apenas informativa e de planejamento. Não constitui parecer jurídico nem consultoria tributária. Para decisões que envolvam contestação judicial ou adesão a teses, consulte um advogado.
        </p>
        <p className="text-sm text-slate-600">
          Simulação com base na LC 224/2025 e IN RFB 2.306/2026. Compare a tributação antes e depois da alteração. Não substitui a apuração oficial nem consultoria tributária.
        </p>
        <details className="mt-3" open={refNormativaExpanded} onToggle={() => setRefNormativaExpanded((v) => !v)}>
          <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-800">Referência normativa</summary>
          <p className="mt-1 text-xs text-slate-500">
            IN RFB nº 2.306, de 22/01/2026; Lei Complementar nº 224/2025; Decreto nº 12.808/2025.
          </p>
        </details>
      </Card>
    </Layout>
  );
}

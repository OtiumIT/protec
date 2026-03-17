import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { propertyService } from '../services/property.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { Modal } from '../../../shared/components/ui/Modal';
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
import type { PropertyTaxSimulationResponse, SimulateStandaloneMesInput, PerfilLocacaoReforma, PropertySimulation } from '@shared/core';
import { calcularTransicaoIBS, type TransicaoIBSResult } from '@shared/core';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type MesFields = Omit<SimulateStandaloneMesInput, 'mes_referencia'>;
type SectionKey = 'receita' | 'despesa' | 'custo';

const ROWS: Array<{ label: string; field: keyof MesFields; section: SectionKey }> = [
  { label: 'Aluguel tradicional (longo prazo)', field: 'receita_aluguel_tradicional', section: 'receita' },
  { label: 'Aluguel curto prazo (Airbnb, temporada)', field: 'receita_aluguel_curto', section: 'receita' },
  { label: 'Estacionamento / vaga de garagem', field: 'receita_garagem', section: 'receita' },
  { label: 'Outras (lavanderia, depósito, etc.)', field: 'receita_outras', section: 'receita' },
  { label: 'IPTU', field: 'iptu', section: 'despesa' },
  { label: 'Condomínio', field: 'condominio', section: 'despesa' },
  { label: 'Seguro do imóvel', field: 'seguro_imovel', section: 'despesa' },
  { label: 'Juros de financiamento do imóvel', field: 'juros_financiamento', section: 'despesa' },
  { label: 'Manutenção e conservação', field: 'manutencao_conservacao', section: 'despesa' },
  { label: 'Outras despesas dedutíveis', field: 'outras_dedutiveis', section: 'despesa' },
  { label: 'Reformas e melhorias', field: 'reformas_melhorias', section: 'custo' },
  { label: 'Mobiliário e equipamentos', field: 'mobilia_equipamentos', section: 'custo' },
  { label: 'Limpeza e higienização', field: 'limpeza_higienizacao', section: 'custo' },
  { label: 'Comissão imobiliária / corretagem', field: 'comissao_corretagem', section: 'custo' },
  { label: 'Taxa de plataforma (Airbnb, Booking, etc.)', field: 'taxa_plataforma', section: 'custo' },
  { label: 'Outros custos operacionais', field: 'outros_custos', section: 'custo' },
];

const SECTION_CONFIG: Record<SectionKey, { title: string; subtitle: string; icon: React.ReactNode; bg: string; border: string; headerBg: string }> = {
  receita: {
    title: 'Receitas',
    subtitle: 'Valores mensais que entram (aluguéis, diárias, etc.)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-100/80 border-emerald-200',
  },
  despesa: {
    title: 'Despesas dedutíveis (PF)',
    subtitle: 'Lei nº 7.739/1989 — reduzem a base de cálculo do IR',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    bg: 'bg-sky-50/60',
    border: 'border-sky-200',
    headerBg: 'bg-sky-100/80 border-sky-200',
  },
  custo: {
    title: 'Custos operacionais',
    subtitle: 'Reforma IBS/CBS — geram créditos na atividade',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    bg: 'bg-amber-50/60',
    border: 'border-amber-200',
    headerBg: 'bg-amber-100/80 border-amber-200',
  },
};

const DEMO_KEY_WINDOW_MS = 1500;

/** Ctrl+D+1: Cenário viável – predominância Airbnb, receita ~140k, ultrapassa 120k no 4º trim (imposto postergado) */
function buildDemoMeses(ano: number): SimulateStandaloneMesInput[] {
  const base = {
    receita_aluguel_tradicional: 2500,
    receita_aluguel_curto: 9000,
    receita_garagem: 200,
    receita_outras: 0,
    iptu: 450,
    condominio: 380,
    seguro_imovel: 120,
    juros_financiamento: 0,
    manutencao_conservacao: 150,
    outras_dedutiveis: 0,
    reformas_melhorias: 0,
    mobilia_equipamentos: 0,
    limpeza_higienizacao: 350,
    comissao_corretagem: 0,
    taxa_plataforma: 540,
    outros_custos: 0,
  };
  return Array.from({ length: 12 }, (_, i) => ({
    mes_referencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
    ...base,
  }));
}

function emptyMes(ano: number, i: number): SimulateStandaloneMesInput {
  return {
    mes_referencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
    receita_aluguel_tradicional: 0,
    receita_aluguel_curto: 0,
    receita_garagem: 0,
    receita_outras: 0,
    iptu: 0,
    condominio: 0,
    seguro_imovel: 0,
    juros_financiamento: 0,
    manutencao_conservacao: 0,
    outras_dedutiveis: 0,
    reformas_melhorias: 0,
    mobilia_equipamentos: 0,
    limpeza_higienizacao: 0,
    comissao_corretagem: 0,
    taxa_plataforma: 0,
    outros_custos: 0,
  };
}

export function SimuladorImoveis() {
  const { success, error: showError, ToastContainer } = useToast();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [meses, setMeses] = useState<SimulateStandaloneMesInput[]>(() =>
    Array.from({ length: 12 }, (_, i) => emptyMes(anoAtual, i))
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PropertyTaxSimulationResponse | null>(null);
  const [contratoAntes16012025, setContratoAntes16012025] = useState(false);
  const [perfilLocacao, setPerfilLocacao] = useState<PerfilLocacaoReforma>('residencial_comum');
  const [saveClientId, setSaveClientId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [simulations, setSimulations] = useState<PropertySimulation[]>([]);
  const [viewingSimulation, setViewingSimulation] = useState<PropertySimulation | null>(null);
  const [editingSimulationId, setEditingSimulationId] = useState<string | null>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  /** Payload da última simulação (para Salvar no histórico após o resultado). */
  const lastSimulationPayloadRef = useRef<{
    ano: number;
    meses: SimulateStandaloneMesInput[];
    quantidade_imoveis: number;
    quantidade_imoveis_residenciais: number;
    quantidade_imoveis_comerciais: number;
    opcoes_reforma: Record<string, unknown>;
  } | null>(null);
  const [modoReceitaAnual, setModoReceitaAnual] = useState(false);
  const [aluguelAnualTradicional, setAluguelAnualTradicional] = useState<number>(0);
  const [aluguelAnualCurto, setAluguelAnualCurto] = useState<number>(0);
  const [modoDespesaAnual, setModoDespesaAnual] = useState(false);
  const [despesaAnualTotal, setDespesaAnualTotal] = useState<number>(0);
  const [modoCustoAnual, setModoCustoAnual] = useState(false);
  const [custoAnualTotal, setCustoAnualTotal] = useState<number>(0);
  const [aliquotaPlenaIBS, setAliquotaPlenaIBS] = useState<number>(19);
  const [aliquotaCBS, setAliquotaCBS] = useState<number>(9);
  const [quantidadeImoveisResidenciais, setQuantidadeImoveisResidenciais] = useState<number>(1);
  const [quantidadeImoveisComerciais, setQuantidadeImoveisComerciais] = useState<number>(0);
  const quantidadeImoveisTotal =
    (quantidadeImoveisResidenciais || 0) + (quantidadeImoveisComerciais || 0) || 1;
  const [valoresAnuais, setValoresAnuais] = useState<Partial<Record<keyof MesFields, number>>>({});

  const transicaoIBSResult = calcularTransicaoIBS(aliquotaPlenaIBS, [2027, 2028, 2029, 2030, 2031, 2032, 2033]);

  const aplicarRateioAnual = useCallback(
    (field: keyof MesFields) => {
      const val = round2(valoresAnuais[field] ?? 0);
      if (val <= 0) return;
      const valorMensal = round2(val / 12);
      setMeses((prev) =>
        prev.map((m) => ({
          ...m,
          [field]: valorMensal,
        }))
      );
      success('Valor anual rateado nos 12 meses. Ajuste manualmente se necessário.');
    },
    [valoresAnuais, success]
  );

  const aplicarAluguelAnual = useCallback(() => {
    const valTrad = round2(aluguelAnualTradicional ?? 0);
    const valCurto = round2(aluguelAnualCurto ?? 0);
    const mensalTrad = round2(valTrad / 12);
    const mensalCurto = round2(valCurto / 12);
    setMeses((prev) =>
      prev.map((m) => ({
        ...m,
        receita_aluguel_tradicional: mensalTrad,
        receita_aluguel_curto: mensalCurto,
      }))
    );
    if (valTrad > 0 || valCurto > 0) {
      success('Aluguel anual rateado nos 12 meses. Ajuste manualmente se necessário.');
    }
  }, [aluguelAnualTradicional, aluguelAnualCurto, success]);

  const aplicarDespesaAnual = useCallback(() => {
    const total = round2(despesaAnualTotal ?? 0);
    const valorMensal = round2(total / 12);
    setMeses((prev) =>
      prev.map((m) => ({
        ...m,
        iptu: 0,
        condominio: 0,
        seguro_imovel: 0,
        juros_financiamento: 0,
        manutencao_conservacao: 0,
        outras_dedutiveis: valorMensal,
      }))
    );
    if (total > 0) {
      success('Despesas anuais rateadas nos 12 meses. Ajuste manualmente se necessário.');
    }
  }, [despesaAnualTotal, success]);

  const aplicarCustoAnual = useCallback(() => {
    const total = round2(custoAnualTotal ?? 0);
    const valorMensal = round2(total / 12);
    setMeses((prev) =>
      prev.map((m) => ({
        ...m,
        outros_custos: valorMensal,
      }))
    );
    if (total > 0) {
      success('Custos operacionais anuais rateados nos 12 meses. Ajuste manualmente se necessário.');
    }
  }, [custoAnualTotal, success]);

  const updateMes = (idx: number, field: keyof MesFields, value: number) => {
    setMeses((prev) => {
      const next = [...prev];
      const m = { ...next[idx]!, [field]: round2(value) };
      next[idx] = m;
      return next;
    });
  };

  const updateAno = (newAno: number) => {
    setAno(newAno);
    setMeses((prev) =>
      prev.map((m, i) => ({
        ...m,
        mes_referencia: `${newAno}-${String(i + 1).padStart(2, '0')}`,
      }))
    );
  };

  const waitingDemoDigitRef = useRef<number>(0);
  const demoKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fillDemo1 = useCallback(() => {
    const anoDemo = anoAtual;
    setAno(anoDemo);
    setMeses(buildDemoMeses(anoDemo));
    setResult(null);
    success('Demo carregada: predominância Airbnb, ~R$ 140k/ano. Clique em "Simular".');
  }, [success, anoAtual]);

  const handlePrintPdf = useCallback(() => {
    const el = document.getElementById('simulador-imoveis-resultado-print');
    if (!el) return;
    const parent = el.parentElement;
    const placeholder = document.createElement('div');
    placeholder.id = 'simulador-imoveis-print-placeholder';
    if (parent) {
      parent.insertBefore(placeholder, el);
      document.body.appendChild(el);
      el.setAttribute('data-print-moved', 'true');
    }
    const cleanup = () => {
      el.removeAttribute('data-print-moved');
      if (parent && placeholder.parentElement && el.parentElement === document.body) {
        document.body.removeChild(el);
        parent.replaceChild(el, placeholder);
      }
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 150);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (waitingDemoDigitRef.current && e.key === '1') {
        e.preventDefault();
        waitingDemoDigitRef.current = 0;
        if (demoKeyTimeoutRef.current) {
          clearTimeout(demoKeyTimeoutRef.current);
          demoKeyTimeoutRef.current = null;
        }
        fillDemo1();
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
  }, [fillDemo1]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [clientsResult, simResult] = await Promise.allSettled([
        clientService.list(),
        propertyService.listSimulations({ page: 1, limit: 20 }),
      ]);
      if (!cancelled) {
        setClients(clientsResult.status === 'fulfilled' && Array.isArray(clientsResult.value) ? clientsResult.value : []);
        setSimulations(simResult.status === 'fulfilled' ? (simResult.value?.simulations ?? []) : []);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (result) {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const buildMesesParaEnvio = (): SimulateStandaloneMesInput[] =>
    meses.map((m, i) => {
      const mesRef = m.mes_referencia || `${ano}-${String(i + 1).padStart(2, '0')}`;
      return {
        mes_referencia: mesRef,
        receita_aluguel_tradicional: round2((m.receita_aluguel_tradicional ?? 0) as number),
        receita_aluguel_curto: round2((m.receita_aluguel_curto ?? 0) as number),
        receita_garagem: round2((m.receita_garagem ?? 0) as number),
        receita_outras: round2((m.receita_outras ?? 0) as number),
        iptu: round2((m.iptu ?? 0) as number),
        condominio: round2((m.condominio ?? 0) as number),
        seguro_imovel: round2((m.seguro_imovel ?? 0) as number),
        juros_financiamento: round2((m.juros_financiamento ?? 0) as number),
        manutencao_conservacao: round2((m.manutencao_conservacao ?? 0) as number),
        outras_dedutiveis: round2((m.outras_dedutiveis ?? 0) as number),
        reformas_melhorias: round2((m.reformas_melhorias ?? 0) as number),
        mobilia_equipamentos: round2((m.mobilia_equipamentos ?? 0) as number),
        limpeza_higienizacao: round2((m.limpeza_higienizacao ?? 0) as number),
        comissao_corretagem: round2((m.comissao_corretagem ?? 0) as number),
        taxa_plataforma: round2((m.taxa_plataforma ?? 0) as number),
        outros_custos: round2((m.outros_custos ?? 0) as number),
      };
    });

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSimulationId) {
      setLoading(true);
      setResult(null);
      try {
        const mesesParaEnvio = buildMesesParaEnvio();
        const opcoes = {
          aliquota_ibs_cbs_estimada: ano >= 2027 && ano <= 2028 ? 0.1 + aliquotaCBS : 26.5,
          aliquota_ibs_plena: aliquotaPlenaIBS,
          aliquota_cbs_estimada: aliquotaCBS,
          redutor_short_stay_pct: 50,
          contrato_antes_16012025: contratoAntes16012025,
          perfil_locacao: perfilLocacao,
        };
        const { result: res } = await propertyService.updateSimulation(editingSimulationId, {
          ano,
          meses: mesesParaEnvio,
          quantidade_imoveis: quantidadeImoveisTotal,
          quantidade_imoveis_residenciais: quantidadeImoveisResidenciais,
          quantidade_imoveis_comerciais: quantidadeImoveisComerciais,
          opcoes_reforma: opcoes,
        });
        setResult(res);
        lastSimulationPayloadRef.current = {
          ano,
          meses: mesesParaEnvio,
          quantidade_imoveis: quantidadeImoveisTotal,
          quantidade_imoveis_residenciais: quantidadeImoveisResidenciais,
          quantidade_imoveis_comerciais: quantidadeImoveisComerciais,
          opcoes_reforma: opcoes,
        };
        setEditingSimulationId(null);
        success('Simulação atualizada.');
        const simRes = await propertyService.listSimulations({ page: 1, limit: 20 });
        setSimulations(simRes.simulations);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Erro ao atualizar');
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const mesesParaEnvio = buildMesesParaEnvio();
      const opcoes = {
        aliquota_ibs_cbs_estimada: ano >= 2027 && ano <= 2028 ? 0.1 + aliquotaCBS : 26.5,
        aliquota_ibs_plena: aliquotaPlenaIBS,
        aliquota_cbs_estimada: aliquotaCBS,
        redutor_short_stay_pct: 50,
        contrato_antes_16012025: contratoAntes16012025,
        perfil_locacao: perfilLocacao,
      };
      const res = await propertyService.simulateStandalone({
        ano,
        meses: mesesParaEnvio,
        quantidade_imoveis: quantidadeImoveisTotal,
        quantidade_imoveis_residenciais: quantidadeImoveisResidenciais,
        quantidade_imoveis_comerciais: quantidadeImoveisComerciais,
        opcoes_reforma: opcoes,
      });
      setResult(res);
      lastSimulationPayloadRef.current = {
        ano,
        meses: mesesParaEnvio,
        quantidade_imoveis: quantidadeImoveisTotal,
        quantidade_imoveis_residenciais: quantidadeImoveisResidenciais,
        quantidade_imoveis_comerciais: quantidadeImoveisComerciais,
        opcoes_reforma: opcoes,
      };
      success('Simulação concluída.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      const sim = await propertyService.getSimulationById(id);
      setViewingSimulation(sim);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao carregar');
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const sim = await propertyService.getSimulationById(id);
      const input = sim.input_data as {
        ano?: number;
        meses?: SimulateStandaloneMesInput[];
        quantidade_imoveis?: number;
        quantidade_imoveis_residenciais?: number;
        quantidade_imoveis_comerciais?: number;
        opcoes_reforma?: {
          contrato_antes_16012025?: boolean;
          perfil_locacao?: PerfilLocacaoReforma;
          aliquota_ibs_plena?: number;
          aliquota_cbs_estimada?: number;
        };
      };
      if (input?.ano) setAno(input.ano);
      if (Array.isArray(input?.meses) && input.meses.length === 12) {
        setMeses(input.meses.map((m) => ({ ...m })));
      }
      if (input?.opcoes_reforma?.contrato_antes_16012025 != null) setContratoAntes16012025(input.opcoes_reforma.contrato_antes_16012025);
      setPerfilLocacao(input?.opcoes_reforma?.perfil_locacao ?? 'residencial_comum');
      if (input?.opcoes_reforma?.aliquota_ibs_plena != null) setAliquotaPlenaIBS(input.opcoes_reforma.aliquota_ibs_plena);
      if (input?.opcoes_reforma?.aliquota_cbs_estimada != null) setAliquotaCBS(input.opcoes_reforma.aliquota_cbs_estimada);
      if (input?.quantidade_imoveis_residenciais != null || input?.quantidade_imoveis_comerciais != null) {
        setQuantidadeImoveisResidenciais(input.quantidade_imoveis_residenciais ?? 0);
        setQuantidadeImoveisComerciais(input.quantidade_imoveis_comerciais ?? 0);
      } else if (input?.quantidade_imoveis != null) {
        setQuantidadeImoveisResidenciais(input.quantidade_imoveis);
        setQuantidadeImoveisComerciais(0);
      }
      // Carregar client_id e title para "Salvar como novo"
      setSaveClientId(sim.client_id ?? '');
      setSaveTitle(sim.title ?? '');
      setEditingSimulationId(id);
      setResult(null);
      success('Simulação carregada. Edite e clique em Simular para atualizar.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao carregar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta simulação?')) return;
    try {
      await propertyService.deleteSimulation(id);
      success('Simulação excluída.');
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      if (viewingSimulation?.id === id) setViewingSimulation(null);
      if (editingSimulationId === id) setEditingSimulationId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleSaveAsNew = async () => {
    if (!saveClientId) {
      showError('Selecione um cliente para salvar como novo');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const mesesParaEnvio = buildMesesParaEnvio();
      const opcoes = {
        aliquota_ibs_cbs_estimada: ano >= 2027 && ano <= 2028 ? 0.1 + aliquotaCBS : 26.5,
        aliquota_ibs_plena: aliquotaPlenaIBS,
        aliquota_cbs_estimada: aliquotaCBS,
        redutor_short_stay_pct: 50,
        contrato_antes_16012025: contratoAntes16012025,
        perfil_locacao: perfilLocacao,
      };
      const { result: res } = await propertyService.simulateStandaloneAndSave({
        ano,
        meses: mesesParaEnvio,
        quantidade_imoveis: quantidadeImoveisTotal,
        quantidade_imoveis_residenciais: quantidadeImoveisResidenciais,
        quantidade_imoveis_comerciais: quantidadeImoveisComerciais,
        opcoes_reforma: opcoes,
        client_id: saveClientId,
        title: saveTitle || undefined,
        save_simulation: true,
      });
      setResult(res);
      setEditingSimulationId(null);
      success('Nova simulação criada com sucesso!');
      const listRes = await propertyService.listSimulations({ page: 1, limit: 20 });
      setSimulations(listRes.simulations);
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSimulationId(null);
  };

  /** Salvar a simulação atual no histórico (botão após resultado). */
  const handleSaveToHistory = async () => {
    if (!saveClientId) {
      showError('Selecione um cliente para salvar a simulação');
      return;
    }
    const payload = lastSimulationPayloadRef.current;
    if (!payload) {
      showError('Execute uma simulação antes de salvar');
      return;
    }
    setLoading(true);
    try {
      const { result: res } = await propertyService.simulateStandaloneAndSave({
        ...payload,
        client_id: saveClientId,
        title: saveTitle || undefined,
      });
      setResult(res);
      success('Simulação salva no histórico.');
      const listRes = await propertyService.listSimulations({ page: 1, limit: 20 });
      setSimulations(listRes.simulations);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao salvar simulação');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Layout>
      <ToastContainer />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Simulador Imobiliário – PF vs PJ vs Reforma LC 214/2025
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Preencha os totais mensais por categoria. O resultado compara Pessoa Física (Carnê-Leão), Pessoa Jurídica (Lucro Presumido) e o cenário da Reforma Tributária (IBS/CBS).
        </p>
      </div>

      <form onSubmit={handleSimulate} className="space-y-6">
        {/* Ano e ação principal */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Ano da simulação</label>
              <Input
                type="number"
                min={2023}
                max={2030}
                value={ano}
                onChange={(e) => updateAno(Number(e.target.value))}
                className="w-28 h-10 text-center font-semibold text-slate-800 rounded-lg border-slate-300"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" variant="primary" disabled={loading} className="min-w-[200px]">
                {loading ? 'Simulando...' : editingSimulationId ? 'Atualizar simulação' : 'Simular PF vs PJ vs Reforma LC 214/2025'}
              </Button>
              {editingSimulationId && (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={handleSaveAsNew} disabled={loading}>
                    Salvar como novo
                  </Button>
                  <Button type="button" variant="tertiary" size="sm" onClick={handleCancelEdit} disabled={loading}>
                    Cancelar edição
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Opções da Reforma LC 214/2025 */}
        <Card className="p-5 border-amber-200/80 bg-amber-50/30">
          <h3 className="font-semibold text-slate-800 mb-3">Opções da Reforma LC 214/2025 (IBS/CBS)</h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contratoAntes16012025}
                onChange={(e) => setContratoAntes16012025(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-700">Contrato firmado antes de 16/01/2025? (Regime de Transição Art. 487 LC 214/25)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Imóveis residenciais (com redutor social)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={quantidadeImoveisResidenciais}
                  onChange={(e) =>
                    setQuantidadeImoveisResidenciais(
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white w-28"
                />
                <span className="text-xs text-slate-500">
                  Cada imóvel residencial gera redutor social de R$ 600/mês na base de IBS/CBS (LC 214/2025, arts. 259–260), limitado ao imposto devido.
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Imóveis comerciais (sem redutor social)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={quantidadeImoveisComerciais}
                  onChange={(e) =>
                    setQuantidadeImoveisComerciais(
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white w-28"
                />
                <span className="text-xs text-slate-500">
                  Usados apenas para verificar se a PF se torna contribuinte de IBS/CBS (limites de 3 imóveis e receita anual de R$ 240k/288k).
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Perfil de locação</label>
              <select
                value={perfilLocacao}
                onChange={(e) => setPerfilLocacao(e.target.value as PerfilLocacaoReforma)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white min-w-[280px]"
              >
                <option value="residencial_comum">Locação de longa duração (Redutor 70%)</option>
                <option value="hospedagem_temporada">Locação de curta temporada (Redutor 50%)</option>
                <option value="ambos">Locação longa duração e curta temporada (ambos os redutores)</option>
              </select>
              <span className="text-xs text-slate-500">Escolha conforme a natureza da sua locação. Em 2027/2028 incide CBS e IBS (0,1%) - A partir de 2029 incide CBS plena e IBS progressiva até 2032.</span>
            </div>
          </div>
        </Card>

        {/* Transição Reforma Tributária (2027-2033) */}
        <Card className="p-5 border-violet-200/80 bg-violet-50/20">
          <h3 className="font-semibold text-slate-800 mb-2">Transição Reforma Tributária - Incidência de CBS + IBS</h3>
          <p className="text-xs text-amber-800 bg-amber-100/80 rounded px-3 py-2 mb-2">
            Valores estimados; alíquotas sujeitas a regulamentação (previsão fim de 2026).
          </p>
          <p className="text-xs text-slate-600 mb-4">
            2027/2028: CBS + IBS de 0,1% fixo · A partir de 2029 até 2032: IBS progressivo + CBS · A partir de 2033: reforma tributária em vigor de forma plena
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-sm font-medium text-slate-700">Alíquota IBS (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={aliquotaPlenaIBS}
                onChange={(e) => setAliquotaPlenaIBS(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-sm font-medium text-slate-700">Alíquota CBS (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={aliquotaCBS}
                onChange={(e) => setAliquotaCBS(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="border border-slate-200 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold">Ano</th>
                  <th className="text-right py-2 px-3 font-semibold">IBS (% alíquota)</th>
                  <th className="text-right py-2 px-3 font-semibold">ICMS/ISS residual</th>
                  <th className="text-right py-2 px-3 font-semibold">IBS efetivo</th>
                </tr>
              </thead>
              <tbody>
                {transicaoIBSResult.map((r: TransicaoIBSResult) => (
                  <tr key={r.ano} className="border-b border-slate-100">
                    <td className="py-2 px-3">{r.ano}</td>
                    <td className="text-right py-2 px-3">{r.ibsFixo ? 'fixo' : `${r.ibsPct}%`}</td>
                    <td className="text-right py-2 px-3">{r.ibsFixo ? '—' : `${r.icmsIssPct}%`}</td>
                    <td className="text-right py-2 px-3 font-medium">{r.aliquotaEfetivaIBS.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Preenchimento rápido – Rateio anual */}
        <Card className="p-5 border-slate-200 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 mb-4">Preenchimento rápido – Valores anuais</h3>

          {/* Bloco Receitas */}
          <div className="mb-4 pb-4 border-b border-slate-200 last:border-b-0 last:mb-0 last:pb-0">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={modoReceitaAnual}
                onChange={(e) => setModoReceitaAnual(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-slate-700">Valor Anual / Distribuição Igualitária – Receitas</span>
            </label>
            {modoReceitaAnual && (
              <div className="flex flex-wrap items-end gap-4 mt-2">
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label className="text-xs font-medium text-slate-600">Aluguel tradicional anual</label>
                  <MoneyInput
                    value={aluguelAnualTradicional}
                    onChange={setAluguelAnualTradicional}
                    className="!py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label className="text-xs font-medium text-slate-600">Aluguel curto prazo anual</label>
                  <MoneyInput
                    value={aluguelAnualCurto}
                    onChange={setAluguelAnualCurto}
                    className="!py-1.5 text-sm"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={aplicarAluguelAnual}>
                  Aplicar rateio
                </Button>
              </div>
            )}
          </div>

          {/* Bloco Despesas dedutíveis */}
          <div className="mb-4 pb-4 border-b border-slate-200 last:border-b-0 last:mb-0 last:pb-0">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={modoDespesaAnual}
                onChange={(e) => setModoDespesaAnual(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-slate-700">Valor Anual / Distribuição Igualitária – Despesas dedutíveis</span>
            </label>
            {modoDespesaAnual && (
              <div className="flex flex-wrap items-end gap-4 mt-2">
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label className="text-xs font-medium text-slate-600">Valor total anual</label>
                  <MoneyInput
                    value={despesaAnualTotal}
                    onChange={setDespesaAnualTotal}
                    className="!py-1.5 text-sm"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={aplicarDespesaAnual}>
                  Aplicar rateio
                </Button>
              </div>
            )}
          </div>

          {/* Bloco Custos operacionais / Créditos IBS/CBS */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={modoCustoAnual}
                onChange={(e) => setModoCustoAnual(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-slate-700">Valor Anual / Distribuição Igualitária – Créditos IBS/CBS</span>
            </label>
            {modoCustoAnual && (
              <div className="flex flex-wrap items-end gap-4 mt-2">
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label className="text-xs font-medium text-slate-600">Valor total anual</label>
                  <MoneyInput
                    value={custoAnualTotal}
                    onChange={setCustoAnualTotal}
                    className="!py-1.5 text-sm"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={aplicarCustoAnual}>
                  Aplicar rateio
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Seções por categoria */}
        {(['receita', 'despesa', 'custo'] as SectionKey[]).map((sectionKey) => {
          const config = SECTION_CONFIG[sectionKey];
          const sectionRows = ROWS.filter((r) => r.section === sectionKey);
          if (sectionRows.length === 0) return null;
          return (
            <Card key={sectionKey} className={`overflow-hidden border-2 ${config.border} ${config.bg}`}>
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${config.headerBg}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm">
                  {config.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">{config.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{config.subtitle}</p>
                </div>
              </div>
              <div className="-mx-2 overflow-x-auto px-2 py-3">
                <table className="w-full text-sm min-w-[2600px]">
                  <thead>
                    <tr className="border-b border-slate-200/80">
                      <th className="sticky left-0 z-10 min-w-[260px] py-2.5 px-3 text-left font-medium text-slate-600 bg-slate-50/80">
                        Item
                      </th>
                      <th className="min-w-[220px] py-2 px-2 text-center font-medium text-slate-600 text-xs">
                        Anual
                      </th>
                      {MESES.map((nome, i) => (
                        <th key={i} className="min-w-[180px] py-2 px-2 text-center font-medium text-slate-600 text-xs">
                          {nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((row) => (
                      <tr key={row.field} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                        <td className="sticky left-0 z-10 py-2 px-3 text-slate-700 bg-white/95 font-medium">
                          {row.label}
                        </td>
                        <td className="py-1.5 px-2 min-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <MoneyInput
                              value={valoresAnuais[row.field] ?? 0}
                              onChange={(v) => setValoresAnuais((prev) => ({ ...prev, [row.field]: v }))}
                              className="!py-1.5 text-sm min-w-[11rem] flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => aplicarRateioAnual(row.field)}
                              title="Dividir valor anual por 12 e preencher todos os meses desta linha"
                              className="shrink-0 !py-1 !px-2 text-xs"
                            >
                              Distribuir
                            </Button>
                          </div>
                        </td>
                        {meses.map((m, i) => (
                          <td key={i} className="py-1.5 px-2 min-w-[180px]">
                            <MoneyInput
                              value={(m[row.field] as number) ?? 0}
                              onChange={(v) => updateMes(i, row.field, v)}
                              className="!py-1.5 text-sm min-w-[11rem]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={loading} className="min-w-[220px]">
            {loading ? 'Simulando...' : 'Simular PF vs PJ vs Reforma LC 214/2025'}
          </Button>
        </div>
      </form>

      {result && (
        <div ref={resultSectionRef} id="simulador-imoveis-resultado-print" className="space-y-6 mt-6">
          {/* Cabeçalho do resultado: título + botão Exportar PDF */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Resultado da simulação – Simulador Imobiliário</h2>
              <p className="text-sm text-slate-600">
                Ano <strong>{result.ano}</strong>
                {result.fluxo_caixa?.[0] && (
                  <> · Receita total: <strong>{formatMoney(result.fluxo_caixa[0].receita_total)}</strong></>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrintPdf}
              className="print:hidden shrink-0 inline-flex items-center gap-2"
              aria-label="Exportar resultado para PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar para PDF
            </Button>
          </div>

          {/* Salvar simulação no histórico (botão após resultado) */}
          <Card className="p-5 border border-slate-200 bg-slate-50/50 print:hidden">
            <h3 className="text-base font-semibold text-slate-800 mb-3">Salvar simulação no histórico</h3>
            <p className="text-sm text-slate-600 mb-4">
              Salve esta simulação para consultar depois no Histórico.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                <select
                  className="h-10 w-full min-w-[200px] border border-slate-300 rounded-md px-3 text-sm text-slate-700 bg-white"
                  value={saveClientId}
                  onChange={(e) => setSaveClientId(e.target.value)}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Título (opcional)</label>
                <Input
                  placeholder="Ex: Simulação 2025"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="h-10"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveToHistory}
                disabled={loading || !saveClientId}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Pessoa Física (Carnê-Leão)</h3>
            <p className="text-2xl font-bold text-brand">
              {formatMoney(result.cenarios.pf.imposto_total)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva: {result.cenarios.pf.aliquota_efetiva_anual.toFixed(1)}%
            </p>
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Ver cálculo
              </summary>
              <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono space-y-1.5 border border-slate-200">
                <p className="text-slate-600 font-sans font-medium border-b border-slate-200 pb-1 mb-2">Fórmula: Base × Alíquota progressiva</p>
                <p>Receita bruta: <span className="text-slate-800 font-semibold">{formatMoney(result.cenarios.pf.receita_bruta_total)}</span></p>
                <p>− Despesas dedutíveis: <span className="text-slate-800">{formatMoney(result.cenarios.pf.despesas_dedutiveis_total)}</span></p>
                <p className="border-t border-slate-200 pt-1">= Base de cálculo: <span className="text-slate-800 font-semibold">{formatMoney(result.cenarios.pf.base_calculo_total)}</span></p>
                <p className="text-slate-500 text-[10px] mt-1">Tabela progressiva mensal aplicada (0% a 27,5%)</p>
                <p className="border-t border-slate-200 pt-1 mt-1">= IR anual: <span className="text-brand font-bold">{formatMoney(result.cenarios.pf.imposto_total)}</span></p>
              </div>
            </details>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Pessoa Jurídica (Lucro Presumido)</h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatMoney(result.cenarios.pj.imposto_total)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva: {result.cenarios.pj.aliquota_efetiva.toFixed(1)}%
            </p>
            {(() => {
              const pres16 = (result.memoria_calculo as { aplicar_presuncao_16_servicos?: boolean } | undefined)?.aplicar_presuncao_16_servicos;
              if (pres16 === undefined) return null;
              return (
                <p className="text-xs text-slate-500 mt-1">
                  {pres16
                    ? 'Presunção 16% – Receita anual ≤ R$ 120k (Lei 9.249/95, Art. 15, § 7º – IN RFB 1700/2017, art. 33, § 7º)'
                    : 'Presunção 32% (locação de imóveis – Lei 9.249/95, Art. 15 – IN RFB 1700/2017, art. 33, § 7º)'}
                </p>
              );
            })()}
            {(result.cenarios.pj.irpj_adicional ?? 0) > 0 && (
              <p className="text-xs text-slate-600 mt-1">
                Adicional IRPJ (10% sobre parcela que excedeu R$ 60 mil/trimestre – Lei 9.249/95): {formatMoney(result.cenarios.pj.irpj_adicional ?? 0)}
              </p>
            )}
            {(result.cenarios.pj.irpj_postergado ?? 0) > 0 && (
              <>
                <p className="text-xs text-amber-700 mt-1 font-medium">
                  Diferença postergada (Lei 9.249/95, Art. 15, § 8º): {formatMoney(result.cenarios.pj.irpj_postergado ?? 0)}. Receita ultrapassou R$ 120 mil no ano-calendário; a diferença de IRPJ (16% → 32%) dos trimestres anteriores foi apurada no trimestre do excesso.
                </p>
                {result.cenarios.pj.trimestres && result.cenarios.pj.trimestres.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-2">Receita Acumulada no Ano-Calendário</p>
                    <div className="flex items-center justify-between gap-1">
                      {(() => {
                        let receitaAcumulada = 0;
                        return result.cenarios.pj.trimestres.map((t, i) => {
                          receitaAcumulada += t.receita;
                          const presuncao = t.presuncao_irpj_pct ?? 32;
                          const ultrapassou = presuncao === 32 && (result.cenarios.pj.trimestres?.[i - 1]?.presuncao_irpj_pct ?? 16) === 16;
                          const temPostergado = (t.irpj_postergado ?? 0) > 0;
                          return (
                            <div key={t.trimestre} className="flex-1 text-center">
                              <div className={`text-[10px] font-mono ${presuncao === 16 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {formatMoney(receitaAcumulada)}
                              </div>
                              <div className="flex items-center justify-center mt-1">
                                {i > 0 && (
                                  <div className={`h-0.5 flex-1 ${ultrapassou ? 'bg-red-400' : presuncao === 16 ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                                )}
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                  ultrapassou ? 'bg-red-500 text-white' : presuncao === 16 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                  {presuncao === 16 ? '16' : '32'}
                                </div>
                                {i < (result.cenarios.pj.trimestres?.length ?? 0) - 1 && (
                                  <div className={`h-0.5 flex-1 ${presuncao === 16 ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{t.trimestre}º Tri</div>
                              {temPostergado && (
                                <div className="text-[9px] text-red-600 font-medium mt-0.5">
                                  +{formatMoney(t.irpj_postergado ?? 0)}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-amber-200 text-[10px]">
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 16% (≤ R$ 120k)</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 32% (&gt; R$ 120k)</div>
                      <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Ultrapassou</div>
                    </div>
                  </div>
                )}
              </>
            )}
            {(() => {
              const mc = result.memoria_calculo as { cenario_32_fixo_imposto?: number; aplicar_presuncao_16_servicos?: boolean } | undefined;
              const cenario32 = mc?.cenario_32_fixo_imposto;
              const usou16 = mc?.aplicar_presuncao_16_servicos;
              if (cenario32 !== undefined && usou16) {
                const economia = cenario32 - result.cenarios.pj.imposto_total;
                const economiaPct = cenario32 > 0 ? (economia / cenario32) * 100 : 0;
                return (
                  <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200">
                    <p className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Economia com presunção 16%: {formatMoney(economia)} ({economiaPct.toFixed(1)}%)
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Se usasse 32% (locação): {formatMoney(cenario32)} | Com 16% (serviços): {formatMoney(result.cenarios.pj.imposto_total)}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Ver cálculo
              </summary>
              <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono space-y-1.5 border border-slate-200">
                <p className="text-slate-600 font-sans font-medium border-b border-slate-200 pb-1 mb-2">Fórmula: Lucro Presumido (Lei 9.249/95)</p>
                {(() => {
                  const pj = result.cenarios.pj;
                  const presuncao = pj.trimestres?.[0]?.presuncao_irpj_pct ?? 32;
                  return (
                    <>
                      <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide">Passo 1: Base de cálculo IRPJ</p>
                      <p>Receita bruta: <span className="text-slate-800">{formatMoney(pj.receita_bruta_total)}</span></p>
                      <p>× Presunção {presuncao}%: <span className="text-slate-800 font-semibold">{formatMoney(pj.base_presumida_irpj)}</span> <span className="text-slate-400">(base IRPJ)</span></p>
                      
                      <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 2: IRPJ (15%)</p>
                      <p>{formatMoney(pj.base_presumida_irpj)} × 15% = <span className="text-slate-800 font-semibold">{formatMoney(pj.irpj)}</span></p>
                      {(pj.irpj_adicional ?? 0) > 0 && (
                        <p>+ Adicional 10% (excedente R$ 60k/tri): <span className="text-amber-700 font-semibold">{formatMoney(pj.irpj_adicional ?? 0)}</span></p>
                      )}
                      {(pj.irpj_postergado ?? 0) > 0 && (
                        <p>+ Diferença § 8º (16%→32%): <span className="text-amber-700 font-semibold">{formatMoney(pj.irpj_postergado ?? 0)}</span></p>
                      )}
                      
                      <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 3: CSLL (9%)</p>
                      <p>{formatMoney(pj.base_presumida_csll)} × 9% = <span className="text-slate-800 font-semibold">{formatMoney(pj.csll)}</span></p>
                      
                      <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 4: PIS/COFINS (cumulativo)</p>
                      <p>{formatMoney(pj.receita_bruta_total)} × 0,65% = PIS <span className="text-slate-800">{formatMoney(pj.pis)}</span></p>
                      <p>{formatMoney(pj.receita_bruta_total)} × 3% = COFINS <span className="text-slate-800">{formatMoney(pj.cofins)}</span></p>
                      
                      <p className="border-t border-slate-200 pt-2 mt-2 font-sans">
                        <span className="text-slate-500">Total =</span> IRPJ + CSLL + PIS + COFINS = <span className="text-slate-800 font-bold">{formatMoney(pj.imposto_total)}</span>
                      </p>
                    </>
                  );
                })()}
              </div>
            </details>
            {result.cenarios.pj.trimestres && result.cenarios.pj.trimestres.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                  Detalhamento por trimestre
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-1 px-1 text-left">Trim</th>
                        <th className="py-1 px-1 text-right">Receita</th>
                        <th className="py-1 px-1 text-right">B.Cálc. IRPJ</th>
                        <th className="py-1 px-1 text-center">Pres.</th>
                        <th className="py-1 px-1 text-right">IRPJ</th>
                        <th className="py-1 px-1 text-right">CSLL</th>
                        <th className="py-1 px-1 text-right">PIS</th>
                        <th className="py-1 px-1 text-right">COFINS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.cenarios.pj.trimestres.map((t) => (
                        <tr key={t.trimestre} className="border-b border-slate-100">
                          <td className="py-1 px-1">{t.trimestre}º</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.receita)}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.base_irpj)}</td>
                          <td className="py-1 px-1 text-center">{t.presuncao_irpj_pct ?? 32}%</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.irpj + (t.irpj_adicional ?? 0) + (t.irpj_postergado ?? 0))}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.csll)}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.pis)}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.cofins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Reforma LC 214/2025 – Pessoa Física (IR + IBS/CBS)</h3>
            {(() => {
              const refPf = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
              const irHoje = result.cenarios.pf.imposto_total;
              const receita = refPf?.receita_bruta_total ?? result.fluxo_caixa?.[0]?.receita_total ?? 0;
              
              // Verificar se PF é contribuinte de IBS/CBS
              const LIMITE_RECEITA = 240_000;
              const LIMITE_RECEITA_ABSOLUTO = 288_000;
              const LIMITE_IMOVEIS = 3;
              const ehContribuinteIbsCbs = receita > LIMITE_RECEITA_ABSOLUTO || 
                (quantidadeImoveisTotal > LIMITE_IMOVEIS && receita > LIMITE_RECEITA);
              
              if (!ehContribuinteIbsCbs) {
                return (
                  <>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatMoney(irHoje)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Alíquota efetiva: {result.cenarios.pf.aliquota_efetiva_anual.toFixed(1)}%
                    </p>
                    <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200">
                      <p className="text-sm text-emerald-800 font-medium">
                        Não contribuinte de IBS/CBS
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        {quantidadeImoveisTotal <= LIMITE_IMOVEIS
                          ? `Com ${quantidadeImoveisTotal} imóvel(is) e receita de ${formatMoney(receita)}, a PF não atinge os critérios para ser contribuinte de IBS/CBS.`
                          : `Receita de ${formatMoney(receita)} está abaixo de R$ 240.000.`}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      A PF continua pagando apenas o IR (Carnê-Leão) sobre a renda de locação.
                    </p>
                  </>
                );
              }
              
              const ibsCbs = refPf?.ibs_cbs_liquido ?? 0;
              const totalPF2027 = irHoje + ibsCbs;
              const aliquotaTotal = receita > 0 ? (totalPF2027 / receita) * 100 : 0;
              return (
                <>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatMoney(totalPF2027)}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Alíquota total: {aliquotaTotal.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    IR (Carnê-Leão, mesmo de hoje): {formatMoney(irHoje)} + IBS/CBS: {formatMoney(ibsCbs)} = total acima.
                  </p>
                  {irHoje === 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      Nesta simulação o IR da PF é zero (base de cálculo zero ou deduções altas), por isso o total da PF coincide com o valor só de IBS/CBS.
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">
                    Em 2027 a PF continua pagando o mesmo IR de hoje sobre a renda; soma-se o IBS/CBS sobre a atividade.
                  </p>
                  <p className="text-xs text-amber-800/90 mt-1 bg-amber-50 rounded px-2 py-1.5">
                    Contribuinte de IBS/CBS: {receita > LIMITE_RECEITA_ABSOLUTO 
                      ? `Receita > R$ 288.000 (independente do número de imóveis)`
                      : `Mais de ${LIMITE_IMOVEIS} imóveis (${quantidadeImoveisTotal}) e receita > R$ 240.000`}
                  </p>
                </>
              );
            })()}
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Reforma LC 214/2025 – Pessoa Jurídica (IBS/CBS + IRPJ + CSLL)</h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatMoney((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.imposto_total ?? 0)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva total: {(result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(1) ?? '0'}%
              {((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { redutor_diferenciado_short?: boolean })?.redutor_diferenciado_short ? (
                <span className="text-slate-500"> (com redutor 70% longa duração e 50% curta temporada)</span>
              ) : (
                ((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { redutor_locacao_aplicado_pct?: number })?.redutor_locacao_aplicado_pct != null && (
                  <span className="text-slate-500"> (com redutor {(result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.redutor_locacao_aplicado_pct ?? 70}% para locação)</span>
                )
              )}
            </p>
            {(() => {
              const ref = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
              const irpj = (ref as { irpj?: number })?.irpj;
              const csll = (ref as { csll?: number })?.csll;
              const ibsCbs = ref?.ibs_cbs_liquido ?? 0;
              if (irpj != null && csll != null) {
                return (
                  <p className="text-xs text-slate-500 mt-1">
                    IBS/CBS: {formatMoney(ibsCbs)} + IRPJ: {formatMoney(irpj)} + CSLL: {formatMoney(csll)} = Total acima.
                  </p>
                );
              }
              return (
                <p className="text-xs text-slate-500 mt-1">
                  Total = IBS/CBS (substitui PIS/COFINS) + IRPJ + CSLL sobre o lucro presumido.
                </p>
              );
            })()}
            {((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { aplicou_transicao_art487?: boolean })?.aplicou_transicao_art487 && (
              <p className="text-xs text-emerald-700 mt-1 font-medium">Aplicado regime de transição Art. 487 (3,65% sobre receita bruta).</p>
            )}
            {((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { redutor_diferenciado_short?: boolean })?.redutor_diferenciado_short && (
              <p className="text-xs text-slate-600 mt-1">Redutor 70% (longa duração) e 50% (curta temporada), aplicados proporcionalmente à receita de cada tipo.</p>
            )}
            <details className="mt-3">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Ver cálculo IBS/CBS
              </summary>
              {(() => {
                const ref = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
                if (!ref) return null;
                const refExt = ref as {
                  aliquota_nominal_ibs_cbs?: number;
                  redutor_locacao_aplicado_pct?: number;
                  ibs_cbs_sobre_receita?: number;
                  custos_operacionais_total?: number;
                  irpj?: number;
                  csll?: number;
                  redutor_diferenciado_short?: boolean;
                  redutor_long_pct?: number;
                  redutor_short_pct?: number;
                };
                const aliqNominal = refExt.aliquota_nominal_ibs_cbs ?? 26.5;
                const receita = ref.receita_bruta_total ?? 0;
                const debito = refExt.ibs_cbs_sobre_receita ?? 0;
                const creditos = ref.creditos_ibs_cbs ?? 0;
                const custos = refExt.custos_operacionais_total ?? 0;
                const liquido = ref.ibs_cbs_liquido ?? 0;
                const irpj = refExt.irpj ?? 0;
                const csll = refExt.csll ?? 0;
                const redutorDiferenciado = refExt.redutor_diferenciado_short === true;
                const aliqEfetiva =
                  receita > 0
                    ? round2((debito / receita) * 100)
                    : aliqNominal * (1 - (refExt.redutor_locacao_aplicado_pct ?? 70) / 100);

                return (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono space-y-1.5 border border-slate-200">
                    <p className="text-slate-600 font-sans font-medium border-b border-slate-200 pb-1 mb-2">Composição da alíquota IBS/CBS (LC 214/2025)</p>
                    
                    <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide">Passo 1: Alíquota efetiva (redutor de ajuste)</p>
                    <p>Alíquota nominal: <span className="text-slate-800">{aliqNominal.toFixed(1)}%</span></p>
                    {redutorDiferenciado ? (
                      <>
                        <p>Redutor 70% (longa duração) e 50% (curta temporada), aplicados proporcionalmente à receita de cada tipo.</p>
                        <p className="border-t border-slate-200 pt-1">= Alíquota efetiva ponderada: <span className="text-slate-800 font-semibold">{aliqEfetiva.toFixed(1)}%</span></p>
                      </>
                    ) : (
                      <>
                        <p>× (100% − Redutor {refExt.redutor_locacao_aplicado_pct ?? 70}%): <span className="text-slate-800">{(100 - (refExt.redutor_locacao_aplicado_pct ?? 70)).toFixed(0)}%</span></p>
                        <p className="border-t border-slate-200 pt-1">= Alíquota efetiva: <span className="text-slate-800 font-semibold">{aliqEfetiva.toFixed(1)}%</span></p>
                      </>
                    )}
                    
                    <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 2: Débito sobre receita</p>
                    <p>{formatMoney(receita)} × {aliqEfetiva.toFixed(1)}% = <span className="text-slate-800">{formatMoney(debito)}</span></p>
                    
                    <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 3: Créditos sobre custos operacionais</p>
                    <p>{formatMoney(custos)} × {aliqEfetiva.toFixed(1)}% = <span className="text-emerald-700">−{formatMoney(creditos)}</span></p>
                    
                    <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 4: IBS/CBS líquido</p>
                    <p>{formatMoney(debito)} − {formatMoney(creditos)} = <span className="text-slate-800 font-semibold">{formatMoney(liquido)}</span></p>
                    
                    {(irpj > 0 || csll > 0) && (
                      <>
                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 5: IRPJ + CSLL (sobre lucro presumido)</p>
                        <p>IRPJ: <span className="text-slate-800">{formatMoney(irpj)}</span> + CSLL: <span className="text-slate-800">{formatMoney(csll)}</span></p>
                      </>
                    )}
                    
                    <p className="border-t border-slate-200 pt-2 mt-2 font-sans">
                      <span className="text-slate-500">Total =</span> IBS/CBS + IRPJ + CSLL = <span className="text-slate-800 font-bold">{formatMoney(ref.imposto_total ?? 0)}</span>
                    </p>
                  </div>
                );
              })()}
            </details>
          </Card>
          </div>

          {/* Card de Projeção Ano a Ano (2027-2033) - Reforma PJ */}
          <Card className="mt-6 p-4 border-violet-200/50 bg-violet-50/10">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Reforma LC 214/2025 – Pessoa Jurídica (IBS/CBS + IRPJ + CSLL) – Projeção 2027-2033</h3>
            <p className="text-xs text-slate-500 mb-4">Demonstração da tributação ano a ano considerando a transição gradual do IBS (0,1% fixo em 2027/2028, progressivo de 2029 a 2033).</p>
            {(() => {
              const receita = result.cenarios.pf.receita_bruta_total;
              const refReforma = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
              const custos = refReforma?.custos_operacionais_total ?? 0;
              const irpjCsll = (result.cenarios.pj.irpj ?? 0) + (result.cenarios.pj.irpj_adicional ?? 0) + (result.cenarios.pj.csll ?? 0);
              const aliqNominalRef = (refReforma as { aliquota_nominal_ibs_cbs?: number })?.aliquota_nominal_ibs_cbs ?? 26.5;
              const debitoRef = (refReforma as { ibs_cbs_sobre_receita?: number })?.ibs_cbs_sobre_receita ?? 0;
              const fatorReducao =
                perfilLocacao === 'ambos' && receita > 0 && aliqNominalRef > 0
                  ? debitoRef / receita / (aliqNominalRef / 100)
                  : (100 - (perfilLocacao === 'hospedagem_temporada' ? 50 : 70)) / 100;

              const anos = [
                { ano: '2027/2028', ibsNominal: 0.1 },
                { ano: '2029', ibsNominal: aliquotaPlenaIBS * 0.1 },
                { ano: '2030', ibsNominal: aliquotaPlenaIBS * 0.2 },
                { ano: '2031', ibsNominal: aliquotaPlenaIBS * 0.3 },
                { ano: '2032', ibsNominal: aliquotaPlenaIBS * 0.4 },
                { ano: '2033', ibsNominal: aliquotaPlenaIBS * 1.0 },
              ];

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2 px-3 text-left font-medium text-slate-600">Ano</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">CBS</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">IBS</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">IBS/CBS Líq.</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">IRPJ+CSLL</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-700">Total</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">Alíq. Efet.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anos.map((item) => {
                        const cbsEfetiva = round2(aliquotaCBS * fatorReducao);
                        const ibsEfetivo = round2(item.ibsNominal * fatorReducao);
                        const aliqCombinada = cbsEfetiva + ibsEfetivo;
                        const ibsCbsBruto = round2((receita * aliqCombinada) / 100);
                        const creditos = round2((custos * aliqCombinada) / 100);
                        const ibsCbsLiquido = Math.max(0, round2(ibsCbsBruto - creditos));
                        const total = round2(ibsCbsLiquido + irpjCsll);
                        const aliqEfetiva = receita > 0 ? round2((total / receita) * 100) : 0;

                        return (
                          <tr key={item.ano} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 font-medium text-slate-700">{item.ano}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(round2((receita * cbsEfetiva) / 100))}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(round2((receita * ibsEfetivo) / 100))}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(ibsCbsLiquido)}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(irpjCsll)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-brand">{formatMoney(total)}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{aliqEfetiva.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <p className="text-xs text-slate-500 mt-3">
              {perfilLocacao === 'ambos'
                ? 'CBS e IBS com redutores 70% (longa duração) e 50% (curta temporada), aplicados proporcionalmente · IRPJ/CSLL sobre lucro presumido.'
                : `CBS com redutor de ${perfilLocacao === 'hospedagem_temporada' ? '50%' : '70%'} · IBS progressivo conforme cronograma LC 214/2025 · IRPJ/CSLL sobre lucro presumido (presunção 16% ou 32%, conforme receita anual).`}
            </p>
          </Card>

      {/* Tabela Comparativa Horizontal */}
      <Card className="mt-6 p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo de Cenários</h3>
        {(() => {
          const pf = result.cenarios.pf;
          const pj = result.cenarios.pj;
          const refPf = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
          const refPj = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
          const receitaComparativo = refPf?.receita_bruta_total ?? pf.receita_bruta_total ?? 0;
          const LIMITE_RECEITA = 240_000;
          const LIMITE_RECEITA_ABSOLUTO = 288_000;
          const LIMITE_IMOVEIS = 3;
          const ehContribuinteIbsCbs =
            receitaComparativo > LIMITE_RECEITA_ABSOLUTO ||
            (quantidadeImoveisTotal > LIMITE_IMOVEIS && receitaComparativo > LIMITE_RECEITA);

          const totalRefPf = pf.imposto_total + (refPf?.ibs_cbs_liquido ?? 0);

          const valores = [
            { label: 'PF', value: pf.imposto_total },
            { label: 'PJ', value: pj.imposto_total },
            { label: 'Ref. PF', value: ehContribuinteIbsCbs ? totalRefPf : refPf?.imposto_total ?? pf.imposto_total },
            { label: 'Ref. PJ', value: refPj?.imposto_total ?? 0 }
          ];
          const melhorAtual = pf.imposto_total < pj.imposto_total ? 'PF' : 'PJ';
          const melhorTotal = valores.reduce((a, b) => a.value < b.value ? a : b);

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2 px-3 text-left font-medium text-slate-600">Métrica</th>
                    <th className="py-2 px-3 text-right font-medium text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        PF (Carnê-Leão)
                        {melhorAtual === 'PF' && <span className="text-emerald-600 text-xs">✓</span>}
                      </div>
                    </th>
                    <th className="py-2 px-3 text-right font-medium text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        PJ (L. Presumido)
                        {melhorAtual === 'PJ' && <span className="text-emerald-600 text-xs">✓</span>}
                      </div>
                    </th>
                    <th className="py-2 px-3 text-right font-medium text-slate-600" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      Reforma LC 214/2025 PF
                    </th>
                    <th className="py-2 px-3 text-right font-medium text-slate-600">
                      <div className="flex items-center justify-end gap-1">
                        Reforma LC 214/2025 PJ
                        {melhorTotal.label === 'Ref. PJ' && <span className="text-amber-500 text-xs">★</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-700">Imposto total</td>
                    <td className={`py-2 px-3 text-right font-semibold ${melhorAtual === 'PF' ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {formatMoney(pf.imposto_total)}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${melhorAtual === 'PJ' ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {formatMoney(pj.imposto_total)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs ? formatMoney(totalRefPf) : '—'}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${melhorTotal.label === 'Ref. PJ' ? 'text-amber-600' : 'text-slate-800'}`}>
                      {formatMoney(refPj?.imposto_total ?? 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-700">Alíquota efetiva</td>
                    <td className="py-2 px-3 text-right text-slate-600">{pf.aliquota_efetiva_anual.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-slate-600">{pj.aliquota_efetiva.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-slate-600" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs
                        ? (pf.receita_bruta_total > 0 ? (totalRefPf / pf.receita_bruta_total) * 100 : 0).toFixed(1) + '%'
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{refPj?.aliquota_efetiva?.toFixed(1) ?? '0'}%</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-700">Receita bruta</td>
                    <td className="py-2 px-3 text-right text-slate-600" colSpan={4}>
                      {formatMoney(pf.receita_bruta_total)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">Diferença vs. melhor atual</td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {melhorAtual === 'PF' ? '—' : `+${formatMoney(pf.imposto_total - pj.imposto_total)}`}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {melhorAtual === 'PJ' ? '—' : `+${formatMoney(pj.imposto_total - pf.imposto_total)}`}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs
                        ? `+${formatMoney(totalRefPf - Math.min(pf.imposto_total, pj.imposto_total))}`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {(refPj?.imposto_total ?? 0) <= Math.min(pf.imposto_total, pj.imposto_total)
                        ? `−${formatMoney(Math.min(pf.imposto_total, pj.imposto_total) - (refPj?.imposto_total ?? 0))}`
                        : `+${formatMoney((refPj?.imposto_total ?? 0) - Math.min(pf.imposto_total, pj.imposto_total))}`
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1"><span className="text-emerald-600">✓</span> Melhor atual (sem reforma)</div>
                <div className="flex items-center gap-1"><span className="text-amber-500">★</span> Melhor absoluto</div>
                {!ehContribuinteIbsCbs && (
                  <div className="flex items-center gap-1" title="PF não atinge os critérios de contribuinte de IBS/CBS (LC 214/2025)">Reforma PF: — = não se aplica</div>
                )}
              </div>
            </div>
          );
        })()}
      </Card>

      {result?.cenarios?.pf?.trimestres && result?.cenarios?.pj?.trimestres && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo trimestral – Imposto por regime</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.cenarios.pf.trimestres.map((t, i) => {
                  const pjTri = result.cenarios.pj.trimestres?.[i];
                  const pjImposto = pjTri
                    ? (pjTri.irpj ?? 0) + (pjTri.irpj_adicional ?? 0) + (pjTri.irpj_postergado ?? 0) + (pjTri.csll ?? 0) + (pjTri.pis ?? 0) + (pjTri.cofins ?? 0)
                    : 0;
                  return {
                    trimestre: `${t.trimestre}º Tri`,
                    idx: i,
                    PF: Math.round(t.imposto * 100) / 100,
                    PJ: Math.round(pjImposto * 100) / 100,
                    pfReceita: t.receita,
                    pfBase: t.base_calculo,
                    pjReceita: pjTri?.receita ?? 0,
                    pjIrpj: (pjTri?.irpj ?? 0) + (pjTri?.irpj_adicional ?? 0) + (pjTri?.irpj_postergado ?? 0),
                    pjCsll: pjTri?.csll ?? 0,
                    pjPis: pjTri?.pis ?? 0,
                    pjCofins: pjTri?.cofins ?? 0,
                    pjPresuncao: pjTri?.presuncao_irpj_pct ?? 32,
                  };
                })}
                margin={{ top: 12, right: 24, left: 24, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="trimestre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const data = payload[0]?.payload as {
                      PF: number;
                      PJ: number;
                      pfReceita: number;
                      pfBase: number;
                      pjReceita: number;
                      pjIrpj: number;
                      pjCsll: number;
                      pjPis: number;
                      pjCofins: number;
                      pjPresuncao: number;
                    };
                    if (!data) return null;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
                        <p className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-1">{label}</p>
                        <div className="space-y-2">
                          <div>
                            <p className="font-medium text-brand flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-brand" />
                              PF (Carnê-Leão): {formatMoney(data.PF)}
                            </p>
                            <p className="text-slate-500 text-[10px] ml-3">
                              Receita: {formatMoney(data.pfReceita)} → Base: {formatMoney(data.pfBase)}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-700 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-slate-600" />
                              PJ (L. Presumido): {formatMoney(data.PJ)}
                            </p>
                            <p className="text-slate-500 text-[10px] ml-3">
                              Presunção: {data.pjPresuncao}% | IRPJ: {formatMoney(data.pjIrpj)}
                            </p>
                            <p className="text-slate-500 text-[10px] ml-3">
                              CSLL: {formatMoney(data.pjCsll)} | PIS: {formatMoney(data.pjPis)} | COFINS: {formatMoney(data.pjCofins)}
                            </p>
                          </div>
                          <div className="border-t border-slate-200 pt-1 mt-1">
                            <p className={`text-[10px] font-medium ${data.PF < data.PJ ? 'text-emerald-600' : 'text-slate-600'}`}>
                              {data.PF < data.PJ
                                ? `PF mais vantajosa (−${formatMoney(data.PJ - data.PF)})`
                                : data.PF > data.PJ
                                  ? `PJ mais vantajosa (−${formatMoney(data.PF - data.PJ)})`
                                  : 'Empate'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar dataKey="PF" name="Pessoa Física (IR)" fill="var(--color-brand, #0ea5e9)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PJ" name="Pessoa Jurídica (IRPJ+CSLL+PIS+COFINS)" fill="#475569" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Memória de cálculo</h3>
          <div className="space-y-4 text-sm">
            <details className="border border-slate-200 rounded-lg overflow-hidden" open>
              <summary className="p-3 bg-slate-50 font-medium cursor-pointer">Pessoa Física (Carnê-Leão)</summary>
              <div className="p-3 pt-0 space-y-1 font-mono text-xs">
                {(() => {
                  const mc = result.memoria_calculo as { detalhe_pf?: { receita_bruta_total: number; despesas_dedutiveis_total: number; base_calculo_total: number; imposto_total: number; aliquota_efetiva_anual: number; trimestres?: Array<{ trimestre: number; receita: number; despesas_dedutiveis: number; base_calculo: number; imposto: number }> } } | undefined;
                  const d = mc?.detalhe_pf;
                  const pf = result.cenarios.pf;
                  if (d) {
                    return (
                      <>
                        <p>Receita bruta: {formatMoney(d.receita_bruta_total)} | Despesas dedutíveis: {formatMoney(d.despesas_dedutiveis_total)} | Base de cálculo: {formatMoney(d.base_calculo_total)}</p>
                        <p>Imposto total: {formatMoney(d.imposto_total)} | Alíquota efetiva anual: {d.aliquota_efetiva_anual.toFixed(1)}%</p>
                        {d.trimestres?.length ? (
                          <table className="w-full mt-2 text-slate-600">
                            <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Desp.ded.</th><th className="text-right">Base</th><th className="text-right">IR</th></tr></thead>
                            <tbody>
                              {d.trimestres.map((t) => (
                                <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.despesas_dedutiveis)}</td><td className="text-right">{formatMoney(t.base_calculo)}</td><td className="text-right">{formatMoney(t.imposto)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </>
                    );
                  }
                  return (
                    <>
                      <p>Receita bruta: {formatMoney(pf.receita_bruta_total)} | Despesas dedutíveis: {formatMoney(pf.despesas_dedutiveis_total)} | Base de cálculo: {formatMoney(pf.base_calculo_total)}</p>
                      <p>Imposto total: {formatMoney(pf.imposto_total)} | Alíquota efetiva anual: {pf.aliquota_efetiva_anual.toFixed(1)}%</p>
                      {pf.trimestres?.length ? (
                        <table className="w-full mt-2 text-slate-600">
                          <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Desp.ded.</th><th className="text-right">Base</th><th className="text-right">IR</th></tr></thead>
                          <tbody>
                            {pf.trimestres.map((t) => (
                              <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.despesas_dedutiveis)}</td><td className="text-right">{formatMoney(t.base_calculo)}</td><td className="text-right">{formatMoney(t.imposto)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </details>
            <details className="border border-slate-200 rounded-lg overflow-hidden">
              <summary className="p-3 bg-slate-50 font-medium cursor-pointer">Pessoa Jurídica (Lucro Presumido)</summary>
              <div className="p-3 pt-0 space-y-1 font-mono text-xs">
                {(() => {
                  const mc = result.memoria_calculo as { detalhe_pj?: { receita_bruta_total: number; presuncao_irpj_pct: number; base_presumida_irpj: number; base_presumida_csll: number; irpj: number; csll: number; pis: number; cofins: number; imposto_total: number; aplicou_in_2306?: boolean; trimestres?: Array<{ trimestre: number; receita: number; base_irpj: number; irpj: number; csll: number; pis: number; cofins: number }> } } | undefined;
                  const d = mc?.detalhe_pj;
                  const pj = result.cenarios.pj;
                  if (d) {
                    return (
                      <>
                        <p>Receita bruta: {formatMoney(d.receita_bruta_total)} | Presunção IRPJ: {d.presuncao_irpj_pct}% | Base IRPJ: {formatMoney(d.base_presumida_irpj)} | Base CSLL: {formatMoney(d.base_presumida_csll)}</p>
                        <p>IRPJ: {formatMoney(d.irpj)} | CSLL: {formatMoney(d.csll)} | PIS: {formatMoney(d.pis)} | COFINS: {formatMoney(d.cofins)} | Total: {formatMoney(d.imposto_total)}</p>
                        {d.aplicou_in_2306 && <p className="text-amber-700">Aplicou acréscimo IN 2.306/2026 (receita &gt; limites).</p>}
                        {d.trimestres?.length ? (
                          <table className="w-full mt-2 text-slate-600">
                            <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Base IRPJ</th><th className="text-right">IRPJ</th><th className="text-right">CSLL</th><th className="text-right">PIS</th><th className="text-right">COFINS</th></tr></thead>
                            <tbody>
                              {d.trimestres.map((t) => (
                                <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.base_irpj)}</td><td className="text-right">{formatMoney(t.irpj)}</td><td className="text-right">{formatMoney(t.csll)}</td><td className="text-right">{formatMoney(t.pis)}</td><td className="text-right">{formatMoney(t.cofins)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </>
                    );
                  }
                  return (
                    <>
                      <p>Receita bruta: {formatMoney(pj.receita_bruta_total)} | Base IRPJ: {formatMoney(pj.base_presumida_irpj)} | Base CSLL: {formatMoney(pj.base_presumida_csll)}</p>
                      <p>IRPJ: {formatMoney(pj.irpj)}{(pj.irpj_adicional ?? 0) > 0 && <> + Adic.: {formatMoney(pj.irpj_adicional ?? 0)}</>}{(pj.irpj_postergado ?? 0) > 0 && <> + Postergado: {formatMoney(pj.irpj_postergado ?? 0)}</>} | CSLL: {formatMoney(pj.csll)} | PIS: {formatMoney(pj.pis)} | COFINS: {formatMoney(pj.cofins)} | Total: {formatMoney(pj.imposto_total)}</p>
                      {pj.aplicou_in_2306 && <p className="text-amber-700">Aplicou acréscimo IN 2.306/2026 (receita &gt; limites).</p>}
                      {(pj.irpj_postergado ?? 0) > 0 && (
                        <p className="text-amber-700 mt-1">
                          § 8º Lei 9.249/95: Receita acumulada ultrapassou R$ 120k. Diferença de presunção (16% → 32%) dos trimestres anteriores = {formatMoney(pj.irpj_postergado ?? 0)}.
                        </p>
                      )}
                      {pj.trimestres?.length ? (
                        <table className="w-full mt-2 text-slate-600">
                          <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-center">Pres.</th><th className="text-right">Base IRPJ</th><th className="text-right">IRPJ</th>{pj.trimestres.some(t => (t.irpj_postergado ?? 0) > 0) && <th className="text-right">Posterg.</th>}<th className="text-right">CSLL</th><th className="text-right">PIS</th><th className="text-right">COFINS</th></tr></thead>
                          <tbody>
                            {pj.trimestres.map((t) => (
                              <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-center">{t.presuncao_irpj_pct ?? 32}%</td><td className="text-right">{formatMoney(t.base_irpj)}</td><td className="text-right">{formatMoney(t.irpj + (t.irpj_adicional ?? 0))}</td>{pj.trimestres.some(x => (x.irpj_postergado ?? 0) > 0) && <td className="text-right">{(t.irpj_postergado ?? 0) > 0 ? formatMoney(t.irpj_postergado ?? 0) : '—'}</td>}<td className="text-right">{formatMoney(t.csll)}</td><td className="text-right">{formatMoney(t.pis)}</td><td className="text-right">{formatMoney(t.cofins)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </details>
            <details className="border border-slate-200 rounded-lg overflow-hidden">
              <summary className="p-3 bg-slate-50 font-medium cursor-pointer">Reforma LC 214/2025 (IBS/CBS)</summary>
              <div className="p-3 pt-0 space-y-1 font-mono text-xs">
                {(() => {
                  const mc = result.memoria_calculo as { detalhe_reforma?: { aliquota_nominal_ibs_cbs: number; redutor_locacao_pct: number; aliquota_efetiva: number; receita_bruta_total: number; custos_operacionais_total: number; creditos_ibs_cbs: number; ibs_cbs_sobre_receita: number; ibs_cbs_liquido: number; imposto_total: number; ir_pf?: number } } | undefined;
                  const d = mc?.detalhe_reforma;
                  const ref = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
                  const refWithIr = ref as typeof ref & { ir_pf?: number };
                  if (d) {
                    return (
                      <>
                        {d.ir_pf != null && (
                          <p className="text-slate-700 font-medium">PF em 2027: IR (Carnê-Leão) + IBS/CBS → Total: {formatMoney(d.imposto_total)} (IR: {formatMoney(d.ir_pf)} + IBS/CBS: {formatMoney(d.ibs_cbs_liquido)})</p>
                        )}
                        <p>Alíquota nominal IBS/CBS: {d.aliquota_nominal_ibs_cbs}% | Redutor locação: {d.redutor_locacao_pct}% | Alíquota efetiva total: {d.aliquota_efetiva.toFixed(1)}%</p>
                        <p>Receita: {formatMoney(d.receita_bruta_total)} | Custos oper.: {formatMoney(d.custos_operacionais_total)} | Créditos IBS/CBS: {formatMoney(d.creditos_ibs_cbs)}</p>
                        <p>IBS/CBS sobre receita: {formatMoney(d.ibs_cbs_sobre_receita)} | Líquido: {formatMoney(d.ibs_cbs_liquido)}{d.ir_pf != null ? <> | IR (PF): {formatMoney(d.ir_pf)}</> : null} | Imposto total: {formatMoney(d.imposto_total)}</p>
                      </>
                    );
                  }
                  if (!ref) return null;
                  return (
                    <>
                      {refWithIr?.ir_pf != null && (
                        <p className="text-slate-700 font-medium">PF em 2027: IR (Carnê-Leão) + IBS/CBS → Total: {formatMoney(ref.imposto_total)} (IR: {formatMoney(refWithIr.ir_pf)} + IBS/CBS: {formatMoney(ref.ibs_cbs_liquido)})</p>
                      )}
                      <p>Alíquota nominal: {ref.aliquota_nominal_ibs_cbs}% | Redutor locação: {ref.redutor_locacao_aplicado_pct}% | Alíquota efetiva: {ref.aliquota_efetiva.toFixed(1)}%</p>
                      <p>Receita: {formatMoney(ref.receita_bruta_total)} | Custos oper.: {formatMoney(ref.custos_operacionais_total)} | Créditos IBS/CBS: {formatMoney(ref.creditos_ibs_cbs)}</p>
                      <p>IBS/CBS sobre receita: {formatMoney(ref.ibs_cbs_sobre_receita)} | Líquido: {formatMoney(ref.ibs_cbs_liquido)} | Imposto total: {formatMoney(ref.imposto_total)}</p>
                    </>
                  );
                })()}
              </div>
            </details>
          </div>
        </Card>
      )}

      {result?.embasamentos_legais && result.embasamentos_legais.length > 0 && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Embasamentos legais</h3>
          <div className="space-y-4">
            {(['pf', 'pj', 'reforma'] as const).map((cenario) => {
              const itens = result.embasamentos_legais!.filter((e) => e.cenario === cenario);
              if (itens.length === 0) return null;
              const labels = { pf: 'Pessoa Física', pj: 'Pessoa Jurídica', reforma: 'Reforma LC 214/2025 (IBS/CBS)' };
              return (
                <div key={cenario}>
                  <p className="font-medium text-slate-700 mb-1">{labels[cenario]}</p>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                    {itens.map((e, i) => (
                      <li key={i}>
                        <strong>{e.norma}</strong>
                        {e.artigo && ` (${e.artigo})`}: {e.descricao}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {result && result.fluxo_caixa?.length > 0 && (() => {
        const fc = result.fluxo_caixa[0]!;
        const impostoPF = result.cenarios.pf.imposto_total;
        const impostoPJ = result.cenarios.pj.imposto_total;
        const pjVence = impostoPJ < impostoPF;
        const economiaReais = Math.abs(impostoPF - impostoPJ);
        const economiaPct = impostoPF > 0 ? (economiaReais / impostoPF) * 100 : 0;
        const reformaPj = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
        const pres16 = (result.memoria_calculo as { aplicar_presuncao_16_servicos?: boolean })?.aplicar_presuncao_16_servicos;
        const acoes: string[] = [];
        if (pjVence && economiaReais > 0) {
          acoes.push(`Recomendação: considerar estruturação em PJ (ME/EPP) para esta atividade — economia estimada de ${formatMoney(economiaReais)} (${economiaPct.toFixed(0)}% sobre a carga em PF).`);
        } else if (!pjVence && economiaReais > 0) {
          acoes.push(`Manter como Pessoa Física é mais vantajoso neste nível de receita — você pagaria ${formatMoney(economiaReais)} a mais em impostos se optasse por PJ.`);
        }
        if (result.break_even) {
          acoes.push(`A partir de aproximadamente ${formatMoney(result.break_even.valor_mensal_break_even)}/mês de receita, PJ tende a ficar mais vantajosa que PF (break-even).`);
        }
        if (reformaPj?.aliquota_efetiva != null) {
          acoes.push(`Reforma LC 214/2025: IBS/CBS + IRPJ + CSLL (holding total ${reformaPj.aliquota_efetiva.toFixed(1)}%). Planeje revisão na vigência da reforma.`);
        }
        acoes.push('Holding em 2027: além do imposto, faz sentido por planejamento sucessório (ITCMD progressivo), proteção patrimonial e tributação na venda (menor que ganho de capital na PF).');
        acoes.push('Contratos de locação firmados até 16/01/2025 podem optar por alíquota de transição 3,65% até o fim do contrato ou 31/12/2028.');
        if ((fc.receita_total ?? 0) >= 240_000) {
          acoes.push('Receita anual ≥ R$ 240 mil: verifique se a PF não ultrapassa o limite para tributação pelo IBS/CBS (reforma).');
        }
        if (pres16 === true) {
          acoes.push(`Elegibilidade 16% (prestação de serviços): cenário considera presunção reduzida de IRPJ/CSLL enquanto receita acumulada respeitar os limites legais.`);
        }
        if (acoes.length === 0) {
          acoes.push('Revise este cenário com seu contador antes de qualquer decisão de estruturação.');
        }
        return (
          <Card className="mt-6 p-5 bg-slate-50 border-brand/20">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Resumo estratégico</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Melhor regime para este cenário</p>
                <p className="text-xl font-bold text-brand mt-0.5">
                  {pjVence ? 'Pessoa Jurídica (Lucro Presumido)' : 'Pessoa Física (Carnê-Leão)'}
                </p>
                {economiaReais > 0 && (
                  <p className="text-sm text-slate-600 mt-1">
                    {pjVence
                      ? `Economia de ${formatMoney(economiaReais)} (${economiaPct.toFixed(0)}% a menos de impostos em relação a PF).`
                      : `Diferença de ${formatMoney(economiaReais)} a menos de impostos em relação a PJ.`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Lucro líquido (o que sobra no bolso)</p>
                <p className="text-sm text-slate-700 mt-1">
                  Como PF: <strong>{formatMoney(fc.lucro_liquido_pf)}</strong> no ano
                </p>
                <p className="text-sm text-slate-700 mt-0.5">
                  Como PJ: <strong>{formatMoney(fc.lucro_liquido_pj)}</strong> no ano
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Após receitas, despesas, custos e impostos.
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Plano de ação</p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
                {acoes.map((texto, i) => (
                  <li key={i}>{texto}</li>
                ))}
              </ul>
            </div>
          </Card>
        );
      })()}

      {result?.break_even && (
        <Card className="mt-4 p-4 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            Break-even: {formatMoney(result.break_even.valor_mensal_break_even)}/mês
          </p>
          <p className="text-sm text-slate-600">{result.break_even.descricao}</p>
        </Card>
      )}

        </div>
      )}

      {/* Simulações salvas */}
      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Simulações salvas</h2>
        {simulations.length === 0 ? (
          <p className="text-slate-500">Nenhuma simulação salva.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {simulations.map((s) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-slate-800">{s.title || `Simulação ${s.ano}`}</span>
                  <span className="text-slate-500 text-sm ml-2">Ano {s.ano}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button variant="secondary" size="sm" onClick={() => handleView(s.id)}>Visualizar</Button>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(s.id)}>Editar</Button>
                  <Button variant="tertiary" size="sm" onClick={() => handleDelete(s.id)} className="text-red-600 border-red-200 hover:bg-red-50">Excluir</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Modal Visualizar Simulação */}
      <Modal
        isOpen={!!viewingSimulation}
        onClose={() => setViewingSimulation(null)}
        title={viewingSimulation ? (viewingSimulation.title || `Simulação ${viewingSimulation.ano}`) : ''}
        size="xl"
      >
        {viewingSimulation && (() => {
          const rd = viewingSimulation.result_data as PropertyTaxSimulationResponse;
          const pf = rd?.cenarios?.pf;
          const pj = rd?.cenarios?.pj;
          const ref = rd?.cenarios?.reforma_2027_pf ?? rd?.cenarios?.reforma_2027;
          return (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-slate-600">Ano {viewingSimulation.ano}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Pessoa Física</h4>
                  <p className="text-lg font-semibold">{pf ? formatMoney(pf.imposto_total) : '-'}</p>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Pessoa Jurídica</h4>
                  <p className="text-lg font-semibold">{pj ? formatMoney(pj.imposto_total) : '-'}</p>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-bold text-slate-600 mb-2">Reforma LC 214/2025</h4>
                  <p className="text-lg font-semibold">{ref ? formatMoney(ref.imposto_total ?? 0) : '-'}</p>
                </Card>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Botão flutuante — Exportar PDF (impressão) */}
      {result && (
        <button
          type="button"
          onClick={handlePrintPdf}
          aria-label="Exportar resultado para PDF"
          title="Exportar para PDF"
          className="print:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand/40"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      )}
    </Layout>
  );
}

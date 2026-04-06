import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { propertyService, type PropertyWithClient } from '../services/property.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { ClientFormModal } from '../../clients/components/ClientFormModal';
import { PropertyFormModal } from '../components/PropertyFormModal';
import { PropertyTransactionsModal } from '../components/PropertyTransactionsModal';
import { PropertiesInlineGrid, type SimulationDraftRowInput } from '../components/PropertiesInlineGrid';
import { Modal } from '../../../shared/components/ui/Modal';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { stripReportExcludedFromClone } from '../../../lib/report-pdf/strip-report-excluded';
import { ReportCoverSection } from '../../../lib/report-pdf/ReportCoverSection';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';
import { formatCnpj, formatCpf } from '../../../shared/utils/masks';
import { spreadsheetTableNavCapture } from '../../../shared/utils/gridKeyboardNav';
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
import type {
  PropertyTaxSimulationResponse,
  SimulateStandaloneMesInput,
  SimulateStandaloneInput,
  PerfilLocacaoReforma,
  PropertySimulation,
  IndicesLc214,
  FiscalIndicesIpcaSeriesResponse,
} from '@shared/core';
import { calcularTransicaoIBS, type TransicaoIBSResult } from '@shared/core';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Nome sugerido ao guardar PDF (Chrome usa `document.title` como nome do ficheiro). */
function sanitizePdfDocumentTitle(raw: string): string {
  const t = raw
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return t || 'Simulador-imobiliario';
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
  { label: 'Camareira', field: 'custo_camareira', section: 'custo' },
  { label: 'Segurança', field: 'custo_seguranca', section: 'custo' },
  { label: 'Material de limpeza', field: 'custo_material_limpeza', section: 'custo' },
  { label: 'Lavanderia e enxoval', field: 'custo_lavanderia_enxoval', section: 'custo' },
  { label: 'Check-in/checkout (terceiros)', field: 'custo_checkin_checkout_terceiros', section: 'custo' },
  { label: 'Taxas de meios de pagamento', field: 'taxas_meios_pagamento', section: 'custo' },
  { label: 'Tarifas bancárias', field: 'tarifas_bancarias', section: 'custo' },
  { label: 'Mão de obra operacional', field: 'mao_de_obra_operacional', section: 'custo' },
  { label: 'Encargos de folha', field: 'encargos_folha', section: 'custo' },
  { label: 'Vacância estimada', field: 'vacancia_estimada', section: 'custo' },
  { label: 'Inadimplência estimada', field: 'inadimplencia_estimada', section: 'custo' },
  { label: 'Outros custos operacionais', field: 'outros_custos', section: 'custo' },
];

const CUSTO_ROW_FIELDS = ROWS.filter((r) => r.section === 'custo').map((r) => r.field);

function hasCustoOperacionalData(mesesArr: SimulateStandaloneMesInput[]): boolean {
  for (const m of mesesArr) {
    for (const f of CUSTO_ROW_FIELDS) {
      if (round2(Number(m[f] ?? 0)) > 0) return true;
    }
  }
  return false;
}

/** Texto explicativo: por que preencher custos operacionais (tooltip / acessível) */
const CUSTOS_OPERACIONAIS_INFO =
  'Custos operacionais alimentam créditos de IBS/CBS no cenário Reforma (LC 214/2025), reduzindo a carga tributária líquida desse bloco. Não alteram o IRPF (Carnê-Leão) nem o Lucro Presumido neste simulador — use Despesas dedutíveis para reduzir a base do IR na pessoa física. Evite duplicar a mesma despesa nas duas rubricas sem critério.';

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
    custo_camareira: 450,
    custo_seguranca: 280,
    custo_material_limpeza: 160,
    custo_lavanderia_enxoval: 220,
    custo_checkin_checkout_terceiros: 180,
    taxas_meios_pagamento: 210,
    tarifas_bancarias: 45,
    mao_de_obra_operacional: 300,
    encargos_folha: 90,
    vacancia_estimada: 120,
    inadimplencia_estimada: 80,
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
    custo_camareira: 0,
    custo_seguranca: 0,
    custo_material_limpeza: 0,
    custo_lavanderia_enxoval: 0,
    custo_checkin_checkout_terceiros: 0,
    taxas_meios_pagamento: 0,
    tarifas_bancarias: 0,
    mao_de_obra_operacional: 0,
    encargos_folha: 0,
    vacancia_estimada: 0,
    inadimplencia_estimada: 0,
    outros_custos: 0,
  };
}

export function SimuladorImoveis() {
  const { success, error: showError, ToastContainer } = useToast();
  const isPaymentRequiredError = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    return (
      msg.includes('402') ||
      msg.includes('payment required') ||
      msg.includes('payment_required') ||
      msg.includes('módulo') ||
      msg.includes('modulo')
    );
  };
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
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [simulations, setSimulations] = useState<PropertySimulation[]>([]);
  const [viewingSimulation, setViewingSimulation] = useState<PropertySimulation | null>(null);
  const [editingSimulationId, setEditingSimulationId] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [reportClientName, setReportClientName] = useState('');
  const [reportTitleName, setReportTitleName] = useState('');
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const printPreviewContentRef = useRef<HTMLDivElement>(null);
  const printWrapperRef = useRef<HTMLDivElement>(null);
  /** Payload da última simulação (para Salvar no histórico após o resultado). */
  const lastSimulationPayloadRef = useRef<{
    ano: number;
    meses: SimulateStandaloneMesInput[];
    aplicar_equiparacao_hospitalar?: boolean;
    quantidade_imoveis: number;
    quantidade_imoveis_residenciais: number;
    quantidade_imoveis_residenciais_longa?: number;
    quantidade_imoveis_comerciais: number;
    opcoes_reforma: Record<string, unknown>;
    receita_locacao_residencial_anual?: number;
    receita_locacao_nao_residencial_anual?: number;
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
  const [anoReferenciaReforma, setAnoReferenciaReforma] = useState<number>(2033);
  const [projecaoModo, setProjecaoModo] = useState<'anual' | 'mensal'>('anual');
  const [quantidadeImoveisResidenciais, setQuantidadeImoveisResidenciais] = useState<number>(1);
  const [quantidadeImoveisResidenciaisLonga, setQuantidadeImoveisResidenciaisLonga] = useState<number>(1);
  const [quantidadeImoveisComerciais, setQuantidadeImoveisComerciais] = useState<number>(0);
  const [receitaLocacaoResidencialAnual, setReceitaLocacaoResidencialAnual] = useState<number>(0);
  const [receitaLocacaoNaoResidencialAnual, setReceitaLocacaoNaoResidencialAnual] = useState<number>(0);
  const [clientId, setClientId] = useState('');
  const clientCardRef = useRef<HTMLDivElement>(null);
  const [imoveisList, setImoveisList] = useState<PropertyWithClient[]>([]);
  const [imoveisSelectedIds, setImoveisSelectedIds] = useState<Set<string>>(new Set());
  const [imoveisDraftSelecionados, setImoveisDraftSelecionados] = useState<SimulationDraftRowInput[]>([]);
  const [imoveisLoading, setImoveisLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState<{ propertyId: string; identificador: string } | null>(null);
  const [deletePropertyModal, setDeletePropertyModal] = useState<{ id: string; identificador: string } | null>(null);
  const [deleteSimulationModal, setDeleteSimulationModal] = useState<{ id: string; title: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [coverageWarning, setCoverageWarning] = useState<string | null>(null);
  const [moduleBlockedMessage, setModuleBlockedMessage] = useState<string | null>(null);
  const quantidadeImoveisTotal =
    (quantidadeImoveisResidenciais || 0) + (quantidadeImoveisComerciais || 0) || 1;
  const [valoresAnuais, setValoresAnuais] = useState<Partial<Record<keyof MesFields, number>>>({});
  const monthlyGridRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLoadedHighlight, setShowLoadedHighlight] = useState(false);
  /** Secção «Custos operacionais»: recolhível; abre ao carregar imóvel/simulação se já houver valores */
  const [custosOperacionaisAberto, setCustosOperacionaisAberto] = useState(false);
  const [ipcaPreview, setIpcaPreview] = useState<IndicesLc214 | null>(null);
  const [ipcaSeries, setIpcaSeries] = useState<FiscalIndicesIpcaSeriesResponse | null>(null);
  const [ipcaSeriesLoading, setIpcaSeriesLoading] = useState(false);
  const [ipcaSeriesModalOpen, setIpcaSeriesModalOpen] = useState(false);
  const [showLc214ContaExplicita, setShowLc214ContaExplicita] = useState(false);
  const [lc214AvancadoAberto, setLc214AvancadoAberto] = useState(false);
  const [lc214ManualLim240, setLc214ManualLim240] = useState('');
  const [lc214ManualLim288, setLc214ManualLim288] = useState('');
  const [lc214ManualRedutorMensal, setLc214ManualRedutorMensal] = useState('');

  const transicaoIBSResult = calcularTransicaoIBS(aliquotaPlenaIBS, [2027, 2028, 2029, 2030, 2031, 2032, 2033]);

  useEffect(() => {
    let cancelled = false;
    propertyService
      .getFiscalIndicesIpca(ano)
      .then((preview) => {
        if (cancelled) return;
        setIpcaPreview(preview);
      })
      .catch(() => {
        if (cancelled) return;
        setIpcaPreview(null);
      });

    propertyService
      .getFiscalIndicesIpcaSeries(ano, 24)
      .then((series) => {
        if (cancelled) return;
        setIpcaSeries(series ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setIpcaSeries(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ano]);

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
      setCustosOperacionaisAberto(true);
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
    setCustosOperacionaisAberto(true);
    setResult(null);
    success('Demo carregada: predominância Airbnb, ~R$ 140k/ano. Clique em "Simular".');
  }, [success, anoAtual]);

  const fillDemo2CenarioIbsCbs = useCallback(() => {
    // Cenário referência IBS/CBS: 2 residenciais curta (120k), 1 residencial longa (60k), 2 não residenciais longa (114k)
    const anoDemo = anoAtual;
    setAno(anoDemo);
    setPerfilLocacao('ambos');
    setAnoReferenciaReforma(2033);
    setAliquotaPlenaIBS(19);
    setAliquotaCBS(9);
    setQuantidadeImoveisResidenciais(3);
    setQuantidadeImoveisResidenciaisLonga(1);
    setQuantidadeImoveisComerciais(2);
    setReceitaLocacaoResidencialAnual(180_000);
    setReceitaLocacaoNaoResidencialAnual(114_000);
    // Distribui receita anual de forma uniforme apenas para referência nos meses
    const mensalLonga = round2(60_000 / 12);
    const mensalCurta = round2(120_000 / 12);
    setMeses((prev) => {
      const next = prev.map((m, i) => ({
        ...m,
        mes_referencia: `${anoDemo}-${String(i + 1).padStart(2, '0')}`,
        receita_aluguel_tradicional: mensalLonga,
        receita_aluguel_curto: mensalCurta,
      }));
      queueMicrotask(() => setCustosOperacionaisAberto(hasCustoOperacionalData(next)));
      return next;
    });
    setResult(null);
    success('Demo carregada: cenário de referência IBS/CBS (2 res. curta, 1 res. longa, 2 não res.), pronto para comparar com a planilha.');
  }, [anoAtual, success]);

  /** Nome do cliente para o relatório: cadastro vinculado (visualização / salvar / simulação) ou texto manual */
  const effectiveClientName =
    (viewingSimulation?.client_id && clients.find((c) => c.id === viewingSimulation!.client_id)?.name?.trim()) ||
    (saveClientId && clients.find((c) => c.id === saveClientId)?.name?.trim()) ||
    (clientId && clients.find((c) => c.id === clientId)?.name?.trim()) ||
    reportClientName.trim() ||
    '';
  const effectiveReportTitle =
    viewingSimulation?.title?.trim() ||
    saveTitle.trim() ||
    reportTitleName.trim() ||
    'Simulador Imobiliário – PF vs PJ vs Reforma LC 214/2025';

  /** Cliente cadastrado para documento na capa do PDF (visualização > salvar > cliente da simulação) */
  const effectiveClientRecord: ClientWithCreatedAt | null =
    (viewingSimulation?.client_id
      ? clients.find((c) => c.id === viewingSimulation.client_id)
      : undefined) ??
    (saveClientId ? clients.find((c) => c.id === saveClientId) : undefined) ??
    (clientId ? clients.find((c) => c.id === clientId) : undefined) ??
    null;
  const coverDocumentLabel =
    effectiveClientRecord?.person_type === 'pj' && effectiveClientRecord.cnpj
      ? `CNPJ: ${formatCnpj(effectiveClientRecord.cnpj)}`
      : effectiveClientRecord?.cpf
        ? `CPF: ${formatCpf(effectiveClientRecord.cpf)}`
        : null;

  /** Nome do cliente vindo do cadastro (sem texto manual em «Nome do cliente»). */
  const clientNameFromSelection = useMemo(() => {
    return (
      (viewingSimulation?.client_id &&
        clients.find((c) => c.id === viewingSimulation.client_id)?.name?.trim()) ||
      (saveClientId && clients.find((c) => c.id === saveClientId)?.name?.trim()) ||
      (clientId && clients.find((c) => c.id === clientId)?.name?.trim()) ||
      ''
    );
  }, [viewingSimulation?.client_id, saveClientId, clientId, clients]);

  /** Preenche título e cliente do PDF com valores padrão (ano + cliente se houver). */
  useEffect(() => {
    if (!result) return;
    setReportTitleName((prev) => {
      if (prev.trim()) return prev;
      return clientNameFromSelection
        ? `Simulador imobiliário ${result.ano} – ${clientNameFromSelection}`
        : `Simulador imobiliário ${result.ano}`;
    });
    setReportClientName((prev) => {
      if (prev.trim()) return prev;
      return clientNameFromSelection;
    });
  }, [result, clientNameFromSelection]);

  const reportEmissionDateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handleOpenPrintPreview = useCallback(() => {
    setShowPrintPreview(true);
  }, []);

  /** Clona o conteúdo do resultado para o preview do modal */
  useEffect(() => {
    if (!showPrintPreview || !printPreviewContentRef.current || !result) return;
    const el = document.getElementById('simulador-imoveis-resultado-print');
    if (!el) return;
    const clone = el.cloneNode(true) as HTMLElement;
    stripReportExcludedFromClone(clone, 'preview');
    printPreviewContentRef.current.innerHTML = '';
    printPreviewContentRef.current.appendChild(clone);
  }, [
    showPrintPreview,
    result,
    effectiveClientName,
    reportClientName,
    clientId,
    coverDocumentLabel,
    reportEmissionDateStr,
  ]);

  const { print: doPrintImoveis } = useReportPrint('simulador-imoveis-print-wrapper');

  const handleDoPrint = useCallback(() => {
    const prevTitle = document.title;
    document.title = sanitizePdfDocumentTitle(effectiveReportTitle);
    setShowPrintPreview(false);
    doPrintImoveis({
      afterPrint: () => {
        document.title = prevTitle;
      },
    });
  }, [doPrintImoveis, effectiveReportTitle]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (waitingDemoDigitRef.current) {
        if (e.key === '1') {
          e.preventDefault();
          waitingDemoDigitRef.current = 0;
          if (demoKeyTimeoutRef.current) {
            clearTimeout(demoKeyTimeoutRef.current);
            demoKeyTimeoutRef.current = null;
          }
          fillDemo1();
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          waitingDemoDigitRef.current = 0;
          if (demoKeyTimeoutRef.current) {
            clearTimeout(demoKeyTimeoutRef.current);
            demoKeyTimeoutRef.current = null;
          }
          fillDemo2CenarioIbsCbs();
          return;
        }
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
  }, [fillDemo1, fillDemo2CenarioIbsCbs]);

  const loadClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const data = await clientService.list();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

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
        if (simResult.status === 'rejected' && isPaymentRequiredError(simResult.reason)) {
          setModuleBlockedMessage(
            'Módulo de Gestão Imobiliária não está ativo no plano deste tenant. Solicite a ativação para usar o simulador.'
          );
        }
        setIsLoadingClients(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (result) {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  /** Inicializa saveClientId com clientId quando disponível (para Salvar no histórico). */
  useEffect(() => {
    if (clientId && !saveClientId) {
      setSaveClientId(clientId);
    }
  }, [clientId, saveClientId]);

  useEffect(() => {
    if (!clientId) {
      setImoveisList([]);
      setImoveisSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    setImoveisLoading(true);
    propertyService.list({ client_id: clientId, limit: 100 }).then(
      (data) => {
        if (!cancelled) {
          setImoveisList(data.properties);
          setImoveisSelectedIds(new Set(data.properties.map((p) => p.id)));
          setModuleBlockedMessage(null);
        }
      },
      (err) => {
        if (!cancelled) {
          setImoveisList([]);
          setImoveisSelectedIds(new Set());
          if (isPaymentRequiredError(err)) {
            setModuleBlockedMessage(
              'Módulo de Gestão Imobiliária não está ativo no plano deste tenant. Solicite a ativação para usar o simulador.'
            );
          }
        }
      }
    ).finally(() => {
      if (!cancelled) setImoveisLoading(false);
    });
    return () => { cancelled = true; };
  }, [clientId]);

  const handleDeleteProperty = async () => {
    if (!deletePropertyModal || deleteConfirmText.toLowerCase() !== 'excluir') return;
    try {
      await propertyService.delete(deletePropertyModal.id);
      setImoveisList((prev) => prev.filter((p) => p.id !== deletePropertyModal.id));
      setImoveisSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletePropertyModal.id);
        return next;
      });
      setDeletePropertyModal(null);
      setDeleteConfirmText('');
      success('Imóvel excluído.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao excluir imóvel');
    }
  };

  /** Popula a grade com dados agregados e padrões dos imóveis selecionados/rascunhos. */
  const handleIniciarSimulacao = useCallback(async (selectionOverride?: {
    propertyIds?: string[];
    draftRows?: SimulationDraftRowInput[];
  }) => {
    const ids = selectionOverride?.propertyIds ?? Array.from(imoveisSelectedIds);
    const draftRows = selectionOverride?.draftRows ?? imoveisDraftSelecionados;
    const hasAnySource = ids.length > 0 || draftRows.length > 0;
    if (!hasAnySource) {
      setMeses(Array.from({ length: 12 }, (_, i) => emptyMes(ano, i)));
      setCustosOperacionaisAberto(false);
      setResult(null);
      setCoverageWarning(null);
      return;
    }

    let baseMeses: SimulateStandaloneMesInput[] = Array.from({ length: 12 }, (_, i) => emptyMes(ano, i));

    if (ids.length > 0) {
      try {
        const preview = await propertyService.aggregatePreview(ids, ano);
        baseMeses = preview.meses;
        if (preview.metadata?.usou_defaults_cadastro) {
          success(
            `Foram aplicados valores presumidos de cadastro em ${preview.metadata.quantidade_imoveis_com_defaults} imóvel(is). Revise os meses antes de simular.`
          );
        }
      } catch {
        baseMeses = Array.from({ length: 12 }, (_, i) => emptyMes(ano, i));
      }
    }

    if (draftRows.length > 0) {
      baseMeses = baseMeses.map((mes) => {
        const extraTradicional = draftRows
          .filter((row) => row.tipo_locacao !== 'flexivel')
          .reduce((sum, row) => sum + Number(row.valor_aluguel_mensal ?? 0), 0);
        const extraCurto = draftRows
          .filter((row) => row.tipo_locacao === 'flexivel')
          .reduce((sum, row) => sum + Number(row.valor_aluguel_mensal ?? 0), 0);
        return {
          ...mes,
          receita_aluguel_tradicional: round2((mes.receita_aluguel_tradicional ?? 0) + extraTradicional),
          receita_aluguel_curto: round2((mes.receita_aluguel_curto ?? 0) + extraCurto),
        };
      });
    }

    setMeses(baseMeses);
    setCustosOperacionaisAberto(false);
    setResult(null);
    const selected = imoveisList.filter((p) => ids.includes(p.id));
    const fixas = selected.filter((p) => p.tipo_locacao === 'fixa');
    const flexiveis = selected.filter((p) => p.tipo_locacao === 'flexivel');
    const draftFixas = draftRows.filter((r) => r.tipo_locacao !== 'flexivel');
    const draftFlexiveis = draftRows.filter((r) => r.tipo_locacao === 'flexivel');
    const temFixas = fixas.length > 0 || draftFixas.length > 0;
    const temFlexiveis = flexiveis.length > 0 || draftFlexiveis.length > 0;
    if (temFixas && temFlexiveis) {
      setPerfilLocacao('ambos');
    } else if (temFlexiveis) {
      setPerfilLocacao('hospedagem_temporada');
    } else if (temFixas) {
      setPerfilLocacao('residencial_comum');
    }

    const allSelected = [...selected, ...draftRows.map((r) => r as any)];
    const qRes = allSelected.filter((p) => p.natureza_locacao !== 'nao_residencial').length;
    const qResLonga = allSelected.filter(
      (p) => p.natureza_locacao !== 'nao_residencial' && p.tipo_locacao === 'fixa'
    ).length;
    const qCom = allSelected.filter((p) => p.natureza_locacao === 'nao_residencial').length;
    if (qRes > 0 || qCom > 0) {
      setQuantidadeImoveisResidenciais(qRes);
      setQuantidadeImoveisResidenciaisLonga(Math.min(qResLonga, qRes));
      setQuantidadeImoveisComerciais(qCom);
    }
    const recRes = round2(
      selected.filter((p) => p.natureza_locacao !== 'nao_residencial')
        .reduce((s, p) => s + Number(p.valor_aluguel_mensal ?? 0) * 12, 0) +
      draftRows.filter((r) => r.natureza_locacao !== 'nao_residencial')
        .reduce((s, r) => s + Number(r.valor_aluguel_mensal ?? 0) * 12, 0)
    );
    const recCom = round2(
      selected.filter((p) => p.natureza_locacao === 'nao_residencial')
        .reduce((s, p) => s + Number(p.valor_aluguel_mensal ?? 0) * 12, 0) +
      draftRows.filter((r) => r.natureza_locacao === 'nao_residencial')
        .reduce((s, r) => s + Number(r.valor_aluguel_mensal ?? 0) * 12, 0)
    );
    if (qRes > 0 && qCom > 0) {
      setReceitaLocacaoResidencialAnual(recRes);
      setReceitaLocacaoNaoResidencialAnual(recCom);
    }

    const fixasSemBase = fixas.filter((p) =>
      !(Number((p as any).iptu_mensal_padrao || 0) > 0) ||
      !(Number((p as any).condominio_mensal_padrao || 0) > 0) ||
      !(Number((p as any).seguro_mensal_padrao || 0) > 0)
    ).length;
    const flexSemBase = flexiveis.filter((p) =>
      !(Number((p as any).camareira_mensal_padrao || 0) > 0) ||
      !(Number((p as any).material_limpeza_mensal_padrao || 0) > 0) ||
      !(Number((p as any).checkin_checkout_mensal_padrao || 0) > 0) ||
      !(Number((p as any).taxas_pagamento_mensal_padrao || 0) > 0)
    ).length;
    if (fixasSemBase > 0 || flexSemBase > 0) {
      setCoverageWarning(
        `Cobertura de parâmetros recomendados incompleta: ${fixasSemBase} imóvel(is) de locação fixa e ${flexSemBase} de locação flexível sem base completa.`
      );
    } else if (draftRows.length > 0) {
      setCoverageWarning(
        `${draftRows.length} linha(s) não salva(s) com aluguel foi(ram) incluída(s) automaticamente na simulação.`
      );
    } else {
      setCoverageWarning(null);
    }
    success('Dados dos imóveis carregados na simulação. Ajuste se necessário e clique em Simular.');
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setShowLoadedHighlight(true);
    highlightTimerRef.current = setTimeout(() => {
      setShowLoadedHighlight(false);
      highlightTimerRef.current = null;
    }, 2500);
    setTimeout(() => {
      monthlyGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [imoveisSelectedIds, imoveisDraftSelecionados, ano, success, imoveisList]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

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
        custo_camareira: round2((m.custo_camareira ?? 0) as number),
        custo_seguranca: round2((m.custo_seguranca ?? 0) as number),
        custo_material_limpeza: round2((m.custo_material_limpeza ?? 0) as number),
        custo_lavanderia_enxoval: round2((m.custo_lavanderia_enxoval ?? 0) as number),
        custo_checkin_checkout_terceiros: round2((m.custo_checkin_checkout_terceiros ?? 0) as number),
        taxas_meios_pagamento: round2((m.taxas_meios_pagamento ?? 0) as number),
        tarifas_bancarias: round2((m.tarifas_bancarias ?? 0) as number),
        mao_de_obra_operacional: round2((m.mao_de_obra_operacional ?? 0) as number),
        encargos_folha: round2((m.encargos_folha ?? 0) as number),
        vacancia_estimada: round2((m.vacancia_estimada ?? 0) as number),
        inadimplencia_estimada: round2((m.inadimplencia_estimada ?? 0) as number),
        outros_custos: round2((m.outros_custos ?? 0) as number),
      };
    });

  const montarOpcoesReforma = (): NonNullable<SimulateStandaloneInput['opcoes_reforma']> => {
    const o: NonNullable<SimulateStandaloneInput['opcoes_reforma']> = {
      ano_referencia_reforma: anoReferenciaReforma,
      aliquota_ibs_cbs_estimada: ano >= 2027 && ano <= 2028 ? 0.1 + aliquotaCBS : 26.5,
      aliquota_ibs_plena: aliquotaPlenaIBS,
      aliquota_cbs_estimada: aliquotaCBS,
      redutor_short_stay_pct: 40,
      contrato_antes_16012025: contratoAntes16012025,
      perfil_locacao: perfilLocacao,
    };
    const p240 =
      lc214ManualLim240.trim() !== '' ? Number(String(lc214ManualLim240).replace(',', '.')) : NaN;
    const p288 =
      lc214ManualLim288.trim() !== '' ? Number(String(lc214ManualLim288).replace(',', '.')) : NaN;
    const pr =
      lc214ManualRedutorMensal.trim() !== ''
        ? Number(String(lc214ManualRedutorMensal).replace(',', '.'))
        : NaN;
    if (Number.isFinite(p240) && p240 > 0) o.limite_receita_contribuinte_pf_manual = p240;
    if (Number.isFinite(p288) && p288 > 0) o.limite_receita_absoluto_contribuinte_pf_manual = p288;
    if (Number.isFinite(pr) && pr > 0) o.redutor_social_mensal_manual = pr;
    return o;
  };

  /** Mesmas regras de `simulateStandalone`: totais manuais LC ou agregado da seleção de imóveis na grade. */
  const buildImoveisStandaloneFields = useCallback(() => {
    const selectedPersistedProperties = imoveisList.filter((p) => imoveisSelectedIds.has(p.id));
    const selectedDraftProperties = imoveisDraftSelecionados;
    const usarSelecaoImoveis =
      selectedPersistedProperties.length > 0 || selectedDraftProperties.length > 0;
    const quantidadeImoveisResidenciaisSelecionados =
      selectedPersistedProperties.filter((p) => p.natureza_locacao !== 'nao_residencial').length +
      selectedDraftProperties.filter((p) => p.natureza_locacao !== 'nao_residencial').length;
    const quantidadeImoveisComerciaisSelecionados =
      selectedPersistedProperties.filter((p) => p.natureza_locacao === 'nao_residencial').length +
      selectedDraftProperties.filter((p) => p.natureza_locacao === 'nao_residencial').length;
    const receitaLocacaoResidencialSelecionadaAnual = round2(
      selectedPersistedProperties
        .filter((p) => p.natureza_locacao !== 'nao_residencial')
        .reduce((sum, p) => sum + Number(p.valor_aluguel_mensal ?? 0) * 12, 0) +
        selectedDraftProperties
          .filter((p) => p.natureza_locacao !== 'nao_residencial')
          .reduce((sum, p) => sum + Number(p.valor_aluguel_mensal ?? 0) * 12, 0)
    );
    const receitaLocacaoNaoResidencialSelecionadaAnual = round2(
      selectedPersistedProperties
        .filter((p) => p.natureza_locacao === 'nao_residencial')
        .reduce((sum, p) => sum + Number(p.valor_aluguel_mensal ?? 0) * 12, 0) +
        selectedDraftProperties
          .filter((p) => p.natureza_locacao === 'nao_residencial')
          .reduce((sum, p) => sum + Number(p.valor_aluguel_mensal ?? 0) * 12, 0)
    );
    const qtdTotal = usarSelecaoImoveis
      ? selectedPersistedProperties.length + selectedDraftProperties.length
      : quantidadeImoveisTotal;
    const qLonga = usarSelecaoImoveis
      ? selectedPersistedProperties.filter((p) => p.natureza_locacao !== 'nao_residencial' && p.tipo_locacao === 'fixa').length +
        selectedDraftProperties.filter((p) => p.natureza_locacao !== 'nao_residencial' && p.tipo_locacao === 'fixa').length
      : quantidadeImoveisResidenciaisLonga;
    return {
      usarSelecaoImoveis,
      quantidade_imoveis: qtdTotal || 1,
      quantidade_imoveis_residenciais: usarSelecaoImoveis
        ? quantidadeImoveisResidenciaisSelecionados
        : quantidadeImoveisResidenciais,
      quantidade_imoveis_residenciais_longa: qLonga,
      quantidade_imoveis_comerciais: usarSelecaoImoveis
        ? quantidadeImoveisComerciaisSelecionados
        : quantidadeImoveisComerciais,
      receita_locacao_residencial_anual: usarSelecaoImoveis
        ? receitaLocacaoResidencialSelecionadaAnual
        : quantidadeImoveisResidenciais > 0 && quantidadeImoveisComerciais > 0
          ? receitaLocacaoResidencialAnual
          : undefined,
      receita_locacao_nao_residencial_anual: usarSelecaoImoveis
        ? receitaLocacaoNaoResidencialSelecionadaAnual
        : quantidadeImoveisResidenciais > 0 && quantidadeImoveisComerciais > 0
          ? receitaLocacaoNaoResidencialAnual
          : undefined,
    };
  }, [
    imoveisList,
    imoveisSelectedIds,
    imoveisDraftSelecionados,
    quantidadeImoveisResidenciais,
    quantidadeImoveisResidenciaisLonga,
    quantidadeImoveisComerciais,
    quantidadeImoveisTotal,
    receitaLocacaoResidencialAnual,
    receitaLocacaoNaoResidencialAnual,
  ]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    const imv = buildImoveisStandaloneFields();
    const receitaMensalSomada = meses.reduce(
      (s, m) =>
        s +
        (m.receita_aluguel_tradicional ?? 0) +
        (m.receita_aluguel_curto ?? 0) +
        (m.receita_garagem ?? 0) +
        (m.receita_outras ?? 0),
      0
    );
    const receitaAnualDeclarada =
      (receitaLocacaoResidencialAnual || 0) + (receitaLocacaoNaoResidencialAnual || 0);
    if (receitaAnualDeclarada > 0) {
      const diff = Math.abs(round2(receitaMensalSomada) - round2(receitaAnualDeclarada));
      if (diff > 1) {
        showError(
          'A soma das receitas mensais diverge da receita anual informada. Revise os valores antes de simular.'
        );
        return;
      }
    }
    if (editingSimulationId) {
      setLoading(true);
      setResult(null);
      try {
        const mesesParaEnvio = buildMesesParaEnvio();
        const opcoes = montarOpcoesReforma();
        const { result: res } = await propertyService.updateSimulation(editingSimulationId, {
          ano,
          meses: mesesParaEnvio,
          aplicar_equiparacao_hospitalar: false,
          quantidade_imoveis: imv.quantidade_imoveis,
          quantidade_imoveis_residenciais: imv.quantidade_imoveis_residenciais,
          quantidade_imoveis_residenciais_longa: imv.quantidade_imoveis_residenciais_longa,
          quantidade_imoveis_comerciais: imv.quantidade_imoveis_comerciais,
          opcoes_reforma: opcoes,
          receita_locacao_residencial_anual: imv.receita_locacao_residencial_anual,
          receita_locacao_nao_residencial_anual: imv.receita_locacao_nao_residencial_anual,
        });
        setResult(res);
        lastSimulationPayloadRef.current = {
          ano,
          meses: mesesParaEnvio,
          aplicar_equiparacao_hospitalar: false,
          quantidade_imoveis: imv.quantidade_imoveis,
          quantidade_imoveis_residenciais: imv.quantidade_imoveis_residenciais,
          quantidade_imoveis_residenciais_longa: imv.quantidade_imoveis_residenciais_longa,
          quantidade_imoveis_comerciais: imv.quantidade_imoveis_comerciais,
          opcoes_reforma: opcoes,
          receita_locacao_residencial_anual: imv.receita_locacao_residencial_anual,
          receita_locacao_nao_residencial_anual: imv.receita_locacao_nao_residencial_anual,
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
      const opcoes = montarOpcoesReforma();
      const res = await propertyService.simulateStandalone({
        ano,
        meses: mesesParaEnvio,
        aplicar_equiparacao_hospitalar: false,
        quantidade_imoveis: imv.quantidade_imoveis,
        quantidade_imoveis_residenciais: imv.quantidade_imoveis_residenciais,
        quantidade_imoveis_residenciais_longa: imv.quantidade_imoveis_residenciais_longa,
        quantidade_imoveis_comerciais: imv.quantidade_imoveis_comerciais,
        opcoes_reforma: opcoes,
        receita_locacao_residencial_anual: imv.receita_locacao_residencial_anual,
        receita_locacao_nao_residencial_anual: imv.receita_locacao_nao_residencial_anual,
      });
      setResult(res);
      if (clientId) {
        setSaveClientId(clientId);
      }
      lastSimulationPayloadRef.current = {
        ano,
        meses: mesesParaEnvio,
        aplicar_equiparacao_hospitalar: false,
        quantidade_imoveis: imv.quantidade_imoveis,
        quantidade_imoveis_residenciais: imv.quantidade_imoveis_residenciais,
        quantidade_imoveis_residenciais_longa: imv.quantidade_imoveis_residenciais_longa,
        quantidade_imoveis_comerciais: imv.quantidade_imoveis_comerciais,
        opcoes_reforma: opcoes,
        receita_locacao_residencial_anual: imv.receita_locacao_residencial_anual,
        receita_locacao_nao_residencial_anual: imv.receita_locacao_nao_residencial_anual,
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
        quantidade_imoveis_residenciais_longa?: number;
        quantidade_imoveis_comerciais?: number;
        receita_locacao_residencial_anual?: number;
        receita_locacao_nao_residencial_anual?: number;
        opcoes_reforma?: {
          ano_referencia_reforma?: number;
          contrato_antes_16012025?: boolean;
          perfil_locacao?: PerfilLocacaoReforma;
          aliquota_ibs_plena?: number;
          aliquota_cbs_estimada?: number;
          limite_receita_contribuinte_pf_manual?: number;
          limite_receita_absoluto_contribuinte_pf_manual?: number;
          redutor_social_mensal_manual?: number;
        };
      };
      if (input?.ano) setAno(input.ano);
      if (Array.isArray(input?.meses) && input.meses.length === 12) {
        const loaded = input.meses.map((m) => ({ ...m }));
        setMeses(loaded);
        setCustosOperacionaisAberto(hasCustoOperacionalData(loaded));
      }
      if (input?.opcoes_reforma?.contrato_antes_16012025 != null) setContratoAntes16012025(input.opcoes_reforma.contrato_antes_16012025);
      if (input?.opcoes_reforma?.ano_referencia_reforma != null) setAnoReferenciaReforma(input.opcoes_reforma.ano_referencia_reforma);
      if (input?.opcoes_reforma?.aliquota_ibs_plena != null) setAliquotaPlenaIBS(input.opcoes_reforma.aliquota_ibs_plena);
      if (input?.opcoes_reforma?.aliquota_cbs_estimada != null) setAliquotaCBS(input.opcoes_reforma.aliquota_cbs_estimada);
      const or = input?.opcoes_reforma;
      setLc214ManualLim240(
        or?.limite_receita_contribuinte_pf_manual != null
          ? String(or.limite_receita_contribuinte_pf_manual)
          : ''
      );
      setLc214ManualLim288(
        or?.limite_receita_absoluto_contribuinte_pf_manual != null
          ? String(or.limite_receita_absoluto_contribuinte_pf_manual)
          : ''
      );
      setLc214ManualRedutorMensal(
        or?.redutor_social_mensal_manual != null ? String(or.redutor_social_mensal_manual) : ''
      );
      if ((input as { receita_locacao_residencial_anual?: number })?.receita_locacao_residencial_anual != null) setReceitaLocacaoResidencialAnual((input as { receita_locacao_residencial_anual: number }).receita_locacao_residencial_anual);
      if ((input as { receita_locacao_nao_residencial_anual?: number })?.receita_locacao_nao_residencial_anual != null) setReceitaLocacaoNaoResidencialAnual((input as { receita_locacao_nao_residencial_anual: number }).receita_locacao_nao_residencial_anual);

      const qr = input?.quantidade_imoveis_residenciais;
      const qc = input?.quantidade_imoveis_comerciais;
      const qt = input?.quantidade_imoveis;
      let resolvedRes: number | undefined;
      let resolvedCom: number | undefined;
      if (qr != null || qc != null) {
        const r = qr ?? 0;
        const c = qc ?? 0;
        if (r === 0 && c === 0 && qt != null && qt > 0) {
          resolvedRes = qt;
          resolvedCom = 0;
        } else {
          resolvedRes = r;
          resolvedCom = c;
        }
      } else if (qt != null) {
        resolvedRes = qt;
        resolvedCom = 0;
      }
      if (resolvedRes !== undefined && resolvedCom !== undefined) {
        setQuantidadeImoveisResidenciais(resolvedRes);
        setQuantidadeImoveisComerciais(resolvedCom);
      }
      if (input?.quantidade_imoveis_residenciais_longa != null) {
        setQuantidadeImoveisResidenciaisLonga(input.quantidade_imoveis_residenciais_longa);
      } else if (resolvedRes !== undefined) {
        setQuantidadeImoveisResidenciaisLonga(resolvedRes);
      }

      const savedPerfil = input?.opcoes_reforma?.perfil_locacao;
      const perfisValidos: PerfilLocacaoReforma[] = ['residencial_comum', 'hospedagem_temporada', 'ambos'];
      const hasExplicitPerfil = savedPerfil != null && perfisValidos.includes(savedPerfil);
      if (hasExplicitPerfil) {
        setPerfilLocacao(savedPerfil);
      } else if (resolvedRes !== undefined && resolvedCom !== undefined && resolvedRes > 0 && resolvedCom > 0) {
        setPerfilLocacao('ambos');
      } else {
        setPerfilLocacao('residencial_comum');
      }
      // Carregar client_id e title para "Salvar como novo"; alinhar dropdown do cliente
      if (sim.client_id) {
        setClientId(sim.client_id);
      }
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
    try {
      await propertyService.deleteSimulation(id);
      success('Simulação excluída.');
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      if (viewingSimulation?.id === id) setViewingSimulation(null);
      if (editingSimulationId === id) setEditingSimulationId(null);
      setDeleteSimulationModal(null);
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
      const opcoes = montarOpcoesReforma();
      const imv = buildImoveisStandaloneFields();
      const { result: res } = await propertyService.simulateStandaloneAndSave({
        ano,
        meses: mesesParaEnvio,
        aplicar_equiparacao_hospitalar: false,
        quantidade_imoveis: imv.quantidade_imoveis,
        quantidade_imoveis_residenciais: imv.quantidade_imoveis_residenciais,
        quantidade_imoveis_residenciais_longa: imv.quantidade_imoveis_residenciais_longa,
        quantidade_imoveis_comerciais: imv.quantidade_imoveis_comerciais,
        opcoes_reforma: opcoes,
        receita_locacao_residencial_anual: imv.receita_locacao_residencial_anual,
        receita_locacao_nao_residencial_anual: imv.receita_locacao_nao_residencial_anual,
        client_id: saveClientId,
        title: saveTitle || undefined,
        save_simulation: true,
      });
      setResult(res);
      lastSimulationPayloadRef.current = {
        ano,
        meses: mesesParaEnvio,
        aplicar_equiparacao_hospitalar: false,
        quantidade_imoveis: imv.quantidade_imoveis,
        quantidade_imoveis_residenciais: imv.quantidade_imoveis_residenciais,
        quantidade_imoveis_residenciais_longa: imv.quantidade_imoveis_residenciais_longa,
        quantidade_imoveis_comerciais: imv.quantidade_imoveis_comerciais,
        opcoes_reforma: opcoes,
        receita_locacao_residencial_anual: imv.receita_locacao_residencial_anual,
        receita_locacao_nao_residencial_anual: imv.receita_locacao_nao_residencial_anual,
      };
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
    const standalonePayload = lastSimulationPayloadRef.current;

    if (!saveClientId) {
      showError('Selecione um cliente para salvar a simulação');
      return;
    }
    if (!standalonePayload) {
      showError('Execute uma simulação antes de salvar');
      return;
    }
    setLoading(true);
    try {
      const { result: res } = await propertyService.simulateStandaloneAndSave({
        ...standalonePayload,
        client_id: saveClientId,
        title: saveTitle || undefined,
      } as Parameters<typeof propertyService.simulateStandaloneAndSave>[0]);
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
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  const formatPercentPtBr = (v: number, casas = 2) =>
    `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    }).format(v)}%`;
  const formatFactorPtBr = (v: number, casas = 6) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    }).format(v);
  const formatMonthRefPtBr = (ym: string) => {
    const m = ym.match(/^(\d{4})-(\d{2})$/);
    if (!m) return ym;
    return `${m[2]}/${m[1]}`;
  };

  const openIpcaSeriesModal = useCallback(async () => {
    setIpcaSeriesModalOpen(true);
    setIpcaSeriesLoading(true);
    try {
      const data = await propertyService.getFiscalIndicesIpcaSeries(ano, 24);
      setIpcaSeries(data ?? null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao carregar série do IPCA');
    } finally {
      setIpcaSeriesLoading(false);
    }
  }, [ano, showError]);

  const ipcaSerieMaisRecente =
    ipcaSeries?.meses && ipcaSeries.meses.length > 0
      ? ipcaSeries.meses[ipcaSeries.meses.length - 1]
      : null;
  const lc214RefFim = ipcaPreview?.mes_referencia_fim ?? '';
  const lc214MesesAplicados = ipcaSeries?.meses
    ? ipcaSeries.meses.filter(
        (m) => lc214RefFim !== '' && m.mes_referencia >= '2025-02' && m.mes_referencia <= lc214RefFim
      )
    : [];
  const lc214ContaExplicita =
    lc214MesesAplicados.length > 0
      ? lc214MesesAplicados
          .map(
            (m) =>
              `(1 + ${formatPercentPtBr(m.variacao_mensal_pct, 2).replace('%', '')}/100 @ ${formatMonthRefPtBr(m.mes_referencia)})`
          )
          .join(' × ')
      : '';
  const lc214MesesLista = lc214MesesAplicados.map((m) => formatMonthRefPtBr(m.mes_referencia)).join(', ');

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
      {moduleBlockedMessage && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4">
          <p className="text-amber-900 text-sm font-medium">{moduleBlockedMessage}</p>
        </Card>
      )}

      <form onSubmit={handleSimulate} className="space-y-6">
        {/* Cliente da simulação (sempre primeiro) */}
        <div ref={clientCardRef}>
        <Card className="p-5 border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-3">Cliente da simulação</h3>
          <div className="flex gap-2 items-center">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-1">Para qual cliente é esta simulação? *</label>
              <select
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isLoadingClients}
              >
                <option value="">{isLoadingClients ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="pt-6">
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => setShowClientModal(true)}
              >
                + Cadastrar cliente
              </Button>
            </div>
          </div>
        </Card>
        </div>

        <PropertiesInlineGrid
          clientId={clientId}
          clientName={clients.find((c) => c.id === clientId)?.name}
          properties={imoveisList}
          loading={imoveisLoading}
          onRefreshClientProperties={async () => {
            if (!clientId) return;
            const data = await propertyService.list({ client_id: clientId, limit: 100 });
            setImoveisList(data.properties);
          }}
          onRequireClientToSave={() => {
            showError('Selecione um cliente');
            clientCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onSaveRows={async (rows) => {
            if (!clientId) return;
            if (!rows.length) return;
            const rowsNormalized = rows.map((r, idx) => {
              const trimmed = r.identificador.trim();
              if (trimmed) return { ...r, identificador: trimmed };
              const suffix =
                r.propertyId != null
                  ? r.propertyId.replace(/-/g, '').slice(0, 8)
                  : r.rowId.split('-').pop()?.slice(0, 10) ?? String(idx + 1);
              return { ...r, identificador: `Sem nome (${suffix})` };
            });
            try {
            const payloadComum = (r: (typeof rowsNormalized)[number]) => ({
              identificador: r.identificador,
              valor_aluguel_mensal: r.valor_aluguel_mensal,
              tipo_locacao: r.tipo_locacao,
              natureza_locacao: r.natureza_locacao,
              modo_entrada: 'detalhado' as const,
              matricula_imovel: r.matricula_imovel,
              inscricao_iptu: r.inscricao_iptu,
              cartorio_registro: r.cartorio_registro,
              iptu_mensal_padrao: r.iptu_mensal_padrao,
              condominio_mensal_padrao: r.condominio_mensal_padrao,
              seguro_mensal_padrao: r.seguro_mensal_padrao,
              camareira_mensal_padrao: r.camareira_mensal_padrao,
              seguranca_mensal_padrao: r.seguranca_mensal_padrao,
              material_limpeza_mensal_padrao: r.material_limpeza_mensal_padrao,
              lavanderia_enxoval_mensal_padrao: r.lavanderia_enxoval_mensal_padrao,
              checkin_checkout_mensal_padrao: r.checkin_checkout_mensal_padrao,
              taxas_pagamento_mensal_padrao: r.taxas_pagamento_mensal_padrao,
              tarifas_bancarias_mensal_padrao: r.tarifas_bancarias_mensal_padrao,
              vacancia_mensal_padrao: r.vacancia_mensal_padrao,
              inadimplencia_mensal_padrao: r.inadimplencia_mensal_padrao,
            });

            const toUpdate = rowsNormalized.filter((r) => r.propertyId);
            const toCreate = rowsNormalized.filter((r) => {
              if (r.propertyId) return false;
              const rent = Number(r.valor_aluguel_mensal);
              return Number.isFinite(rent) && rent > 0;
            });

            await Promise.all(
              toUpdate.map((r) => propertyService.update(r.propertyId!, payloadComum(r)))
            );

            if (toCreate.length > 0) {
              await propertyService.createBatch({
                client_id: clientId,
                properties: toCreate.map((r) => ({
                  ...payloadComum(r),
                  modo_entrada: 'detalhado',
                })),
              });
            }

            success('Imóveis salvos com sucesso.');
            } catch (err) {
              showError(err instanceof Error ? err.message : 'Erro ao salvar imóveis');
              throw err;
            }
          }}
          onApplyToSimulation={async ({ propertyIds, draftRows }) => {
            setImoveisSelectedIds(new Set(propertyIds));
            setImoveisDraftSelecionados(draftRows);
            await handleIniciarSimulacao({ propertyIds, draftRows });
          }}
          onDeletePersistedRows={async (propertyIds) => {
            await Promise.all(propertyIds.map((id) => propertyService.delete(id)));
            setImoveisList((prev) => prev.filter((p) => !propertyIds.includes(p.id)));
            setImoveisSelectedIds((prev) => {
              const next = new Set(prev);
              propertyIds.forEach((id) => next.delete(id));
              return next;
            });
            success(propertyIds.length > 1 ? 'Linhas excluídas com sucesso.' : 'Linha excluída com sucesso.');
          }}
        />
        {coverageWarning && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            {coverageWarning}
          </p>
        )}

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
              <Button
                type="submit"
                variant="primary"
                disabled={
                  loading ||
                  false
                }
                className="min-w-[200px]"
              >
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
          {ipcaPreview && (
            <div
              className="mb-4 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700"
              role="region"
              aria-label="Parâmetros LC 214 indexados pelo IPCA"
            >
              <p className="font-medium text-slate-800 mb-1">
                IPCA / LC 214 — ano-calendário {ano} (referência do cálculo: {formatMonthRefPtBr(ipcaPreview.mes_referencia_fim)})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">IPCA mensal mais recente</p>
                  <p className="text-base font-semibold text-slate-900">
                    {ipcaSerieMaisRecente ? formatPercentPtBr(ipcaSerieMaisRecente.variacao_mensal_pct, 2) : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {ipcaSerieMaisRecente
                      ? formatMonthRefPtBr(ipcaSerieMaisRecente.mes_referencia)
                      : 'Carregue a tabela'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Fator de correção LC 214 (x)</p>
                    <button
                      type="button"
                      onClick={() => setShowLc214ContaExplicita((v) => !v)}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                      title={showLc214ContaExplicita ? 'Ocultar conta explícita' : 'Mostrar conta explícita'}
                      aria-label={showLc214ContaExplicita ? 'Ocultar conta explícita' : 'Mostrar conta explícita'}
                    >
                      i
                    </button>
                  </div>
                  <p className="text-base font-semibold text-slate-900">
                    {formatFactorPtBr(ipcaPreview.fator_acumulado_desde_publicacao, 6)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Equivale a {formatPercentPtBr((ipcaPreview.fator_acumulado_desde_publicacao - 1) * 100, 4)}
                  </p>
                </div>
              </div>
              {showLc214ContaExplicita && lc214MesesAplicados.length > 0 && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Conta explícita do fator LC 214</p>
                  <p className="text-xs text-slate-700 mt-1 break-words">
                    Meses aplicados: {lc214MesesLista}
                  </p>
                  <p className="text-xs text-slate-700 mt-1 break-words">
                    {lc214ContaExplicita} = <strong>{formatFactorPtBr(ipcaPreview.fator_acumulado_desde_publicacao, 6)}</strong>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Redutor social mensal efetivo</p>
                  <p className="text-base font-semibold text-slate-900">{formatMoney(ipcaPreview.redutor_social_mensal_efetivo)}</p>
                  <p className="text-[11px] text-slate-500">
                    {lc214ManualRedutorMensal.trim()
                      ? 'Entrada manual informada'
                      : `Calculado automaticamente: R$ 600,00 × ${formatFactorPtBr(ipcaPreview.fator_acumulado_desde_publicacao, 6)}`}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Tetos PF (LC 214)</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatMoney(ipcaPreview.limite_receita_pf_contribuinte)} / {formatMoney(ipcaPreview.limite_receita_pf_absoluto)}
                  </p>
                  <p className="text-[11px] text-slate-500">Contribuinte / absoluto</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                <span className="font-medium">Atualização automática:</span>
                <span>
                  {ipcaPreview.ipca_fonte === 'bcb_online'
                    ? 'sim (consulta online BCB confirmada)'
                    : ipcaPreview.ipca_fonte === 'cache'
                      ? 'sim (dados BCB recentes em cache)'
                      : 'não confirmada online (contingência embutida)'}
                </span>
                {ipcaPreview.data_consulta_bcb ? (
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-600"
                    title={`Última consulta automática: ${new Date(ipcaPreview.data_consulta_bcb).toLocaleString('pt-BR')}`}
                    aria-label={`Última consulta automática: ${new Date(ipcaPreview.data_consulta_bcb).toLocaleString('pt-BR')}`}
                  >
                    i
                  </span>
                ) : null}
                <span>· Série SGS {ipcaPreview.serie_sgs_codigo}</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => void openIpcaSeriesModal()}
                  className="text-brand underline"
                >
                  Ver tabela de índices
                </button>
                <span>·</span>
                <a
                  href="https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  Ver últimos índices (API oficial BCB)
                </a>
              </div>
              {ipcaPreview.ipca_fonte === 'embutido' ? (
                <p className="text-amber-800 text-xs mt-2">Atenção: BCB indisponível no momento; valores podem estar aproximados (contingência).</p>
              ) : null}
            </div>
          )}
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
            <div className={`grid grid-cols-1 ${perfilLocacao === 'ambos' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
              {perfilLocacao === 'ambos' ? (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Residenciais longa duração</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quantidadeImoveisResidenciaisLonga}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setQuantidadeImoveisResidenciaisLonga(v);
                        setQuantidadeImoveisResidenciais(v + Math.max(0, quantidadeImoveisResidenciais - quantidadeImoveisResidenciaisLonga));
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white w-28"
                    />
                    <span className="text-xs text-slate-500">
                      Com redutor social Art. 260 LC 214/2025 (
                      {ipcaPreview
                        ? `${formatMoney(ipcaPreview.redutor_social_mensal_efetivo)}/mês por imóvel (nominal R$ 600,00 corrigido IPCA)`
                        : 'R$ 600,00/mês por imóvel, corrigido IPCA após carregar parâmetros'}
                      ). Só locação residencial {'>'}90 dias gera redutor social.
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Residenciais curta temporada</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.max(0, quantidadeImoveisResidenciais - quantidadeImoveisResidenciaisLonga)}
                      onChange={(e) => {
                        const curta = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setQuantidadeImoveisResidenciais(quantidadeImoveisResidenciaisLonga + curta);
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white w-28"
                    />
                    <span className="text-xs text-slate-500">
                      Sem redutor social — equiparada a hotelaria (Arts. 253/278 LC 214/2025). Redutor de alíquota 40% (Art. 281).
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Imóveis residenciais {perfilLocacao === 'residencial_comum' ? '(com redutor social)' : '(sem redutor social)'}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={quantidadeImoveisResidenciais}
                    onChange={(e) => {
                      const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setQuantidadeImoveisResidenciais(v);
                      if (perfilLocacao === 'residencial_comum') setQuantidadeImoveisResidenciaisLonga(v);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white w-28"
                  />
                  <span className="text-xs text-slate-500">
                    {perfilLocacao === 'residencial_comum'
                      ? `Redutor social Art. 260 LC 214/2025 (${
                          ipcaPreview
                            ? `${formatMoney(ipcaPreview.redutor_social_mensal_efetivo)}/mês por imóvel (nominal R$ 600,00 × IPCA)`
                            : 'R$ 600,00/mês por imóvel corrigido IPCA'
                        }) — locação residencial de longa duração.`
                      : 'Equiparada a hotelaria (Arts. 253/278 LC 214/2025) — sem redutor social, redutor de alíquota 40% (Art. 281).'}
                  </span>
                </div>
              )}
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
                  Entra na contagem total de imóveis (residenciais + comerciais) para verificar se a PF se torna contribuinte de IBS/CBS (limite de 3 imóveis).
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Ano de referência do cenário Reforma</label>
              <select
                value={anoReferenciaReforma}
                onChange={(e) => setAnoReferenciaReforma(Number(e.target.value))}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white w-40"
              >
                <option value={2027}>2027/2028</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
                <option value={2030}>2030</option>
                <option value={2031}>2031</option>
                <option value={2032}>2032</option>
                <option value={2033}>2033 (reforma integral)</option>
              </select>
              <span className="text-xs text-slate-500">Ano usado para o card principal da Reforma. Default 2033 para alinhar com a projeção.</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Perfil de locação</label>
              <select
                value={perfilLocacao}
                onChange={(e) => setPerfilLocacao(e.target.value as PerfilLocacaoReforma)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white min-w-[280px]"
              >
                <option value="residencial_comum">Locação de longa duração (Redutor da alíquota 70%)</option>
                <option value="hospedagem_temporada">Locação de curta temporada (Redutor da alíquota 40%)</option>
                <option value="ambos">Locação longa duração e curta temporada (ambos os redutores)</option>
              </select>
              <span className="text-xs text-slate-500">Escolha conforme a natureza da sua locação. Em 2027/2028 incide CBS e IBS (0,1%) - A partir de 2029 incide CBS plena e IBS progressiva até 2032.</span>
            </div>
            <div className="border-t border-amber-200 pt-3">
              <button
                type="button"
                className="text-sm font-medium text-brand hover:underline"
                onClick={() => setLc214AvancadoAberto((v) => !v)}
                aria-expanded={lc214AvancadoAberto}
              >
                {lc214AvancadoAberto ? '▼' : '▶'} Parâmetros LC 214 manuais (avançado)
              </button>
              {lc214AvancadoAberto && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700">Teto PF &gt;3 imóveis (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Automático (IPCA)"
                      value={lc214ManualLim240}
                      onChange={(e) => setLc214ManualLim240(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-slate-800 bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700">Teto absoluto PF (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Automático (IPCA)"
                      value={lc214ManualLim288}
                      onChange={(e) => setLc214ManualLim288(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-slate-800 bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-700">Redutor social mensal / imóvel (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Automático (IPCA)"
                      value={lc214ManualRedutorMensal}
                      onChange={(e) => setLc214ManualRedutorMensal(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-slate-800 bg-white"
                    />
                  </div>
                  <p className="sm:col-span-3 text-xs text-slate-500">
                    Deixe em branco para usar IPCA (BCB SGS) e os valores legais nominais corrigidos. Preencha apenas para conferir com tabela oficial ou cenário alternativo.
                  </p>
                </div>
              )}
            </div>
            {quantidadeImoveisResidenciais > 0 && quantidadeImoveisComerciais > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-200">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Receita anual locação residencial (R$)</label>
                  <MoneyInput
                    value={receitaLocacaoResidencialAnual}
                    onChange={setReceitaLocacaoResidencialAnual}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-slate-500">
                    Com redutor social por imóvel/mês (IPCA desde jan/2025, LC 227/2026) e redutor setorial da alíquota (70% longa duração ou 40% curta temporada, conforme perfil escolhido).
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Receita anual locação não residencial (R$)</label>
                  <MoneyInput
                    value={receitaLocacaoNaoResidencialAnual}
                    onChange={setReceitaLocacaoNaoResidencialAnual}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-slate-500">
                    Sem redutor social, mas com o mesmo redutor setorial de alíquota configurado acima (70% longa duração ou 40% curta temporada, conforme perfil).
                  </span>
                </div>
              </div>
            )}
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
          <h3 className="font-semibold text-slate-800 mb-2">Preenchimento rápido – Valores anuais</h3>
          <p className="text-xs text-slate-600 mb-4 bg-sky-50 border border-sky-200 rounded px-3 py-2">
            A <strong>grid de meses</strong> (aluguel tradicional + curto prazo) é a base para PF, PJ e Reforma. O botão &quot;Aplicar rateio&quot; distribui os totais anuais nos 12 meses. Se você preencher apenas os totais no topo (receita residencial/não residencial) sem aplicar rateio na grid, o cálculo usará os valores já presentes nos meses — mantenha a grid atualizada. Quando há misto residencial + comercial, informe também os campos de receita anual residencial e não residencial acima para o redutor social e a segregação correta na Reforma.
          </p>

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
        </Card>

        {/* Seções por categoria: receitas e despesas dedutíveis */}
        <div ref={monthlyGridRef} />
        {(['receita', 'despesa'] as SectionKey[]).map((sectionKey) => {
          const config = SECTION_CONFIG[sectionKey];
          const sectionRows = ROWS.filter((r) => r.section === sectionKey);
          if (sectionRows.length === 0) return null;
          return (
            <Card
              key={sectionKey}
              className={`overflow-hidden border-2 transition-all duration-300 ${
                showLoadedHighlight ? 'ring-2 ring-brand/40 shadow-lg' : ''
              } ${config.border} ${config.bg}`}
            >
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${config.headerBg}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm">
                  {config.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">{config.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{config.subtitle}</p>
                </div>
              </div>
              <div
                className="-mx-2 overflow-x-auto px-2 py-3"
                onKeyDownCapture={spreadsheetTableNavCapture}
              >
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
                              className={`!py-1.5 text-sm min-w-[11rem] transition-colors duration-300 ${
                                showLoadedHighlight ? 'bg-amber-50/60 border-amber-300' : ''
                              }`}
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

        {/* Custos operacionais: opcional, recolhível; créditos IBS/CBS na Reforma */}
        <details
          open={custosOperacionaisAberto}
          onToggle={(e) => setCustosOperacionaisAberto(e.currentTarget.open)}
          className="rounded-xl border-2 border-amber-200 bg-amber-50/60 overflow-hidden transition-all duration-300"
        >
          <summary className="cursor-pointer list-none px-4 py-3 bg-amber-100/80 border-b border-amber-200 flex flex-wrap items-start gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-slate-500 select-none mt-0.5" aria-hidden>
              {custosOperacionaisAberto ? '▼' : '▶'}
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm">
              {SECTION_CONFIG.custo.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-800">{SECTION_CONFIG.custo.title}</h3>
                <span className="text-xs font-normal text-slate-500">(opcional)</span>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-white text-slate-600 hover:bg-amber-50 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                  aria-label="Por que preencher custos operacionais"
                  title={CUSTOS_OPERACIONAIS_INFO}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 pr-2">{SECTION_CONFIG.custo.subtitle}</p>
            </div>
          </summary>
          <div className="space-y-4 p-4 bg-amber-50/40">
            <Card className="p-4 border-amber-200/80 bg-white/90">
              <p className="text-xs text-slate-600 mb-3">{CUSTOS_OPERACIONAIS_INFO}</p>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={modoCustoAnual}
                  onChange={(e) => setModoCustoAnual(e.target.checked)}
                  className="rounded border-slate-300 text-brand focus:ring-brand"
                />
                <span className="text-sm font-medium text-slate-700">Valor anual / distribuição igualitária — Créditos IBS/CBS</span>
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
            </Card>
            {(() => {
              const sectionKey: SectionKey = 'custo';
              const config = SECTION_CONFIG[sectionKey];
              const sectionRows = ROWS.filter((r) => r.section === sectionKey);
              return (
                <Card
                  className={`overflow-hidden border-2 transition-all duration-300 ${
                    showLoadedHighlight ? 'ring-2 ring-brand/40 shadow-lg' : ''
                  } ${config.border} ${config.bg}`}
                >
                  <div
                    className="-mx-2 overflow-x-auto px-2 py-3"
                    onKeyDownCapture={spreadsheetTableNavCapture}
                  >
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
                                  className={`!py-1.5 text-sm min-w-[11rem] transition-colors duration-300 ${
                                    showLoadedHighlight ? 'bg-amber-50/60 border-amber-300' : ''
                                  }`}
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
            })()}
          </div>
        </details>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={loading} className="min-w-[220px]">
            {loading ? 'Simulando...' : 'Simular PF vs PJ vs Reforma LC 214/2025'}
          </Button>
        </div>
      </form>

      {result && (
        <div id="simulador-imoveis-print-wrapper" ref={printWrapperRef} className="report-print-wrapper mt-6">
          <ReportPrintHeader
            variant="printSheet"
            reportTitle="Simulador Imobiliário – PF vs PJ vs Reforma LC 214/2025"
            metaLine={`Emissão ${reportEmissionDateStr}`}
          />
          <ReportCoverSection
            variant="printSheet"
            title="Simulador Imobiliário – PF vs PJ vs Reforma LC 214/2025"
            clientName={effectiveClientName || undefined}
            subtitle={coverDocumentLabel || undefined}
            details={[
              { label: 'Ano-base', value: String(result.ano) },
              ...(result.fluxo_caixa?.[0] ? [{ label: 'Receita (Carnê-Leão / LP)', value: formatMoney(result.fluxo_caixa[0].receita_total) }] : []),
            ]}
          />
          <div ref={resultSectionRef} id="simulador-imoveis-resultado-print" className="space-y-6 report-resultado-content print:pt-2">
          {/* Cabeçalho do resultado: título + botão Exportar PDF */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Resultado da simulação – Simulador Imobiliário</h2>
              <div className="space-y-0.5 text-sm text-slate-600">
                <p>
                  Ano <strong>{result.ano}</strong>
                  {result.fluxo_caixa?.[0] && (
                    <> · Receita PF/PJ (Carnê-Leão / Lucro Presumido): <strong>{formatMoney(result.fluxo_caixa[0].receita_total)}</strong></>
                  )}
                </p>
                {(() => {
                  const receitaReforma =
                    result.cenarios.reforma_2027_pf?.receita_bruta_total ??
                    result.cenarios.reforma_2027?.receita_bruta_total;
                  if (!receitaReforma || !result.fluxo_caixa?.[0]) return null;
                  if (Math.round(receitaReforma) === Math.round(result.fluxo_caixa[0].receita_total)) return null;
                  return (
                    <p className="text-xs text-slate-500">
                      Receita considerada na Reforma (residencial + não residencial):{' '}
                      <strong>{formatMoney(receitaReforma)}</strong>
                    </p>
                  );
                })()}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenPrintPreview}
              className="print:hidden shrink-0 inline-flex items-center gap-2"
              aria-label="Exportar resultado para PDF"
              data-report-exclude="preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar para PDF
            </Button>
          </div>

          {/* Salvar simulação no histórico (botão após resultado) */}
          <Card className="p-5 border border-slate-200 bg-slate-50/50 print:hidden" data-report-exclude="preview">
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
                  disabled={isLoadingClients}
                >
                  <option value="">{isLoadingClients ? 'Carregando clientes...' : 'Selecione um cliente'}</option>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Pessoa Física (Carnê-Leão)</h3>
            <p className="text-2xl font-bold text-brand">
              {formatMoney(result.cenarios.pf.imposto_total)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva: {result.cenarios.pf.aliquota_efetiva_anual.toFixed(2)}%
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
              Alíquota efetiva: {result.cenarios.pj.aliquota_efetiva.toFixed(2)}%
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
                      Economia com presunção 16%: {formatMoney(economia)} ({economiaPct.toFixed(2)}%)
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
                      Alíquota efetiva: {result.cenarios.pf.aliquota_efetiva_anual.toFixed(2)}%
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
                    Alíquota total: {aliquotaTotal.toFixed(2)}%
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
              Alíquota efetiva total: {(result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(2) ?? '0'}%
              {((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { redutor_diferenciado_short?: boolean })?.redutor_diferenciado_short ? (
                <span className="text-slate-500"> (com redutor 70% longa duração e 40% curta temporada)</span>
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
              <p className="text-xs text-slate-600 mt-1">Redutor da alíquota 70% (longa duração) e 40% (curta temporada — Art. 281 LC 214/2025), aplicados proporcionalmente à receita de cada tipo.</p>
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
                  ibs_cbs_antes_redutor_social?: number;
                  redutor_social_base_deduzida_anual?: number;
                  redutor_social_aplicado?: number;
                };
                const aliqNominal = refExt.aliquota_nominal_ibs_cbs ?? 26.5;
                const debito = refExt.ibs_cbs_sobre_receita ?? 0;
                const creditos = ref.creditos_ibs_cbs ?? 0;
                const custos = refExt.custos_operacionais_total ?? 0;
                const liquido = ref.ibs_cbs_liquido ?? 0;
                const temRedutorSocial = refExt.ibs_cbs_antes_redutor_social != null && (refExt.redutor_social_aplicado ?? 0) > 0;
                const irpj = refExt.irpj ?? 0;
                const csll = refExt.csll ?? 0;
                const redutorDiferenciado = refExt.redutor_diferenciado_short === true;
                const pctRedutorLonga = refExt.redutor_long_pct ?? refExt.redutor_locacao_aplicado_pct ?? 70;
                const pctRedutorShort = refExt.redutor_short_pct ?? 40;
                const aliqEfetivaLonga = round2(aliqNominal * (1 - pctRedutorLonga / 100));
                const aliqEfetivaShort = round2(aliqNominal * (1 - pctRedutorShort / 100));

                const idxLc214 = result.indices_lc214;
                const mensalRedutorSocialEfetivo = idxLc214?.redutor_social_mensal_efetivo ?? 600;
                const nImoveisArt260 =
                  quantidadeImoveisResidenciaisLonga > 0
                    ? quantidadeImoveisResidenciaisLonga
                    : perfilLocacao !== 'hospedagem_temporada'
                      ? quantidadeImoveisResidenciais
                      : 0;

                const recResAnual = receitaLocacaoResidencialAnual;
                const recNaoResAnual = receitaLocacaoNaoResidencialAnual;
                const recLongaMeses = meses.reduce((s, m) => s + (m.receita_aluguel_tradicional ?? 0), 0);
                const recCurtaMeses = meses.reduce((s, m) => s + (m.receita_aluguel_curto ?? 0), 0);
                const totalLongShort = recLongaMeses + recCurtaMeses;
                const partLong = totalLongShort > 0 ? recLongaMeses / totalLongShort : 1;
                const recResLonga = round2(recResAnual * partLong);
                const recResCurta = round2(recResAnual * (1 - partLong));
                const temSplit = redutorDiferenciado && (recResLonga > 0 || recResCurta > 0 || recNaoResAnual > 0);

                const redutorAnual = round2(Math.max(0, nImoveisArt260) * mensalRedutorSocialEfetivo * 12);
                const baseDeduzida = temRedutorSocial ? round2(Math.min(recResLonga, redutorAnual)) : 0;
                const baseResLonga = round2(recResLonga - baseDeduzida);
                const ibsResLonga = round2(baseResLonga * aliqEfetivaLonga / 100);
                const ibsResCurta = round2(recResCurta * aliqEfetivaShort / 100);
                const ibsNaoRes = round2(recNaoResAnual * aliqEfetivaLonga / 100);
                const ibsTotalTipos = round2(ibsResLonga + ibsResCurta + ibsNaoRes);

                const temPassoIrpjCsll = irpj > 0 || csll > 0;

                return (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono space-y-1.5 border border-slate-200">
                    <p className="text-slate-600 font-sans font-medium border-b border-slate-200 pb-1 mb-2">Composição da alíquota IBS/CBS (LC 214/2025)</p>
                    
                    <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide">Passo 1: Alíquota efetiva (redutor da alíquota)</p>
                    <p>Alíquota nominal: <span className="text-slate-800">{aliqNominal.toFixed(2)}%</span></p>
                    {redutorDiferenciado ? (
                      <>
                        <p className="font-sans text-slate-600">Longa duração: {aliqNominal.toFixed(2)}% × (100% − {pctRedutorLonga}%) = <span className="text-slate-800 font-semibold">{aliqEfetivaLonga.toFixed(2)}%</span> (Art. 261)</p>
                        <p className="font-sans text-slate-600">Curta temporada: {aliqNominal.toFixed(2)}% × (100% − {pctRedutorShort}%) = <span className="text-slate-800 font-semibold">{aliqEfetivaShort.toFixed(2)}%</span> (Art. 281)</p>
                        <p className="font-sans text-slate-600">Não residencial: mesma da longa duração = <span className="text-slate-800 font-semibold">{aliqEfetivaLonga.toFixed(2)}%</span></p>
                      </>
                    ) : (
                      <>
                        <p>× (100% − {refExt.redutor_locacao_aplicado_pct ?? 70}% redutor) = <span className="text-slate-800">{(100 - (refExt.redutor_locacao_aplicado_pct ?? 70))}%</span></p>
                        <p className="border-t border-slate-200 pt-1">= Alíquota efetiva: <span className="text-slate-800 font-semibold">{aliqEfetivaLonga.toFixed(2)}%</span></p>
                      </>
                    )}

                    {temSplit ? (
                      <>
                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-3">Passo 2: IBS/CBS por tipo de imóvel</p>
                        <div className="mt-1 font-sans space-y-2">
                          {recResLonga > 0 && (
                            <div className="rounded border border-slate-200 bg-white px-3 py-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">Residencial longa</span>
                                <span className="text-xs font-bold text-slate-800">{formatMoney(ibsResLonga)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[11px]">
                                <div><span className="text-slate-400">Receita</span> <span className="text-slate-700 font-medium">{formatMoney(recResLonga)}</span></div>
                                <div><span className="text-slate-400">Redutor</span> <span className="text-emerald-700 font-medium">{baseDeduzida > 0 ? `−${formatMoney(baseDeduzida)}` : '—'}</span></div>
                                <div><span className="text-slate-400">Base</span> <span className="text-slate-800 font-semibold">{formatMoney(baseResLonga)}</span></div>
                                <div><span className="text-slate-400">Alíq.</span> <span className="text-slate-700">{aliqEfetivaLonga.toFixed(2)}%</span></div>
                              </div>
                            </div>
                          )}
                          {recResCurta > 0 && (
                            <div className="rounded border border-slate-200 bg-white px-3 py-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">Residencial curta</span>
                                <span className="text-xs font-bold text-slate-800">{formatMoney(ibsResCurta)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[11px]">
                                <div><span className="text-slate-400">Receita</span> <span className="text-slate-700 font-medium">{formatMoney(recResCurta)}</span></div>
                                <div><span className="text-slate-400">Redutor</span> <span className="text-slate-400">—</span></div>
                                <div><span className="text-slate-400">Base</span> <span className="text-slate-800 font-semibold">{formatMoney(recResCurta)}</span></div>
                                <div><span className="text-slate-400">Alíq.</span> <span className="text-slate-700">{aliqEfetivaShort.toFixed(2)}%</span></div>
                              </div>
                            </div>
                          )}
                          {recNaoResAnual > 0 && (
                            <div className="rounded border border-slate-200 bg-white px-3 py-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700">Não residencial</span>
                                <span className="text-xs font-bold text-slate-800">{formatMoney(ibsNaoRes)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[11px]">
                                <div><span className="text-slate-400">Receita</span> <span className="text-slate-700 font-medium">{formatMoney(recNaoResAnual)}</span></div>
                                <div><span className="text-slate-400">Redutor</span> <span className="text-slate-400">—</span></div>
                                <div><span className="text-slate-400">Base</span> <span className="text-slate-800 font-semibold">{formatMoney(recNaoResAnual)}</span></div>
                                <div><span className="text-slate-400">Alíq.</span> <span className="text-slate-700">{aliqEfetivaLonga.toFixed(2)}%</span></div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-baseline justify-between border-t border-slate-300 pt-1.5">
                            <span className="text-xs font-semibold text-slate-800">Total IBS/CBS</span>
                            <span className="text-xs font-bold text-slate-800">{formatMoney(ibsTotalTipos)}</span>
                          </div>
                        </div>

                        {baseDeduzida > 0 && (
                          <p className="font-sans text-[11px] text-slate-500 mt-1.5">
                            Redutor social Art. 260: {nImoveisArt260} imóvel(is) × {formatMoney(mensalRedutorSocialEfetivo)}/mês × 12 meses = {formatMoney(redutorAnual)}
                            {baseDeduzida < redutorAnual ? ' (limitado à receita de longa duração)' : ''}
                          </p>
                        )}

                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-3">Passo 3: Créditos sobre custos operacionais</p>
                        <p>{formatMoney(custos)} = <span className="text-emerald-700">{creditos > 0 ? `−${formatMoney(creditos)}` : formatMoney(creditos)}</span></p>

                        <p className="border-t border-slate-200 pt-1 mt-1 font-semibold">
                          = IBS/CBS líquido: <span className="text-slate-800">{formatMoney(liquido)}</span>
                        </p>
                      </>
                    ) : temRedutorSocial ? (
                      <>
                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 2: Base de cálculo (redutor social Art. 260)</p>
                        <p>Receita anual: <span className="text-slate-800">{formatMoney(ref.receita_bruta_total ?? 0)}</span></p>
                        <p>(−) Redutor social: {nImoveisArt260} imóvel(is) × {formatMoney(mensalRedutorSocialEfetivo)}/mês × 12 = <span className="text-emerald-700">−{formatMoney(baseDeduzida)}</span></p>
                        <p className="border-t border-slate-200 pt-1">= Base líquida: <span className="text-slate-800 font-semibold">{formatMoney(round2((ref.receita_bruta_total ?? 0) - baseDeduzida))}</span></p>

                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 3: IBS/CBS sobre base líquida</p>
                        <p>{formatMoney(round2((ref.receita_bruta_total ?? 0) - baseDeduzida))} × {aliqEfetivaLonga.toFixed(2)}% = <span className="text-slate-800 font-semibold">{formatMoney(debito)}</span></p>

                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 4: Créditos sobre custos operacionais</p>
                        <p>{formatMoney(custos)} × {aliqEfetivaLonga.toFixed(2)}% = <span className="text-emerald-700">{creditos > 0 ? `−${formatMoney(creditos)}` : formatMoney(creditos)}</span></p>

                        <p className="border-t border-slate-200 pt-1 mt-1 font-semibold">= IBS/CBS líquido: <span className="text-slate-800">{formatMoney(liquido)}</span></p>
                      </>
                    ) : (
                      <>
                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 2: IBS/CBS sobre receita</p>
                        <p>{formatMoney(ref.receita_bruta_total ?? 0)} × {aliqEfetivaLonga.toFixed(2)}% = <span className="text-slate-800">{formatMoney(debito)}</span></p>

                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">Passo 3: Créditos sobre custos operacionais</p>
                        <p>{formatMoney(custos)} × {aliqEfetivaLonga.toFixed(2)}% = <span className="text-emerald-700">{creditos > 0 ? `−${formatMoney(creditos)}` : formatMoney(creditos)}</span></p>

                        <p className="border-t border-slate-200 pt-1 mt-1 font-semibold">= IBS/CBS líquido: <span className="text-slate-800">{formatMoney(liquido)}</span></p>
                      </>
                    )}
                    
                    {temPassoIrpjCsll && (
                      <>
                        <p className="font-sans text-[10px] text-slate-500 uppercase tracking-wide mt-2">IRPJ + CSLL (lucro presumido)</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-lg font-semibold text-slate-800">Reforma LC 214/2025 – Pessoa Jurídica (IBS/CBS + IRPJ + CSLL) – Projeção 2027-2033</h3>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs shrink-0">
                <button
                  type="button"
                  className={`px-3 py-1.5 font-medium transition-colors ${projecaoModo === 'anual' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setProjecaoModo('anual')}
                >
                  Anual
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 font-medium transition-colors ${projecaoModo === 'mensal' ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setProjecaoModo('mensal')}
                >
                  Mensal
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {projecaoModo === 'mensal'
                ? 'Estimativa mensal da tributação (valores anuais ÷ 12) considerando a transição gradual do IBS (0,1% fixo em 2027/2028, progressivo de 2029 a 2033).'
                : 'Demonstração da tributação ano a ano considerando a transição gradual do IBS (0,1% fixo em 2027/2028, progressivo de 2029 a 2033).'}
            </p>
            {(() => {
              const receitaBase = result.cenarios.pf.receita_bruta_total;
              const receita = quantidadeImoveisResidenciais > 0 && quantidadeImoveisComerciais > 0 && (receitaLocacaoResidencialAnual > 0 || receitaLocacaoNaoResidencialAnual > 0)
                ? receitaLocacaoResidencialAnual + receitaLocacaoNaoResidencialAnual
                : receitaBase;
              const refReforma = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
              const custos = refReforma?.custos_operacionais_total ?? 0;
              const irpjCsll = (result.cenarios.pj.irpj ?? 0) + (result.cenarios.pj.irpj_adicional ?? 0) + (result.cenarios.pj.irpj_postergado ?? 0) + (result.cenarios.pj.csll ?? 0);
              const aliqNominalRef = (refReforma as { aliquota_nominal_ibs_cbs?: number })?.aliquota_nominal_ibs_cbs ?? 26.5;
              // Usar ibs_cbs_antes_redutor_social (bruto) para fatorReducao; fallback para ibs_cbs_sobre_receita
              const debitoRefBruto = (refReforma as { ibs_cbs_antes_redutor_social?: number })?.ibs_cbs_antes_redutor_social
                ?? (refReforma as { ibs_cbs_sobre_receita?: number })?.ibs_cbs_sobre_receita ?? 0;
              const fatorReducao =
                receita > 0 && aliqNominalRef > 0
                  ? debitoRefBruto / receita / (aliqNominalRef / 100)
                  : (100 - (perfilLocacao === 'hospedagem_temporada' ? 40 : 70)) / 100;

              const divisor = projecaoModo === 'mensal' ? 12 : 1;

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
                        <th className="py-2 px-3 text-right font-medium text-slate-600">CBS{projecaoModo === 'mensal' ? '/mês' : ''}</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">IBS{projecaoModo === 'mensal' ? '/mês' : ''}</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">IBS/CBS Líq.{projecaoModo === 'mensal' ? '/mês' : ''}</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-600">IRPJ+CSLL{projecaoModo === 'mensal' ? '/mês' : ''}</th>
                        <th className="py-2 px-3 text-right font-medium text-slate-700">Total{projecaoModo === 'mensal' ? '/mês' : ''}</th>
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
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(round2((receita * cbsEfetiva) / 100 / divisor))}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(round2((receita * ibsEfetivo) / 100 / divisor))}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(round2(ibsCbsLiquido / divisor))}</td>
                            <td className="py-2 px-3 text-right text-slate-600">{formatMoney(round2(irpjCsll / divisor))}</td>
                            <td className="py-2 px-3 text-right font-semibold text-brand">{formatMoney(round2(total / divisor))}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{aliqEfetiva.toFixed(2)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            <p className="text-xs text-slate-500 mt-3">
              {projecaoModo === 'mensal' ? 'Valores mensais estimados (total anual ÷ 12). ' : ''}
              {((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { redutor_diferenciado_short?: boolean })?.redutor_diferenciado_short || perfilLocacao === 'ambos'
                ? 'CBS e IBS com redutor da alíquota 70% (longa duração) e 40% (curta temporada — Art. 281), aplicados proporcionalmente · IRPJ/CSLL sobre lucro presumido.'
                : `CBS com redutor da alíquota ${perfilLocacao === 'hospedagem_temporada' ? '40%' : '70%'} · IBS progressivo conforme cronograma LC 214/2025 · IRPJ/CSLL sobre lucro presumido (presunção 16% ou 32%, conforme receita anual).`}
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
                    <td className="py-2 px-3 text-right text-slate-600">{pf.aliquota_efetiva_anual.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right text-slate-600">{pj.aliquota_efetiva.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right text-slate-600" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs
                        ? (pf.receita_bruta_total > 0 ? (totalRefPf / pf.receita_bruta_total) * 100 : 0).toFixed(2) + '%'
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{refPj?.aliquota_efetiva?.toFixed(2) ?? '0'}%</td>
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
          <div className="h-72 w-full min-w-0 print-imoveis-chart-trimestral">
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
                margin={{ top: 8, right: 12, left: 8, bottom: 52 }}
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
                <Legend
                  align="left"
                  verticalAlign="bottom"
                  layout="horizontal"
                  wrapperStyle={{
                    width: '100%',
                    maxWidth: '100%',
                    paddingLeft: 0,
                    left: 0,
                    fontSize: 11,
                    lineHeight: 1.35,
                  }}
                />
                <Bar dataKey="PF" name="PF — Carnê-Leão (IR)" fill="var(--color-brand, #0ea5e9)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PJ" name="PJ (IRPJ+CSLL+PIS+COFINS)" fill="#475569" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Memória de cálculo</h3>
          <div className="space-y-4 text-sm">
            {result.indices_lc214 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-800 mb-1">LC 214 / IPCA (valores usados nesta simulação)</p>
                <p>
                  Origem dos parâmetros:{' '}
                  <strong>
                    {result.indices_lc214.parametros_origem === 'calculado'
                      ? 'automático (IPCA)'
                      : result.indices_lc214.parametros_origem === 'manual_completo'
                        ? 'entrada manual (completa)'
                        : 'misto (manual + automático)'}
                  </strong>
                </p>
                <p>
                  Referência IPCA: {result.indices_lc214.mes_referencia_fim} · Fator acumulado:{' '}
                  {result.indices_lc214.fator_acumulado_desde_publicacao} · Fonte:{' '}
                  {result.indices_lc214.ipca_fonte === 'bcb_online'
                    ? 'BCB online'
                    : result.indices_lc214.ipca_fonte === 'cache'
                      ? 'cache API'
                      : 'contingência'}
                </p>
                <p>
                  Redutor social mensal efetivo: {formatMoney(result.indices_lc214.redutor_social_mensal_efetivo)} · Tetos PF:{' '}
                  {formatMoney(result.indices_lc214.limite_receita_pf_contribuinte)} /{' '}
                  {formatMoney(result.indices_lc214.limite_receita_pf_absoluto)}
                </p>
              </div>
            )}
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
                        <p>Imposto total: {formatMoney(d.imposto_total)} | Alíquota efetiva anual: {d.aliquota_efetiva_anual.toFixed(2)}%</p>
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
                      <p>Imposto total: {formatMoney(pf.imposto_total)} | Alíquota efetiva anual: {pf.aliquota_efetiva_anual.toFixed(2)}%</p>
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
                        <p>Alíquota nominal IBS/CBS: {d.aliquota_nominal_ibs_cbs}% | Redutor locação: {d.redutor_locacao_pct}% | Alíquota efetiva total: {d.aliquota_efetiva.toFixed(2)}%</p>
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
                      <p>Alíquota nominal: {ref.aliquota_nominal_ibs_cbs}% | Redutor locação: {ref.redutor_locacao_aplicado_pct}% | Alíquota efetiva: {ref.aliquota_efetiva.toFixed(2)}%</p>
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
          acoes.push(`Recomendação: considerar estruturação em PJ para esta atividade — economia estimada de ${formatMoney(economiaReais)} (${economiaPct.toFixed(0)}% sobre a carga em PF).`);
        } else if (!pjVence && economiaReais > 0) {
          acoes.push(`Manter como Pessoa Física é mais vantajoso neste nível de receita — você pagaria ${formatMoney(economiaReais)} a mais em impostos se optasse por PJ.`);
        }
        if (result.break_even) {
          acoes.push(`A partir de aproximadamente ${formatMoney(result.break_even.valor_mensal_break_even)}/mês de receita, PJ tende a ficar mais vantajosa que PF (break-even).`);
        }
        if (reformaPj?.aliquota_efetiva != null) {
          acoes.push(`Reforma LC 214/2025: IBS/CBS + IRPJ + CSLL (holding total ${reformaPj.aliquota_efetiva.toFixed(2)}%). Planeje revisão na vigência da reforma.`);
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
          <p className="text-sm text-slate-600 mt-1">
            Devem ser considerados para tanto os custos envolvidos na constituição da PJ (ITBI, honorários advocatícios e contábeis etc.).
          </p>
        </Card>
      )}

      {result?.analise_custos && (
        <Card className="mt-4 p-4 bg-slate-50">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Análise de custos e créditos</h3>
          <p className="text-sm text-slate-600">
            Créditos IBS/CBS: potencial {formatMoney(result.analise_custos.creditos_ibs_cbs.total_potencial)} | aproveitado {formatMoney(result.analise_custos.creditos_ibs_cbs.total_aproveitado)} | não aproveitado {formatMoney(result.analise_custos.creditos_ibs_cbs.nao_aproveitado)}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Margem operacional: antes dos tributos {result.analise_custos.indicadores.margem_operacional_antes_tributos.toFixed(2)}% | após tributos (PJ) {result.analise_custos.indicadores.margem_operacional_apos_tributos_pj.toFixed(2)}%
          </p>
          {result.analise_custos.categorias.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-1 pr-2">Categoria</th>
                    <th className="py-1 pr-2">Valor</th>
                    <th className="py-1 pr-2">Participação</th>
                    <th className="py-1 pr-2">Crédito potencial</th>
                  </tr>
                </thead>
                <tbody>
                  {result.analise_custos.categorias.slice(0, 8).map((c) => (
                    <tr key={c.categoria} className="border-t border-slate-200">
                      <td className="py-1 pr-2">{c.categoria}</td>
                      <td className="py-1 pr-2">{formatMoney(c.valor)}</td>
                      <td className="py-1 pr-2">{c.participacao_percentual.toFixed(2)}%</td>
                      <td className="py-1 pr-2">{formatMoney(c.credito_potencial)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

          </div>
          <ReportPrintFooter variant="printSheet" />
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
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={() =>
                      setDeleteSimulationModal({
                        id: s.id,
                        title: s.title || `Simulação ${s.ano}`,
                      })
                    }
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        isOpen={ipcaSeriesModalOpen}
        onClose={() => setIpcaSeriesModalOpen(false)}
        title="Tabela de índices IPCA (Série SGS 433)"
        size="xl"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Referência do cálculo LC 214: {ipcaPreview ? formatMonthRefPtBr(ipcaPreview.mes_referencia_fim) : '—'}.
          </p>
          {ipcaSeriesLoading && (
            <p className="text-sm text-slate-600">Carregando série do IPCA...</p>
          )}
          {!ipcaSeriesLoading && ipcaSeries && (
            <div className="max-h-[60vh] overflow-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-slate-200">Mês</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Variação mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {ipcaSeries.meses
                    .slice()
                    .reverse()
                    .map((row) => {
                      const isRef = row.mes_referencia === ipcaPreview?.mes_referencia_fim;
                      return (
                        <tr key={row.mes_referencia} className={isRef ? 'bg-amber-50/60' : ''}>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {formatMonthRefPtBr(row.mes_referencia)}
                            {isRef ? <span className="ml-2 text-[11px] text-amber-700 font-medium">referência LC214</span> : null}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100 text-right">
                            {formatPercentPtBr(row.variacao_mensal_pct, 2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-xs text-slate-500">
            Fonte: {ipcaSeries?.fonte === 'bcb_online'
              ? 'BCB online'
              : ipcaSeries?.fonte === 'cache'
                ? 'cache da API'
                : 'contingência embutida'}
            {ipcaSeries?.data_consulta_bcb ? ` · Última consulta: ${new Date(ipcaSeries.data_consulta_bcb).toLocaleString('pt-BR')}` : ''}
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setIpcaSeriesModalOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

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

      {/* Modal de preview antes de imprimir */}
      <Modal
        isOpen={showPrintPreview && !!result}
        onClose={() => setShowPrintPreview(false)}
        title="Visualizar relatório antes de imprimir"
        size="xl"
      >
        <div className="space-y-4">
          {!saveClientId && !viewingSimulation?.client_id && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do relatório (opcional)</label>
              <Input
                placeholder={
                  result
                    ? clientNameFromSelection
                      ? `Simulador imobiliário ${result.ano} – ${clientNameFromSelection}`
                      : `Simulador imobiliário ${result.ano}`
                    : 'Simulador imobiliário'
                }
                value={reportTitleName}
                onChange={(e) => setReportTitleName(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                O título é sugerido automaticamente (ano + cliente, se houver); ajuste se precisar. Também define o nome
                sugerido ao salvar o PDF no navegador.
              </p>
            </div>
          )}
          {!viewingSimulation?.client_id && !saveClientId && !clientId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do cliente (opcional)</label>
              <Input
                placeholder="Nome na capa do relatório"
                value={reportClientName}
                onChange={(e) => setReportClientName(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Preenchido automaticamente quando há cliente selecionado na simulação; pode editar para a capa do PDF.
              </p>
            </div>
          )}
          <div
            className="report-preview border border-slate-200 rounded-lg overflow-hidden bg-white"
            style={{ width: '210mm', maxWidth: '100%', maxHeight: '65vh', overflowY: 'auto' }}
          >
            <div className="report-preview-inner p-4">
              <ReportPrintHeader
                variant="previewModal"
                reportTitle={effectiveReportTitle}
                metaLine={`Emissão ${reportEmissionDateStr}`}
              />
              <ReportCoverSection
                variant="previewModal"
                title="Simulador Imobiliário – PF vs PJ vs Reforma LC 214/2025"
                clientName={effectiveClientName || undefined}
                subtitle={coverDocumentLabel || undefined}
                details={[
                  ...(result ? [{ label: 'Ano-base', value: String(result.ano) }] : []),
                  ...(result?.fluxo_caixa?.[0] ? [{ label: 'Receita (Carnê-Leão / LP)', value: formatMoney(result.fluxo_caixa[0].receita_total) }] : []),
                ]}
              />
              <div ref={printPreviewContentRef} className="report-preview-content" />
              <ReportPrintFooter variant="previewModal" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowPrintPreview(false)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={handleDoPrint}>
              Imprimir / Exportar PDF
            </Button>
          </div>
        </div>
      </Modal>

      {/* Botão flutuante — Exportar PDF (impressão) */}
      {result && (
        <button
          type="button"
          onClick={handleOpenPrintPreview}
          aria-label="Exportar resultado para PDF"
          title="Exportar para PDF"
          className="print:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand/40"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      )}

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={(client) => {
          loadClients();
          setClientId(client.id);
        }}
      />

      <PropertyFormModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        onSuccess={() => {
          if (clientId) {
            propertyService.list({ client_id: clientId, limit: 100 }).then((data) => {
              setImoveisList(data.properties);
              setImoveisSelectedIds(new Set(data.properties.map((p) => p.id)));
            });
          }
        }}
        clients={clients}
        defaultClientId={clientId}
      />

      {deleteSimulationModal && (
        <Modal
          isOpen={!!deleteSimulationModal}
          onClose={() => setDeleteSimulationModal(null)}
          title="Excluir simulação"
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              Tem certeza que deseja excluir a simulação &quot;{deleteSimulationModal.title}&quot;?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="tertiary" onClick={() => setDeleteSimulationModal(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => void handleDelete(deleteSimulationModal.id)}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deletePropertyModal && (
        <Modal
          isOpen={!!deletePropertyModal}
          onClose={() => {
            setDeletePropertyModal(null);
            setDeleteConfirmText('');
          }}
          title="Excluir imóvel"
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              Tem certeza que deseja excluir o imóvel &quot;{deletePropertyModal.identificador}&quot;? Esta ação não pode ser desfeita.
            </p>
            <p className="text-sm text-slate-500">
              Digite <strong>excluir</strong> para confirmar:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="excluir"
              className="font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="tertiary"
                onClick={() => {
                  setDeletePropertyModal(null);
                  setDeleteConfirmText('');
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteProperty}
                disabled={deleteConfirmText.toLowerCase() !== 'excluir'}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showTxModal && (
        <PropertyTransactionsModal
          isOpen={!!showTxModal}
          onClose={() => setShowTxModal(null)}
          propertyId={showTxModal.propertyId}
          identificador={showTxModal.identificador}
          ano={ano}
        />
      )}
    </Layout>
  );
}

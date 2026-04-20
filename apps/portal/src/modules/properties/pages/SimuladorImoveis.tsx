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
import { SIMULATION_KIND_LOCACAO_PF_PJ } from '@shared/core';
import { calcularTransicaoIBS, type TransicaoIBSResult } from '@shared/core';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Nome sugerido ao guardar PDF (Chrome usa `document.title` como nome do ficheiro). */
function sanitizePdfDocumentTitle(raw: string): string {
  const t = raw
    .replace(/[–—]/g, '-')           // en-dash / em-dash → hífen comum
    .replace(/[\\/:*?"<>|]+/g, '-')  // caracteres ilegais em nomes de arquivo
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return t || 'Simulador-imobiliario';
}

type MesFields = Omit<SimulateStandaloneMesInput, 'mes_referencia'>;
type SectionKey = 'receita' | 'despesa' | 'custo';

const CONDOMINIO_TOOLTIP =
  'Dedutível apenas quando pago pelo locador (proprietário). Se o encargo de condomínio for assumido pelo locatário, não integra as despesas dedutíveis da base de cálculo do Carnê-Leão (art. 47, Lei nº 7.739/1989).';

const ROWS: Array<{ label: string; field: keyof MesFields; section: SectionKey; tooltip?: string }> = [
  { label: 'Aluguel tradicional (longo prazo)', field: 'receita_aluguel_tradicional', section: 'receita' },
  { label: 'Aluguel curto prazo (Airbnb, temporada)', field: 'receita_aluguel_curto', section: 'receita' },
  { label: 'Estacionamento / vaga de garagem', field: 'receita_garagem', section: 'receita' },
  { label: 'Outras (lavanderia, depósito, etc.)', field: 'receita_outras', section: 'receita' },
  { label: 'IPTU Anual', field: 'iptu', section: 'despesa' },
  { label: 'Condomínio (pago pelo locador)', field: 'condominio', section: 'despesa', tooltip: CONDOMINIO_TOOLTIP },
  { label: 'Seguro do imóvel Anual', field: 'seguro_imovel', section: 'despesa' },
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
    subtitle: 'Valores mensais auferidos (aluguéis e diárias)',
    icon: (
      <svg className="w-5 h-5 text-[#0c326f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    bg: 'bg-white',
    border: 'border-slate-200',
    headerBg: 'bg-slate-50 border-slate-200 border-b',
  },
  despesa: {
    title: 'Despesas dedutíveis (PF)',
    subtitle: 'Conforme Lei nº 7.739/1989',
    icon: (
      <svg className="w-5 h-5 text-[#0c326f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    bg: 'bg-white',
    border: 'border-slate-200',
    headerBg: 'bg-slate-50 border-slate-200 border-b',
  },
  custo: {
    title: 'Custos operacionais',
    subtitle: 'Créditos IBS/CBS (Reforma LC 214)',
    icon: (
      <svg className="w-5 h-5 text-[#0c326f]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    bg: 'bg-white',
    border: 'border-slate-200',
    headerBg: 'bg-slate-50 border-slate-200 border-b',
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
    // IPTU e Seguro são anuais: valor total concentrado em Janeiro, zero nos demais meses
    condominio: 380,
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
    iptu: i === 0 ? 5400 : 0,          // R$ 450/mês × 12 = R$ 5.400 anuais em Janeiro
    seguro_imovel: i === 0 ? 1440 : 0, // R$ 120/mês × 12 = R$ 1.440 anuais em Janeiro
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

const WIZARD_STEPS = [
  {
    step: 1 as const,
    label: 'Cliente e imóveis',
    description: 'Selecione o cliente e cadastre os imóveis que fazem parte da simulação',
  },
  {
    step: 2 as const,
    label: 'Parâmetros e meses',
    description: 'Ajuste os valores mensais de receitas, despesas, custos e as opções da Reforma LC 214/2025',
  },
  {
    step: 3 as const,
    label: 'Resultado',
    description: 'Comparativo PF × PJ × Reforma LC 214/2025 — exporte para PDF quando estiver pronto',
  },
] as const;

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
  const wizardStep2TopRef = useRef<HTMLDivElement>(null);
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
  /** 1 = imóveis; 2 = planilha e parâmetros; 3 = resultado. */
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [isApplyingSimulacao, setIsApplyingSimulacao] = useState(false);
  /** Chave da última seleção de imóveis aplicada à etapa 2 (impede recarregar se a seleção não mudou). */
  const [lastAppliedKey, setLastAppliedKey] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

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

  const CAMPOS_ANUAIS = new Set<keyof MesFields>(['iptu', 'seguro_imovel']);

  const aplicarRateioAnual = useCallback(
    (field: keyof MesFields) => {
      const val = round2(valoresAnuais[field] ?? 0);
      if (val <= 0) return;
      if (CAMPOS_ANUAIS.has(field)) {
        setMeses((prev) =>
          prev.map((m, i) => ({
            ...m,
            [field]: i === 0 ? val : 0,
          }))
        );
        success('Valor anual concentrado em Janeiro. Ajuste manualmente se necessário.');
      } else {
        const valorMensal = round2(val / 12);
        setMeses((prev) =>
          prev.map((m) => ({
            ...m,
            [field]: valorMensal,
          }))
        );
        success('Valor anual rateado nos 12 meses. Ajuste manualmente se necessário.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setWizardStep(2);
    success('Demo carregada: predominância Airbnb, ~R$ 140k/ano. Revise os parâmetros e clique em Próximo.');
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
    setWizardStep(2);
    success('Demo carregada: cenário de referência IBS/CBS (2 res. curta, 1 res. longa, 2 não res.). Revise e clique em Próximo.');
  }, [anoAtual, success]);

  /** Limpa todo o estado da simulação voltando ao passo 1 com valores iniciais. */
  const handleClearSimulation = useCallback(() => {
    setMeses(Array.from({ length: 12 }, (_, i) => emptyMes(anoAtual, i)));
    setAno(anoAtual);
    setResult(null);
    setPerfilLocacao('residencial_comum');
    setContratoAntes16012025(false);
    setAliquotaPlenaIBS(19);
    setAliquotaCBS(9);
    setAnoReferenciaReforma(2033);
    setQuantidadeImoveisResidenciais(1);
    setQuantidadeImoveisResidenciaisLonga(1);
    setQuantidadeImoveisComerciais(0);
    setReceitaLocacaoResidencialAnual(0);
    setReceitaLocacaoNaoResidencialAnual(0);
    setModoReceitaAnual(false);
    setAluguelAnualTradicional(0);
    setAluguelAnualCurto(0);
    setModoDespesaAnual(false);
    setDespesaAnualTotal(0);
    setModoCustoAnual(false);
    setCustoAnualTotal(0);
    setValoresAnuais({});
    setCustosOperacionaisAberto(false);
    setLc214AvancadoAberto(false);
    setLc214ManualLim240('');
    setLc214ManualLim288('');
    setLc214ManualRedutorMensal('');
    setShowLc214ContaExplicita(false);
    setCoverageWarning(null);
    setEditingSimulationId(null);
    setLastAppliedKey(null);
    setImoveisSelectedIds(new Set());
    setImoveisDraftSelecionados([]);
    setWizardStep(1);
    setShowClearModal(false);
    success('Simulação limpa. Configure os imóveis e avance para a planilha.');
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
    clone.querySelectorAll('details').forEach((d) => d.remove());
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
        propertyService.listSimulations({ page: 1, limit: 20, simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ }),
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
    if (result && wizardStep === 3) {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result, wizardStep]);

  /** Inicializa saveClientId com clientId quando disponível (para Salvar no histórico). */
  useEffect(() => {
    if (clientId && !saveClientId) {
      setSaveClientId(clientId);
    }
  }, [clientId, saveClientId]);

  useEffect(() => {
    // Resetar dados da simulação ao trocar de cliente
    setMeses(Array.from({ length: 12 }, (_, i) => emptyMes(anoAtual, i)));
    setResult(null);
    setWizardStep(1);
    setLastAppliedKey(null);
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

    if (draftRows.length > 0) {
      setCoverageWarning(
        `${draftRows.length} linha(s) não salva(s) com aluguel foi(ram) incluída(s) automaticamente na simulação.`
      );
    } else {
      setCoverageWarning(null);
    }
    success('Dados dos imóveis aplicados à planilha. Ajuste se necessário e clique em Próximo para calcular o resultado.');
    setWizardStep(2);
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
      wizardStep2TopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        setWizardStep(3);
        success('Simulação atualizada.');
        const simRes = await propertyService.listSimulations({ page: 1, limit: 20, simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ });
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
      setWizardStep(3);
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
      setWizardStep(2);
      success('Simulação carregada. Ajuste os dados e clique em Próximo para atualizar o resultado.');
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
      setWizardStep(3);
      success('Nova simulação criada com sucesso!');
      const listRes = await propertyService.listSimulations({ page: 1, limit: 20, simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ });
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
      const listRes = await propertyService.listSimulations({ page: 1, limit: 20, simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ });
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
      <div className="mb-8 border-b border-slate-200 bg-white -mx-6 px-6 py-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#0c326f] uppercase tracking-tighter">
              Simulador Imobiliário
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              PF vs PJ vs Reforma LC 214/2025
            </p>
          </div>
          
          {/* Institutional Stepper */}
          <div className="flex items-center gap-2" role="list" aria-label="Progresso da simulação">
            {WIZARD_STEPS.map((s, i) => {
              const isCompleted = wizardStep > s.step;
              const isActive = wizardStep === s.step;
              
              return (
                <div key={s.step} className="flex items-center">
                  <div className="flex flex-col items-center relative group">
                    <button
                      type="button"
                      disabled={!isCompleted && !isActive}
                      onClick={() => {
                        if (isCompleted) {
                          setWizardStep(s.step);
                          if (s.step < 3) setResult(null);
                        }
                      }}
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300
                        ${isActive 
                          ? 'bg-[#0c326f] text-white ring-4 ring-[#0c326f]/20 scale-110' 
                          : isCompleted 
                            ? 'bg-[#1351b4] text-white hover:bg-[#0c326f] cursor-pointer' 
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'}
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : s.step}
                    </button>
                    <span className={`
                      absolute -bottom-6 whitespace-nowrap text-[10px] font-bold uppercase tracking-tighter transition-colors duration-300
                      ${isActive ? 'text-[#0c326f]' : isCompleted ? 'text-[#1351b4]' : 'text-slate-400'}
                    `}>
                      {s.label}
                    </span>
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={`h-0.5 w-12 sm:w-20 mx-2 rounded transition-all duration-500 ${isCompleted ? 'bg-[#1351b4]' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Step Description Banner */}
        <div className="mt-10 bg-slate-50 border border-slate-200 rounded-md px-4 py-3 flex items-center gap-3">
          <div className="bg-[#0c326f] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
            Passo {wizardStep}
          </div>
          <p className="text-sm font-medium text-slate-700">
            {WIZARD_STEPS[wizardStep - 1].description}
          </p>
        </div>
      </div>
      {moduleBlockedMessage && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4">
          <p className="text-amber-900 text-sm font-medium">{moduleBlockedMessage}</p>
        </Card>
      )}

      <div className={wizardStep !== 1 ? 'hidden' : 'space-y-6'}>
        {/* Cliente da simulação — etapa 1 */}
        <div ref={clientCardRef}>
        <Card className="card-gov card-gov-accent px-6 py-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-[#0c326f]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0c326f]">
              Identificação do Cliente
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[300px] max-w-md">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">
                Selecione o titular para simulação *
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded px-4 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#1351b4]/20 focus:border-[#1351b4] outline-none transition-all shadow-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isLoadingClients}
              >
                <option value="">{isLoadingClients ? 'Carregando base de clientes...' : 'Escolha um cliente cadastrado'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="!border-[#1351b4] !text-[#1351b4] hover:!bg-[#1351b4]/5 font-bold text-xs uppercase"
              onClick={() => setShowClientModal(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Cliente
            </Button>
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
            // Detectar se a seleção não mudou desde a última vez que os dados foram carregados.
            // Se for a mesma, apenas navegar para o step 2 sem recarregar (preserva edições da planilha).
            const newKey =
              [...propertyIds].sort().join(',') + '||' + draftRows.map((r) => r.rowId).sort().join(',');
            if (lastAppliedKey !== null && newKey === lastAppliedKey) {
              setWizardStep(2);
              setTimeout(
                () => wizardStep2TopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                50
              );
              return;
            }
            setIsApplyingSimulacao(true);
            try {
              await handleIniciarSimulacao({ propertyIds, draftRows });
              setLastAppliedKey(newKey);
            } finally {
              setIsApplyingSimulacao(false);
            }
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
          simulationLoadButtonPlacement="footer"
          simulationLoadButtonLabel="Avançar"
          simulationLoadButtonLoading={isApplyingSimulacao}
        />
        <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500 text-center max-w-lg">
            Não vai usar a grade de imóveis? Avance para a planilha mensal vazia e preencha tudo manualmente.
          </p>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => {
              setResult(null);
              setWizardStep(2);
              setTimeout(() => wizardStep2TopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }}
          >
            Ir para parâmetros e planilha (sem carregar imóveis)
          </Button>
        </div>
      </div>

      {wizardStep === 2 && (
      <form onSubmit={handleSimulate} className="space-y-6">
        <div ref={wizardStep2TopRef} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#0c326f] flex items-center justify-center text-white shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter text-[#0c326f]">Parâmetros e Planilha Mensal</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Configuração tributária e fluxo de caixa de 12 meses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="!border-[#1351b4] !text-[#1351b4] hover:!bg-[#1351b4]/5 font-bold text-xs uppercase"
              onClick={() => {
                setWizardStep(1);
                setResult(null);
              }}
            >
              ← Voltar aos imóveis
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!border-red-500 !text-red-600 hover:!bg-red-50 font-bold text-xs uppercase"
              onClick={() => setShowClearModal(true)}
            >
              Limpar simulação
            </Button>
          </div>
        </div>
        {coverageWarning && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            {coverageWarning}
          </p>
        )}

        <Card className="card-gov card-gov-accent px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Ano-Base da Simulação</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2023}
                    max={2030}
                    value={ano}
                    onChange={(e) => updateAno(Number(e.target.value))}
                    className="w-32 !py-2.5 text-center font-black text-lg text-[#0c326f] rounded border-slate-300 shadow-sm focus:border-[#1351b4] focus:ring-[#1351b4]/20"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Calendário</span>
                </div>
              </div>
            </div>
            {editingSimulationId && (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" className="!border-[#1351b4] !text-[#1351b4] font-bold text-xs uppercase" size="sm" onClick={handleSaveAsNew} disabled={loading}>
                  Salvar como Novo
                </Button>
                <Button type="button" variant="tertiary" className="font-bold text-xs uppercase text-slate-500" size="sm" onClick={handleCancelEdit} disabled={loading}>
                  Cancelar Edição
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Opções da Reforma LC 214/2025 */}
        <Card className="card-gov border-l-4 border-amber-400 px-6 py-6 bg-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-amber-50 rounded-full opacity-50" />
          
          <div className="flex items-center gap-2 mb-5 relative z-10">
            <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0c326f]">Opções da Reforma LC 214/2025 (IBS/CBS)</h3>
          </div>

          {ipcaPreview && (
            <div
              className="mb-6 rounded-lg border-2 border-amber-100 bg-amber-50/30 px-5 py-4 relative z-10"
              role="region"
              aria-label="Parâmetros LC 214 indexados pelo IPCA"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-black uppercase text-[#0c326f] tracking-tight">
                  IPCA / LC 214 — Ano-calendário {ano}
                </p>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Ref: {formatMonthRefPtBr(ipcaPreview.mes_referencia_fim)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                <div className="rounded border border-white bg-white/60 p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">IPCA Mensal Recente</p>
                  <p className="text-xl font-black text-[#0c326f]">
                    {ipcaSerieMaisRecente ? formatPercentPtBr(ipcaSerieMaisRecente.variacao_mensal_pct, 2) : '—'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    {ipcaSerieMaisRecente ? formatMonthRefPtBr(ipcaSerieMaisRecente.mes_referencia) : 'Sem dados'}
                  </p>
                </div>

                <div className="rounded border border-white bg-white/60 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Fator de Correção (x)</p>
                    <button
                      type="button"
                      onClick={() => setShowLc214ContaExplicita((v) => !v)}
                      className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[8px] font-black hover:bg-slate-300"
                    >i</button>
                  </div>
                  <p className="text-xl font-black text-[#0c326f]">
                    {formatFactorPtBr(ipcaPreview.fator_acumulado_desde_publicacao, 6)}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase">
                    Variação: +{formatPercentPtBr((ipcaPreview.fator_acumulado_desde_publicacao - 1) * 100, 4)}
                  </p>
                </div>

                <div className="rounded border border-white bg-white/60 p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Redutor Social Efetivo</p>
                  <p className="text-xl font-black text-[#1351b4]">
                    {formatMoney(ipcaPreview.redutor_social_mensal_efetivo)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    {lc214ManualRedutorMensal.trim() ? 'Informado Manualmente' : 'Correção IPCA Automática'}
                  </p>
                </div>
              </div>

              {showLc214ContaExplicita && lc214MesesAplicados.length > 0 && (
                <div className="mt-4 rounded border border-amber-200 bg-amber-50/50 p-3 relative">
                  <p className="text-[9px] font-black uppercase text-amber-800 tracking-widest mb-1.5">Memória de Cálculo - Fator Acumulado</p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-600 leading-relaxed italic">
                      Meses considerados: {lc214MesesLista}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                      {lc214ContaExplicita} = <span className="text-[#0c326f]">{formatFactorPtBr(ipcaPreview.fator_acumulado_desde_publicacao, 6)}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 rounded border border-white shadow-sm bg-white/40">
                 <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2">Limites de Isenção PF (Art. 288 / 240)</p>
                 <div className="flex items-center gap-8">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Individual</span>
                      <span className="text-sm font-black text-slate-700">{formatMoney(ipcaPreview.limite_receita_pf_contribuinte)}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Grupo / Absoluto</span>
                      <span className="text-sm font-black text-slate-700">{formatMoney(ipcaPreview.limite_receita_pf_absoluto)}</span>
                    </div>
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
          <div className="flex flex-col gap-6 relative z-10">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={contratoAntes16012025}
                  onChange={(e) => setContratoAntes16012025(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1351b4] focus:ring-[#1351b4]/20 transition-all"
                />
                <span className="text-xs font-black uppercase text-slate-700">Contrato firmado antes de 16/01/2025? (Regime de Transição Art. 487)</span>
              </label>

              <div className={`grid grid-cols-1 ${perfilLocacao === 'ambos' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
                {perfilLocacao === 'ambos' ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500">Residenciais Longa Duração</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={quantidadeImoveisResidenciaisLonga}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setQuantidadeImoveisResidenciaisLonga(v);
                            setQuantidadeImoveisResidenciais(v + Math.max(0, quantidadeImoveisResidenciais - quantidadeImoveisResidenciaisLonga));
                          }}
                          className="w-24 !py-2 font-bold text-center border-slate-300"
                        />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Com Redutor Social</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500">Residenciais Curta Temporada</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={Math.max(0, quantidadeImoveisResidenciais - quantidadeImoveisResidenciaisLonga)}
                          onChange={(e) => {
                            const curta = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setQuantidadeImoveisResidenciais(quantidadeImoveisResidenciaisLonga + curta);
                          }}
                          className="w-24 !py-2 font-bold text-center border-slate-300"
                        />
                        <span className="text-[10px] font-bold text-amber-600 uppercase">Art. 253 / 278</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500">Imóveis Residenciais</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={quantidadeImoveisResidenciais}
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setQuantidadeImoveisResidenciais(v);
                          if (perfilLocacao === 'residencial_comum') setQuantidadeImoveisResidenciaisLonga(v);
                        }}
                        className="w-24 !py-2 font-bold text-center border-slate-300"
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {perfilLocacao === 'residencial_comum' ? 'Regime Comum' : 'Hospedagem'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">Imóveis Comerciais / Outros</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={quantidadeImoveisComerciais}
                      onChange={(e) => setQuantidadeImoveisComerciais(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-24 !py-2 font-bold text-center border-slate-300"
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sem Redutor</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Perfil de Locação Predominante</label>
                <select
                  value={perfilLocacao}
                  onChange={(e) => setPerfilLocacao(e.target.value as PerfilLocacaoReforma)}
                  className="w-full bg-white border border-slate-300 rounded px-4 py-2.5 text-sm font-bold text-[#0c326f] focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] outline-none shadow-sm transition-all"
                >
                  <option value="residencial_comum">Residencial Longa Duração (Redutor 70%)</option>
                  <option value="hospedagem_temporada">Curta Temporada / Hospedagem (Redutor 40%)</option>
                  <option value="ambos">Misto (Longa Duração e Temporada)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Referência do Cenário Reforma</label>
                <select
                  value={anoReferenciaReforma}
                  onChange={(e) => setAnoReferenciaReforma(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded px-4 py-2.5 text-sm font-bold text-[#0c326f] focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] outline-none shadow-sm transition-all"
                >
                  <option value={2027}>Bienal 2027 / 2028</option>
                  <option value={2029}>Cenário 2029</option>
                  <option value={2031}>Cenário 2031</option>
                  <option value={2033}>Projeção 2033 (Regime Pleno)</option>
                </select>
              </div>
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
        <Card className="card-gov border-l-4 border-violet-400 px-6 py-6 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded bg-violet-100 flex items-center justify-center text-violet-700 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0c326f]">Transição Reforma Tributária - IBS + CBS</h3>
          </div>

          <div className="p-4 rounded border border-violet-100 bg-violet-50/30 mb-6 font-bold text-[#4c1d95] text-xs uppercase tracking-tight">
            Valores estimados conforme EC 132/2023. Alíquotas sujeitas a regulamentação definitiva.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Alíquota IBS Referência (%)</label>
              <Input
                type="number"
                step={0.1}
                value={aliquotaPlenaIBS}
                onChange={(e) => setAliquotaPlenaIBS(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="!py-2.5 font-bold text-[#0c326f] border-slate-300"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Alíquota CBS Referência (%)</label>
              <Input
                type="number"
                step={0.1}
                value={aliquotaCBS}
                onChange={(e) => setAliquotaCBS(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="!py-2.5 font-bold text-[#0c326f] border-slate-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded shadow-sm">
            <table className="table-gov !text-[11px]">
              <thead>
                <tr>
                  <th className="px-4">Ano-Calendário</th>
                  <th className="text-right px-4">IBS (% alíquota)</th>
                  <th className="text-right px-4">ICMS/ISS Residual</th>
                  <th className="text-right px-4">Alíquota Efetiva IBS</th>
                </tr>
              </thead>
              <tbody>
                {transicaoIBSResult.map((r: TransicaoIBSResult) => (
                  <tr key={r.ano}>
                    <td className="px-4 font-bold text-[#0c326f]">{r.ano}</td>
                    <td className="text-right px-4">{r.ibsFixo ? 'Fixo 0,05%' : `${r.ibsPct.toFixed(2)}%`}</td>
                    <td className="text-right px-4">{r.ibsFixo ? 'Precedente' : `${r.icmsIssPct.toFixed(2)}%`}</td>
                    <td className="text-right px-4 font-black text-[#1351b4]">{r.aliquotaEfetivaIBS.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Preenchimento rápido – Rateio anual */}
        <Card className="card-gov card-gov-accent px-6 py-6 border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded bg-[#0c326f] flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#0c326f]">Preenchimento Rápido – Valores Anuais</h3>
          </div>

          <div className="p-4 rounded border border-blue-100 bg-blue-50/30 mb-6 text-xs text-[#0c326f] leading-relaxed relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1351b4] rounded-l" />
            A <strong>Grade de Meses</strong> é a base para todos os cenários. Use o "Aplicar Rateio" para distribuir totais anuais nos 12 meses de forma automática.
          </div>

          <div className="space-y-6">
            {/* Bloco Receitas */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm transition-all hover:border-[#1351b4]/30">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={modoReceitaAnual}
                  onChange={(e) => setModoReceitaAnual(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1351b4] focus:ring-[#1351b4]/20"
                />
                <span className="text-xs font-black uppercase text-slate-700 tracking-tight">Distribuição Igualitária – Receitas de Aluguéis</span>
              </label>
              {modoReceitaAnual && (
                <div className="flex flex-wrap items-end gap-6 mt-2 ml-7">
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tradicional Anual (Longa)</label>
                    <MoneyInput
                      value={aluguelAnualTradicional}
                      onChange={setAluguelAnualTradicional}
                      className="!py-2 font-bold text-[#0c326f] border-slate-300"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Curto Prazo Anual (Temporada)</label>
                    <MoneyInput
                      value={aluguelAnualCurto}
                      onChange={setAluguelAnualCurto}
                      className="!py-2 font-bold text-[#0c326f] border-slate-300"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="primary" 
                    className="!bg-[#1351b4] hover:!bg-[#0c326f] font-black text-[10px] uppercase tracking-widest h-10 px-6 shadow-sm transform active:scale-95 transition-all"
                    onClick={aplicarAluguelAnual}
                  >
                    Aplicar Rateio
                  </Button>
                </div>
              )}
            </div>

            {/* Bloco Despesas dedutíveis */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm transition-all hover:border-[#1351b4]/30">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={modoDespesaAnual}
                  onChange={(e) => setModoDespesaAnual(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1351b4] focus:ring-[#1351b4]/20"
                />
                <span className="text-xs font-black uppercase text-slate-700 tracking-tight">Distribuição Igualitária – Despesas Dedutíveis</span>
              </label>
              {modoDespesaAnual && (
                <div className="flex flex-wrap items-end gap-6 mt-2 ml-7">
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Total Despesas Anuais</label>
                    <MoneyInput
                      value={despesaAnualTotal}
                      onChange={setDespesaAnualTotal}
                      className="!py-2 font-bold text-[#0c326f] border-slate-300"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="primary" 
                    className="!bg-[#1351b4] hover:!bg-[#0c326f] font-black text-[10px] uppercase tracking-widest h-10 px-6 shadow-sm transform active:scale-95 transition-all"
                    onClick={aplicarDespesaAnual}
                  >
                    Aplicar Rateio
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {(['receita', 'despesa'] as SectionKey[]).map((sectionKey) => {
          const config = SECTION_CONFIG[sectionKey];
          const sectionRows = ROWS.filter((r) => r.section === sectionKey);
          if (sectionRows.length === 0) return null;
          return (
            <Card
              key={sectionKey}
              className={`card-gov overflow-hidden border-2 transition-all duration-300 shadow-md ${
                showLoadedHighlight ? 'ring-2 ring-[#1351b4]/40 shadow-xl scale-[1.002]' : ''
              } ${config.border} ${config.bg}`}
            >
              <div className={`flex items-center gap-4 px-6 py-5 border-b shadow-sm ${config.headerBg}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded bg-white text-[#0c326f] shadow-md border border-slate-100">
                  {config.icon}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#0c326f]">{config.title}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{config.subtitle}</p>
                </div>
              </div>
              <div
                className="overflow-x-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
                onKeyDownCapture={spreadsheetTableNavCapture}
              >
                <table className="table-gov w-full min-w-[2800px]">
                  <thead>
                    <tr className="bg-[#0c326f]">
                      <th className="sticky left-0 z-20 min-w-[300px] py-4 px-4 text-left font-black uppercase text-[10px] text-white bg-[#0c326f] tracking-widest border-r border-[#1351b4]/30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.3)]">
                        Descrição do Item
                      </th>
                      <th className="min-w-[240px] py-4 px-4 text-center font-black uppercase text-[10px] text-white tracking-widest bg-[#0c326f]/90">
                        Total Ano
                      </th>
                      {MESES.map((nome, i) => (
                        <th key={i} className="min-w-[200px] py-4 px-4 text-center font-black uppercase text-[10px] text-white tracking-widest opacity-90 border-l border-white/10 italic">
                          {nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {sectionRows.map((row, idx) => (
                      <tr key={row.field} className={`group transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className={`sticky left-0 z-10 py-3 px-4 bg-inherit border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-[#eef2f6]`}>
                          <div className="flex items-center gap-2">
                             <span className="text-[11px] font-black text-[#0c326f] uppercase tracking-tight leading-tight">{row.label}</span>
                             {row.tooltip && (
                               <span
                                 title={row.tooltip}
                                 className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 text-[8px] font-black cursor-help hover:bg-blue-100 hover:text-blue-600 transition-all"
                               >?</span>
                             )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 min-w-[240px] bg-inherit">
                          <div className="flex items-center gap-2">
                            <MoneyInput
                              value={valoresAnuais[row.field] ?? 0}
                              onChange={(v) => setValoresAnuais((prev) => ({ ...prev, [row.field]: v }))}
                              className="!py-2 font-black text-[#0c326f] !bg-white/80 border-slate-200 focus:border-[#1351b4] text-xs flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => aplicarRateioAnual(row.field)}
                              className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-[#1351b4] hover:text-white transition-all shadow-sm"
                              title="Distribuir valor nos meses"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </button>
                          </div>
                        </td>
                        {meses.map((m, i) => (
                          <td key={i} className={`py-2.5 px-3 min-w-[200px] bg-inherit border-l border-slate-100/50`}>
                            <MoneyInput
                              value={(m[row.field] as number) ?? 0}
                              onChange={(v) => updateMes(i, row.field, v)}
                              className={`!py-2 font-bold text-slate-700 !bg-white focus:border-[#1351b4] focus:ring-[#1351b4]/10 text-xs transition-all ${
                                showLoadedHighlight ? 'animate-pulse bg-amber-50 border-amber-300' : ''
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

        {/* Custos operacionais: opcional, recolhível; */}
        <details
          open={custosOperacionaisAberto}
          onToggle={(e) => setCustosOperacionaisAberto(e.currentTarget.open)}
          className="rounded-xl border-2 border-amber-200 bg-white overflow-hidden transition-all duration-300 shadow-sm"
        >
          <summary className="cursor-pointer list-none px-6 py-4 bg-amber-50/50 border-b border-amber-100 flex items-center gap-4 group">
            <span className="text-amber-400 group-hover:text-amber-600 transition-colors" aria-hidden>
              {custosOperacionaisAberto ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              )}
            </span>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-amber-600 shadow-sm border border-amber-100">
              {SECTION_CONFIG.custo.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-black uppercase tracking-tight text-[#0c326f]">{SECTION_CONFIG.custo.title} <span className="ml-2 font-bold text-slate-400 normal-case">(Opcional)</span></h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{SECTION_CONFIG.custo.subtitle}</p>
            </div>
          </summary>
          
          <div className="p-6 space-y-6">
            <div className="p-4 rounded border border-amber-100 bg-amber-50/20 text-xs text-amber-900 leading-relaxed italic">
              {CUSTOS_OPERACIONAIS_INFO}
            </div>

            <div className="p-5 rounded-lg border-2 border-slate-100 bg-slate-50/30">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={modoCustoAnual}
                  onChange={(e) => setModoCustoAnual(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1351b4] focus:ring-[#1351b4]/20"
                />
                <span className="text-xs font-black uppercase text-slate-700 tracking-tight tracking-tight">Distribuição Igualitária – Créditos IBS/CBS</span>
              </label>
              {modoCustoAnual && (
                <div className="flex flex-wrap items-end gap-6 mt-2 ml-7">
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Total Créditos Anuais</label>
                    <MoneyInput
                      value={custoAnualTotal}
                      onChange={setCustoAnualTotal}
                      className="!py-2 font-bold text-[#0c326f] border-slate-300"
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="primary" 
                    className="!bg-[#1351b4] hover:!bg-[#0c326f] font-black text-[10px] uppercase tracking-widest h-10 px-6"
                    onClick={aplicarCustoAnual}
                  >
                    Aplicar Rateio
                  </Button>
                </div>
              )}
            </div>

            {(() => {
              const sectionKey: SectionKey = 'custo';
              const sectionRows = ROWS.filter((r) => r.section === sectionKey);
              return (
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto" onKeyDownCapture={spreadsheetTableNavCapture}>
                    <table className="table-gov w-full min-w-[2800px]">
                      <thead>
                        <tr className="bg-[#0c326f]">
                          <th className="sticky left-0 z-20 min-w-[300px] py-4 px-4 text-left font-black uppercase text-[10px] text-white bg-[#0c326f] tracking-widest border-r border-[#1351b4]/30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.3)]">
                            Descrição do Item
                          </th>
                          <th className="min-w-[240px] py-4 px-4 text-center font-black uppercase text-[10px] text-white tracking-widest bg-[#0c326f]/90">
                            Total Ano
                          </th>
                          {MESES.map((nome, i) => (
                            <th key={i} className="min-w-[200px] py-4 px-4 text-center font-black uppercase text-[10px] text-white tracking-widest opacity-90 border-l border-white/10 italic">
                              {nome}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {sectionRows.map((row, idx) => (
                          <tr key={row.field} className={`group transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                            <td className="sticky left-0 z-10 py-3 px-4 bg-inherit border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] group-hover:bg-[#eef2f6]">
                              <span className="text-[11px] font-black text-[#0c326f] uppercase tracking-tight">{row.label}</span>
                            </td>
                            <td className="py-2.5 px-3 min-w-[240px] bg-inherit">
                              <div className="flex items-center gap-2">
                                <MoneyInput
                                  value={valoresAnuais[row.field] ?? 0}
                                  onChange={(v) => setValoresAnuais((prev) => ({ ...prev, [row.field]: v }))}
                                  className="!py-2 font-black text-[#0c326f] !bg-white/80 border-slate-200 text-xs flex-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => aplicarRateioAnual(row.field)}
                                  className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-500 hover:bg-[#1351b4] hover:text-white transition-all shadow-sm"
                                  title="Distribuir valor nos meses"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </button>
                              </div>
                            </td>
                            {meses.map((m, i) => (
                              <td key={i} className="py-2.5 px-3 min-w-[200px] bg-inherit border-l border-slate-100/50">
                                <MoneyInput
                                  value={(m[row.field] as number) ?? 0}
                                  onChange={(v) => updateMes(i, row.field, v)}
                                  className="!py-2 font-bold text-slate-700 !bg-white border-slate-200 text-xs"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </details>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t font-black uppercase text-xs tracking-widest border-[#eef2f6]">
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading} 
            className="!bg-[#1351b4] hover:!bg-[#0c326f] shadow-lg font-black text-sm uppercase tracking-widest px-12 py-7 h-auto transition-all transform active:scale-95 group"
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Processando...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                {editingSimulationId ? 'Atualizar Resultados' : 'Calcular Simulação Completa'}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
            )}
          </Button>
        </div>
      </form>
      )}

      {wizardStep === 3 && result && (
        <>
        <div className="mt-8 print:hidden">
          <Card className="card-gov border-2 border-[#1351b4] bg-white px-6 py-5 mb-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-[#eef2f6] -mr-8 -skew-x-12 opacity-50" />
            
            <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded bg-[#0c326f] flex items-center justify-center text-white shadow-md">
                   <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-sm font-black uppercase text-[#0c326f] tracking-tighter">Simulação Concluída com Sucesso</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Os resultados comparativos para o ano {ano} estão disponíveis abaixo.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setWizardStep(2);
                    setResult(null);
                  }}
                  className="!border-[#1351b4] !text-[#1351b4] hover:!bg-[#1351b4]/5 font-black text-xs uppercase"
                >
                  ← Ajustar Parâmetros
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleOpenPrintPreview}
                  className="!bg-[#1351b4] hover:!bg-[#0c326f] shadow-lg font-black text-xs uppercase tracking-widest inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar PDF
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <div id="simulador-imoveis-print-wrapper" ref={printWrapperRef} className="report-print-wrapper mt-0">
          {/*
           * Layout de impressão baseado em <table>:
           * - <thead> se repete nativamente em cada página do Chrome (sem position:fixed).
           * - <tfoot> aparece no rodapé da última página.
           * - Na tela, a tabela é um container transparente; apenas o resultado é visível.
           */}
          <table className="imoveis-print-layout w-full">
            <thead>
              <tr><td className="p-0">
                <div className="imoveis-print-header hidden print:flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-2">
                  <img src="/logo-iatax.png" alt="" className="h-5 w-5 object-contain shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-900 leading-tight">Simulador Imobiliário – PF vs PJ vs Reforma LC 214/2025</p>
                    <p className="text-[8px] text-slate-500 leading-tight">Emissão {reportEmissionDateStr}</p>
                  </div>
                  <span className="text-[8px] text-slate-400 shrink-0">IATax Soluções Inteligentes</span>
                </div>
              </td></tr>
            </thead>
            <tfoot>
              <tr><td className="p-0">
                <div className="imoveis-print-footer hidden print:flex items-center justify-between pt-1.5 mt-2 border-t border-slate-200">
                  <span className="text-[8px] text-slate-500">IATax Soluções Inteligentes</span>
                  <span className="text-[8px] text-slate-500">{reportEmissionDateStr}</span>
                </div>
              </td></tr>
            </tfoot>
            <tbody>
              <tr><td className="p-0 align-top">
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
          {/* ── Parâmetros da simulação — visível no PDF e no preview ── */}
          {(() => {
            const rowsBySection = {
              receita: ROWS.filter((r) => r.section === 'receita'),
              despesa: ROWS.filter((r) => r.section === 'despesa'),
              custo: ROWS.filter((r) => r.section === 'custo'),
            };
            const totalAnual = (field: keyof MesFields) =>
              meses.reduce((s, m) => s + (Number(m[field]) || 0), 0);
            const hasAny = (list: { field: keyof MesFields }[]) =>
              list.some((r) => totalAnual(r.field) > 0);
            const hasCustos = hasAny(rowsBySection.custo);
            if (!hasAny([...rowsBySection.receita, ...rowsBySection.despesa, ...rowsBySection.custo])) return null;

            const renderSection = (
              title: string,
              rows: typeof ROWS,
              color: string,
            ) => {
              const visible = rows.filter((r) => totalAnual(r.field) > 0);
              if (visible.length === 0) return null;
              const total = visible.reduce((s, r) => s + totalAnual(r.field), 0);
              return (
                <div key={title}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${color}`}>{title}</p>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r.field} className="border-b border-slate-100">
                          <td className="py-0.5 pr-2 text-slate-600 w-[65%]">{r.label}</td>
                          <td className="py-0.5 text-right font-mono text-slate-800">{formatMoney(totalAnual(r.field))}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-300">
                        <td className="py-0.5 pr-2 font-semibold text-slate-700">Total</td>
                        <td className="py-0.5 text-right font-mono font-semibold text-slate-900">{formatMoney(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            };

            return (
              <section className="print-imoveis-params hidden print:block">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Parâmetros utilizados — Ano {ano}
                  </h3>
                  <div className={`grid gap-4 ${hasCustos ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {renderSection('Receitas', rowsBySection.receita, 'text-emerald-700')}
                    {renderSection('Despesas dedutíveis (PF)', rowsBySection.despesa, 'text-sky-700')}
                    {hasCustos && renderSection('Custos operacionais', rowsBySection.custo, 'text-amber-700')}
                  </div>
                </div>
              </section>
            );
          })()}
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
              variant="primary"
              onClick={handleOpenPrintPreview}
              className="print:hidden shrink-0 inline-flex items-center gap-2 shadow-sm"
              aria-label="Exportar resultado para PDF"
              data-report-exclude="preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar para PDF
            </Button>
          </div>

          {/* Salvar simulação no histórico */}
          <Card className="card-gov card-gov-accent p-6 border-slate-200 bg-slate-50/50 print:hidden" data-report-exclude="preview">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded bg-[#0c326f] flex items-center justify-center text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0c326f]">Registrar Simulação no Histórico</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">Armazene os dados para consultas futuras e comparativos.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Vincular ao Cliente *</label>
                <select
                  className="w-full bg-white border border-slate-300 rounded px-4 py-2.5 text-sm font-bold text-[#0c326f] focus:border-[#1351b4] focus:ring-1 focus:ring-[#1351b4] outline-none shadow-sm transition-all"
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
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Título de Referência</label>
                <Input
                  placeholder="Ex: Simulação IRPF 2025"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="!py-2.5 font-bold text-[#0c326f] border-slate-300"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveToHistory}
                disabled={loading || !saveClientId}
                className="!bg-[#1351b4] hover:!bg-[#0c326f] !text-white font-black text-[10px] uppercase tracking-widest h-[42px] px-8 shadow-sm transition-all transform active:scale-95"
              >
                {loading ? 'Processando...' : 'Salvar Registro'}
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PERSONA FÍSICA CARD */}
            <Card className="card-gov border-l-4 border-[#1351b4] px-6 py-6 bg-white shadow-md">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-[#1351b4]">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 </div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Pessoa Física <span className="text-slate-400 font-bold ml-1">(Carnê-Leão)</span></h3>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-4xl font-black text-[#1351b4] tracking-tight">{formatMoney(result.cenarios.pf.imposto_total)}</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-black text-[#1351b4] uppercase">Efetiva: {result.cenarios.pf.aliquota_efetiva_anual.toFixed(2)}%</span>
                </div>
              </div>
              
              <details className="mt-6 border-t border-slate-100 pt-4 group">
                <summary className="text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-[#1351b4] flex items-center gap-2 transition-colors list-none">
                  <svg className="w-3 h-3 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  Detalhamento do Cálculo
                </summary>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-500">Receita Bruta Total</span>
                      <span className="text-xs font-bold text-[#0c326f]">{formatMoney(result.cenarios.pf.receita_bruta_total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-600">
                      <span className="text-[10px] font-black uppercase opacity-70">Despesas Dedutíveis (−)</span>
                      <span className="text-xs font-bold">{formatMoney(result.cenarios.pf.despesas_dedutiveis_total)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[#1351b4]">
                      <span className="text-[10px] font-black uppercase">Base de Cálculo Final</span>
                      <span className="text-sm font-black tracking-tight">{formatMoney(result.cenarios.pf.base_calculo_total)}</span>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed mt-2 text-center bg-white py-1 rounded shadow-sm">Tabela RFB aplicada mensalmente (12 meses)</p>
                  </div>
                </div>
              </details>
            </Card>

            {/* PERSONA JURÍDICA CARD */}
            <Card className="card-gov border-l-4 border-slate-400 px-6 py-6 bg-white shadow-md">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                 </div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Pessoa Jurídica <span className="text-slate-400 font-bold ml-1">(Lucro Presumido)</span></h3>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-4xl font-black text-slate-800 tracking-tight">{formatMoney(result.cenarios.pj.imposto_total)}</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-black text-slate-600 uppercase">Efetiva: {result.cenarios.pj.aliquota_efetiva.toFixed(2)}%</span>
                </div>
              </div>

              {(() => {
                const pj = result.cenarios.pj;
                const mc = result.memoria_calculo as { cenario_32_fixo_imposto?: number; aplicar_presuncao_16_servicos?: boolean } | undefined;
                const pres16 = mc?.aplicar_presuncao_16_servicos;
                const cenario32 = mc?.cenario_32_fixo_imposto;
                return (
                  <div className="mt-4 space-y-2">
                    <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-[9px] font-bold text-slate-500 uppercase leading-snug">
                      {pres16
                        ? '✓ Presunção Reduzida 16% (Art. 15 Lei 9.249/95)'
                        : '✓ Presunção Padrão 32% (Locação)'}
                    </div>
                    {cenario32 !== undefined && pres16 && (
                       <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[9px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                         Economia Gerada: {formatMoney(cenario32 - pj.imposto_total)}
                       </div>
                    )}
                  </div>
                );
              })()}

              <details className="mt-4 border-t border-slate-100 pt-4 group">
                <summary className="text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-slate-700 flex items-center gap-2 transition-colors list-none">
                  <svg className="w-3 h-3 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  Detalhamento do Cálculo
                </summary>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="text-[10px] font-black uppercase">IRPJ + CSLL (Federais)</span>
                      <span className="text-xs font-bold text-slate-700">
                        {formatMoney(
                          result.cenarios.pj.irpj +
                            result.cenarios.pj.csll +
                            (result.cenarios.pj.irpj_adicional ?? 0) +
                            (result.cenarios.pj.irpj_postergado ?? 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="text-[10px] font-black uppercase opacity-70">PIS + COFINS Cumulativo</span>
                      <span className="text-xs font-bold">{formatMoney(result.cenarios.pj.pis + result.cenarios.pj.cofins)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-800">
                      <span className="text-[10px] font-black uppercase">Imposto Total Simulado</span>
                      <span className="text-sm font-black">{formatMoney(result.cenarios.pj.imposto_total)}</span>
                    </div>
                  </div>
                </div>
              </details>
            </Card>

            {/* REFORMA PF CARD */}
            <Card className="card-gov border-l-4 border-violet-400 px-6 py-6 bg-white shadow-md">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded bg-violet-50 flex items-center justify-center text-violet-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                 </div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Reforma LC 214/2025 <span className="text-violet-400 font-bold ml-1">(Pessoa Física)</span></h3>
              </div>
              {(() => {
                const refPf = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
                const irHoje = result.cenarios.pf.imposto_total;
                const receita = refPf?.receita_bruta_total ?? result.fluxo_caixa?.[0]?.receita_total ?? 0;
                
                const LIMITE_RECEITA_ABSOLUTO = 288_000;
                const LIMITE_IMOVEIS = 3;
                const ehContribuinteIbsCbs = receita > LIMITE_RECEITA_ABSOLUTO || (quantidadeImoveisTotal > LIMITE_IMOVEIS && receita > 240000);
                
                if (!ehContribuinteIbsCbs) {
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-4xl font-black text-emerald-600 tracking-tight">{formatMoney(irHoje)}</span>
                      <div className="p-3 mt-4 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-800 uppercase leading-snug">
                         Atividade Isenta de IBS/CBS – Fora do critério de faturamento.
                      </div>
                    </div>
                  );
                }
                
                const ibsCbs = refPf?.ibs_cbs_liquido ?? 0;
                const totalPF2027 = irHoje + ibsCbs;
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-4xl font-black text-[#6d28d9] tracking-tight">{formatMoney(totalPF2027)}</span>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="px-2 py-0.5 rounded bg-violet-50 text-[10px] font-black text-violet-700 uppercase">Impacto IBS/CBS: {formatMoney(ibsCbs)}</span>
                    </div>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="space-y-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                        <div className="flex justify-between">
                          <span>IR (Carnê-Leão Atual)</span>
                          <span>{formatMoney(irHoje)}</span>
                        </div>
                        <div className="flex justify-between text-violet-600">
                          <span>Novo IBS + CBS Mensal</span>
                          <span>{formatMoney(ibsCbs)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* REFORMA PJ CARD */}
            <Card className="card-gov border-l-4 border-violet-600 px-6 py-6 bg-[#0c326f] shadow-md">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                 </div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Reforma LC 214/2025 <span className="text-violet-300 font-bold ml-1">(Pessoa Jurídica)</span></h3>
              </div>
              <div className="flex flex-col gap-0.5 text-white">
                <span className="text-4xl font-black tracking-tight">
                  {formatMoney((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.imposto_total ?? 0)}
                </span>
                <div className="flex items-center gap-2 mt-2 font-black uppercase">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white/90 tracking-widest">
                    Efetiva Total: {(result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(2) ?? '0'}%
                  </span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-white/50 uppercase tracking-tight">
                   <span>Sistema 2027/2033</span>
                   <span className="text-violet-300 font-bold">IBS + CBS + IRPJ + CSLL</span>
                </div>
                <p className="text-[10px] font-bold text-white/90 uppercase leading-snug">
                   Cálculo contempla transição gradual e créditos permitidos pela LC 214.
                </p>
              </div>
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
            <>
              <table className="table-gov w-full">
                <thead className="bg-[#0c326f] text-white">
                  <tr>
                    <th className="py-3 px-4 text-left font-black uppercase tracking-widest text-[10px]">Métrica / Cenário</th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[10px]">
                      <div className="flex items-center justify-end gap-1.5">
                        PF (Carnê-Leão)
                        {melhorAtual === 'PF' && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px]">✓</span>}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[10px]">
                      <div className="flex items-center justify-end gap-1.5">
                        PJ (Presumido)
                        {melhorAtual === 'PJ' && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px]">✓</span>}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[10px]" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      Reforma PF
                    </th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[10px]">
                      <div className="flex items-center justify-end gap-1.5">
                        Reforma PJ
                        {melhorTotal.label === 'Ref. PJ' && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px]">★</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase">Imposto Total</td>
                    <td className={`py-3 px-4 text-right font-black ${melhorAtual === 'PF' ? 'text-[#1351b4]' : 'text-slate-800'}`}>
                      {formatMoney(pf.imposto_total)}
                    </td>
                    <td className={`py-3 px-4 text-right font-black ${melhorAtual === 'PJ' ? 'text-[#1351b4]' : 'text-slate-800'}`}>
                      {formatMoney(pj.imposto_total)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800 font-bold" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs ? formatMoney(totalRefPf) : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-black ${melhorTotal.label === 'Ref. PJ' ? 'text-amber-600' : 'text-slate-800'}`}>
                      {formatMoney(refPj?.imposto_total ?? 0)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/30">
                    <td className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase">Alíquota Efetiva</td>
                    <td className="py-3 px-4 text-right text-slate-600 font-bold">{pf.aliquota_efetiva_anual.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right text-slate-600 font-bold">{pj.aliquota_efetiva.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right text-slate-600 font-bold" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs
                        ? (pf.receita_bruta_total > 0 ? (totalRefPf / pf.receita_bruta_total) * 100 : 0).toFixed(2) + '%'
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-bold">{refPj?.aliquota_efetiva?.toFixed(2) ?? '0'}%</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase">Receita Bruta (Ano)</td>
                    <td className="py-3 px-4 text-right text-slate-800 font-black tracking-tight" colSpan={4}>
                      {formatMoney(pf.receita_bruta_total)}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/30">
                    <td className="py-3 px-4 text-[11px] font-black text-[#0c326f] uppercase">vs. Melhor Atual (Economia)</td>
                    <td className="py-3 px-4 text-right text-slate-400 font-bold italic text-[10px]">
                      {melhorAtual === 'PF' ? 'REFERÊNCIA' : `+${formatMoney(pf.imposto_total - pj.imposto_total)}`}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-bold italic text-[10px]">
                      {melhorAtual === 'PJ' ? 'REFERÊNCIA' : `+${formatMoney(pj.imposto_total - pf.imposto_total)}`}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-500 font-bold" title={!ehContribuinteIbsCbs ? 'Não se aplica (PF não é contribuinte de IBS/CBS)' : undefined}>
                      {ehContribuinteIbsCbs
                        ? `+${formatMoney(totalRefPf - Math.min(pf.imposto_total, pj.imposto_total))}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black">
                      {(refPj?.imposto_total ?? 0) <= Math.min(pf.imposto_total, pj.imposto_total)
                        ? <span className="text-emerald-600">−{formatMoney(Math.min(pf.imposto_total, pj.imposto_total) - (refPj?.imposto_total ?? 0))}</span>
                        : <span className="text-rose-500">+{formatMoney((refPj?.imposto_total ?? 0) - Math.min(pf.imposto_total, pj.imposto_total))}</span>
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="flex items-center gap-6 mt-4 px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                  <span className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center text-white text-[8px]">✓</span> 
                  Melhor Atual
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                  <span className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-white text-[8px]">★</span> 
                  Melhor Absoluto
                </div>
              </div>
            </>
          );
        })()}
      </Card>

      {result?.cenarios?.pf?.trimestres && result?.cenarios?.pj?.trimestres && (
        <Card className="card-gov mt-6 p-6 bg-white shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#1351b4]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#0c326f]">Comparativo Trimestral</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Carga Tributária Efetiva por Regime</p>
            </div>
          </div>
          <div className="h-80 w-full min-w-0 print-imoveis-chart-trimestral">
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
                    pjReceita: pjTri?.receita ?? 0,
                  };
                })}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="trimestre" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-xs min-w-[200px]">
                        <p className="font-black text-[#0c326f] uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">{label}</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm bg-[#1351b4]" />
                              <span className="font-bold text-slate-600">Pessoa Física:</span>
                            </div>
                            <span className="font-black text-[#1351b4]">{formatMoney(payload[0].value as number)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm bg-[#64748b]" />
                              <span className="font-bold text-slate-600">Pessoa Jurídica:</span>
                            </div>
                            <span className="font-black text-slate-800">{formatMoney(payload[1].value as number)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend iconType="rect" iconSize={12} wrapperStyle={{ paddingTop: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }} />
                <Bar dataKey="PF" name="Carga PF (IR)" fill="#1351b4" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="PJ" name="Carga PJ (LP)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={24} />
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
        const pfTotal = result.cenarios.pf.imposto_total ?? 0;
        const pjTotal = result.cenarios.pj.imposto_total ?? 0;
        const pjVence = pjTotal < pfTotal;
        const economiaReais = Math.max(0, Math.abs(pfTotal - pjTotal));
        const baseComparacao = Math.max(pfTotal, pjTotal);
        const economiaPct = baseComparacao > 0 ? (economiaReais / baseComparacao) * 100 : 0;
        const fc = result.fluxo_caixa[0] ?? { lucro_liquido_pf: 0, lucro_liquido_pj: 0 };
        const acoes = pjVence
          ? [
              'Avaliar constituição de PJ para formalizar a operação com eficiência tributária.',
              'Validar custos acessórios da migração (contabilidade, taxas e obrigações acessórias).',
              'Projetar fluxo de caixa trimestral para capturar o ganho fiscal estimado.',
              'Revisar regime periodicamente para manter aderência ao perfil de receita.',
            ]
          : [
              'Manter operação em PF no cenário atual, preservando a menor carga fiscal.',
              'Monitorar a evolução da receita e quantidade de imóveis para reavaliar a migração.',
              'Atualizar custos dedutíveis e premissas operacionais a cada novo ciclo de simulação.',
              'Planejar revisão do enquadramento quando houver mudança relevante de faturamento.',
            ];
        return (
          <Card className="card-gov mt-6 bg-[#0c326f] text-white overflow-hidden shadow-xl">
            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Resumo Estratégico</h3>
                   <p className="text-xl font-black text-white tracking-tight">{pjVence ? 'Migração Recomendada para PJ' : 'Manter Operação na PF'}</p>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${pjVence ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                 {pjVence ? 'Melhor Eficiência Fiscal' : 'Regime Sugerido'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10">
              <div className="bg-[#0c326f] p-6">
                <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-4">Análise de Impacto</p>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/40 uppercase">Diferença de Carga (Anual)</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                       {economiaReais > 0 ? formatMoney(economiaReais) : formatMoney(0)}
                    </span>
                    <p className="text-[10px] font-bold text-white/60 uppercase mt-1">
                       {economiaReais > 0 
                         ? (pjVence 
                             ? `PJ gera ${formatMoney(economiaReais)} de economia adicional.` 
                             : `PF economiza ${formatMoney(economiaReais)} frente ao lucro presumido.`)
                         : 'Carga tributária equivalente em ambos regimes.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-black uppercase">ROI Estimado: {economiaPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#0c326f] p-6 border-l border-white/10">
                <p className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-4">Lucro Líquido Anual (Estimado)</p>
                <div className="space-y-3">
                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-xs font-bold text-white/70 uppercase">Cenário PF</span>
                      <span className="text-sm font-black text-white">{formatMoney(fc.lucro_liquido_pf)}</span>
                   </div>
                   <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-xs font-bold text-white/70 uppercase">Cenário PJ</span>
                      <span className="text-sm font-black text-white">{formatMoney(fc.lucro_liquido_pj)}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 text-slate-800">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Plano de Ação e Observações Fiscais</p>
               <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {acoes.map((texto, i) => (
                    <li key={i} className="flex gap-3 text-xs leading-relaxed">
                       <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1351b4] shrink-0" />
                       <span className="font-bold text-slate-600 uppercase text-[9px] tracking-tight">{texto}</span>
                    </li>
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
        <Card className="card-gov mt-6 p-6 bg-white shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Análise de Custos e Créditos</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Potencial de Recuperação IBS/CBS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Créditos IBS/CBS</p>
               <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 uppercase">Total Potencial:</span>
                  <span className="font-black text-[#1351b4]">{formatMoney(result.analise_custos.creditos_ibs_cbs.total_potencial)}</span>
               </div>
               <div className="flex justify-between items-center text-xs mt-1 text-slate-400">
                   <span className="font-bold uppercase">Não Aproveitável:</span>
                   <span>{formatMoney(result.analise_custos.creditos_ibs_cbs.nao_aproveitado)}</span>
               </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Indicadores de Eficiência</p>
               <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600 uppercase">Margem Operacional:</span>
                  <span className="font-black text-slate-800">{result.analise_custos.indicadores.margem_operacional_apos_tributos_pj.toFixed(2)}%</span>
               </div>
               <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                  Cenário PJ após tributação simulada
               </div>
            </div>
          </div>

          {result.analise_custos.categorias.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="table-gov w-full text-sm">
                <thead className="bg-[#0c326f] text-white">
                  <tr>
                    <th className="py-3 px-4 text-left font-black uppercase tracking-widest text-[9px]">Categoria de Despesa</th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[9px]">Valor Anual</th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[9px]">Part. (%)</th>
                    <th className="py-3 px-4 text-right font-black uppercase tracking-widest text-[9px]">Créditos LC 214</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.analise_custos.categorias.slice(0, 8).map((c) => (
                    <tr key={c.categoria} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-4 text-[11px] font-bold text-slate-600 uppercase">{c.categoria}</td>
                      <td className="py-2 px-4 text-right font-bold text-slate-800">{formatMoney(c.valor)}</td>
                      <td className="py-2 px-4 text-right text-slate-500 font-medium">{c.participacao_percentual.toFixed(1)}%</td>
                      <td className={`py-2 px-4 text-right font-black ${c.credito_potencial > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                        {c.credito_potencial > 0 ? formatMoney(c.credito_potencial) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

          {/* CTA final — Exportar PDF */}
          <div
            className="print:hidden mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 rounded-2xl bg-[#0c326f] px-8 py-8 shadow-2xl relative overflow-hidden"
            data-report-exclude="preview"
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#1351b4]/20 rounded-full -ml-10 -mb-10 blur-2xl pointer-events-none" />
            
            <div className="flex items-start gap-4 z-10">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 shadow-inner">
                <svg className="w-7 h-7 text-[#5cc6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-white leading-tight uppercase tracking-wide">Pronto para Entregar ao Cliente?</p>
                <p className="text-sm text-white/60 mt-1 font-medium leading-relaxed max-w-md">Gere agora o relatório oficial em PDF com capa institucional, comparativo de cenários e embasamentos legais da LC 214/2025.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenPrintPreview}
              className="z-10 !h-14 !px-8 !bg-white !text-[#0c326f] hover:!bg-blue-50 hover:!scale-105 active:!scale-95 transition-all !rounded-xl !font-black !uppercase !tracking-widest !text-xs shadow-xl shrink-0 border-none"
              aria-label="Exportar resultado para PDF"
            >
              Exportar Relatório PDF
            </Button>
          </div>

          </div>{/* fecha #simulador-imoveis-resultado-print */}
              </td></tr>
            </tbody>
          </table>{/* fecha imoveis-print-layout */}
        </div>
        </>
      )}

      {/* Simulações salvas (sempre acessível) */}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="p-5" accent>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pessoa Física</h4>
                  <p className="text-2xl font-black text-[#0c326f] tracking-tighter">{pf ? formatMoney(pf.imposto_total) : '-'}</p>
                </Card>
                <Card className="p-5" accent>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pessoa Jurídica</h4>
                  <p className="text-2xl font-black text-[#0c326f] tracking-tighter">{pj ? formatMoney(pj.imposto_total) : '-'}</p>
                </Card>
                <Card className="p-5" accent>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Reforma LC 214/2025</h4>
                  <p className="text-2xl font-black text-[#1351b4] tracking-tighter">{ref ? formatMoney(ref.imposto_total ?? 0) : '-'}</p>
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
            style={{ width: '210mm', maxWidth: '100%', maxHeight: '45vh', overflowY: 'auto' }}
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

      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Limpar simulação"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Tem certeza que deseja limpar todos os dados da simulação? Os valores preenchidos na planilha serão perdidos e você voltará ao passo 1.
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
              onClick={handleClearSimulation}
            >
              Sim, limpar tudo
            </Button>
          </div>
        </div>
      </Modal>

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

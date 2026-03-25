import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  irpfAltaRendaService,
  type IrpfAltaRendaRecord,
  type ExtractFromPdfResult,
} from '../services/irpf-alta-renda.service';
import { trackIrpfMetric } from '../services/irpf-metrics.service';
import type { DeclaracaoIrpfCompleta } from '@shared/core';
import { companyService } from '../../companies/services/company.service';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { useToast } from '../../../shared/components/ui/Toast';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
  RendimentoIsentoDividendo,
  ComparativoPfPj,
  DadosIrpfAltaRenda,
} from '@shared/core';
import { IrpfKpiCards } from '../components/IrpfKpiCards';
import { IrpfBccCard } from '../components/IrpfBccCard';
import { IrpfFormAccordionSection } from '../components/IrpfFormAccordionSection';
import { LabelWithTooltip } from '../components/LabelWithTooltip';
import { IrpfComposicaoChart } from '../components/IrpfComposicaoChart';
import { IrpfComparativoChart } from '../components/IrpfComparativoChart';
import { IrpfCustoPfPjChart } from '../components/IrpfCustoPfPjChart';
import { RemoveConfirmModal } from '../../../shared/components/ui/RemoveConfirmModal';
import { InfoModal } from '../../../shared/components/ui/InfoModal';
import { ParametrosSimulacaoPrint } from '../components/ParametrosSimulacaoPrint';
import html2pdf from 'html2pdf.js';
import {
  buildReportPdfFilename,
  getDefaultReportHtml2PdfOptions,
  ReportExportChoiceModal,
  stripReportExcludedFromClone,
} from '../../../lib/report-pdf';

const CURRENT_YEAR = new Date().getFullYear();
const DEMO_KEY_WINDOW_MS = 1500;
const PDF_PROCESSING_STEPS = [
  { minElapsedMs: 0, progress: 8, stage: 'Enviando PDF...', detail: 'Realizando upload seguro do arquivo.' },
  { minElapsedMs: 2000, progress: 18, stage: 'Lendo estrutura do PDF...', detail: 'Preparando o documento para extração de texto.' },
  { minElapsedMs: 7000, progress: 32, stage: 'Extraindo conteúdo textual...', detail: 'Coletando campos e blocos relevantes da declaração.' },
  { minElapsedMs: 14000, progress: 50, stage: 'Interpretando identificação e resumo...', detail: 'Organizando dados de contribuinte e totais principais.' },
  { minElapsedMs: 22000, progress: 67, stage: 'Processando rendimentos...', detail: 'Classificando tributáveis, isentos e exclusivos.' },
  { minElapsedMs: 30000, progress: 82, stage: 'Conferindo consistência dos dados...', detail: 'Validando estrutura para preencher o formulário.' },
  { minElapsedMs: 38000, progress: 92, stage: 'Finalizando extração...', detail: 'Quase pronto, aplicando os últimos ajustes.' },
] as const;

/** Demo 1: Cenário básico (RT, dividendos, deduções) — Ctrl+D+1 */
const DEMO_1 = {
  nome: 'João Silva (Demo 1)',
  cpf: '12345678909',
  ano: CURRENT_YEAR,
  rendimentosTributaveis: 400_000,
  dividendos: [{ nome_fonte: 'Holding XYZ', valor: 300_000, codigo: '09' as const }],
  lucrosAprovados: 0,
  impostoRetencao: 60_000,
  impostoCarneLeao: 0,
  impostoAplicacoes: 0,
  impostoAntecipado: 0,
  ganhoCapital: 0,
  fiis: 0,
  outrosExcluidos: 0,
  outrosIsentos: [] as OutroIsentoInput[],
  lei7713: [] as Lei7713Input[],
};

/** Demo 2: Cenário com otimização (outros isentos que entram + Lei 7.713) — Ctrl+D+2 */
const DEMO_2 = {
  ...DEMO_1,
  nome: 'Maria Santos (Demo 2)',
  cpf: '98765432100',
  rendimentosTributaveis: 350_000,
  dividendos: [{ nome_fonte: 'Empresa ABC', valor: 250_000, codigo: '09' as const }],
  outrosIsentos: [{ descricao: 'Renda de título isento', valor: 80_000 }] as OutroIsentoInput[],
  lei7713: [{ descricao: 'CDB com IRRF', valor_bruto: 50_000, irrf: 7_500 }] as Lei7713Input[],
};

/** Demo 3: Cenário alta base (BCC > 1,2M, faixa fixa 10%) — Ctrl+D+3 */
const DEMO_3 = {
  ...DEMO_1,
  nome: 'Carlos Alta Renda (Demo 3)',
  cpf: '52998224725',
  rendimentosTributaveis: 800_000,
  dividendos: [
    { nome_fonte: 'Holdings várias', valor: 600_000, codigo: '09' as const },
  ],
  impostoRetencao: 120_000,
};

const emptyDividendo: RendimentoIsentoDividendo = {
  nome_fonte: '',
  valor: 0,
  codigo: '09',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Valida CPF pelos dígitos verificadores. Retorna true se válido ou se tiver menos de 11 dígitos (ainda digitando). */
function validarCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]!, 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(digits[9]!, 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]!, 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  if (d2 !== parseInt(digits[10]!, 10)) return false;
  return true;
}

/** Converte avisos técnicos em mensagens amigáveis para o usuário. */
function mensagemAmigavel(aviso: string): string {
  const a = aviso.toLowerCase();
  if (a.includes('stagefailures') || a.includes('falha em etapas da extração')) {
    return 'Houve um problema na extração dos dados. Algumas informações podem estar incompletas. Revise os campos antes de simular ou use o preenchimento manual.';
  }
  if (a.includes('porta 3001') || a.includes('reinicie a api')) {
    return 'Se os valores estiverem incorretos, tente reimportar o arquivo ou use o preenchimento manual.';
  }
  if (a.includes('estrutura invalida') || a.includes('formato inesperado')) {
    return 'Não foi possível interpretar o conteúdo. Tente outro arquivo ou use o preenchimento manual.';
  }
  return aviso;
}

type OutroIsentoInput = {
  descricao: string;
  valor: number;
};

type Lei7713Input = {
  descricao: string;
  valor_bruto: number;
  irrf: number;
};

export function IrpfAltaRenda() {
  const { success, error: showError, ToastContainer } = useToast();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<IrpfAltaRendaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [result, setResult] = useState<IrpfAltaRendaSimulacaoResponse | null>(null);

  const [ano, setAno] = useState(CURRENT_YEAR);
  const [contribuinteNome, setContribuinteNome] = useState('');
  const [contribuinteCpf, setContribuinteCpf] = useState('');
  const [rendimentosTributaveis, setRendimentosTributaveis] = useState(0);
  const [dividendos, setDividendos] = useState<RendimentoIsentoDividendo[]>([{ ...emptyDividendo }]);
  const [lucrosAprovadosAte31dez2025, setLucrosAprovadosAte31dez2025] = useState(0);
  const [impostoJaPagoRetencao, setImpostoJaPagoRetencao] = useState(0);
  const [impostoJaPagoCarneLeao, setImpostoJaPagoCarneLeao] = useState(0);
  const [impostoJaPagoAplicacoes, setImpostoJaPagoAplicacoes] = useState(0);
  const [impostoAntecipadoDividendos, setImpostoAntecipadoDividendos] = useState(0);
  const [ganhoCapitalExcluido, setGanhoCapitalExcluido] = useState(0);
  const [rendimentosFiisExcluidos, setRendimentosFiisExcluidos] = useState(0);
  const [outrosExcluidosArt16A, setOutrosExcluidosArt16A] = useState(0);
  const [outrosIsentosQueEntramBase, setOutrosIsentosQueEntramBase] = useState<OutroIsentoInput[]>([{ descricao: '', valor: 0 }]);
  const [rendimentosLei7713, setRendimentosLei7713] = useState<Lei7713Input[]>([{ descricao: '', valor_bruto: 0, irrf: 0 }]);
  const [optouAjusteAnualLei7713, setOptouAjusteAnualLei7713] = useState(false);
  const [rendimentosAplicacoesPj, setRendimentosAplicacoesPj] = useState(0);
  const [aliquotaIrrfComparativo, setAliquotaIrrfComparativo] = useState(15);
  const [valorHipoteticoComparativo, setValorHipoteticoComparativo] = useState<number | undefined>(undefined);

  const [saveCompanyId, setSaveCompanyId] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [decDbkLoading, setDecDbkLoading] = useState(false);
  const [decDbkFile, setDecDbkFile] = useState<File | null>(null);
  const [declaracaoExtraida, setDeclaracaoExtraida] = useState<DeclaracaoIrpfCompleta | null>(null);
  const [decDbkParserVersion, setDecDbkParserVersion] = useState<number | null>(null);
  const [diagnosticoExtracao, setDiagnosticoExtracao] = useState<{ completude: 'alta' | 'media' | 'baixa'; avisos: string[] } | null>(null);
  const [processingStage, setProcessingStage] = useState('');
  const [processingDetail, setProcessingDetail] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [removeConfirmModal, setRemoveConfirmModal] = useState<{
    isOpen: boolean;
    type: 'dividendo' | 'outroIsento' | 'lei7713';
    index: number;
  }>({ isOpen: false, type: 'dividendo', index: 0 });
  const [deleteSimulacaoModal, setDeleteSimulacaoModal] = useState<{
    isOpen: boolean;
    item: IrpfAltaRendaRecord | null;
  }>({ isOpen: false, item: null });
  const [selectedImportType, setSelectedImportType] = useState<'pdf' | 'dec_dbk' | 'manual' | null>(null);
  const [infoModalLei, setInfoModalLei] = useState(false);
  const [infoModalPdf, setInfoModalPdf] = useState(false);
  const [infoModalDecDbk, setInfoModalDecDbk] = useState(false);
  const [infoModalManual, setInfoModalManual] = useState(false);
  const [importSectionKey, setImportSectionKey] = useState(0);
  const [decDbkDropActive, setDecDbkDropActive] = useState(false);
  const [manualFormStarted, setManualFormStarted] = useState(false);
  const [pdfDropActive, setPdfDropActive] = useState(false);
  const [etapa1Collapsed, setEtapa1Collapsed] = useState(false);
  const [etapa2Collapsed, setEtapa2Collapsed] = useState(false);
  const [diagnosticoAvisosExpanded, setDiagnosticoAvisosExpanded] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [decDbkFileName, setDecDbkFileName] = useState<string | null>(null);
  const [pdfExportModalOpen, setPdfExportModalOpen] = useState(false);
  const [pdfExportIncludeParams, setPdfExportIncludeParams] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [listAnoFilter, setListAnoFilter] = useState<number | ''>('');
  const [listSearchContribuinte, setListSearchContribuinte] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const LIST_LIMIT = 50;
  const [editingSimulationId, setEditingSimulationId] = useState<string | null>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const pdfResultPlaceholderRef = useRef<HTMLDivElement>(null);
  const waitingDemoDigitRef = useRef<number>(0);
  const demoKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const listRes = await irpfAltaRendaService.list({
        page: listPage,
        limit: LIST_LIMIT,
        ...(listAnoFilter !== '' && { ano: listAnoFilter }),
      });
      setItems(listRes.items);
      setListTotal(listRes.total);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Erro ao carregar simulações');
      showError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setListLoading(false);
    }
  }, [showError, listAnoFilter, listPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fillDemo1 = useCallback(() => {
    setContribuinteNome(DEMO_1.nome);
    setContribuinteCpf(DEMO_1.cpf);
    setAno(DEMO_1.ano);
    setRendimentosTributaveis(DEMO_1.rendimentosTributaveis);
    setDividendos(DEMO_1.dividendos.length > 0 ? DEMO_1.dividendos : [{ ...emptyDividendo }]);
    setLucrosAprovadosAte31dez2025(DEMO_1.lucrosAprovados);
    setImpostoJaPagoRetencao(DEMO_1.impostoRetencao);
    setImpostoJaPagoCarneLeao(DEMO_1.impostoCarneLeao);
    setImpostoJaPagoAplicacoes(DEMO_1.impostoAplicacoes);
    setImpostoAntecipadoDividendos(DEMO_1.impostoAntecipado);
    setGanhoCapitalExcluido(DEMO_1.ganhoCapital);
    setRendimentosFiisExcluidos(DEMO_1.fiis);
    setOutrosExcluidosArt16A(DEMO_1.outrosExcluidos);
    setOutrosIsentosQueEntramBase(DEMO_1.outrosIsentos.length > 0 ? DEMO_1.outrosIsentos : [{ descricao: '', valor: 0 }]);
    setRendimentosLei7713(DEMO_1.lei7713.length > 0 ? DEMO_1.lei7713 : [{ descricao: '', valor_bruto: 0, irrf: 0 }]);
    setRendimentosAplicacoesPj(0);
    setResult(null);
    success('Demo 1: Cenário básico. Clique em Simular.');
  }, [success]);

  const fillDemo2 = useCallback(() => {
    setContribuinteNome(DEMO_2.nome);
    setContribuinteCpf(DEMO_2.cpf);
    setAno(DEMO_2.ano);
    setRendimentosTributaveis(DEMO_2.rendimentosTributaveis);
    setDividendos(DEMO_2.dividendos.length > 0 ? DEMO_2.dividendos : [{ ...emptyDividendo }]);
    setLucrosAprovadosAte31dez2025(DEMO_2.lucrosAprovados ?? 0);
    setImpostoJaPagoRetencao(DEMO_2.impostoRetencao);
    setImpostoJaPagoCarneLeao(DEMO_2.impostoCarneLeao);
    setImpostoJaPagoAplicacoes(DEMO_2.impostoAplicacoes);
    setImpostoAntecipadoDividendos(DEMO_2.impostoAntecipado);
    setGanhoCapitalExcluido(DEMO_2.ganhoCapital ?? 0);
    setRendimentosFiisExcluidos(DEMO_2.fiis ?? 0);
    setOutrosExcluidosArt16A(DEMO_2.outrosExcluidos ?? 0);
    setOutrosIsentosQueEntramBase(DEMO_2.outrosIsentos?.length ? DEMO_2.outrosIsentos : [{ descricao: '', valor: 0 }]);
    setRendimentosLei7713(DEMO_2.lei7713?.length ? DEMO_2.lei7713 : [{ descricao: '', valor_bruto: 0, irrf: 0 }]);
    setRendimentosAplicacoesPj(0);
    setResult(null);
    success('Demo 2: Cenário com otimização. Clique em Simular.');
  }, [success]);

  const fillDemo3 = useCallback(() => {
    setContribuinteNome(DEMO_3.nome);
    setContribuinteCpf(DEMO_3.cpf);
    setAno(DEMO_3.ano);
    setRendimentosTributaveis(DEMO_3.rendimentosTributaveis);
    setDividendos(DEMO_3.dividendos.length > 0 ? DEMO_3.dividendos : [{ ...emptyDividendo }]);
    setLucrosAprovadosAte31dez2025(DEMO_3.lucrosAprovados ?? 0);
    setImpostoJaPagoRetencao(DEMO_3.impostoRetencao);
    setImpostoJaPagoCarneLeao(DEMO_3.impostoCarneLeao);
    setImpostoJaPagoAplicacoes(DEMO_3.impostoAplicacoes);
    setImpostoAntecipadoDividendos(DEMO_3.impostoAntecipado);
    setGanhoCapitalExcluido(DEMO_3.ganhoCapital ?? 0);
    setRendimentosFiisExcluidos(DEMO_3.fiis ?? 0);
    setOutrosExcluidosArt16A(DEMO_3.outrosExcluidos ?? 0);
    setOutrosIsentosQueEntramBase(DEMO_3.outrosIsentos?.length ? DEMO_3.outrosIsentos : [{ descricao: '', valor: 0 }]);
    setRendimentosLei7713(DEMO_3.lei7713?.length ? DEMO_3.lei7713 : [{ descricao: '', valor_bruto: 0, irrf: 0 }]);
    setRendimentosAplicacoesPj(0);
    setResult(null);
    success('Demo 3: Cenário alta base (BCC > 1,2M). Clique em Simular.');
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

  useEffect(() => {
    if (!user) return;
    if (user.role === 'super_admin') {
      companyService.list().then((list) => setCompanies(list.map((c) => ({ id: c.id, name: c.name })))).catch(() => setCompanies([]));
    } else if (user.tenant_id) {
      const tid = user.tenant_id;
      setCompanies([{ id: tid, name: 'Sua empresa' }]);
    } else {
      setCompanies([]);
    }
  }, [user]);

  const bccCalculado =
    rendimentosTributaveis +
    dividendos.reduce((s, d) => s + (d.valor ?? 0), 0) -
    outrosExcluidosArt16A +
    outrosIsentosQueEntramBase.reduce((s, d) => s + (d.valor ?? 0), 0) -
    lucrosAprovadosAte31dez2025 -
    ganhoCapitalExcluido -
    rendimentosFiisExcluidos;

  const updateDividendo = (index: number, field: keyof RendimentoIsentoDividendo, value: string | number) => {
    setDividendos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  };

  const addDividendo = () => {
    setDividendos((prev) => [...prev, { ...emptyDividendo }]);
  };

  const removeDividendo = (index: number) => {
    if (dividendos.length <= 1) return;
    setDividendos((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOutroIsento = (index: number, field: keyof OutroIsentoInput, value: string | number) => {
    setOutrosIsentosQueEntramBase((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as OutroIsentoInput;
      return next;
    });
  };

  const addOutroIsento = () => setOutrosIsentosQueEntramBase((prev) => [...prev, { descricao: '', valor: 0 }]);
  const removeOutroIsento = (index: number) => {
    if (outrosIsentosQueEntramBase.length <= 1) return;
    setOutrosIsentosQueEntramBase((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLei7713 = (index: number, field: keyof Lei7713Input, value: string | number) => {
    setRendimentosLei7713((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as Lei7713Input;
      return next;
    });
  };
  const addLei7713 = () => setRendimentosLei7713((prev) => [...prev, { descricao: '', valor_bruto: 0, irrf: 0 }]);
  const removeLei7713 = (index: number) => {
    if (rendimentosLei7713.length <= 1) return;
    setRendimentosLei7713((prev) => prev.filter((_, i) => i !== index));
  };

  const hasDividendoData = (d: RendimentoIsentoDividendo) =>
    (d.nome_fonte?.trim() ?? '') !== '' || (d.valor ?? 0) > 0;
  const hasOutroIsentoData = (item: OutroIsentoInput) => (item.descricao?.trim() ?? '') !== '' || (item.valor ?? 0) > 0;
  const hasLei7713Data = (item: Lei7713Input) =>
    (item.descricao?.trim() ?? '') !== '' || (item.valor_bruto ?? 0) > 0 || (item.irrf ?? 0) > 0;

  const handleRemoveClick = (
    type: 'dividendo' | 'outroIsento' | 'lei7713',
    index: number,
    hasData: boolean
  ) => {
    if (type === 'dividendo' && dividendos.length <= 1) return;
    if (type === 'outroIsento' && outrosIsentosQueEntramBase.length <= 1) return;
    if (type === 'lei7713' && rendimentosLei7713.length <= 1) return;
    if (hasData) {
      setRemoveConfirmModal({ isOpen: true, type, index });
    } else {
      if (type === 'dividendo') removeDividendo(index);
      else if (type === 'outroIsento') removeOutroIsento(index);
      else removeLei7713(index);
    }
  };

  const handleRemoveConfirm = () => {
    const { type, index } = removeConfirmModal;
    if (type === 'dividendo') removeDividendo(index);
    else if (type === 'outroIsento') removeOutroIsento(index);
    else removeLei7713(index);
    setRemoveConfirmModal({ ...removeConfirmModal, isOpen: false });
  };

  const handleOpenPdfModal = () => setPdfExportModalOpen(true);

  const startPdfExport = (includeParams: boolean) => {
    setPdfExportIncludeParams(includeParams);
    setPdfExporting(true);
  };

  useEffect(() => {
    if (!pdfExporting || !result) return;
    const runExport = async () => {
      const contentEl = pdfContentRef.current;
      const placeholder = pdfResultPlaceholderRef.current;
      const resultEl = document.getElementById('irpf-alta-renda-resultado-print');
      if (!contentEl || !resultEl) {
        setPdfExporting(false);
        return;
      }
      if (placeholder) {
        placeholder.innerHTML = '';
        const clone = resultEl.cloneNode(true) as HTMLElement;
        stripReportExcludedFromClone(clone, 'pdf');
        placeholder.appendChild(clone);
      }
      await new Promise((r) => setTimeout(r, 250));
      try {
        const filename = buildReportPdfFilename({
          productSlug: 'IRPF-Alta-Renda',
          extra: `${ano}-${contribuinteNome || 'simulacao'}`,
        });
        const opt = getDefaultReportHtml2PdfOptions({
          filename,
          image: { type: 'jpeg' as const, quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            width: contentEl.scrollWidth,
            windowWidth: contentEl.scrollWidth,
          },
        });
        await html2pdf().set(opt as any).from(contentEl).save();
        success('PDF exportado com sucesso.');
      } catch (e) {
        console.error(e);
        showError('Falha ao exportar PDF. Tente novamente.');
      } finally {
        setPdfExporting(false);
      }
    };
    runExport();
  }, [pdfExporting, result, ano, contribuinteNome, success, showError]);

  const buildInput = (): SimulateIrpfAltaRendaInput => ({
    ano,
    dados: {
      contribuinte: { nome: contribuinteNome.trim(), cpf: contribuinteCpf.replace(/\D/g, '') },
      rendimentos_tributaveis: rendimentosTributaveis,
      rendimentos_isentos_dividendos: dividendos
        .filter((d) => d.valor > 0)
        .map((d) => ({
          nome_fonte: d.nome_fonte || undefined,
          cnpj_fonte: d.cnpj_fonte || undefined,
          valor: d.valor,
          codigo: (d.codigo as '09' | '13') || '09',
        })),
      lucros_aprovados_ate_31dez2025: lucrosAprovadosAte31dez2025,
      imposto_ja_pago_retencao_fonte: impostoJaPagoRetencao,
      imposto_ja_pago_carne_leao: impostoJaPagoCarneLeao,
      imposto_ja_pago_aplicacoes: impostoJaPagoAplicacoes,
      imposto_antecipado_dividendos: impostoAntecipadoDividendos,
      ganho_capital_excluido: ganhoCapitalExcluido,
      rendimentos_fiis_excluidos: rendimentosFiisExcluidos,
      outros_excluidos_art_16a: outrosExcluidosArt16A,
      outros_isentos_que_entram_base: outrosIsentosQueEntramBase
        .filter((i) => i.valor > 0)
        .map((i) => ({ descricao: i.descricao || 'Isento que entra na base', valor: i.valor, tipo_ativo: 'outro_isento' as const })),
      rendimentos_tributados_exclusivamente_lei_7713: rendimentosLei7713
        .filter((i) => i.valor_bruto > 0 || i.irrf > 0)
        .map((i) => ({
          descricao: i.descricao || 'Rendimento Lei 7.713',
          valor_bruto: i.valor_bruto,
          irrf: i.irrf,
          aliquota_irrf_percentual: i.valor_bruto > 0 ? (i.irrf / i.valor_bruto) * 100 : 15,
        })),
      optou_ajuste_anual_lei_7713: optouAjusteAnualLei7713,
      rendimentos_aplicacoes_financeiras_pj: rendimentosAplicacoesPj,
      aliquota_irrf_comparativo_percentual: aliquotaIrrfComparativo,
      valor_hipotetico_comparativo_pf_pj: valorHipoteticoComparativo,
    } as SimulateIrpfAltaRendaInput['dados'],
  });

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuinteNome.trim() || !contribuinteCpf.trim()) {
      showError('Preencha nome e CPF do contribuinte.');
      return;
    }
    const cpfDigits = contribuinteCpf.replace(/\D/g, '');
    if (cpfDigits.length === 11 && !validarCpf(contribuinteCpf)) {
      showError('CPF inválido. Verifique os dígitos.');
      return;
    }
    const startedAt = Date.now();
    trackIrpfMetric('irpfm_simulate_started', { ano });
    setLoading(true);
    setResult(null);
    try {
      const res = await irpfAltaRendaService.simulate(buildInput());
      setResult(res);
      setEtapa2Collapsed(true);
      if (startedAt) {
        trackIrpfMetric('irpfm_time_to_insight_seconds', {
          seconds: Math.round((Date.now() - startedAt) / 1000),
          faixa: res.faixa,
        });
      }
      trackIrpfMetric('irpfm_simulate_success', {
        faixa: res.faixa,
        imposto_complementar: res.imposto_estimado,
      });
      success('Simulação concluída.');
      requestAnimationFrame(() => {
        setTimeout(() => {
          resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      });
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  const buildSaveInput = (): SimulateAndSaveIrpfAltaRendaInput => {
    const base = buildInput();
    const tipoImport = selectedImportType ?? 'manual';
    return {
      ...base,
      company_id: saveCompanyId || undefined,
      title: saveTitle.trim() || undefined,
      tipo_importacao: tipoImport,
      arquivo_nome: tipoImport === 'pdf' ? (pdfFileName ?? null) : tipoImport === 'dec_dbk' ? (decDbkFileName ?? null) : null,
      declaracao_completa: declaracaoExtraida ?? undefined,
      diagnostico: diagnosticoExtracao ? { completude: diagnosticoExtracao.completude, avisos: diagnosticoExtracao.avisos } : undefined,
      parser_version: decDbkParserVersion ?? undefined,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuinteNome.trim() || !contribuinteCpf.trim()) {
      showError('Preencha nome e CPF do contribuinte.');
      return;
    }
    const cpfDigits = contribuinteCpf.replace(/\D/g, '');
    if (cpfDigits.length === 11 && !validarCpf(contribuinteCpf)) {
      showError('CPF inválido. Verifique os dígitos.');
      return;
    }
    if (!saveCompanyId) {
      showError('Selecione uma empresa para salvar.');
      return;
    }
    setLoading(true);
    try {
      if (editingSimulationId) {
        const input = buildSaveInput();
        await irpfAltaRendaService.update(editingSimulationId, {
          ano: input.ano,
          dados: input.dados,
          title: input.title,
          company_id: input.company_id ?? null,
        });
        trackIrpfMetric('irpfm_simulation_updated', { ano: input.ano });
        success('Simulação atualizada.');
      } else {
        const input = buildSaveInput();
        await irpfAltaRendaService.simulateAndSave(input);
        trackIrpfMetric('irpfm_simulation_saved', {
          ano: input.ano,
          has_title: Boolean(input.title),
        });
        success('Simulação salva.');
      }
      setResult(null);
      setSaveTitle('');
      setSaveCompanyId('');
      setEditingSimulationId(null);
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuinteNome.trim() || !contribuinteCpf.trim()) {
      showError('Preencha nome e CPF do contribuinte.');
      return;
    }
    const cpfDigits = contribuinteCpf.replace(/\D/g, '');
    if (cpfDigits.length === 11 && !validarCpf(contribuinteCpf)) {
      showError('CPF inválido. Verifique os dígitos.');
      return;
    }
    if (!saveCompanyId) {
      showError('Selecione uma empresa para salvar.');
      return;
    }
    setLoading(true);
    try {
      const input = buildSaveInput();
      await irpfAltaRendaService.simulateAndSave(input);
      trackIrpfMetric('irpfm_simulation_saved', { ano: input.ano, has_title: Boolean(input.title) });
      success('Nova simulação salva.');
      setResult(null);
      setSaveTitle('');
      setSaveCompanyId('');
      setEditingSimulationId(null);
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item: IrpfAltaRendaRecord) => {
    setDeleteSimulacaoModal({ isOpen: true, item });
  };

  const handleDeleteConfirm = async () => {
    const item = deleteSimulacaoModal.item;
    if (!item) return;
    try {
      await irpfAltaRendaService.delete(item.id);
      success('Simulação excluída.');
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const applyPayloadFromRecord = (full: IrpfAltaRendaRecord) => {
    const payload = full.payload_json;
    const tipoImport = payload?.tipo_importacao ?? 'manual';
    setSelectedImportType(tipoImport === 'manual' ? 'manual' : tipoImport);
    if (tipoImport === 'pdf') {
      setPdfFileName(payload?.arquivo_nome ?? null);
      setDecDbkFileName(null);
    } else if (tipoImport === 'dec_dbk') {
      setDecDbkFileName(payload?.arquivo_nome ?? null);
      setPdfFileName(null);
    } else {
      setPdfFileName(null);
      setDecDbkFileName(null);
    }
    setDeclaracaoExtraida((payload?.declaracao_completa as DeclaracaoIrpfCompleta) ?? null);
    setDiagnosticoExtracao(
      payload?.diagnostico
        ? { completude: (payload.diagnostico.completude as 'alta' | 'media' | 'baixa') ?? 'media', avisos: payload.diagnostico.avisos ?? [] }
        : null
    );
    setDecDbkParserVersion(payload?.parser_version ?? null);

    const d = (payload?.dados ?? {
      contribuinte: { nome: full.contribuinte_nome, cpf: full.contribuinte_cpf },
      rendimentos_tributaveis: full.rendimentos_tributaveis,
      rendimentos_isentos_dividendos: full.dados_dividendos ?? [],
    }) as DadosIrpfAltaRenda;

    setAno(payload?.ano ?? full.ano);
    setContribuinteNome(d.contribuinte?.nome ?? full.contribuinte_nome);
    setContribuinteCpf((d.contribuinte?.cpf ?? full.contribuinte_cpf).replace(/\D/g, ''));
    setRendimentosTributaveis(d.rendimentos_tributaveis ?? full.rendimentos_tributaveis);

    const isentos09 = d.isentos_lucros_dividendos ?? [];
    const isentos13 = d.isentos_simples_nacional ?? [];
    const isentosLegado = d.rendimentos_isentos_dividendos ?? [];
    const fmt = (x: { nome_fonte?: string; fonte?: string; cnpj_fonte?: string; cnpj?: string; valor: number }, cod: '09' | '13') => {
      const nome = x.nome_fonte ?? x.fonte ?? '';
      const cnpj = x.cnpj_fonte ?? x.cnpj ?? '';
      const nomeFonte = nome && cnpj ? `${nome} (${cnpj})` : nome || cnpj;
      return { nome_fonte: nomeFonte, cnpj_fonte: cnpj || undefined, valor: x.valor ?? 0, codigo: cod };
    };
    const combined =
      isentos09.length > 0 || isentos13.length > 0
        ? [...isentos09.map((x: RendimentoIsentoDividendo) => fmt(x, '09')), ...isentos13.map((x: RendimentoIsentoDividendo) => fmt(x, '13'))]
        : isentosLegado.map((x) => ({
            nome_fonte: x.nome_fonte ?? '',
            cnpj_fonte: x.cnpj_fonte,
            valor: x.valor ?? 0,
            codigo: (x.codigo as '09' | '13') || '09',
          }));
    setDividendos(combined.length > 0 ? combined : [{ ...emptyDividendo }]);

    setLucrosAprovadosAte31dez2025((d as { lucros_aprovados_ate_31dez2025?: number }).lucros_aprovados_ate_31dez2025 ?? 0);
    const dd = d as {
      imposto_ja_pago_retencao_fonte?: number;
      imposto_ja_pago_carne_leao?: number;
      imposto_ja_pago_aplicacoes?: number;
      imposto_antecipado_dividendos?: number;
      ganho_capital_excluido?: number;
      rendimentos_fiis_excluidos?: number;
      outros_excluidos_art_16a?: number;
      outros_isentos_que_entram_base?: Array<{ descricao?: string; valor: number }>;
      rendimentos_tributados_exclusivamente_lei_7713?: Array<{ descricao?: string; valor_bruto: number; irrf?: number }>;
      optou_ajuste_anual_lei_7713?: boolean;
      rendimentos_aplicacoes_financeiras_pj?: number;
      aliquota_irrf_comparativo_percentual?: number;
      valor_hipotetico_comparativo_pf_pj?: number;
    };
    setImpostoJaPagoRetencao(dd.imposto_ja_pago_retencao_fonte ?? 0);
    setImpostoJaPagoCarneLeao(dd.imposto_ja_pago_carne_leao ?? 0);
    setImpostoJaPagoAplicacoes(dd.imposto_ja_pago_aplicacoes ?? 0);
    setImpostoAntecipadoDividendos(dd.imposto_antecipado_dividendos ?? 0);
    setGanhoCapitalExcluido(dd.ganho_capital_excluido ?? 0);
    setRendimentosFiisExcluidos(dd.rendimentos_fiis_excluidos ?? 0);
    setOutrosExcluidosArt16A(dd.outros_excluidos_art_16a ?? 0);
    setOutrosIsentosQueEntramBase(
      dd.outros_isentos_que_entram_base?.length
        ? dd.outros_isentos_que_entram_base.map((x) => ({ descricao: x.descricao ?? '', valor: x.valor ?? 0 }))
        : [{ descricao: '', valor: 0 }]
    );
    setRendimentosLei7713(
      dd.rendimentos_tributados_exclusivamente_lei_7713?.length
        ? dd.rendimentos_tributados_exclusivamente_lei_7713.map((x) => ({
            descricao: x.descricao ?? '',
            valor_bruto: x.valor_bruto ?? 0,
            irrf: x.irrf ?? 0,
          }))
        : [{ descricao: '', valor_bruto: 0, irrf: 0 }]
    );
    setOptouAjusteAnualLei7713(Boolean(dd.optou_ajuste_anual_lei_7713));
    setRendimentosAplicacoesPj(dd.rendimentos_aplicacoes_financeiras_pj ?? 0);
    setAliquotaIrrfComparativo(dd.aliquota_irrf_comparativo_percentual ?? 15);
    setValorHipoteticoComparativo(dd.valor_hipotetico_comparativo_pf_pj);
    setResult(full.resultado_simulacao);
    setManualFormStarted(true);
    setEtapa1Collapsed(true);
    setEtapa2Collapsed(false);
  };

  const handleOpenEditar = async (item: IrpfAltaRendaRecord, asNew = false) => {
    try {
      const full = await irpfAltaRendaService.getById(item.id);
      applyPayloadFromRecord(full);
      setEditingSimulationId(asNew ? null : full.id);
      setSaveCompanyId(full.company_id ?? '');
      setSaveTitle(full.title ?? '');
      success(asNew ? 'Simulação duplicada. Edite e salve como nova.' : 'Simulação carregada. Edite e salve ou salve como novo.');
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao carregar simulação');
    }
  };

  const filteredItems = listSearchContribuinte.trim()
    ? items.filter((i) =>
        i.contribuinte_nome.toLowerCase().includes(listSearchContribuinte.toLowerCase().trim())
      )
    : items;

  const applyExtractedData = (res: ExtractFromPdfResult & { parser_version?: number }) => {
    const d = res.dados;
    setAno(res.ano);
    setContribuinteNome(d.contribuinte.nome);
    setContribuinteCpf(d.contribuinte.cpf.replace(/\D/g, ''));
    setRendimentosTributaveis(d.rendimentos_tributaveis);

    const isentos09 = d.isentos_lucros_dividendos ?? [];
    const isentos13 = d.isentos_simples_nacional ?? [];
    const isentosLegado = d.rendimentos_isentos_dividendos ?? [];
    const fmt = (x: { nome_fonte?: string; fonte?: string; cnpj_fonte?: string; cnpj?: string; valor: number }, cod: '09' | '13') => {
      const nome = x.nome_fonte ?? x.fonte ?? '';
      const cnpj = x.cnpj_fonte ?? x.cnpj ?? '';
      const nomeFonte = nome && cnpj ? `${nome} (${cnpj})` : nome || cnpj;
      return { nome_fonte: nomeFonte, cnpj_fonte: cnpj || undefined, valor: x.valor ?? 0, codigo: cod };
    };
    const combined = isentos09.length > 0 || isentos13.length > 0
      ? [...isentos09.map((x) => fmt(x, '09')), ...isentos13.map((x) => fmt(x, '13'))]
      : isentosLegado.map((x) => ({ nome_fonte: x.nome_fonte ?? '', cnpj_fonte: x.cnpj_fonte, valor: x.valor ?? 0, codigo: (x.codigo as '09' | '13') || '09' }));
    setDividendos(combined.length > 0 ? combined : [{ ...emptyDividendo }]);
    setLucrosAprovadosAte31dez2025((d as { lucros_aprovados_ate_31dez2025?: number }).lucros_aprovados_ate_31dez2025 ?? 0);
    const dd = d as {
      imposto_ja_pago_retencao_fonte?: number;
      imposto_ja_pago_carne_leao?: number;
      imposto_ja_pago_aplicacoes?: number;
      imposto_antecipado_dividendos?: number;
      ganho_capital_excluido?: number;
      rendimentos_fiis_excluidos?: number;
      outros_excluidos_art_16a?: number;
      outros_isentos_que_entram_base?: Array<{ descricao?: string; valor: number }>;
      rendimentos_tributados_exclusivamente_lei_7713?: Array<{ descricao?: string; valor_bruto: number; irrf?: number }>;
      optou_ajuste_anual_lei_7713?: boolean;
    };
    setImpostoJaPagoRetencao(dd.imposto_ja_pago_retencao_fonte ?? 0);
    setImpostoJaPagoCarneLeao(dd.imposto_ja_pago_carne_leao ?? 0);
    setImpostoJaPagoAplicacoes(dd.imposto_ja_pago_aplicacoes ?? 0);
    setImpostoAntecipadoDividendos(dd.imposto_antecipado_dividendos ?? 0);
    setGanhoCapitalExcluido(dd.ganho_capital_excluido ?? 0);
    setRendimentosFiisExcluidos(dd.rendimentos_fiis_excluidos ?? 0);
    setOutrosExcluidosArt16A(dd.outros_excluidos_art_16a ?? 0);
    setOutrosIsentosQueEntramBase(
      dd.outros_isentos_que_entram_base?.length
        ? dd.outros_isentos_que_entram_base.map((x) => ({ descricao: x.descricao ?? '', valor: x.valor ?? 0 }))
        : [{ descricao: '', valor: 0 }]
    );
    setRendimentosLei7713(
      dd.rendimentos_tributados_exclusivamente_lei_7713?.length
        ? dd.rendimentos_tributados_exclusivamente_lei_7713.map((x) => ({
            descricao: x.descricao ?? '',
            valor_bruto: x.valor_bruto ?? 0,
            irrf: x.irrf ?? 0,
          }))
        : [{ descricao: '', valor_bruto: 0, irrf: 0 }]
    );
    setOptouAjusteAnualLei7713(Boolean(dd.optou_ajuste_anual_lei_7713));
    const rendPj = (d as { rendimentos_aplicacoes_financeiras_pj?: number }).rendimentos_aplicacoes_financeiras_pj ?? 0;
    setRendimentosAplicacoesPj(rendPj);

    setDeclaracaoExtraida(res.declaracao_completa ?? null);
    setDiagnosticoExtracao(res.diagnostico ? { completude: res.diagnostico.completude, avisos: res.diagnostico.avisos ?? [] } : null);
    const pv = (res as { parser_version?: number }).parser_version;
    setDecDbkParserVersion(typeof pv === 'number' ? pv : null);
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      showError('Selecione um arquivo PDF.');
      return;
    }
    setSelectedImportType('pdf');
    setPdfLoading(true);
    setProcessingStage('Enviando PDF...');
    setProcessingDetail('Preparando importação...');
    setProcessingProgress(8);
    const startedAt = Date.now();
    const updatePdfProgress = () => {
      const elapsedMs = Date.now() - startedAt;
      const activeStep =
        [...PDF_PROCESSING_STEPS].reverse().find((step) => elapsedMs >= step.minElapsedMs) ?? PDF_PROCESSING_STEPS[0];
      setProcessingStage(activeStep.stage);
      setProcessingDetail(activeStep.detail);
      setProcessingProgress(activeStep.progress);
    };
    const progressInterval = window.setInterval(updatePdfProgress, 1200);
    try {
      trackIrpfMetric('irpfm_pdf_upload_started');
      updatePdfProgress();
      const result = await irpfAltaRendaService.extractFromPdf(pdfFile);
      setProcessingStage('Preenchendo formulário automaticamente...');
      setProcessingDetail('Aplicando os dados extraídos nos campos.');
      setProcessingProgress(97);
      applyExtractedData(result);
      setProcessingProgress(100);
      trackIrpfMetric('irpfm_pdf_upload_success', { ano: result.ano });
      success('Dados extraídos do PDF. Revise e clique em Simular.');
      setPdfFileName((result as { arquivo_nome?: string }).arquivo_nome ?? pdfFile.name);
      setDecDbkFileName(null);
      setPdfFile(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao extrair dados do PDF');
    } finally {
      window.clearInterval(progressInterval);
      setPdfLoading(false);
      setProcessingStage('');
      setProcessingDetail('');
      setProcessingProgress(0);
    }
  };

  const handleDecDbkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decDbkFile) {
      showError('Selecione um arquivo .dec ou .dbk.');
      return;
    }
    setSelectedImportType('dec_dbk');
    setDecDbkLoading(true);
    setProcessingStage('Enviando arquivo .dec/.dbk...');
    setProcessingDetail('Realizando upload do arquivo para importação.');
    setProcessingProgress(20);
    try {
      trackIrpfMetric('irpfm_dec_dbk_upload_started');
      setProcessingStage('Lendo leiaute e classificando rendimentos...');
      setProcessingDetail('Interpretando estrutura interna do arquivo .dec/.dbk.');
      setProcessingProgress(65);
      const result = await irpfAltaRendaService.importDeclaration(decDbkFile);
      setProcessingStage('Aplicando dados no formulário...');
      setProcessingDetail('Transferindo dados para os campos do simulador.');
      setProcessingProgress(95);
      applyExtractedData(result);
      setProcessingProgress(100);
      trackIrpfMetric('irpfm_dec_dbk_upload_success', { ano: result.ano });
      success('Dados importados do arquivo .dec/.dbk. Revise e clique em Simular.');
      setDecDbkFileName((result as { arquivo_nome?: string }).arquivo_nome ?? decDbkFile.name);
      setPdfFileName(null);
      setDecDbkFile(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao importar arquivo .dec/.dbk');
    } finally {
      setDecDbkLoading(false);
      setProcessingStage('');
      setProcessingDetail('');
      setProcessingProgress(0);
    }
  };

  const handleCancelSimulacao = () => {
    setEditingSimulationId(null);
    setEtapa1Collapsed(false);
    setEtapa2Collapsed(false);
    setPdfFileName(null);
    setDecDbkFileName(null);
    setDeclaracaoExtraida(null);
    setDiagnosticoExtracao(null);
    setDiagnosticoAvisosExpanded(false);
    setDecDbkParserVersion(null);
    setPdfFile(null);
    setDecDbkFile(null);
    setSelectedImportType(null);
    setResult(null);
    setAno(CURRENT_YEAR);
    setContribuinteNome('');
    setContribuinteCpf('');
    setRendimentosTributaveis(0);
    setDividendos([{ ...emptyDividendo }]);
    setLucrosAprovadosAte31dez2025(0);
    setImpostoJaPagoRetencao(0);
    setImpostoJaPagoCarneLeao(0);
    setImpostoJaPagoAplicacoes(0);
    setImpostoAntecipadoDividendos(0);
    setGanhoCapitalExcluido(0);
    setRendimentosFiisExcluidos(0);
    setOutrosExcluidosArt16A(0);
    setOutrosIsentosQueEntramBase([{ descricao: '', valor: 0 }]);
    setRendimentosLei7713([{ descricao: '', valor_bruto: 0, irrf: 0 }]);
    setOptouAjusteAnualLei7713(false);
    setRendimentosAplicacoesPj(0);
    setImportSectionKey((k) => k + 1);
    setManualFormStarted(false);
    success('Simulação cancelada. Escolha novamente o tipo de importação.');
  };

  const hasLoadedData = Boolean(declaracaoExtraida) ||
    contribuinteNome.trim() !== '' ||
    contribuinteCpf.trim() !== '' ||
    rendimentosTributaveis > 0 ||
    dividendos.some((d) => (d.valor ?? 0) > 0);

  const showFormSection = (selectedImportType === 'manual' && manualFormStarted) || hasLoadedData;

  const prevShowFormRef = useRef(false);
  useEffect(() => {
    if (showFormSection && !prevShowFormRef.current) setEtapa1Collapsed(true);
    prevShowFormRef.current = showFormSection;
  }, [showFormSection]);

  const getSelectedImportLabel = () => {
    if (selectedImportType === 'pdf') return 'PDF (DAA / Declaração)';
    if (selectedImportType === 'dec_dbk') return '.dec ou .dbk';
    if (selectedImportType === 'manual') return 'Inserção manual';
    return '';
  };

  const getSelectedImportIcon = () => {
    if (selectedImportType === 'pdf') return '/irpf-icon-pdf.png';
    if (selectedImportType === 'dec_dbk') return '/irpf-icon-dec-dbk.png';
    if (selectedImportType === 'manual') return '/irpf-icon-manual.png';
    return null;
  };

  return (
    <Layout>
      <ToastContainer />
      <RemoveConfirmModal
        isOpen={removeConfirmModal.isOpen}
        onClose={() => setRemoveConfirmModal({ ...removeConfirmModal, isOpen: false })}
        onConfirm={handleRemoveConfirm}
        title="Confirmar remoção"
        message='Este item contém dados preenchidos. Para remover, digite "remover" no campo abaixo.'
      />
      <RemoveConfirmModal
        isOpen={deleteSimulacaoModal.isOpen}
        onClose={() => setDeleteSimulacaoModal({ isOpen: false, item: null })}
        onConfirm={handleDeleteConfirm}
        title="Excluir simulação"
        message={
          deleteSimulacaoModal.item
            ? `Excluir a simulação de ${deleteSimulacaoModal.item.contribuinte_nome} (${deleteSimulacaoModal.item.ano})? Esta ação não pode ser desfeita. Digite "remover" para confirmar.`
            : ''
        }
      />
      <div className="space-y-5">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            Simulador de Tributação de Alta Renda – IRPFM
          </h1>
          <button
            type="button"
            onClick={() => setInfoModalLei(true)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-colors"
            aria-label="Informações sobre a Lei 15.270/2025"
            title="Lei 15.270/2025"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <p className="text-sm sm:text-base text-slate-600 mt-0 mb-1">
          Simule o imposto complementar da alta renda, compare cenários e explore alternativas de planejamento.
        </p>
        <div className="max-w-4xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-900">
          <p className="font-medium">
            Simulação para planejamento tributário – não substitui a Declaração de Ajuste Anual (DAA) nem parecer jurídico-tributário.
          </p>
          <p className="mt-0.5 text-amber-800">
            Consulte seu contador ou advogado para validação dos resultados e enquadramento à Lei 15.270/2025.
          </p>
        </div>
        <InfoModal
          isOpen={infoModalLei}
          onClose={() => setInfoModalLei(false)}
          title="Lei 15.270/2025 (Art. 16-A)"
          size="md"
        >
          <p>
            Esta legislação alterou a tributação de rendimentos de alta renda, incluindo novas alíquotas e regras para dividendos. Nossa ferramenta simula o impacto dessas alterações e explora estratégias para otimizar sua carga tributária, comparando cenários pré e pós-lei.
          </p>
          <p className="mt-2">
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline font-medium"
            >
              Ver lei na íntegra →
            </a>
          </p>
        </InfoModal>

        <div className="space-y-6">
        <Card
          key={importSectionKey}
          onClick={showFormSection && etapa1Collapsed ? () => setEtapa1Collapsed(false) : undefined}
          className={`w-full ${showFormSection && etapa1Collapsed ? '!p-5 cursor-pointer' : ''}`}
          title={
            showFormSection ? (
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 font-normal">Etapa 1 concluída:</span>
                  <span className="inline-flex items-center gap-2 text-brand font-semibold">
                    {getSelectedImportIcon() && (
                      <img src={getSelectedImportIcon()!} alt="" className="w-6 h-6 object-contain" />
                    )}
                    {getSelectedImportLabel()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEtapa1Collapsed((c) => !c); }}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
                  aria-label={etapa1Collapsed ? 'Expandir Etapa 1' : 'Recolher Etapa 1'}
                  title={etapa1Collapsed ? 'Expandir' : 'Recolher'}
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${etapa1Collapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            ) : (
              'Etapa 1: Tipo de importação'
            )
          }
        >
          {showFormSection && etapa1Collapsed ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-600">
                    {selectedImportType === 'manual'
                      ? 'Preencha os dados abaixo e clique em Simular.'
                      : 'Dados carregados. Revise abaixo e clique em Simular.'}
                  </p>
                  {(pdfFileName || decDbkFileName) && (
                    <p className="text-xs text-slate-500 mt-1 font-mono truncate max-w-md" title={pdfFileName || decDbkFileName || undefined}>
                      Arquivo: {pdfFileName || decDbkFileName}
                      {editingSimulationId && (
                        <span className="block text-slate-400 mt-0.5 normal-case">
                          Simulação importada. O arquivo original não está armazenado.
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-sm border border-emerald-200/60">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {selectedImportType === 'manual' ? 'Preenchimento manual' : 'Dados extraídos'}
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleCancelSimulacao(); }}>
                    Cancelar Simulação
                  </Button>
                </div>
              </div>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card PDF */}
            <div
              role="button"
              tabIndex={showFormSection ? -1 : 0}
              onClick={() => !showFormSection && setSelectedImportType('pdf')}
              onKeyDown={(e) => !showFormSection && (e.key === 'Enter' || e.key === ' ') && setSelectedImportType('pdf')}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-200 ${
                showFormSection
                  ? 'opacity-50 cursor-default'
                  : selectedImportType === 'pdf'
                    ? 'border-brand bg-white shadow-lg cursor-pointer opacity-100'
                    : selectedImportType === null
                      ? 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'
                      : 'border-slate-200 bg-white opacity-60 cursor-pointer'
              }`}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setInfoModalPdf(true); }}
                className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                aria-label="Mais informações"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex flex-col items-center flex-1">
                <img src="/irpf-icon-pdf.png" alt="" className="w-28 h-28 object-contain mb-4" />
                <h3 className={`font-bold text-lg ${selectedImportType === 'pdf' ? 'text-brand' : 'text-slate-700'}`}>PDF (DAA / Declaração)</h3>
              </div>
              <form onSubmit={handlePdfUpload} className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <label
                  className={`block rounded-xl border-2 border-dashed py-4 px-3 text-center cursor-pointer transition-colors ${pdfDropActive ? 'border-brand bg-brand/10' : selectedImportType === 'pdf' ? 'border-brand/50 bg-brand/5 hover:border-brand hover:bg-brand/10' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
                  onDragOver={(e) => { e.preventDefault(); setPdfDropActive(true); }}
                  onDragLeave={() => setPdfDropActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setPdfDropActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file?.type === 'application/pdf') {
                      setPdfFile(file);
                      setSelectedImportType('pdf');
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  {pdfFile ? (
                    <p className="text-sm font-medium text-brand truncate max-w-full">{pdfFile.name}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Solte o PDF aqui</p>
                  )}
                </label>
                <Button type="submit" disabled={pdfLoading || !pdfFile} className="w-full">
                  {pdfLoading ? 'Extraindo...' : 'Extrair dados'}
                </Button>
              </form>
            </div>

            {/* Card .dec /.dbk */}
            <div
              role="button"
              tabIndex={showFormSection ? -1 : 0}
              onClick={() => !showFormSection && setSelectedImportType('dec_dbk')}
              onKeyDown={(e) => !showFormSection && (e.key === 'Enter' || e.key === ' ') && setSelectedImportType('dec_dbk')}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-200 ${
                showFormSection
                  ? 'opacity-50 cursor-default'
                  : selectedImportType === 'dec_dbk'
                    ? 'border-brand bg-white shadow-lg cursor-pointer opacity-100'
                    : selectedImportType === null
                      ? 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'
                      : 'border-slate-200 bg-white opacity-60 cursor-pointer'
              }`}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setInfoModalDecDbk(true); }}
                className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                aria-label="Mais informações"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex flex-col items-center flex-1">
                <img src="/irpf-icon-dec-dbk.png" alt="" className="w-28 h-28 object-contain mb-4" />
                <h3 className={`font-bold text-lg ${selectedImportType === 'dec_dbk' ? 'text-brand' : 'text-slate-700'}`}>.dec ou .dbk</h3>
              </div>
              <form onSubmit={handleDecDbkUpload} className="space-y-3" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <label
                  className={`block rounded-xl border-2 border-dashed py-4 px-3 text-center cursor-pointer transition-colors ${decDbkDropActive ? 'border-brand bg-brand/10' : selectedImportType === 'dec_dbk' ? 'border-brand bg-white hover:bg-brand/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDecDbkDropActive(true); setSelectedImportType('dec_dbk'); }}
                  onDragLeave={(e) => { e.preventDefault(); setDecDbkDropActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDecDbkDropActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith('.dec') || file.name.endsWith('.dbk'))) {
                      setDecDbkFile(file);
                      setSelectedImportType('dec_dbk');
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".dec,.dbk"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setDecDbkFile(f);
                      if (f) setSelectedImportType('dec_dbk');
                    }}
                    className="hidden"
                  />
                  <span className={`text-sm font-medium block truncate max-w-full ${decDbkFile ? 'text-brand' : 'text-slate-500'}`}>
                    {decDbkFile ? decDbkFile.name : 'Solte o arquivo aqui'}
                  </span>
                </label>
                <Button type="submit" disabled={decDbkLoading || !decDbkFile} className="w-full">
                  {decDbkLoading ? 'Importando...' : 'Importar'}
                </Button>
              </form>
            </div>

            {/* Card Inserção manual - clique seleciona o tipo; botão "Começar preenchimento" abre o formulário */}
            <div
              role="button"
              tabIndex={showFormSection ? -1 : 0}
              onClick={() => !showFormSection && setSelectedImportType('manual')}
              onKeyDown={(e) => {
                if (!showFormSection && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setSelectedImportType('manual');
                }
              }}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-200 ${
                showFormSection
                  ? 'opacity-50 cursor-default'
                  : selectedImportType === 'manual'
                    ? 'border-brand bg-white shadow-lg cursor-pointer opacity-100'
                    : selectedImportType === null
                      ? 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'
                      : 'border-slate-200 bg-white opacity-60 cursor-pointer'
              }`}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setInfoModalManual(true); }}
                className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors z-10"
                aria-label="Mais informações sobre inserção manual"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="flex flex-col items-center flex-1">
                <img src="/irpf-icon-manual.png" alt="" className="w-28 h-28 object-contain mb-4" />
                <h3 className={`font-bold text-lg ${selectedImportType === 'manual' ? 'text-brand' : 'text-slate-700'}`}>Inserção manual</h3>
              </div>
              <Button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedImportType === 'manual' && !showFormSection) {
                    setManualFormStarted(true);
                  }
                }}
                disabled={selectedImportType !== 'manual' || showFormSection}
                className="w-full"
              >
                Começar preenchimento manual
              </Button>
            </div>
          </div>
          <p
            className="mt-4 text-xs text-slate-500"
            title="Atalhos de demo para preencher rapidamente cenários de teste"
          >
            Atalhos: Ctrl+D+1 (básico), Ctrl+D+2 (otimização), Ctrl+D+3 (alta base)
          </p>
          {showFormSection && !etapa1Collapsed && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <Button type="button" variant="secondary" size="sm" onClick={handleCancelSimulacao}>
                Cancelar Simulação
              </Button>
            </div>
          )}
          </>
          )}
        </Card>

        {processingStage && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-700 font-medium">{processingStage}</p>
              <span className="text-xs font-semibold text-slate-600">{Math.max(0, Math.min(100, Math.round(processingProgress)))}%</span>
            </div>
            {processingDetail && (
              <p className="mt-1 text-xs text-slate-500">{processingDetail}</p>
            )}
            <div className="mt-2 h-2 rounded bg-slate-200 overflow-hidden">
              <div
                className="h-2 bg-brand transition-all duration-700 ease-out"
                style={{ width: `${Math.max(8, Math.min(100, processingProgress))}%` }}
              />
            </div>
          </div>
        )}

        <InfoModal
          isOpen={infoModalPdf}
          onClose={() => setInfoModalPdf(false)}
          title="Importar PDF (DAA / Declaração IRPF)"
          size="md"
        >
          <p>
            Para análise rápida, anexe o PDF da sua declaração ou do DAA. A extração automática (IA) preenche nome, CPF, ano, rendimentos tributáveis e dividendos. Revise os dados antes de simular.
          </p>
        </InfoModal>

        <InfoModal
          isOpen={infoModalDecDbk}
          onClose={() => setInfoModalDecDbk(false)}
          title="Importar .dec ou .dbk"
          size="md"
        >
          <p>
            Para importação mais completa e precisa, use o arquivo .dec (após transmitir) ou .dbk (backup) do Programa IRPF, ou obtenha no e-CAC em Documentos e Arquivos → Cópia da Declaração. Esses formatos garantem que todos os detalhes sejam considerados na simulação.
          </p>
        </InfoModal>

        <InfoModal
          isOpen={infoModalManual}
          onClose={() => setInfoModalManual(false)}
          title="Inserção manual"
          size="md"
        >
          <p>
            Na inserção manual, você preenche todos os dados da declaração diretamente nos campos do formulário: nome e CPF do contribuinte, ano-calendário, rendimentos tributáveis, dividendos por fonte, exclusões legais (lucros aprovados até 31/12/2025, ganho de capital, FIIs, etc.), impostos já pagos e demais ajustes. Ideal quando não possui PDF ou arquivo .dec/.dbk, ou quando precisa simular cenários hipotéticos do zero.
          </p>
          <p className="mt-2">
            Após clicar em &quot;Iniciar preenchimento&quot;, o formulário completo será exibido para você digitar ou editar os valores. Revise os dados e clique em &quot;Simular&quot; para obter o resultado.
          </p>
        </InfoModal>

        <ReportExportChoiceModal
          isOpen={pdfExportModalOpen}
          onClose={() => setPdfExportModalOpen(false)}
          title="Exportar para PDF"
          intro="O que deseja incluir no PDF?"
          optionA={{
            title: 'Apenas resultado',
            description: 'KPIs, tabelas, gráficos, sugestões de planejamento e memória de cálculo.',
            onSelect: () => startPdfExport(false),
          }}
          optionB={{
            title: 'Resultado + parâmetros',
            description: 'Inclui os parâmetros da simulação (Etapa 2) antes do resultado.',
            onSelect: () => startPdfExport(true),
          }}
        />

        {pdfExporting && result && (
          <div
            ref={pdfContainerRef}
            id="irpf-pdf-content"
            className="fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-slate-200/90 p-6 text-slate-900"
            style={{ boxSizing: 'border-box' }}
          >
            <div
              ref={pdfContentRef}
              id="irpf-pdf-export-root"
              className="report-html2pdf-root bg-white shadow-xl p-6 w-full"
              style={{ width: '194mm', minWidth: '194mm', maxWidth: '194mm', boxSizing: 'border-box' }}
            >
            <div className="keep space-y-2 mb-4 pb-3 border-b border-slate-200">
              <p className="text-xs text-slate-500">
                Simulado em{' '}
                {new Date().toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-slate-600 italic">
                Simulação para fins de planejamento tributário. Não substitui a apuração oficial da DAA. Consulte seu contador ou advogado.
              </p>
              <p className="text-xs text-slate-600">
                Base legal: Lei 15.270/2025 – Art. 16-A
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>
                  Faixa: {result.faixa === 'isento' ? 'Isento' : result.faixa === 'progressiva' ? 'Progressiva (até 10%)' : 'Fixa 10%'}
                </span>
                <span>
                  Alíquota efetiva:{' '}
                  {result.base_calculo_combinada > 0
                    ? ((result.imposto_estimado / result.base_calculo_combinada) * 100).toFixed(2)
                    : '0'}%
                </span>
                {result.risco_retencao_mensal && (
                  <span className="text-amber-700">
                    Risco de retenção mensal (10% na fonte). Avaliação indicativa: média anual; gatilho real &gt; R$ 50.000/mês.
                  </span>
                )}
              </div>
            </div>
            {pdfExportIncludeParams && (
              <ParametrosSimulacaoPrint
                contribuinteNome={contribuinteNome}
                contribuinteCpf={contribuinteCpf}
                ano={ano}
                rendimentosTributaveis={rendimentosTributaveis}
                dividendos={dividendos}
                lucrosAprovadosAte31dez2025={lucrosAprovadosAte31dez2025}
                ganhoCapitalExcluido={ganhoCapitalExcluido}
                rendimentosFiisExcluidos={rendimentosFiisExcluidos}
                outrosExcluidosArt16A={outrosExcluidosArt16A}
                outrosIsentosQueEntramBase={outrosIsentosQueEntramBase}
                rendimentosLei7713={rendimentosLei7713}
                optouAjusteAnualLei7713={optouAjusteAnualLei7713}
                impostoJaPagoRetencao={impostoJaPagoRetencao}
                impostoJaPagoCarneLeao={impostoJaPagoCarneLeao}
                impostoJaPagoAplicacoes={impostoJaPagoAplicacoes}
                impostoAntecipadoDividendos={impostoAntecipadoDividendos}
                bccCalculado={bccCalculado}
              />
            )}
            <div ref={pdfResultPlaceholderRef} className="irpf-pdf-resultado" />
            </div>
          </div>
        )}

        {showFormSection && (
        <Card
          title={
            <div className="flex items-center justify-between gap-3 w-full">
              <span>
                {etapa2Collapsed ? 'Etapa 2 concluída:' : 'Etapa 2: Dados do IRPF'}
                {etapa2Collapsed && (
                  <span className="ml-2 text-slate-600 font-normal">
                    {contribuinteNome || '—'} · BCC: {formatCurrency(bccCalculado)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setEtapa2Collapsed((c) => !c)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
                aria-label={etapa2Collapsed ? 'Expandir Etapa 2' : 'Recolher Etapa 2'}
                title={etapa2Collapsed ? 'Expandir' : 'Recolher'}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${etapa2Collapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          }
          className={`w-full ${etapa2Collapsed ? '!p-5' : ''}`}
        >
          {etapa2Collapsed ? (
            <p className="text-sm text-slate-600">
              Clique na seta acima para editar os dados e simular novamente.
            </p>
          ) : (
          <>
          {diagnosticoExtracao && (diagnosticoExtracao.completude === 'media' || diagnosticoExtracao.completude === 'baixa') && (
            <div
              className="mb-4 p-4 rounded-lg border border-amber-300 bg-amber-50"
              role="alert"
              aria-live="polite"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="font-medium text-amber-900">
                  Revise os dados extraídos – confiabilidade {diagnosticoExtracao.completude === 'media' ? 'média' : 'baixa'}
                </p>
                {diagnosticoExtracao.avisos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiagnosticoAvisosExpanded((e) => !e)}
                    className="text-sm font-medium text-amber-800 hover:text-amber-900 underline shrink-0"
                  >
                    {diagnosticoAvisosExpanded ? 'Ocultar avisos' : 'Ver avisos'}
                  </button>
                )}
              </div>
              {diagnosticoAvisosExpanded && diagnosticoExtracao.avisos.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm text-amber-900 space-y-1">
                  {diagnosticoExtracao.avisos.map((aviso, idx) => (
                    <li key={idx}>{mensagemAmigavel(aviso)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {declaracaoExtraida && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm space-y-3">
              <p className="font-medium text-emerald-800">
                Declaração extraída
                {declaracaoExtraida.fonte === 'dec_dbk' && (
                  decDbkParserVersion === 2
                    ? ' — Parser .dbk corrigido (v2)'
                    : ' — Se os valores estiverem incorretos, tente reimportar o arquivo ou use o preenchimento manual'
                )}
              </p>
              {diagnosticoExtracao && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <p className="font-medium">Confiabilidade da extração: {diagnosticoExtracao.completude}</p>
                  {diagnosticoExtracao.avisos.length > 0 && (
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      {diagnosticoExtracao.avisos.map((aviso, idx) => (
                        <li key={idx}>{mensagemAmigavel(aviso)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {declaracaoExtraida.rendimentos_tributaveis_pj?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Rendimentos PJ:</span>
                  <ul className="list-disc list-inside ml-2">
                    {declaracaoExtraida.rendimentos_tributaveis_pj.itens.map((p, i) => (
                      <li key={i}>{p.nome_fonte || p.cnpj || 'Fonte'}: {formatCurrency(p.valor)}</li>
                    ))}
                  </ul>
                  <p className="text-emerald-700 mt-1">Total: {formatCurrency(declaracaoExtraida.rendimentos_tributaveis_pj.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.rendimentos_tributaveis_pf?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Rendimentos PF (aluguéis, carnê-leão):</span>
                  <p className="ml-2">Total: {formatCurrency(declaracaoExtraida.rendimentos_tributaveis_pf.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.rendimentos_isentos_nao_tributaveis?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Isentos (códigos 09, 13, etc.):</span>
                  <p className="ml-2">Total: {formatCurrency(declaracaoExtraida.rendimentos_isentos_nao_tributaveis.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.bens_direitos?.itens?.length > 0 && (
                <div>
                  <span className="text-emerald-700">Bens e direitos:</span>
                  <p className="ml-2">Total: {formatCurrency(declaracaoExtraida.bens_direitos.total ?? 0)}</p>
                </div>
              )}
              {declaracaoExtraida.resumo?.base_calculo_ir != null && declaracaoExtraida.resumo.base_calculo_ir > 0 && (
                <div className="pt-2 border-t border-emerald-200">
                  <span className="text-emerald-700 font-medium">Resumo:</span>
                  <p className="ml-2">Base IR: {formatCurrency(declaracaoExtraida.resumo.base_calculo_ir)} | Imposto: {formatCurrency(declaracaoExtraida.resumo.imposto_devido ?? 0)}</p>
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSimulate} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do contribuinte"
                value={contribuinteNome}
                onChange={(e) => setContribuinteNome(e.target.value)}
                placeholder="Nome completo"
              />
              <div className="w-full">
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-sm font-medium text-slate-700">CPF</label>
                  <span
                    className="inline-flex text-slate-400 hover:text-slate-600 cursor-help"
                    title="CPF com validação de dígitos verificadores."
                    aria-label="CPF com validação de dígitos verificadores"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
                <input
                  value={contribuinteCpf}
                  onChange={(e) => setContribuinteCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-white border border-slate-200 rounded-md px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano da declaração</label>
                <select
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-md px-4 py-2 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <MoneyInput
                label="Rendimentos tributáveis (RT) – Pro-labore, salários PJ, aluguéis"
                value={rendimentosTributaveis}
                onChange={setRendimentosTributaveis}
              />
            </div>

            <IrpfFormAccordionSection title="Dividendos e isentos que entram na base" defaultOpen={true}>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Rendimentos isentos – Lucros e dividendos (09) e Sócio Simples (13)
                </label>
                <Button type="button" variant="secondary" size="sm" onClick={addDividendo} className="self-start sm:self-auto shrink-0">
                  + Adicionar fonte
                </Button>
              </div>
              <div className="rounded-md border border-slate-200 overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm min-w-[320px] sm:min-w-[420px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-1.5 px-2 sm:px-3 font-medium text-slate-700 min-w-[160px] sm:min-w-[180px]">Tipo</th>
                      <th className="text-left py-1.5 px-2 sm:px-3 font-medium text-slate-700">Nome/CNPJ fonte</th>
                      <th className="text-right py-1.5 px-2 sm:px-3 font-medium text-slate-700 min-w-[140px]">Valor</th>
                      <th className="w-14 py-1.5 px-2 sm:px-3 text-center" aria-hidden="true">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividendos.map((d, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-[160px] sm:min-w-[180px]">
                          <select
                            value={d.codigo || '09'}
                            onChange={(e) => updateDividendo(i, 'codigo', e.target.value)}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                            aria-label={`Tipo/código do item ${i + 1}`}
                          >
                            <option value="09">09 – Dividendos</option>
                            <option value="13">13 – Sócio Simples</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-0">
                          <input
                            type="text"
                            placeholder="Nome/CNPJ fonte"
                            value={d.nome_fonte ?? ''}
                            onChange={(e) => updateDividendo(i, 'nome_fonte', e.target.value)}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                            aria-label={`Nome ou CNPJ da fonte ${i + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-[140px]">
                          <MoneyInput
                            value={d.valor ?? 0}
                            onChange={(v) => updateDividendo(i, 'valor', v)}
                            className="w-full min-w-[120px] py-1.5 px-2 sm:px-3 text-sm font-mono tabular-nums"
                            aria-label={`Valor da fonte ${i + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveClick('dividendo', i, hasDividendoData(d))}
                            disabled={dividendos.length <= 1}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500 transition-colors"
                            aria-label={`Remover linha ${i + 1}`}
                            title="Excluir linha"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-xs font-medium hidden sm:inline">Excluir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-medium">
                      <td className="py-1.5 px-2 sm:px-3 text-slate-700" colSpan={2}>
                        Total
                      </td>
                      <td className="py-1.5 px-2 sm:px-3 text-right font-mono tabular-nums">
                        {formatCurrency(dividendos.reduce((s, d) => s + (d.valor ?? 0), 0))}
                      </td>
                      <td className="py-1.5 px-2 sm:px-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-slate-700">Outros isentos que entram na base mínima</p>
                <Button type="button" variant="secondary" size="sm" onClick={addOutroIsento} className="self-start sm:self-auto shrink-0">
                  + Adicionar item
                </Button>
              </div>
              <div className="rounded-md border border-slate-200 overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm min-w-[320px] sm:min-w-[420px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-1.5 px-2 sm:px-3 font-medium text-slate-700">Descrição</th>
                      <th className="text-right py-1.5 px-2 sm:px-3 font-medium text-slate-700 min-w-[140px]">Valor</th>
                      <th className="w-14 py-1.5 px-2 sm:px-3 text-center" aria-hidden="true">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outrosIsentosQueEntramBase.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-0">
                          <input
                            type="text"
                            placeholder="Descrição do ativo/rendimento"
                            value={item.descricao}
                            onChange={(e) => updateOutroIsento(index, 'descricao', e.target.value)}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                            aria-label={`Descrição do item ${index + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-[140px]">
                          <MoneyInput
                            value={item.valor}
                            onChange={(v) => updateOutroIsento(index, 'valor', v)}
                            className="w-full min-w-[120px] py-1.5 px-2 sm:px-3 text-sm font-mono tabular-nums"
                            aria-label={`Valor do item ${index + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveClick('outroIsento', index, hasOutroIsentoData(item))}
                            disabled={outrosIsentosQueEntramBase.length <= 1}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500 transition-colors"
                            aria-label={`Remover linha ${index + 1}`}
                            title="Excluir linha"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-xs font-medium hidden sm:inline">Excluir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-medium">
                      <td className="py-1.5 px-2 sm:px-3 text-slate-700">Total</td>
                      <td className="py-1.5 px-2 sm:px-3 text-right font-mono tabular-nums">
                        {formatCurrency(outrosIsentosQueEntramBase.reduce((s, i) => s + (i.valor ?? 0), 0))}
                      </td>
                      <td className="py-1.5 px-2 sm:px-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            </IrpfFormAccordionSection>

            <IrpfFormAccordionSection title="Exclusões da base (Art. 16-A § 1º)" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <LabelWithTooltip
                  label="Lucros aprovados até 31/12/2025"
                  tooltip="Regra de transição (Art. 16-A § 1º XII): lucros e dividendos aprovados até 31/12/2025 ficam excluídos da base de cálculo."
                />
                <MoneyInput value={lucrosAprovadosAte31dez2025} onChange={setLucrosAprovadosAte31dez2025} />
              </div>
              <div>
                <LabelWithTooltip
                  label="Ganho de capital excluído"
                  tooltip="Art. 16-A § 1º I: ganho de capital fora de bolsa/mercado organizado (ex.: venda de imóvel) não entra na BCC."
                />
                <MoneyInput value={ganhoCapitalExcluido} onChange={setGanhoCapitalExcluido} />
              </div>
              <div>
                <LabelWithTooltip
                  label="Rendimentos FIIs excluídos"
                  tooltip="Art. 16-A § 1º V-j: FIIs com 100+ cotistas são excluídos da base de cálculo da tributação mínima."
                />
                <MoneyInput value={rendimentosFiisExcluidos} onChange={setRendimentosFiisExcluidos} />
              </div>
              <div>
                <LabelWithTooltip
                  label="Outros excluídos Art. 16-A (CRI, CRA, LCI, LCA...)"
                  tooltip="Ativos incentivados: CRI, CRA, LCI, LCA, LIG, poupança e debêntures de infraestrutura – não entram na base de cálculo."
                />
                <MoneyInput value={outrosExcluidosArt16A} onChange={setOutrosExcluidosArt16A} />
              </div>
            </div>
            </IrpfFormAccordionSection>

            <IrpfFormAccordionSection title="Lei 7.713, deduções e comparativo PF vs PJ" defaultOpen={false}>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-slate-700">Tributados exclusivamente na fonte (Lei 7.713)</p>
                <Button type="button" variant="secondary" size="sm" onClick={addLei7713} className="self-start sm:self-auto shrink-0">
                  + Adicionar item
                </Button>
              </div>
              <label className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                <input
                  type="checkbox"
                  checked={optouAjusteAnualLei7713}
                  onChange={(e) => setOptouAjusteAnualLei7713(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  O contribuinte optou pelo ajuste anual para rendimentos do art. 12-A da Lei 7.713.
                  Nesse caso, esses valores não devem ser tratados como exclusão da base mínima.
                </span>
              </label>
              <div className="rounded-md border border-slate-200 overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm min-w-[320px] sm:min-w-[420px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-1.5 px-2 sm:px-3 font-medium text-slate-700">Descrição</th>
                      <th className="text-right py-1.5 px-2 sm:px-3 font-medium text-slate-700 min-w-[140px]">Valor bruto</th>
                      <th className="text-right py-1.5 px-2 sm:px-3 font-medium text-slate-700 min-w-[120px]">IRRF</th>
                      <th className="w-14 py-1.5 px-2 sm:px-3 text-center" aria-hidden="true">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rendimentosLei7713.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-0">
                          <input
                            type="text"
                            placeholder="Descrição"
                            value={item.descricao}
                            onChange={(e) => updateLei7713(index, 'descricao', e.target.value)}
                            className="w-full min-w-0 bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                            aria-label={`Descrição do item Lei 7.713 ${index + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-[140px]">
                          <MoneyInput
                            value={item.valor_bruto}
                            onChange={(v) => updateLei7713(index, 'valor_bruto', v)}
                            className="w-full min-w-[120px] py-1.5 px-2 sm:px-3 text-sm font-mono tabular-nums"
                            aria-label={`Valor bruto do item ${index + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle min-w-[120px]">
                          <MoneyInput
                            value={item.irrf}
                            onChange={(v) => updateLei7713(index, 'irrf', v)}
                            className="w-full min-w-[100px] py-1.5 px-2 sm:px-3 text-sm font-mono tabular-nums"
                            aria-label={`IRRF do item ${index + 1}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 sm:px-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveClick('lei7713', index, hasLei7713Data(item))}
                            disabled={rendimentosLei7713.length <= 1}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500 transition-colors"
                            aria-label={`Remover linha ${index + 1}`}
                            title="Excluir linha"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-xs font-medium hidden sm:inline">Excluir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-medium">
                      <td className="py-1.5 px-2 sm:px-3 text-slate-700">Total</td>
                      <td className="py-1.5 px-2 sm:px-3 text-right font-mono tabular-nums">
                        {formatCurrency(rendimentosLei7713.reduce((s, i) => s + (i.valor_bruto ?? 0), 0))}
                      </td>
                      <td className="py-1.5 px-2 sm:px-3 text-right font-mono tabular-nums">
                        {formatCurrency(rendimentosLei7713.reduce((s, i) => s + (i.irrf ?? 0), 0))}
                      </td>
                      <td className="py-1.5 px-2 sm:px-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">IR já pago (deduções do imposto mínimo – Art. 16-A § 3º)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MoneyInput label="Retenção na fonte (pró-labore, salários)" value={impostoJaPagoRetencao} onChange={setImpostoJaPagoRetencao} />
                <MoneyInput label="Carnê-leão" value={impostoJaPagoCarneLeao} onChange={setImpostoJaPagoCarneLeao} />
                <MoneyInput label="Aplicações financeiras (tributação exclusiva)" value={impostoJaPagoAplicacoes} onChange={setImpostoJaPagoAplicacoes} />
                <MoneyInput label="Antecipado dividendos (10% retido – Art. 6º-A)" value={impostoAntecipadoDividendos} onChange={setImpostoAntecipadoDividendos} />
                <MoneyInput
                  label="Rend. aplicações financeiras na PJ (diagnóstico PF vs PJ)"
                  value={rendimentosAplicacoesPj}
                  onChange={setRendimentosAplicacoesPj}
                />
                <MoneyInput
                  label="Valor hipotético para comparativo PF vs PJ (opcional)"
                  value={valorHipoteticoComparativo ?? 0}
                  onChange={(v) => setValorHipoteticoComparativo(v > 0 ? v : undefined)}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Alíquota IRRF % (comparativo PF vs PJ)
                  </label>
                  <select
                    value={aliquotaIrrfComparativo}
                    onChange={(e) => setAliquotaIrrfComparativo(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={15}>CDB curto / JCP (15%)</option>
                    <option value={22.5}>CDB longo &gt;720d (22,5%)</option>
                    <option value={20}>FII (20%)</option>
                    <option value={0}>Outro (0%)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-0.5">Usado no comparativo de custo tributário.</p>
                </div>
              </div>
            </div>
            </IrpfFormAccordionSection>

            <div className="pt-2 border-t border-slate-200">
              <IrpfBccCard bcc={bccCalculado} />
              <p className="text-xs text-slate-500 mt-2">
                Fórmula: RT + dividendos + outros isentos que entram na base − exclusões (lucros aprovados, ganho capital, FIIs, Art. 16-A)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Calculando...' : 'Simular'}
              </Button>
            </div>
          </form>
          </>
          )}
        </Card>
        )}

        {result && (
          <div ref={resultadoRef} id="etapa-3-resultado" className="space-y-4 scroll-mt-6">
          <div id="irpf-alta-renda-resultado-print" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Resultado da simulação – IRPF Alta Renda</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Ano {ano} · Contribuinte: {contribuinteNome || '—'} · BCC: {formatCurrency(result.base_calculo_combinada)}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenPdfModal}
                disabled={pdfExporting}
                className="print:hidden shrink-0 inline-flex items-center gap-2"
                aria-label="Exportar resultado para PDF"
                data-report-exclude="pdf"
              >
                {pdfExporting ? (
                  'Gerando PDF...'
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar para PDF
                  </>
                )}
              </Button>
            </div>
          <Card title="Etapa 3: Resultado da simulação" className="w-full keep">
            {(result as { aviso_ano_fora_vigencia?: string }).aviso_ano_fora_vigencia && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <strong>Atenção:</strong> {(result as { aviso_ano_fora_vigencia?: string }).aviso_ano_fora_vigencia}
              </div>
            )}
            <IrpfKpiCards
              impostoComplementar={result.imposto_estimado}
              impostoMinimo={result.imposto_minimo}
              deducoes={result.deducoes_imposto_ja_pago}
              economiaPotencial={result.otimizacao_isento_vs_tributado?.ganho_liquido_estimado}
              riscoRetencaoMensal={result.risco_retencao_mensal}
            />

            <div className="grid grid-cols-1 gap-6 pt-4">
              {/* Painel: tabelas Rendimentos + IRPFM (estilo modelo) */}
              <div className="space-y-4">
                <div className="rounded-md border border-emerald-200 overflow-hidden">
                  <div className="bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Rendimentos</div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700">Renda tributável (PJ + PF)</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.composicao_renda?.tributaveis ?? 0)}</td>
                      </tr>
                      <tr className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700">Renda isenta que entra na base</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.composicao_renda?.isentos_que_entram_base ?? 0)}</td>
                      </tr>
                      <tr className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700">Renda isenta excluída (dividendos 09/13)</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.composicao_renda?.isentos_excluidos ?? 0)}</td>
                      </tr>
                      {(result.composicao_renda?.tributacao_exclusiva_lei_7713 ?? 0) > 0 && (
                        <tr className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-700">Tributação exclusiva (Lei 7.713)</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.composicao_renda!.tributacao_exclusiva_lei_7713!)}</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-medium">
                        <td className="py-2 px-3 text-slate-800">Rendimentos totais (BCC)</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.base_calculo_combinada)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-md border border-red-200 overflow-hidden">
                  <div className="bg-red-600 px-3 py-2 text-sm font-semibold text-white">IRPFM (Art. 16-A)</div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700">Renda total para cálculo</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.base_calculo_combinada)}</td>
                      </tr>
                      <tr className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700">Alíquota mínima (%)</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{typeof result.aliquota_percentual === 'number' ? result.aliquota_percentual.toFixed(2) : result.aliquota_percentual}%</td>
                      </tr>
                      {result.imposto_minimo != null && result.imposto_minimo > 0 && (
                        <>
                          <tr className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-700">Imposto mínimo devido</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.imposto_minimo)}</td>
                          </tr>
                          <tr className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-700">Imposto de renda já recolhido</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(result.deducoes_imposto_ja_pago ?? 0)}</td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-amber-50 border-t-2 border-amber-300">
                        <td className="py-3 px-3 font-semibold text-amber-900">Valor a complementar</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-900">{formatCurrency(result.imposto_estimado)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-slate-500">Faixa: {result.faixa === 'isento' ? 'Isento' : result.faixa === 'progressiva' ? 'Progressiva (até 10%)' : 'Fixa 10%'}</p>

                <div className="rounded-md border border-slate-200 p-4">
                  <h4 className="text-sm font-medium text-slate-800 mb-3">Atual vs otimizado</h4>
                  <IrpfComparativoChart
                    atual={{
                      base: result.base_calculo_combinada,
                      impostoComplementar: result.imposto_estimado,
                    }}
                    otimizado={
                      result.otimizacao_isento_vs_tributado
                        ? {
                            base: result.otimizacao_isento_vs_tributado.bcc_cenario_otimizado,
                            impostoComplementar: result.otimizacao_isento_vs_tributado.imposto_complementar_otimizado,
                          }
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Painel direito: gráficos em coluna única (max 2 colunas na página, mais espaço para gráficos) */}
              <div className="flex flex-col gap-6">
                <div className="rounded-md border border-slate-200 p-4 min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-slate-800 mb-3">Composição da renda</h4>
                  <IrpfComposicaoChart
                    composicao={{
                      tributaveis: result.composicao_renda?.tributaveis ?? 0,
                      isentos_que_entram_base: result.composicao_renda?.isentos_que_entram_base ?? 0,
                      dividendos_09_13: (result.composicao_renda as { dividendos_09_13?: number } | undefined)?.dividendos_09_13,
                      isentos_excluidos: result.composicao_renda?.isentos_excluidos ?? 0,
                      tributacao_exclusiva_lei_7713: (result.composicao_renda as { tributacao_exclusiva_lei_7713?: number } | undefined)?.tributacao_exclusiva_lei_7713,
                    }}
                  />
                </div>
                <div className="rounded-md border border-slate-200 p-4 min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-slate-800 mb-3">Custo tributário: PF vs PJ</h4>
                  <IrpfCustoPfPjChart comparativo={(result as IrpfAltaRendaSimulacaoResponse & { comparativo_pf_pj?: ComparativoPfPj }).comparativo_pf_pj} />
                </div>
                {result.risco_retencao_mensal && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                    <h4 className="text-sm font-medium text-amber-800 mb-2">Risco de retenção mensal (10% na fonte)</h4>
                    <p className="text-sm text-amber-800">{result.risco_retencao_detalhe}</p>
                    <p className="text-sm text-amber-700 mt-2">
                      Possível retenção de 10% na fonte: valor mensal superior a R$ 50.000 em uma ou mais fontes (Sócio Simples (cód. 13)).
                    </p>
                    <p className="text-xs text-amber-600 mt-2 italic">
                      Avaliação indicativa: considera média anual. O gatilho real é pagamento mensal &gt; R$ 50.000.
                    </p>
                  </div>
                )}
              </div>

              {(() => {
                const comparativo = (result as IrpfAltaRendaSimulacaoResponse & { comparativo_pf_pj?: ComparativoPfPj }).comparativo_pf_pj;
                return comparativo && comparativo.diferenca_percentual_pj_mais_caro > 0 ? (
                  <div key="estrategico-pj" className="rounded-md border border-amber-200 bg-amber-50 p-3 keep">
                    <p className="text-sm font-semibold text-amber-900">Relatório estratégico (PF vs PJ)</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Seu cliente está pagando{' '}
                      <strong>{comparativo.diferenca_percentual_pj_mais_caro.toFixed(1)}%</strong> a mais por
                      investir via PJ (Lucro Presumido) para uma aplicação de{' '}
                      {formatCurrency(comparativo.rendimento_bruto)} no cenário-base desta simulação. Essa
                      diferença pode aumentar quando a PF utiliza ativos isentos (como LCI, LCA e
                      debêntures incentivadas). Se a empresa precisar do recurso para operação, avalie o
                      custo de liquidez antes de mover o caixa para PF. Estratégia sugerida: manter na PJ
                      o caixa operacional e direcionar excedentes de longo prazo para PF quando possível.
                    </p>
                  </div>
                ) : null;
              })()}
              {result.otimizacao_isento_vs_tributado && result.otimizacao_isento_vs_tributado.irrf_compensavel_estimado > 0 && (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 keep">
                  <p className="text-sm font-semibold text-indigo-900">Otimização: migração LCI/CDB</p>
                  <p className="text-sm text-indigo-800 mt-1">
                    Migrar de LCI para CDB (ou ativo tributado com IRRF) pode gerar crédito estimado de{' '}
                    <strong>{formatCurrency(result.otimizacao_isento_vs_tributado.irrf_compensavel_estimado)}</strong> no
                    IRPFM, com ganho líquido potencial de{' '}
                    {formatCurrency(result.otimizacao_isento_vs_tributado.ganho_liquido_estimado)}.
                  </p>
                </div>
              )}
              {result.otimizacao_isento_vs_tributado && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-emerald-800">Simulador de otimização (Isento vs Tributado)</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Migração simulada: {formatCurrency(result.otimizacao_isento_vs_tributado.valor_migrado)} | IRRF compensável:{' '}
                    {formatCurrency(result.otimizacao_isento_vs_tributado.irrf_compensavel_estimado)} | Ganho líquido estimado:{' '}
                    {formatCurrency(result.otimizacao_isento_vs_tributado.ganho_liquido_estimado)}
                  </p>
                  <div className="grid grid-cols-1 gap-2 mt-3">
                    <div className="rounded border border-emerald-200 bg-white p-2">
                      <p className="text-xs text-slate-500">Antes (ativo isento que entra na base)</p>
                      <p className="text-sm text-slate-700">BCC: {formatCurrency(result.otimizacao_isento_vs_tributado.bcc_cenario_atual)}</p>
                      <p className="text-sm text-slate-700">A complementar: {formatCurrency(result.otimizacao_isento_vs_tributado.imposto_complementar_atual)}</p>
                    </div>
                    <div className="rounded border border-emerald-200 bg-white p-2">
                      <p className="text-xs text-slate-500">Depois (ativo tributado com IRRF compensável)</p>
                      <p className="text-sm text-slate-700">BCC: {formatCurrency(result.otimizacao_isento_vs_tributado.bcc_cenario_otimizado)}</p>
                      <p className="text-sm text-slate-700">A complementar: {formatCurrency(result.otimizacao_isento_vs_tributado.imposto_complementar_otimizado)}</p>
                    </div>
                  </div>
                  {result.base_calculo_combinada > 1200000 && (
                    <p className="text-xs text-emerald-800 mt-2">
                      Faixa acima de R$ 1,2M: o mínimo tende a 10% fixo. Nessa faixa, crédito de IRRF do ativo tributado pode reduzir imposto complementar.
                    </p>
                  )}
                </div>
              )}

              {Array.isArray(result.impacto_incremental_base) && result.impacto_incremental_base.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Drivers do imposto (top 3)</p>
                  <ul className="text-sm text-slate-700 list-disc list-inside">
                    {result.impacto_incremental_base
                      .slice()
                      .sort((a, b) => b.percentual_base - a.percentual_base)
                      .slice(0, 3)
                      .map((item, idx) => (
                        <li key={idx}>
                          {item.categoria}: {formatCurrency(item.valor)} ({item.percentual_base.toFixed(2)}% da base)
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-200 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Possíveis soluções para redução da tributação</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Sugestões de planejamento com base nos dados da simulação:
                </p>
                <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
                  {(result.sugestoes_planejamento?.length ? result.sugestoes_planejamento : [
                    'Constituição de holding para reorganização da estrutura e da distribuição de dividendos',
                    'Segregação da renda com cônjuge ou filhos (dentro dos limites legais)',
                    'Revisão do momento e da forma de recebimento dos rendimentos',
                  ]).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-600 mt-2">
                  Consulte seu consultor tributário para simulações específicas e enquadramento à Lei 15.270/2025.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Esta tela é uma simulação de planejamento tributário e não substitui a apuração oficial da DAA.
                </p>
              </div>
            </div>

            {Array.isArray(result.memoria_legal_exclusoes) && result.memoria_legal_exclusoes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-800 mb-2">Por que foi excluído da base</h4>
                <details className="mb-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-800">
                    Explicação legal (Art. 16-A) — abrir detalhes
                  </summary>
                  <ul className="mt-2 text-xs text-indigo-900 list-disc list-inside space-y-1">
                    <li>Art. 16-A, §1º, I: ganho de capital fora de bolsa/mercado organizado.</li>
                    <li>Art. 16-A, §1º, V-j: rendimentos de FIIs qualificados.</li>
                    <li>Art. 16-A, §1º, XII: lucros/dividendos aprovados até 31/12/2025 (regra de transição).</li>
                    <li>Art. 16-A, §1º: ativos incentivados como LCI, LCA, CRI, CRA, LIG e debêntures de infraestrutura.</li>
                  </ul>
                </details>
                <div className="space-y-2">
                  {result.memoria_legal_exclusoes.map((item, idx) => (
                    <div key={idx} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-medium text-slate-800">{item.item} — {formatCurrency(item.valor)}</p>
                      <p className="text-slate-600">{item.base_legal}</p>
                      <p className="text-slate-500">{item.motivo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.memoria_calculo && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-800 mb-2">Memória de cálculo</h4>
                <div className="text-sm text-slate-700 space-y-2 bg-slate-50 p-3 rounded-md">
                  <p>
                    <strong>BCC</strong> = Rendimentos tributáveis + Soma dos dividendos (09 e 13)
                    <br />
                    <span className="font-mono">
                      {formatCurrency(Number(result.memoria_calculo.rendimentos_tributaveis ?? 0))}
                      {' + '}
                      {formatCurrency(Number(result.memoria_calculo.soma_dividendos ?? 0))}
                      {' = '}
                      {formatCurrency(Number(result.memoria_calculo.base_calculo_combinada ?? result.base_calculo_combinada))}
                    </span>
                  </p>
                  {Array.isArray(result.memoria_calculo.detalhe_fontes) &&
                    (result.memoria_calculo.detalhe_fontes as { codigo?: string; nome_fonte?: string; valor: number }[]).length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Detalhe por fonte:</p>
                        <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 text-left">
                              <th className="p-1.5">Cód.</th>
                              <th className="p-1.5">Fonte</th>
                              <th className="p-1.5 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(result.memoria_calculo.detalhe_fontes as { codigo?: string; nome_fonte?: string; valor: number }[]).map((f, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                <td className="p-1.5">{f.codigo ?? '-'}</td>
                                <td className="p-1.5">{f.nome_fonte ?? '-'}</td>
                                <td className="p-1.5 text-right font-mono">{formatCurrency(f.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  {Number(result.memoria_calculo.excedente_sobre_600k ?? 0) > 0 && (
                    <p>
                      <strong>Excedente sobre R$ 600.000:</strong>{' '}
                      {formatCurrency(Number(result.memoria_calculo.excedente_sobre_600k))}
                    </p>
                  )}
                  <p className="pt-1 text-slate-600">
                    <strong>Fonte normativa:</strong> {String(result.memoria_calculo.fonte_normativa ?? 'Lei 15.270/2025')}
                    {result.memoria_calculo.observacao_progressiva != null && result.memoria_calculo.observacao_progressiva !== '' ? (
                      <>
                        <br />
                        <span className="text-xs">{String(result.memoria_calculo.observacao_progressiva)}</span>
                      </>
                    ) : null}
                  </p>
                  {Array.isArray(result.memoria_calculo.premissas_aplicadas) &&
                    (result.memoria_calculo.premissas_aplicadas as string[]).length > 0 && (
                      <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        <p className="font-medium">Premissas aplicadas na simulação</p>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                          {(result.memoria_calculo.premissas_aplicadas as string[]).map((premissa, idx) => (
                            <li key={idx}>{premissa}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200" data-report-exclude="pdf">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                {editingSimulationId ? 'Atualizar ou salvar como novo' : 'Salvar simulação'}
              </h4>
              <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                  <select
                    value={saveCompanyId}
                    onChange={(e) => setSaveCompanyId(e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-brand"
                  >
                    <option value="">Selecione...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="Título (opcional)"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="min-w-[180px]"
                />
                <Button type="submit" variant="secondary" disabled={loading}>
                  {editingSimulationId ? 'Salvar' : 'Salvar'}
                </Button>
                {editingSimulationId && (
                  <Button type="button" variant="secondary" disabled={loading} onClick={handleSaveNew}>
                    Salvar novo
                  </Button>
                )}
              </form>
            </div>
          </Card>
          </div>
          </div>
        )}

        </div>

        <Card title="Simulações salvas" className="w-full">
          {listLoading ? (
            <p className="text-slate-500">Carregando simulações...</p>
          ) : listError ? (
            <div className="space-y-2">
              <p className="text-sm text-red-600">Falha ao carregar simulações: {listError}</p>
              <Button type="button" variant="secondary" size="sm" onClick={loadData}>
                Tentar novamente
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-slate-500">Nenhuma simulação salva.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Filtrar por ano</label>
                  <select
                    value={listAnoFilter}
                    onChange={(e) => {
                      setListAnoFilter(e.target.value === '' ? '' : Number(e.target.value));
                      setListPage(1);
                    }}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    <option value="">Todos</option>
                    {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Buscar contribuinte</label>
                  <input
                    type="text"
                    value={listSearchContribuinte}
                    onChange={(e) => setListSearchContribuinte(e.target.value)}
                    placeholder="Nome do contribuinte"
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm min-w-[180px]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 pr-2">Ano</th>
                      <th className="py-2 pr-2">Contribuinte</th>
                      <th className="py-2 pr-2">Arquivo</th>
                      <th className="py-2 pr-2">BCC</th>
                      <th className="py-2 pr-2">Faixa</th>
                      <th className="py-2 pr-2">Imposto</th>
                      <th className="py-2 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-slate-500 text-center">
                          Nenhuma simulação encontrada com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const payload = item.payload_json;
                        const tipoOrigem = payload?.tipo_importacao ?? 'manual';
                        const badge =
                          tipoOrigem === 'pdf' ? (
                            <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-800">PDF</span>
                          ) : tipoOrigem === 'dec_dbk' ? (
                            <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-800">.dec/.dbk</span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-600">Manual</span>
                          );
                        return (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="py-2 pr-2">{item.ano}</td>
                            <td className="py-2 pr-2">{item.contribuinte_nome}</td>
                            <td className="py-2 pr-2">
                              <span className="flex items-center gap-1">
                                {badge}
                                {payload?.arquivo_nome && (
                                  <span className="text-xs text-slate-500 truncate max-w-[120px]" title={payload.arquivo_nome}>
                                    {payload.arquivo_nome}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-2 pr-2">{formatCurrency(item.base_calculo_combinada)}</td>
                            <td className="py-2 pr-2">{item.resultado_simulacao?.faixa ?? '-'}</td>
                            <td className="py-2 pr-2">{formatCurrency(item.resultado_simulacao?.imposto_estimado ?? 0)}</td>
                            <td className="py-2 pr-2">
                              <div className="flex flex-wrap gap-1">
                                <Button type="button" variant="secondary" size="sm" onClick={() => handleOpenEditar(item, false)}>
                                  Editar
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => handleOpenEditar(item, true)}>
                                  Duplicar
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => handleDeleteClick(item)}>
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {listTotal > LIST_LIMIT && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <p className="text-sm text-slate-600">
                    Página {listPage} de {Math.ceil(listTotal / LIST_LIMIT)} ({listTotal} simulações)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={listPage <= 1}
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={listPage >= Math.ceil(listTotal / LIST_LIMIT)}
                      onClick={() => setListPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}

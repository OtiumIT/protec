import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../../shared/components/layout/Layout';
import {
  ratingValidatorService,
  type SimulateRatingInput,
  type RatingSimulationResult,
  type ExtractEcdPdfResult,
} from '../services/rating-validator.service';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { judicialProcessService } from '../../judicial-processes/services/judicial-process.service';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Badge } from '../../../shared/components/ui/Badge';
import { useToast } from '../../../shared/components/ui/Toast';

type Tab = 'simulation' | 'scenarios' | 'real' | 'history';
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS: { number: Step; title: string; description: string }[] = [
  { number: 1, title: 'Ativo Circulante', description: 'Informe os valores do ativo circulante' },
  { number: 2, title: 'Ativo Não Circulante', description: 'Informe os valores do ativo não circulante' },
  { number: 3, title: 'Passivo Circulante', description: 'Informe os valores do passivo circulante' },
  { number: 4, title: 'Passivo Não Circulante', description: 'Informe os valores do passivo não circulante' },
  { number: 5, title: 'Patrimônio Líquido', description: 'Informe os valores do patrimônio líquido' },
  { number: 6, title: 'DRE (Opcional)', description: 'Informe dados da DRE (opcional)' },
  { number: 7, title: 'Revisão', description: 'Revise os dados e confirme' },
];

const DEMO_KEY_WINDOW_MS = 1500;
const ECD_PROCESSING_STEPS = [
  { minElapsedMs: 0, progress: 10, stage: 'Enviando arquivo...', detail: 'Transferindo o PDF da ECD para processamento.' },
  { minElapsedMs: 1800, progress: 24, stage: 'Lendo estrutura do PDF...', detail: 'Preparando páginas e blocos contábeis.' },
  { minElapsedMs: 6000, progress: 43, stage: 'Processando dados...', detail: 'Extraindo balanço patrimonial e DRE.' },
  { minElapsedMs: 12000, progress: 64, stage: 'Conferindo consistência...', detail: 'Validando campos para preencher o formulário.' },
  { minElapsedMs: 20000, progress: 82, stage: 'Finalizando...', detail: 'Aplicando os últimos ajustes da extração.' },
] as const;

/** Fallback quando API não retorna thresholds_by_level (para tabela sempre visível) */
const FALLBACK_THRESHOLDS: Record<string, { D: string; C: string; B: string; A: string }> = {
  liquidez_corrente: { D: '≥ 0', C: '≥ 1,00', B: '≥ 1,50', A: '≥ 2,00' },
  liquidez_geral: { D: '≥ 0', C: '≥ 1,00', B: '≥ 1,20', A: '≥ 1,50' },
  solvencia: { D: '≥ 0', C: '≥ 10%', B: '≥ 30%', A: '≥ 50%' },
};

/** Limiares numéricos para calcular "atende" no frontend (independente da API) */
const THRESHOLD_MINS: Record<string, { D: number; C: number; B: number; A: number }> = {
  liquidez_corrente: { D: 0, C: 1, B: 1.5, A: 2 },
  liquidez_geral: { D: 0, C: 1, B: 1.2, A: 1.5 },
  solvencia: { D: 0, C: 0.1, B: 0.3, A: 0.5 },
};
const EPS = 1e-9;

/** Demo Ctrl+D+1: Queda de rating B → C. Valores que geram rating estimado C (liquidez/solvência regular). */
function getDemoBToC(clientId: string): SimulateRatingInput {
  return {
    ativo_circulante: {
      caixa_equivalentes: 400_000,
      aplicacoes_financeiras: 200_000,
      contas_receber: 300_000,
      estoques: 100_000,
      tributos_recuperar: 0,
      despesas_antecipadas: 0,
      outros_ativos_circulantes: 0,
    },
    ativo_nao_circulante: {
      realizavel_longo_prazo: {
        contas_receber_lp: 200_000,
        emprestimos_concedidos: 0,
        outros_creditos_lp: 0,
      },
      investimentos: 0,
      imobilizado: 800_000,
      intangivel: 0,
      outros_ativos_nao_circulantes: 0,
    },
    passivo_circulante: {
      fornecedores: 400_000,
      emprestimos_financiamentos: 300_000,
      obrigacoes_trabalhistas: 150_000,
      tributos_pagar: 80_000,
      contas_pagar: 50_000,
      provisoes: 0,
      outros_passivos_circulantes: 20_000,
    },
    passivo_nao_circulante: {
      emprestimos_financiamentos_lp: 150_000,
      obrigacoes_trabalhistas_lp: 0,
      tributos_pagar_lp: 0,
      provisoes_lp: 30_000,
      outros_passivos_nao_circulantes: 20_000,
    },
    patrimonio_liquido: {
      capital_social: 500_000,
      reservas_capital: 0,
      reservas_lucros: 200_000,
      lucros_prejuizos_acumulados: 100_000,
      outros_ajustes: 0,
    },
    competencia: '2024-12',
    client_id: clientId,
    rating_real: 'C',
    save_simulation: false,
  };
}

export function RatingValidator() {
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { success, error: showError, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('simulation');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<RatingSimulationResult | null>(null);

  // Simulador de parcelamento
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [showDebtSimulator, setShowDebtSimulator] = useState(false);

  // Restaurar resultado ao voltar da página de impressão
  useEffect(() => {
    const s = locationState as { simulationResult?: RatingSimulationResult; debtAmount?: number } | null;
    if (s?.simulationResult) {
      setSimulationResult(s.simulationResult);
      if (s.debtAmount != null) setDebtAmount(s.debtAmount);
    }
  }, [locationState]);
  
  // Processos judiciais elegíveis (para validação de CONTENCIOSO)
  const [eligibleTheses, setEligibleTheses] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const waitingDemoDigitRef = useRef<number>(0);
  const demoKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ecdPdfInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingEcdPdf, setIsExtractingEcdPdf] = useState(false);
  const [ecdProcessingStage, setEcdProcessingStage] = useState('');
  const [ecdProcessingDetail, setEcdProcessingDetail] = useState('');
  const [ecdProcessingProgress, setEcdProcessingProgress] = useState(0);

  // Estado para controlar modo granular vs total em cada seção
  const [useTotalMode, setUseTotalMode] = useState<{
    ativo_circulante: boolean;
    realizavel_longo_prazo: boolean;
    passivo_circulante: boolean;
    passivo_nao_circulante: boolean;
    patrimonio_liquido: boolean;
  }>({
    ativo_circulante: false,
    realizavel_longo_prazo: false,
    passivo_circulante: false,
    passivo_nao_circulante: false,
    patrimonio_liquido: false,
  });

  // Form state - campos granulares
  const [formData, setFormData] = useState<SimulateRatingInput>({
    ativo_circulante: {
      caixa_equivalentes: 0,
      aplicacoes_financeiras: 0,
      contas_receber: 0,
      estoques: 0,
      tributos_recuperar: 0,
      despesas_antecipadas: 0,
      outros_ativos_circulantes: 0,
    },
    ativo_nao_circulante: {
      realizavel_longo_prazo: {
        contas_receber_lp: 0,
        emprestimos_concedidos: 0,
        outros_creditos_lp: 0,
      },
      investimentos: 0,
      imobilizado: 0,
      intangivel: 0,
      outros_ativos_nao_circulantes: 0,
    },
    passivo_circulante: {
      fornecedores: 0,
      emprestimos_financiamentos: 0,
      obrigacoes_trabalhistas: 0,
      tributos_pagar: 0,
      contas_pagar: 0,
      provisoes: 0,
      outros_passivos_circulantes: 0,
    },
    passivo_nao_circulante: {
      emprestimos_financiamentos_lp: 0,
      obrigacoes_trabalhistas_lp: 0,
      tributos_pagar_lp: 0,
      provisoes_lp: 0,
      outros_passivos_nao_circulantes: 0,
    },
    patrimonio_liquido: {
      capital_social: 0,
      reservas_capital: 0,
      reservas_lucros: 0,
      lucros_prejuizos_acumulados: 0,
      outros_ajustes: 0,
    },
    competencia: '',
    client_id: '',
    save_simulation: false,
  });

  // Calcular totais em tempo real
  const calculatedTotals = useMemo(() => {
    // Usar total direto se fornecido, senão calcular a partir dos campos granulares
    const ativoCirculanteTotal = useTotalMode.ativo_circulante && formData.ativo_circulante_total !== undefined
      ? formData.ativo_circulante_total
      : Object.values(formData.ativo_circulante).reduce((a, b) => a + b, 0);
    
    const realizavelLongoPrazoTotal = useTotalMode.realizavel_longo_prazo && formData.realizavel_longo_prazo_total !== undefined
      ? formData.realizavel_longo_prazo_total
      : (formData.ativo_nao_circulante.realizavel_longo_prazo?.contas_receber_lp || 0) +
        (formData.ativo_nao_circulante.realizavel_longo_prazo?.emprestimos_concedidos || 0) +
        (formData.ativo_nao_circulante.realizavel_longo_prazo?.outros_creditos_lp || 0);
    
    const passivoCirculanteTotal = useTotalMode.passivo_circulante && formData.passivo_circulante_total !== undefined
      ? formData.passivo_circulante_total
      : Object.values(formData.passivo_circulante).reduce((a, b) => a + b, 0);
    
    const passivoNaoCirculanteTotal = useTotalMode.passivo_nao_circulante && formData.passivo_nao_circulante_total !== undefined
      ? formData.passivo_nao_circulante_total
      : Object.values(formData.passivo_nao_circulante).reduce((a, b) => a + b, 0);
    
    const patrimonioLiquidoTotal = useTotalMode.patrimonio_liquido && formData.patrimonio_liquido_total !== undefined
      ? formData.patrimonio_liquido_total
      : Object.values(formData.patrimonio_liquido).reduce((a, b) => a + b, 0);
    
    const ativoTotal =
      ativoCirculanteTotal +
      realizavelLongoPrazoTotal +
      formData.ativo_nao_circulante.investimentos +
      formData.ativo_nao_circulante.imobilizado +
      formData.ativo_nao_circulante.intangivel +
      formData.ativo_nao_circulante.outros_ativos_nao_circulantes;
    const passivoTotal = passivoCirculanteTotal + passivoNaoCirculanteTotal;

    return {
      ativo_circulante_total: ativoCirculanteTotal,
      realizavel_longo_prazo_total: realizavelLongoPrazoTotal,
      passivo_circulante_total: passivoCirculanteTotal,
      passivo_nao_circulante_total: passivoNaoCirculanteTotal,
      patrimonio_liquido_total: patrimonioLiquidoTotal,
      ativo_total: ativoTotal,
      passivo_total: passivoTotal,
    };
  }, [formData, useTotalMode]);

  useEffect(() => {
    loadClients();
  }, []);

  const handleEcdPdfUpload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showError('Selecione um arquivo PDF.');
        return;
      }
      setIsExtractingEcdPdf(true);
      setEcdProcessingStage('Enviando arquivo...');
      setEcdProcessingDetail('Preparando importação da ECD.');
      setEcdProcessingProgress(10);
      const startedAt = Date.now();
      const updateProgress = () => {
        const elapsedMs = Date.now() - startedAt;
        const activeStep =
          [...ECD_PROCESSING_STEPS].reverse().find((step) => elapsedMs >= step.minElapsedMs) ?? ECD_PROCESSING_STEPS[0];
        setEcdProcessingStage(activeStep.stage);
        setEcdProcessingDetail(activeStep.detail);
        setEcdProcessingProgress(activeStep.progress);
      };
      const progressInterval = window.setInterval(updateProgress, 1200);
      try {
        updateProgress();
        const result: ExtractEcdPdfResult = await ratingValidatorService.extractFromEcdPdf(file);
        const prefill = result.simulação_prefill;
        setEcdProcessingStage('Finalizando...');
        setEcdProcessingDetail('Aplicando dados extraídos na simulação.');
        setEcdProcessingProgress(97);
        setFormData((prev) => ({
          ...prev,
          ativo_circulante: prefill.ativo_circulante,
          ativo_nao_circulante: prefill.ativo_nao_circulante,
          passivo_circulante: prefill.passivo_circulante,
          passivo_nao_circulante: prefill.passivo_nao_circulante,
          patrimonio_liquido: prefill.patrimonio_liquido,
          competencia: prefill.competencia || prev.competencia,
          dre: prefill.dre ?? prev.dre,
        }));
        setCurrentStep(1);
        success(
          result.ecd.entidade?.nome
            ? `Dados da ECD de ${result.ecd.entidade.nome} importados. Revise os valores e prossiga.`
            : 'Dados do PDF da ECD importados. Revise os valores e prossiga.'
        );
        setEcdProcessingProgress(100);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Falha ao extrair dados do PDF da ECD.');
      } finally {
        window.clearInterval(progressInterval);
        setIsExtractingEcdPdf(false);
        setEcdProcessingStage('');
        setEcdProcessingDetail('');
        setEcdProcessingProgress(0);
        if (ecdPdfInputRef.current) ecdPdfInputRef.current.value = '';
      }
    },
    [success, showError]
  );

  // Carregar teses elegíveis quando cliente for selecionado
  useEffect(() => {
    if (formData.client_id && formData.client_id !== selectedClientId) {
      setSelectedClientId(formData.client_id);
      loadEligibleTheses(formData.client_id);
    } else if (!formData.client_id) {
      setSelectedClientId(null);
      setEligibleTheses([]);
    }
  }, [formData.client_id]);

  const loadEligibleTheses = async (clientId: string) => {
    try {
      const theses = await judicialProcessService.getEligibleTheses(clientId);
      setEligibleTheses(theses);
    } catch (error: any) {
      console.error('Error loading eligible theses:', error);
      // Não mostrar erro ao usuário, apenas não exibir CONTENCIOSO se não houver processos
      setEligibleTheses([]);
    }
  };

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const clientsList = await clientService.list();
      setClients(clientsList || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      showError(error.message || 'Erro ao carregar clientes');
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fillDemoBToC = useCallback(() => {
    const clientId = clients.length > 0 ? clients[0].id : '';
    setFormData(getDemoBToC(clientId));
    setCurrentStep(7);
    setActiveTab('simulation');
    setSimulationResult(null);
    success('Demo carregada: queda de rating B → C (Ctrl+D+1)');
  }, [clients, success]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (waitingDemoDigitRef.current && e.key === '1') {
        e.preventDefault();
        waitingDemoDigitRef.current = 0;
        if (demoKeyTimeoutRef.current) {
          clearTimeout(demoKeyTimeoutRef.current);
          demoKeyTimeoutRef.current = null;
        }
        fillDemoBToC();
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
  }, [fillDemoBToC]);

  const handleSimulate = async () => {
    if (!formData.competencia) {
      showError('Competência é obrigatória');
      return;
    }
    
    // Se for salvar simulação, cliente é obrigatório
    if (formData.save_simulation && !formData.client_id) {
      showError('Cliente é obrigatório para salvar a simulação');
      return;
    }

    setIsSimulating(true);
    try {
      const result = await ratingValidatorService.simulate(formData);
      setSimulationResult(result);
      success('Simulação realizada com sucesso!');
      // Scroll para resultado
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Error simulating:', error);
      showError(error.message || 'Erro ao realizar simulação');
    } finally {
      setIsSimulating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  /** Número em pt-BR (vírgula para decimais). Ex: 1,00 ou 1,5. Não usar ponto como decimal (1.000 = mil no Brasil). */
  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  /** Percentual em pt-BR. Ex: 40,00% */
  const formatPercent = (value: number, decimals = 2) => {
    return `${formatNumber(value * 100, decimals)}%`;
  };


  const getRatingColor = (rating: 'A' | 'B' | 'C' | 'D') => {
    switch (rating) {
      case 'A':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'B':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'C':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'D':
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  const getRatingLabel = (rating: 'A' | 'B' | 'C' | 'D') => {
    switch (rating) {
      case 'A':
        return 'Excelente';
      case 'B':
        return 'Bom';
      case 'C':
        return 'Regular';
      case 'D':
        return 'Insuficiente';
    }
  };

  // Tipos para modalidades de transação
  type TransactionModality = 'CAPAG' | 'PEQUENO_VALOR' | 'CONTENCIOSO' | 'IRRECUPERAVEIS';

  interface TransactionConditions {
    modality: TransactionModality;
    name: string;
    description: string;
    entryPercent: number;
    entryInstallments: number; // Parcelas para entrada
    maxMonths: number;
    discountOnPrincipal: number; // Desconto sobre principal (%)
    discountOnInterest: number; // Desconto sobre juros (%)
    discountOnFees: number; // Desconto sobre multas (%)
    maxDiscountLimit?: number; // Limite máximo de desconto (% da dívida)
    eligibility?: {
      maxAmount?: number; // Valor máximo elegível
      minAmount?: number; // Valor mínimo elegível
      requiresRating?: boolean; // Se requer rating específico
    };
  }

  // Condições atualizadas baseadas nos Editais PGFN 2025
  const getTransactionConditions = (
    _amount: number,
    rating?: 'A' | 'B' | 'C' | 'D',
    isMEI: boolean = false
  ): Record<TransactionModality, TransactionConditions> => {
    const salarioMinimo = 1412; // SM 2025 (ajustar conforme necessário)
    const maxPequenoValor = 60 * salarioMinimo; // 60 SM

    // CAPAG - Edital 11/2025
    // Rating D: 70% desconto sobre valor total
    // Rating C: 65% desconto sobre valor total (70% para ME/EPP/MEI)
    // Rating A/B: 0% desconto
    const capagDiscountPercent = 
      rating === 'D' ? 70 : 
      rating === 'C' ? (isMEI ? 70 : 65) : 
      0;
    const capagMaxMonths = isMEI ? 133 : 114;

    const conditions: Record<TransactionModality, TransactionConditions> = {
      CAPAG: {
        modality: 'CAPAG',
        name: 'CAPAG (Transação por Capacidade de Pagamento)',
        description: 'Edital PGDAU 11/2025 - Transação conforme capacidade de pagamento',
        entryPercent: 6, // 6% de entrada (parcelável em até 12x)
        entryInstallments: 12,
        maxMonths: capagMaxMonths,
        // Para CAPAG, o desconto é aplicado sobre o valor total (principal + juros + multas)
        discountOnPrincipal: capagDiscountPercent, // Desconto sobre valor total
        discountOnInterest: 0, // Não usado para CAPAG (desconto é sobre total)
        discountOnFees: 0, // Não usado para CAPAG (desconto é sobre total)
        maxDiscountLimit: undefined, // Não há limite adicional (o desconto já é o limite)
        eligibility: {
          maxAmount: 45000000, // R$ 45 milhões
          requiresRating: true,
        },
      },
      PEQUENO_VALOR: {
        modality: 'PEQUENO_VALOR',
        name: 'Transação de Pequeno Valor',
        description: 'Edital 11/2025 - Para débitos até 60 salários mínimos',
        entryPercent: 5, // 5% de entrada
        entryInstallments: 5, // Parcelável em até 5x
        maxMonths: 55, // Até 55 meses
        discountOnPrincipal: 30, // Desconto progressivo: 50% (até 7m), 45% (até 12m), 40% (até 30m), 30% (até 55m) - usando o mínimo para cálculo conservador
        discountOnInterest: 0,
        discountOnFees: 0,
        eligibility: {
          maxAmount: maxPequenoValor,
          minAmount: isMEI ? 25 : 100, // R$ 25 para MEI, R$ 100 para demais
        },
      },
      CONTENCIOSO: {
        modality: 'CONTENCIOSO',
        name: 'Transação Contencioso Tributário (Teses)',
        description: 'Edital 52/2025 - Contencioso de relevante controvérsia jurídica. Desconto 65% independente de rating',
        entryPercent: 5, // 5% de entrada (estimado)
        entryInstallments: 6, // Parcelável em até 6x (estimado)
        maxMonths: 60, // Até 60 meses
        discountOnPrincipal: 65, // 65% de desconto sobre o valor total (independente de rating)
        discountOnInterest: 0,
        discountOnFees: 0,
        maxDiscountLimit: undefined,
        eligibility: {
          // Aplicável apenas se cliente tiver processo judicial ativo para uma das teses:
          // IPI_PRACA, PRL, IRPJ_CSLL_DESMUTUALIZACAO
          // Validação será feita dinamicamente no calculateModalitySimulation
        },
      },
      IRRECUPERAVEIS: {
        modality: 'IRRECUPERAVEIS' as TransactionModality,
        name: 'Débitos Irrecuperáveis',
        description: 'Edital 11/2025 - Para dívidas inscritas há mais de 15 anos, devedores falidos ou empresas com atividades encerradas',
        entryPercent: 5,
        entryInstallments: 12,
        maxMonths: capagMaxMonths,
        discountOnPrincipal: 70, // Descontos máximos permitidos por lei
        discountOnInterest: 100,
        discountOnFees: 100,
        eligibility: {
          // Requer comprovação de situação específica
        },
      },
    };

    return conditions;
  };

  // Calcular simulação para uma modalidade específica
  const calculateModalitySimulation = (
    amount: number,
    modality: TransactionModality,
    rating?: 'A' | 'B' | 'C' | 'D',
    isMEI: boolean = false,
    clientId?: string
  ) => {
    const conditions = getTransactionConditions(amount, rating, isMEI)[modality];

    // Verificar elegibilidade
    if (conditions.eligibility?.maxAmount && amount > conditions.eligibility.maxAmount) {
      return null; // Não elegível
    }
    if (conditions.eligibility?.minAmount && amount < conditions.eligibility.minAmount) {
      return null; // Não elegível
    }
    if (conditions.eligibility?.requiresRating && !rating) {
      return null; // Requer rating
    }

    // Para CONTENCIOSO: verificar se cliente tem processos judiciais ativos
    // Apenas validar se um cliente foi especificado
    if (modality === 'CONTENCIOSO' && clientId) {
      // Se cliente foi especificado mas não tem teses elegíveis, não é elegível
      if (eligibleTheses.length === 0) {
        return null; // Não elegível - cliente não tem processos judiciais ativos
      }
    }
    // Se não houver clientId, permite mostrar CONTENCIOSO (para simulação geral)

    // Estimativas (em produção viriam de API)
    const estimatedInterest = amount * 0.15; // 15% de juros
    const estimatedFees = amount * 0.1; // 10% de multas

    // Valor total com juros e multas
    const totalWithInterest = amount + estimatedInterest + estimatedFees;

    // Calcular desconto total
    // Para CAPAG e CONTENCIOSO: desconto é sobre o valor total (principal + juros + multas)
    // Para PEQUENO_VALOR: desconto progressivo sobre valor total
    let totalDiscount = 0;
    
    if (conditions.discountOnPrincipal > 0) {
      // Desconto sobre valor total (principal + juros + multas)
      totalDiscount = (totalWithInterest * conditions.discountOnPrincipal) / 100;
    } else if (conditions.discountOnInterest > 0 || conditions.discountOnFees > 0) {
      // Desconto apenas sobre juros/multas (caso específico)
      const discountOnInterest = conditions.discountOnInterest > 0 
        ? (estimatedInterest * conditions.discountOnInterest) / 100 
        : 0;
      const discountOnFees = conditions.discountOnFees > 0 
        ? (estimatedFees * conditions.discountOnFees) / 100 
        : 0;
      totalDiscount = discountOnInterest + discountOnFees;
    }

    // Aplicar limite máximo de desconto (se houver)
    if (conditions.maxDiscountLimit) {
      const maxDiscountAmount = (totalWithInterest * conditions.maxDiscountLimit) / 100;
      if (totalDiscount > maxDiscountAmount) {
        totalDiscount = maxDiscountAmount;
      }
    }

    // Valor final após descontos
    const totalWithDiscount = totalWithInterest - totalDiscount;
    
    // Valor a ser parcelado (após entrada e descontos)
    const entryAmount = (amount * conditions.entryPercent) / 100;
    const amountToInstall = totalWithDiscount - entryAmount;
    const monthlyPayment = amountToInstall / conditions.maxMonths;

    // Calcular descontos individuais para exibição (aproximado)
    const discountRatio = totalDiscount / totalWithInterest;
    const discountOnInterest = estimatedInterest * discountRatio;
    const discountOnFees = estimatedFees * discountRatio;
    const discountOnPrincipal = totalDiscount - discountOnInterest - discountOnFees;

    return {
      modality: conditions.modality,
      name: conditions.name,
      description: conditions.description,
      entryPercent: conditions.entryPercent,
      entryAmount,
      entryInstallments: conditions.entryInstallments,
      amountToInstall,
      monthlyPayment,
      maxMonths: conditions.maxMonths,
      totalWithInterest,
      totalWithDiscount,
      savings: totalDiscount,
      discountOnInterest,
      discountOnFees,
      discountOnPrincipal,
      estimatedInterest,
      estimatedFees,
      isEligible: true,
    };
  };

  // Comparar todas as modalidades e identificar a mais vantajosa
  const compareModalities = (
    amount: number,
    rating?: 'A' | 'B' | 'C' | 'D',
    isMEI: boolean = false,
    includeIrrecuperaveis: boolean = false,
    clientId?: string
  ) => {
    const modalities: TransactionModality[] = includeIrrecuperaveis
      ? ['CAPAG', 'PEQUENO_VALOR', 'CONTENCIOSO', 'IRRECUPERAVEIS']
      : ['CAPAG', 'PEQUENO_VALOR', 'CONTENCIOSO'];
    const simulations = modalities
      .map((modality) => calculateModalitySimulation(amount, modality, rating, isMEI, clientId))
      .filter((sim) => sim !== null) as Array<NonNullable<ReturnType<typeof calculateModalitySimulation>>>;

    // Ordenar por menor valor total (mais vantajosa)
    simulations.sort((a, b) => a.totalWithDiscount - b.totalWithDiscount);

    const bestModality = simulations[0]?.modality;

    return {
      simulations,
      bestModality,
      comparisons: simulations.map((sim, index) => ({
        ...sim,
        isBest: index === 0,
        savingsVsWorst: simulations.length > 1
          ? simulations[simulations.length - 1].totalWithDiscount - sim.totalWithDiscount
          : 0,
      })),
    };
  };

  // Simulador de parcelamento por rating (mantido para compatibilidade)
  const calculateDebtInstallment = (amount: number, rating: 'A' | 'B' | 'C' | 'D') => {
    const capagSim = calculateModalitySimulation(amount, 'CAPAG', rating, false, formData.client_id);
    if (!capagSim) {
      return null;
    }

    return {
      rating,
      entryAmount: capagSim.entryAmount,
      remainingAmount: capagSim.amountToInstall,
      monthlyPayment: capagSim.monthlyPayment,
      maxMonths: capagSim.maxMonths,
      totalWithInterest: capagSim.totalWithInterest,
      totalWithDiscount: capagSim.totalWithDiscount,
      savings: capagSim.savings,
      discountOnInterest: capagSim.discountOnInterest,
      discountOnFees: capagSim.discountOnFees,
      condition: capagSim.description,
      estimatedInterest: capagSim.estimatedInterest,
      estimatedFees: capagSim.estimatedFees,
    };
  };

  const debtSimulations = useMemo(() => {
    if (!debtAmount || debtAmount <= 0) return null;
    const sims = {
      A: calculateDebtInstallment(debtAmount, 'A'),
      B: calculateDebtInstallment(debtAmount, 'B'),
      C: calculateDebtInstallment(debtAmount, 'C'),
      D: calculateDebtInstallment(debtAmount, 'D'),
    };
    // Filtrar nulos
    return Object.fromEntries(Object.entries(sims).filter(([_, v]) => v !== null)) as Record<
      'A' | 'B' | 'C' | 'D',
      NonNullable<ReturnType<typeof calculateDebtInstallment>>
    >;
  }, [debtAmount]);

  // Comparativo de modalidades para o rating atual
  const modalityComparison = useMemo(() => {
    if (!debtAmount || debtAmount <= 0 || !simulationResult) return null;
    return compareModalities(debtAmount, simulationResult.rating_estimado, false);
  }, [debtAmount, simulationResult]);

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleFieldChange = (path: string[], value: number) => {
    setFormData((prev) => {
      const newData = { ...prev };
      let current: any = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha os valores que você encontra facilmente na contabilidade.
                O sistema calculará automaticamente o total do Ativo Circulante.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_ativo_circulante"
                  checked={useTotalMode.ativo_circulante}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, ativo_circulante: e.target.checked });
                    if (!e.target.checked) {
                      // Limpar total quando desativar modo total
                      setFormData({ ...formData, ativo_circulante_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_ativo_circulante" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Ativo Circulante diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.ativo_circulante ? (
              <div>
                <MoneyInput
                  label="Total Ativo Circulante"
                  value={formData.ativo_circulante_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      ativo_circulante_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Ativo Circulante conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.ativo_circulante).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['ativo_circulante', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Ativo Circulante:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculatedTotals.ativo_circulante_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha os valores do Ativo Não Circulante, incluindo Realizável a Longo Prazo.
              </p>
            </div>
            
            {/* Toggle para modo total - Realizável a Longo Prazo */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_realizavel_lp"
                  checked={useTotalMode.realizavel_longo_prazo}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, realizavel_longo_prazo: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, realizavel_longo_prazo_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_realizavel_lp" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Realizável a Longo Prazo diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Realizável a Longo Prazo</h4>
              {useTotalMode.realizavel_longo_prazo ? (
                <div>
                  <MoneyInput
                    value={formData.realizavel_longo_prazo_total || 0}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        realizavel_longo_prazo_total: value || undefined,
                      })
                    }
                    className="text-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Digite o valor total do Realizável a Longo Prazo conforme sua contabilidade
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {Object.entries(formData.ativo_nao_circulante.realizavel_longo_prazo || {}).map(
                    ([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </label>
                        <MoneyInput
                          value={value || 0}
                          onChange={(val) =>
                            handleFieldChange(
                              ['ativo_nao_circulante', 'realizavel_longo_prazo', key],
                              val
                            )
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">Outros Ativos Não Circulantes</h4>
              <div className="grid grid-cols-2 gap-4">
                {['investimentos', 'imobilizado', 'intangivel', 'outros_ativos_nao_circulantes'].map(
                  (key) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                      <MoneyInput
                        value={(formData.ativo_nao_circulante as any)[key] || 0}
                        onChange={(val) =>
                          handleFieldChange(
                            ['ativo_nao_circulante', key],
                            val
                          )
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Realizável a Longo Prazo:</span>
                  <span className="font-semibold">{formatCurrency(calculatedTotals.realizavel_longo_prazo_total)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha todas as obrigações de curto prazo da empresa.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_passivo_circulante"
                  checked={useTotalMode.passivo_circulante}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, passivo_circulante: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, passivo_circulante_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_passivo_circulante" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Passivo Circulante diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.passivo_circulante ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Passivo Circulante
                </label>
                <MoneyInput
                  value={formData.passivo_circulante_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      passivo_circulante_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Passivo Circulante conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.passivo_circulante).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['passivo_circulante', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Passivo Circulante:</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculatedTotals.passivo_circulante_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Preencha todas as obrigações de longo prazo da empresa.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_passivo_nao_circulante"
                  checked={useTotalMode.passivo_nao_circulante}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, passivo_nao_circulante: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, passivo_nao_circulante_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_passivo_nao_circulante" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Passivo Não Circulante diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.passivo_nao_circulante ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Passivo Não Circulante
                </label>
                <MoneyInput
                  value={formData.passivo_nao_circulante_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      passivo_nao_circulante_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Passivo Não Circulante conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.passivo_nao_circulante).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['passivo_nao_circulante', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Passivo Não Circulante:</span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculatedTotals.passivo_nao_circulante_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> O campo "Lucros ou Prejuízos Acumulados" pode ser negativo.
              </p>
            </div>
            
            {/* Toggle para modo total */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use_total_patrimonio_liquido"
                  checked={useTotalMode.patrimonio_liquido}
                  onChange={(e) => {
                    setUseTotalMode({ ...useTotalMode, patrimonio_liquido: e.target.checked });
                    if (!e.target.checked) {
                      setFormData({ ...formData, patrimonio_liquido_total: undefined });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="use_total_patrimonio_liquido" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Digitar Total Patrimônio Líquido diretamente (se já possuir o valor calculado)
                </label>
              </div>
            </div>

            {useTotalMode.patrimonio_liquido ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Patrimônio Líquido
                </label>
                <MoneyInput
                  value={formData.patrimonio_liquido_total || 0}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      patrimonio_liquido_total: value || undefined,
                    })
                  }
                  className="text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Digite o valor total do Patrimônio Líquido conforme sua contabilidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.patrimonio_liquido).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <MoneyInput
                      value={value || 0}
                      onChange={(val) => handleFieldChange(['patrimonio_liquido', key], val)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Patrimônio Líquido:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculatedTotals.patrimonio_liquido_total)}
                </span>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Opcional:</strong> Os dados da DRE são opcionais para o cálculo do Rating.
              </p>
            </div>
            {!formData.dre && (
              <Button
                variant="tertiary"
                onClick={() => setFormData({ ...formData, dre: { receita_bruta: 0, deducoes_vendas: 0, custos_vendas: 0, despesas_operacionais: 0, resultado_financeiro: 0, outros_resultados: 0 } })}
              >
                Adicionar Dados da DRE
              </Button>
            )}
            {formData.dre && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(formData.dre).map(([key, value]) => {
                  if (key === 'receita_liquida') return null;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </label>
                      <MoneyInput
                        value={value || 0}
                        onChange={(val) => handleFieldChange(['dre', key], val)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Revise os dados:</strong> Verifique se todos os valores estão corretos antes de calcular o Rating.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente {formData.save_simulation ? '*' : '(Opcional)'}
                </label>
                <select
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value || '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  disabled={isLoadingClients}
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {formData.save_simulation && !formData.client_id && (
                  <p className="text-xs text-red-600 mt-1">Cliente é obrigatório para salvar a simulação</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Competência (YYYY-MM) *
                </label>
                <Input
                  type="text"
                  value={formData.competencia}
                  onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                  placeholder="2024-01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-3 text-slate-700">Resumo do Balanço</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Ativo Circulante:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.ativo_circulante_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Realizável LP:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.realizavel_longo_prazo_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Outros Ativos NC:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        calculatedTotals.ativo_total -
                          calculatedTotals.ativo_circulante_total -
                          calculatedTotals.realizavel_longo_prazo_total
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Total Ativo:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(calculatedTotals.ativo_total)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-3 text-slate-700">Resumo do Passivo</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Passivo Circulante:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.passivo_circulante_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Passivo Não Circulante:</span>
                    <span className="font-semibold">{formatCurrency(calculatedTotals.passivo_nao_circulante_total)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Total Passivo:</span>
                    <span className="font-bold text-lg text-red-600">
                      {formatCurrency(calculatedTotals.passivo_total)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-semibold text-slate-700">Patrimônio Líquido:</span>
                    <span className="font-bold text-lg text-green-600">
                      {formatCurrency(calculatedTotals.patrimonio_liquido_total)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save_simulation"
                checked={formData.save_simulation}
                onChange={(e) => setFormData({ ...formData, save_simulation: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="save_simulation" className="text-sm text-slate-700">
                Salvar esta simulação no histórico
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Enquadramento Receita Federal (opcional)
              </label>
              <select
                value={formData.rating_real || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rating_real: (e.target.value as 'A' | 'B' | 'C' | 'D') || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Não informar</option>
                <option value="A">A - Excelente</option>
                <option value="B">B - Bom</option>
                <option value="C">C - Regular</option>
                <option value="D">D - Insuficiente</option>
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Transação Tributária - Análise da capacidade de pagamento</h1>
          <p className="text-slate-600 mt-2">
            Avalie se a classificação da capacidade de pagamento feita pela Receita Federal está correta, possibilitando a revisão do enquadramento com os dados contábeis analisados pelo sistema, com emissão de relatório para fundamentação.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('simulation')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'simulation'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Simulação
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'scenarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Cenários
            </button>
            <button
              onClick={() => setActiveTab('real')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'real'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Validação Real
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Histórico
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            {/* Importar PDF da ECD */}
            <Card className="border-dashed border-slate-300 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-4">
                <input
                  ref={ecdPdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleEcdPdfUpload(f);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isExtractingEcdPdf}
                  onClick={() => ecdPdfInputRef.current?.click()}
                >
                  {isExtractingEcdPdf ? 'Extraindo dados do PDF...' : 'Importar PDF da ECD (SPED)'}
                </Button>
                <p className="text-sm text-slate-600">
                  Envie o PDF oficial do Recibo de Entrega da ECD (Balanço e DRE) para preencher automaticamente os dados da simulação.
                </p>
              </div>
              {ecdProcessingStage && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-700 font-medium">{ecdProcessingStage}</p>
                    <span className="text-xs font-semibold text-slate-600">{Math.round(ecdProcessingProgress)}%</span>
                  </div>
                  {ecdProcessingDetail && (
                    <p className="mt-1 text-xs text-slate-500">{ecdProcessingDetail}</p>
                  )}
                  <div className="mt-2 h-2 rounded bg-slate-200 overflow-hidden">
                    <div
                      className="h-2 bg-brand transition-all duration-700 ease-out"
                      style={{ width: `${Math.max(8, Math.min(100, ecdProcessingProgress))}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Progress Steps */}
            <Card>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  {STEPS.map((step, index) => (
                    <div key={step.number} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                            currentStep === step.number
                              ? 'bg-blue-600 text-white'
                              : currentStep > step.number
                              ? 'bg-brand text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {currentStep > step.number ? '✓' : step.number}
                        </div>
                        <div className="mt-2 text-xs text-center max-w-[100px]">
                          <div className="font-medium">{step.title}</div>
                        </div>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`h-1 flex-1 mx-2 transition-all ${
                            currentStep > step.number ? 'bg-brand' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h2 className="text-xl font-semibold mb-2">{STEPS[currentStep - 1].title}</h2>
                <p className="text-sm text-slate-600 mb-6">{STEPS[currentStep - 1].description}</p>

                {renderStepContent()}

                <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
                  <Button
                    variant="tertiary"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    Anterior
                  </Button>
                  {currentStep < 7 ? (
                    <Button onClick={handleNext}>Próximo</Button>
                  ) : (
                    <Button onClick={handleSimulate} disabled={isSimulating}>
                      {isSimulating ? 'Calculando...' : 'Calcular classificação'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Resultado */}
            {simulationResult && (
              <>
              {/* Conteúdo dedicado para PDF — off-screen, layout de documento para advogados */}
              <div
                id="rating-validator-pdf-content"
                className="fixed left-[-9999px] top-0 w-[210mm] bg-white text-black p-8 space-y-6"
                aria-hidden="true"
              >
                <div className="pdf-keep-together">
                  <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-slate-900">IATax Soluções Inteligentes</h1>
                      <p className="text-sm text-slate-600">Transação Tributária · Análise da capacidade de pagamento</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Relatório para fundamentação — {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pdf-keep-together grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Liquidez Corrente</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(simulationResult.indicators.liquidez_corrente, 2)}</p>
                    <p className="text-xs text-slate-600 mt-0.5">AC ÷ PC</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Liquidez Geral</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(simulationResult.indicators.liquidez_geral, 2)}</p>
                    <p className="text-xs text-slate-600 mt-0.5">(AC+RLP) ÷ (PC+PNC)</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Solvência</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatPercent(simulationResult.indicators.solvencia)}</p>
                    <p className="text-xs text-slate-600 mt-0.5">PL ÷ Ativo Total</p>
                  </div>
                </div>

                <div className="pdf-keep-together flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg border-2 px-5 py-3 ${getRatingColor(simulationResult.rating_estimado)}`}>
                      <span className="block text-2xl font-bold">{simulationResult.rating_estimado}</span>
                      <span className="block text-xs">Enquadramento Revisado</span>
                    </div>
                  </div>
                  {simulationResult.rating_real && (
                    <>
                      <span className="text-slate-400">vs</span>
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg border-2 px-5 py-3 ${getRatingColor(simulationResult.rating_real)} ${simulationResult.has_discrepancy ? 'ring-2 ring-rose-400' : ''}`}>
                          <span className="block text-2xl font-bold">{simulationResult.rating_real}</span>
                          <span className="block text-xs">Enquadramento Receita Federal</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {simulationResult.has_discrepancy && simulationResult.rating_real && (
                  <div className="pdf-keep-together py-3 px-4 rounded-lg bg-rose-50 border border-rose-200">
                    <p className="text-sm text-rose-800 font-medium">
                      Discrepância identificada: os indicadores sustentam o Enquadramento Revisado ({simulationResult.rating_estimado}), distinto do Enquadramento Receita Federal ({simulationResult.rating_real}). Fundamenta pedido de revisão conforme arts. 30 e ss. da Portaria PGFN 6.757/2022.
                    </p>
                  </div>
                )}

                {/* Comparativo focado: Revisado vs RF */}
                {simulationResult.indicator_analysis && simulationResult.indicator_analysis.length > 0 && (() => {
                  const real = simulationResult.rating_real;
                  const estimado = simulationResult.rating_estimado;
                  const atendeNivel = (item: { id: string; value: number }, lvl: 'D' | 'C' | 'B' | 'A') => {
                    const mins = THRESHOLD_MINS[item.id];
                    if (!mins) return lvl === 'D';
                    return item.value >= mins[lvl] - EPS;
                  };
                  const getThreshold = (item: { id: string; thresholds_by_level?: { D?: string; C?: string; B?: string; A?: string } }, lvl: 'D' | 'C' | 'B' | 'A') =>
                    item.thresholds_by_level?.[lvl] ?? FALLBACK_THRESHOLDS[item.id]?.[lvl] ?? '-';
                  const colsToShow = real && real !== estimado
                    ? [
                        { key: 'revisado' as const, label: `Enquadramento Revisado (${estimado})`, level: estimado },
                        { key: 'rf' as const, label: `Enquadramento RF (${real})`, level: real },
                      ]
                    : [{ key: 'revisado' as const, label: `Enquadramento Revisado (${estimado})`, level: estimado }];
                  return (
                    <div className="pdf-keep-together">
                      <h3 className="text-base font-semibold text-slate-800 mb-2">Comparativo Revisado vs Receita Federal</h3>
                      <table className="w-full text-sm border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left p-3 font-semibold text-slate-700 border-b border-r border-slate-200">Indicador</th>
                            <th className="text-center p-3 font-semibold text-slate-700 border-b border-r border-slate-200">Valor</th>
                            {colsToShow.map((c) => (
                              <th key={c.key} className="text-center p-3 font-semibold text-slate-700 border-b border-slate-200">
                                {c.label}
                              </th>
                            ))}
                            <th className="text-left p-3 font-semibold text-slate-700 border-b border-slate-200">Observação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationResult.indicator_analysis.map((item) => {
                            const atendeRevisado = atendeNivel(item, estimado);
                            const atendeRF = real ? atendeNivel(item, real) : true;
                            const discrepante = real && real !== estimado && !atendeRF;
                            const obs = discrepante
                              ? 'Não atende RF — evidência para revisão'
                              : real && real !== estimado
                                ? 'Atende ambos'
                                : 'Atende';
                            return (
                              <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                                <td className="p-3 border-r border-slate-100">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-slate-500">{item.formula}</div>
                                </td>
                                <td className="p-3 text-center font-mono font-bold border-r border-slate-100">
                                  {item.id === 'solvencia' ? formatPercent(item.value) : formatNumber(item.value, 2)}
                                </td>
                                {colsToShow.map((c) => {
                                  const atende = c.key === 'revisado' ? atendeRevisado : atendeRF;
                                  const thr = getThreshold(item, c.level);
                                  return (
                                    <td key={c.key} className={`p-3 text-center border-r border-slate-100 ${discrepante && c.key === 'rf' ? 'bg-rose-50' : ''}`}>
                                      <div className="font-medium">{thr}</div>
                                      <div className={`text-xs mt-0.5 ${atende ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {atende ? '✓ Atende' : 'Não atende'}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className={`p-3 text-sm ${discrepante ? 'text-rose-700 font-medium' : 'text-slate-600'}`}>
                                  {obs}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="mt-3 text-sm text-slate-600">
                        Uso jurídico: a análise resulta no Enquadramento Revisado ({estimado}).
                        {real && real !== estimado && (
                          <> A divergência com o Enquadramento RF ({real}) fundamenta pedido de revisão junto à Receita Federal (art. 30, Portaria PGFN 6.757/2022).</>
                        )}
                      </p>
                    </div>
                  );
                })()}

                <div className="pdf-keep-together space-y-4">
                  <h3 className="text-base font-semibold text-slate-800">Memória de Cálculo</h3>
                  <p className="text-sm text-slate-600">
                    Metodologia: Portaria PGFN nº 6.757, de 29 de julho de 2022. Indicadores conforme arts. 30 e ss. (Capag Efetiva).
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="rounded border border-slate-200 bg-slate-50/50 p-3">
                      <p className="font-medium">Liquidez Corrente</p>
                      <p className="text-slate-600">{formatCurrency(simulationResult.calculated_values.ativo_circulante_total)} ÷ {formatCurrency(simulationResult.calculated_values.passivo_circulante_total)} = <strong>{formatNumber(simulationResult.indicators.liquidez_corrente, 2)}</strong></p>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50/50 p-3">
                      <p className="font-medium">Liquidez Geral</p>
                      <p className="text-slate-600">({formatCurrency(simulationResult.calculated_values.ativo_circulante_total)} + {formatCurrency(simulationResult.calculated_values.realizavel_longo_prazo_total)}) ÷ ({formatCurrency(simulationResult.calculated_values.passivo_circulante_total)} + {formatCurrency(simulationResult.calculated_values.passivo_nao_circulante_total)}) = <strong>{formatNumber(simulationResult.indicators.liquidez_geral, 2)}</strong></p>
                    </div>
                    <div className="rounded border border-slate-200 bg-slate-50/50 p-3">
                      <p className="font-medium">Solvência</p>
                      <p className="text-slate-600">{formatCurrency(simulationResult.calculated_values.patrimonio_liquido_total)} ÷ {formatCurrency(simulationResult.calculated_values.ativo_total)} = <strong>{formatPercent(simulationResult.indicators.solvencia)}</strong></p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    Regras: LC ≥2(3pts), ≥1,5(2pts), ≥1(1pt); LG ≥1,5(3pts), ≥1,2(2pts), ≥1(1pt); Solvência ≥0,5(3pts), ≥0,3(2pts), ≥0,1(1pt). Classificação: A≥7pts, B 5–6, C 3–4, D &lt;3.
                  </p>
                </div>

                <div className="pdf-keep-together space-y-3">
                  <h3 className="text-base font-semibold text-slate-800">Embasamento Legal</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Portaria PGFN nº 6.757/2022 regula a transação na cobrança de créditos da União e FGTS. O contribuinte pode requerer revisão de capacidade de pagamento (arts. 30 e ss.), no prazo de 30 dias, com documentação (Balanço, DRE, DFC, extratos etc.). Classificações A/B: capacidade de cumprir; C/D: possibilidade de descontos e prazo ampliado. Base: Lei 13.988/2020, Portaria PGFN 6.757/2022 e 1.241/2023.
                  </p>
                </div>

                {/* Simulador no PDF: só se há valor de dívida e discrepância para destacar o impacto */}
                {debtAmount > 0 && debtSimulations && simulationResult.rating_real && simulationResult.rating_real !== simulationResult.rating_estimado && (
                  <div className="pdf-keep-together">
                    <h3 className="text-base font-semibold text-slate-800 mb-2">Impacto no Parcelamento (dívida informada)</h3>
                    <p className="text-sm text-slate-600 mb-3">Dívida: {formatCurrency(debtAmount)} — Comparação entre Enquadramento Revisado e Enquadramento RF.</p>
                    <table className="w-full text-sm border border-slate-200">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left p-3 font-semibold text-slate-700 border-b border-r border-slate-200">Condição</th>
                          <th className="text-center p-3 font-semibold text-slate-700 border-b border-r border-slate-200">
                            Revisado ({simulationResult.rating_estimado})
                          </th>
                          <th className="text-center p-3 font-semibold text-slate-700 border-b border-slate-200">
                            RF ({simulationResult.rating_real})
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="p-3 border-r border-slate-100">Entrada (1%)</td>
                          <td className="p-3 text-center border-r border-slate-100 font-mono">{formatCurrency(debtSimulations[simulationResult.rating_estimado].entryAmount)}</td>
                          <td className="p-3 text-center font-mono">{formatCurrency(debtSimulations[simulationResult.rating_real].entryAmount)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-3 border-r border-slate-100">Parcela mensal</td>
                          <td className="p-3 text-center border-r border-slate-100 font-mono">{formatCurrency(debtSimulations[simulationResult.rating_estimado].monthlyPayment)}</td>
                          <td className="p-3 text-center font-mono">{formatCurrency(debtSimulations[simulationResult.rating_real].monthlyPayment)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-3 border-r border-slate-100">Economia (descontos)</td>
                          <td className="p-3 text-center border-r border-slate-100 font-mono text-emerald-600">{formatCurrency(debtSimulations[simulationResult.rating_estimado].savings)}</td>
                          <td className="p-3 text-center font-mono text-emerald-600">{formatCurrency(debtSimulations[simulationResult.rating_real].savings)}</td>
                        </tr>
                        <tr>
                          <td className="p-3 border-r border-slate-100">Prazo máximo</td>
                          <td className="p-3 text-center border-r border-slate-100">{debtSimulations[simulationResult.rating_estimado].maxMonths} meses</td>
                          <td className="p-3 text-center">{debtSimulations[simulationResult.rating_real].maxMonths} meses</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div id="rating-validator-resultado-print" className="space-y-6 pdf-export-root">
                {/* Cabeçalho profissional para tela e impressão */}
                <div id="pdf-header" className="pdf-keep-together flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">IATax Soluções Inteligentes</h2>
                      <p className="text-sm text-slate-600">Transação Tributária · Análise da capacidade de pagamento</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Relatório gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div id="result-section" className="space-y-6">
                {/* Cards de Indicadores */}
                <div id="pdf-indicators-grid" className="pdf-keep-together grid grid-cols-3 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-600">Liquidez Corrente</h3>
                      <Badge
                        className={
                          simulationResult.indicators.liquidez_corrente >= 1.0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {simulationResult.indicators.liquidez_corrente >= 1.0 ? 'Adequado' : 'Atenção'}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatNumber(simulationResult.indicators.liquidez_corrente, 2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ativo Circulante / Passivo Circulante
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-600">Liquidez Geral</h3>
                      <Badge
                        className={
                          simulationResult.indicators.liquidez_geral >= 1.0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {simulationResult.indicators.liquidez_geral >= 1.0 ? 'Adequado' : 'Atenção'}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatNumber(simulationResult.indicators.liquidez_geral, 2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      (AC + RLP) / (PC + PNC)
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-600">Solvência</h3>
                      <Badge
                        className={
                          simulationResult.indicators.solvencia >= 0.3
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {simulationResult.indicators.solvencia >= 0.3 ? 'Bom' : 'Regular'}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {formatPercent(simulationResult.indicators.solvencia)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Patrimônio Líquido / Ativo Total
                    </p>
                  </Card>
                </div>

                {/* Rating Card — layout comparativo de planos */}
                <Card className="pdf-keep-together p-6 overflow-hidden">
                  {/* Resumo visual: Enquadramento Revisado vs Enquadramento RF */}
                  <div className="flex flex-wrap items-center gap-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-xl border-2 px-6 py-4 ${getRatingColor(simulationResult.rating_estimado)}`}>
                        <span className="block text-3xl font-bold">{simulationResult.rating_estimado}</span>
                        <span className="text-sm opacity-90">{getRatingLabel(simulationResult.rating_estimado)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Revisado</p>
                        <p className="text-slate-700">Enquadramento Revisado</p>
                      </div>
                    </div>
                    {simulationResult.rating_real && (
                      <>
                        <span className="text-slate-400 text-2xl font-light">×</span>
                        <div className="flex items-center gap-4">
                          <div className={`rounded-xl border-2 px-6 py-4 ${getRatingColor(simulationResult.rating_real)} ${
                            simulationResult.has_discrepancy ? 'ring-2 ring-rose-300' : ''
                          }`}>
                            <span className="block text-3xl font-bold">{simulationResult.rating_real}</span>
                            <span className="text-sm opacity-90">{getRatingLabel(simulationResult.rating_real)}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Receita Federal</p>
                            <p className="text-slate-700">Enquadramento Receita Federal</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {simulationResult.has_discrepancy && (
                    <div className="mb-6 py-3 px-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-3">
                      <span className="text-rose-500 text-xl" aria-hidden>!</span>
                      <p className="text-sm text-rose-800">
                        <strong>Discrepância:</strong> os indicadores levam ao <strong>Enquadramento Revisado</strong> ({simulationResult.rating_estimado}), diferente do Enquadramento Receita Federal ({simulationResult.rating_real}). Veja abaixo onde cada indicador se enquadra.
                      </p>
                    </div>
                  )}

                  {/* Tabela comparativa — sempre visível */}
                  {simulationResult.indicator_analysis && simulationResult.indicator_analysis.length > 0 && (() => {
                    const levels: ('D' | 'C' | 'B' | 'A')[] = ['D', 'C', 'B', 'A'];
                    const real = simulationResult.rating_real;
                    const estimado = simulationResult.rating_estimado;
                    const hasDiscrepancy = simulationResult.has_discrepancy && real && real !== estimado;
                    /** Calcula "atende" pelo valor numérico do indicador (independente da API) */
                    const atendeNivel = (item: { id: string; value: number }, colLevel: 'D' | 'C' | 'B' | 'A') => {
                      const mins = THRESHOLD_MINS[item.id];
                      if (!mins) return colLevel === 'D';
                      return item.value >= mins[colLevel] - EPS;
                    };
                    const getThreshold = (item: { id: string; thresholds_by_level?: { D?: string; C?: string; B?: string; A?: string } }, lvl: 'D' | 'C' | 'B' | 'A') =>
                      item.thresholds_by_level?.[lvl] ?? FALLBACK_THRESHOLDS[item.id]?.[lvl] ?? '-';
                    return (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">Comparativo de indicadores por Rating</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          Uma coluna por classificação (D, C, B, A). Seu valor vs. o que cada nível exige. Verde = atende; vermelho = discrepância (Enquadramento RF exige um nível que este indicador não atinge).
                        </p>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <table className="w-full text-sm min-w-[36rem]">
                            <thead>
                              <tr>
                                <th className="text-left p-4 font-semibold text-slate-700 bg-slate-50 rounded-tl-2xl border-b border-slate-200">Indicador</th>
                                <th className="text-center p-4 font-semibold text-slate-700 bg-white border-b border-l border-slate-200">Seu valor</th>
                                {levels.map((lvl) => {
                                  const isCalculado = lvl === estimado;
                                  const isInformado = lvl === real;
                                  const isRedHeader = isInformado && hasDiscrepancy;
                                  return (
                                    <th
                                      key={lvl}
                                      className={`p-4 font-semibold text-center min-w-[8rem] border-b border-l border-slate-200 ${
                                        isRedHeader
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : isCalculado
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-slate-50 text-slate-700'
                                      } ${lvl === 'A' ? 'rounded-tr-2xl' : ''}`}
                                    >
                                      <span className="block text-xl font-bold">{lvl}</span>
                                      <span className="block text-xs font-normal mt-1 opacity-90">
                                        {isCalculado && '✓ Enquadramento Revisado'}
                                        {isInformado && !isCalculado && 'Enquadramento RF'}
                                        {!isCalculado && !isInformado && getRatingLabel(lvl)}
                                      </span>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {simulationResult.indicator_analysis.map((item) => {
                                const atendeCol = (lvl: 'D' | 'C' | 'B' | 'A') => atendeNivel(item, lvl);
                                return (
                                  <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                                    <td className="p-4 bg-slate-50/70 border-r border-slate-100">
                                      <div className="font-medium text-slate-800">{item.name}</div>
                                      <div className="text-xs text-slate-500 mt-0.5">{item.formula}</div>
                                    </td>
                                    <td className="p-4 text-center font-mono font-bold text-slate-900 bg-white border-r border-slate-100">
                                      {item.id === 'solvencia' ? formatPercent(item.value) : formatNumber(item.value, 2)}
                                    </td>
                                    {levels.map((lvl) => {
                                      const atende = atendeCol(lvl);
                                      const isCalculado = lvl === estimado;
                                      const isRed = hasDiscrepancy && lvl === real && !atende;
                                      const isGreen = lvl === estimado && atende;
                                      return (
                                        <td
                                          key={lvl}
                                          className={`p-4 text-center border-l border-slate-100 ${
                                            isRed
                                              ? 'bg-rose-50 text-rose-700'
                                              : isGreen
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : isCalculado
                                                  ? 'bg-emerald-50/40 text-slate-700'
                                                  : 'bg-white text-slate-600'
                                          }`}
                                        >
                                          <div className="font-semibold">{getThreshold(item, lvl)}</div>
                                          <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                            atende
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : 'bg-slate-100 text-slate-500'
                                          }`}>
                                            {atende ? '✓ Atende' : 'Não atende'}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">
                          <strong>Uso jurídico:</strong> a análise resulta no <strong>Enquadramento Revisado</strong> ({simulationResult.rating_estimado}).
                          {real && real !== estimado && (
                            <> A divergência com o Enquadramento Receita Federal ({real}) pode fundamentar pedido de revisão junto à Receita Federal.</>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  {(!simulationResult.indicator_analysis || simulationResult.indicator_analysis.length === 0) && (
                    <p className="text-sm text-slate-500 italic">Indicadores detalhados não disponíveis para este resultado.</p>
                  )}
                </Card>

                {/* Memória de Cálculo */}
                <Card className="pdf-keep-together p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-1">Memória de Cálculo</h2>
                  <p className="text-sm text-slate-600 mb-2">
                    Metodologia baseada na <strong>Portaria PGFN nº 6.757, de 29 de julho de 2022</strong>, que regulamenta a transação na cobrança de créditos da União e do FGTS e dispõe sobre a aferição da capacidade de pagamento para fins de negociação.
                  </p>
                  <p className="text-sm text-slate-600 mb-4">
                    Indicadores calculados a partir dos demonstrativos contábeis (Balanço Patrimonial) conforme critérios utilizados na análise de Capag Efetiva (arts. 30 e seguintes da Portaria 6.757/2022).
                  </p>
                  <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <h3 className="font-medium text-slate-800 mb-2">Liquidez Corrente</h3>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Fórmula:</strong> Ativo Circulante ÷ Passivo Circulante — mede a capacidade de pagar obrigações de curto prazo. Valores ≥ 1,0 indicam capacidade adequada.
                      </p>
                      <div className="font-mono text-sm bg-white rounded-lg p-3 border border-slate-200">
                        {formatCurrency(simulationResult.calculated_values.ativo_circulante_total)}
                        <span className="text-slate-400 mx-2">÷</span>
                        {formatCurrency(simulationResult.calculated_values.passivo_circulante_total)}
                        <span className="text-slate-400 mx-2">=</span>
                        <strong className="text-emerald-700">
                          {formatNumber(simulationResult.indicators.liquidez_corrente, 2)}
                        </strong>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <h3 className="font-medium text-slate-800 mb-2">Liquidez Geral</h3>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Fórmula:</strong> (Ativo Circulante + Realizável a LP) ÷ (Passivo Circulante + Passivo Não Circulante) — mede a capacidade de pagar todas as obrigações (curto e longo prazo). Considera ativos e passivos circulantes e não circulantes.
                      </p>
                      <div className="font-mono text-sm bg-white rounded-lg p-3 border border-slate-200">
                        <span className="text-slate-500">(</span>
                        {formatCurrency(simulationResult.calculated_values.ativo_circulante_total)}
                        <span className="text-slate-400 mx-1">+</span>
                        {formatCurrency(simulationResult.calculated_values.realizavel_longo_prazo_total)}
                        <span className="text-slate-500">)</span>
                        <span className="text-slate-400 mx-2">÷</span>
                        <span className="text-slate-500">(</span>
                        {formatCurrency(simulationResult.calculated_values.passivo_circulante_total)}
                        <span className="text-slate-400 mx-1">+</span>
                        {formatCurrency(simulationResult.calculated_values.passivo_nao_circulante_total)}
                        <span className="text-slate-500">)</span>
                        <span className="text-slate-400 mx-2">=</span>
                        <strong className="text-emerald-700">
                          {formatNumber(simulationResult.indicators.liquidez_geral, 2)}
                        </strong>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <h3 className="font-medium text-slate-800 mb-2">Solvência</h3>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Fórmula:</strong> Patrimônio Líquido ÷ Ativo Total — mede a participação do capital próprio no ativo total. Valores mais altos indicam menor dependência de capital de terceiros.
                      </p>
                      <div className="font-mono text-sm bg-white rounded-lg p-3 border border-slate-200">
                        {formatCurrency(simulationResult.calculated_values.patrimonio_liquido_total)}
                        <span className="text-slate-400 mx-2">÷</span>
                        {formatCurrency(simulationResult.calculated_values.ativo_total)}
                        <span className="text-slate-400 mx-2">=</span>
                        <strong className="text-emerald-700">
                          {formatPercent(simulationResult.indicators.solvencia)}
                        </strong>
                      </div>
                    </div>
                  </div>
                  {/* Regras de classificação conforme Portaria 6.757/2022 */}
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <h3 className="font-medium text-slate-800 mb-2">Regras de enquadramento (classificação A, B, C, D)</h3>
                    <p className="text-sm text-slate-600 mb-3">
                      A classificação para transação segue critérios baseados na pontuação dos três indicadores (Portaria PGFN 6.757/2022). Cada indicador atribui pontos conforme o valor obtido:
                    </p>
                    <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
                      <li><strong>Liquidez Corrente:</strong> ≥ 2,0 (3 pts), ≥ 1,5 (2 pts), ≥ 1,0 (1 pt)</li>
                      <li><strong>Liquidez Geral:</strong> ≥ 1,5 (3 pts), ≥ 1,2 (2 pts), ≥ 1,0 (1 pt)</li>
                      <li><strong>Solvência:</strong> ≥ 0,5 (3 pts), ≥ 0,3 (2 pts), ≥ 0,1 (1 pt)</li>
                    </ul>
                    <p className="text-sm text-slate-600 mt-3">
                      <strong>Classificação final:</strong> A (≥ 7 pts), B (5–6 pts), C (3–4 pts), D (&lt; 3 pts). As classificações A e B indicam capacidade de cumprir obrigações; C e D indicam dificuldade de quitação do passivo, com possibilidade de descontos e parcelamento ampliado.
                    </p>
                  </div>
                </Card>

                {/* Embasamento Legal - para advogados e contadores */}
                <Card className="pdf-keep-together p-6 bg-slate-50/80 border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800 mb-2">Embasamento legal</h2>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Fundamentação normativa para uso em peças e pareceres</p>
                  <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <p>
                      O presente relatório utiliza metodologia alinhada à <strong>Portaria PGFN nº 6.757, de 29 de julho de 2022</strong>, que regulamenta a transação na cobrança de créditos da União e do FGTS. A capacidade de pagamento é o critério previsto em lei e utilizado pela Procuradoria-Geral da Fazenda Nacional (PGFN) e Receita Federal para conceder benefícios em negociações — como descontos e prazo alongado para pagamento (consultar: gov.br/pgfn — Serviços de orientação ao contribuinte).
                    </p>
                    <p>
                      O contribuinte que discorda da classificação atribuída pela Receita Federal pode apresentar <strong>pedido de revisão de capacidade de pagamento</strong>, nos termos dos arts. 30 e seguintes da Portaria PGFN nº 6.757/2022, no prazo de 30 dias contados da ciência da classificação. O requerimento deve indicar o valor que entende correto, a metodologia de cálculo e comprovar com documentação (Balanço Patrimonial, DRE, DFC, relação de bens e direitos, extratos bancários e demais exigências do art. 30).
                    </p>
                    <p>
                      As classificações <strong>A e B</strong> são atribuídas aos devedores que têm condições de cumprir as obrigações (negociação em até 60 meses, sem descontos). As classificações <strong>C e D</strong> aplicam-se quando a capacidade de pagamento não é suficiente para liquidar todo o passivo fiscal; nesses casos, a Fazenda Nacional pode conceder descontos e prazo ampliado, pois a dívida é considerada de difícil recuperação ou irrecuperável.
                    </p>
                    <p>
                      Base legal: <strong>Lei nº 13.988/2020</strong> (transação tributária); <strong>Portaria PGFN nº 6.757/2022</strong> (regulamentação da transação e critérios de capacidade de pagamento); <strong>Portaria PGFN nº 1.241/2023</strong> (alterações); normas disponíveis em normas.receita.fazenda.gov.br.
                    </p>
                  </div>
                </Card>

                {/* Simulador de Parcelamento */}
                <Card className="pdf-keep-together p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">Simulador de Parcelamento de Dívida</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Veja a diferença efetiva de troca baseada no seu Rating
                      </p>
                    </div>
                    <Button
                      variant="tertiary"
                      onClick={() => setShowDebtSimulator(!showDebtSimulator)}
                      className="print:hidden pdf-exclude"
                    >
                      {showDebtSimulator ? 'Ocultar' : 'Mostrar Simulador'}
                    </Button>
                  </div>

                  {showDebtSimulator && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Valor Total da Dívida (R$)
                        </label>
                        <MoneyInput
                          label="Valor Total da Dívida"
                          value={debtAmount || 0}
                          onChange={(value) => setDebtAmount(value)}
                          className="text-lg"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Informe o valor total da dívida para simular as condições de parcelamento
                        </p>
                      </div>

                      {debtSimulations && (
                        <div className="mt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                              const sim = debtSimulations[rating];
                              const isCurrentRating = simulationResult.rating_estimado === rating;
                              return (
                                <Card
                                  key={rating}
                                  className={`p-5 ${
                                    isCurrentRating
                                      ? 'border-2 border-blue-500 bg-blue-50'
                                      : 'border border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Badge className={`${getRatingColor(rating)} text-lg px-3 py-1`}>
                                        Rating {rating}
                                      </Badge>
                                      {isCurrentRating && (
                                        <Badge className="bg-blue-600 text-white text-xs">
                                          Seu Rating
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Entrada (1%):</span>
                                      <span className="font-semibold">{formatCurrency(sim.entryAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Saldo a parcelar:</span>
                                      <span className="font-semibold">{formatCurrency(sim.remainingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Parcela mensal:</span>
                                      <span className="font-semibold">{formatCurrency(sim.monthlyPayment)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Prazo máximo:</span>
                                      <span className="font-semibold">{sim.maxMonths} meses</span>
                                    </div>
                                    {sim.savings > 0 && (
                                      <>
                                        <div className="pt-2 border-t border-slate-200">
                                          <div className="flex justify-between text-green-600">
                                            <span className="font-medium">Desconto em Juros:</span>
                                            <span className="font-bold">
                                              {formatCurrency(sim.discountOnInterest)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-green-600">
                                            <span className="font-medium">Desconto em Multas:</span>
                                            <span className="font-bold">
                                              {formatCurrency(sim.discountOnFees)}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="pt-2 border-t-2 border-green-300 bg-green-50 p-2 rounded">
                                          <div className="flex justify-between">
                                            <span className="font-bold text-green-800">
                                              Economia Total:
                                            </span>
                                            <span className="font-bold text-lg text-green-800">
                                              {formatCurrency(sim.savings)}
                                            </span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    <div className="pt-2 border-t border-slate-200">
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">Total com juros/multas:</span>
                                        <span className="font-semibold text-slate-700">
                                          {formatCurrency(sim.totalWithInterest)}
                                        </span>
                                      </div>
                                      {sim.savings > 0 && (
                                        <div className="flex justify-between mt-1">
                                          <span className="text-slate-600">Total com descontos:</span>
                                          <span className="font-bold text-green-600">
                                            {formatCurrency(sim.totalWithDiscount)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-500 mt-3 italic">
                                    {sim.condition}
                                  </p>
                                </Card>
                              );
                            })}
                          </div>

                          {/* Comparação */}
                          <Card className="p-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
                            <h3 className="font-semibold text-lg mb-4">Comparação de Economia</h3>
                            <div className="grid grid-cols-4 gap-4">
                              {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                                const sim = debtSimulations[rating];
                                const isCurrentRating = simulationResult.rating_estimado === rating;
                                const diffFromA = sim.savings - debtSimulations.A.savings;
                                return (
                                  <div
                                    key={rating}
                                    className={`p-4 rounded-lg ${
                                      isCurrentRating
                                        ? 'bg-blue-100 border-2 border-blue-500'
                                        : 'bg-white border border-slate-200'
                                    }`}
                                  >
                                    <div className="text-center">
                                      <Badge className={`${getRatingColor(rating)} mb-2`}>
                                        Rating {rating}
                                      </Badge>
                                      {isCurrentRating && (
                                        <p className="text-xs text-blue-600 font-medium mb-2">Seu Rating</p>
                                      )}
                                      <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(sim.savings)}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">Economia total</p>
                                      {rating !== 'A' && diffFromA !== 0 && (
                                        <p
                                          className={`text-xs mt-2 font-medium ${
                                            diffFromA > 0 ? 'text-green-600' : 'text-red-600'
                                          }`}
                                        >
                                          {diffFromA > 0 ? '+' : ''}
                                          {formatCurrency(diffFromA)} vs Rating A
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                              <p className="text-sm text-slate-700">
                                <strong>Diferença Efetiva:</strong> Com Rating{' '}
                                <Badge className={getRatingColor(simulationResult.rating_estimado)}>
                                  {simulationResult.rating_estimado}
                                </Badge>
                                , você teria uma economia de{' '}
                                <strong className="text-green-600">
                                  {formatCurrency(debtSimulations[simulationResult.rating_estimado].savings)}
                                </strong>{' '}
                                em relação ao pagamento sem negociação.
                                {simulationResult.rating_estimado === 'C' || simulationResult.rating_estimado === 'D' ? (
                                  <span className="block mt-2 text-green-700">
                                    ✓ Você se qualifica para descontos em juros e multas!
                                  </span>
                                ) : (
                                  <span className="block mt-2 text-blue-700">
                                    ✓ Você se qualifica para entrada facilitada e prazo máximo!
                                  </span>
                                )}
                              </p>
                            </div>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Comparativo de Modalidades */}
                {simulationResult && (
                  <Card className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold mb-2">Comparativo de Modalidades de Transação</h2>
                      <p className="text-sm text-slate-600">
                        Compare as condições das diferentes modalidades disponíveis nos Editais PGFN 2025 e identifique
                        qual é mais vantajosa para seu Rating{' '}
                        <Badge className={getRatingColor(simulationResult.rating_estimado)}>
                          {simulationResult.rating_estimado}
                        </Badge>
                      </p>
                    </div>

                    {!debtAmount || debtAmount <= 0 ? (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          Informe o valor da dívida acima para ver o comparativo de modalidades.
                        </p>
                      </div>
                    ) : modalityComparison && modalityComparison.comparisons.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {modalityComparison.comparisons.map((sim) => (
                            <Card
                              key={sim.modality}
                              className={`p-5 ${
                                sim.isBest
                                  ? 'border-2 border-brand bg-brand/5'
                                  : 'border border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-slate-700">{sim.name}</h3>
                                  {sim.isBest && (
                                    <Badge className="bg-brand text-white text-xs">
                                      ⭐ Mais Vantajosa
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 mb-4">{sim.description}</p>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Entrada ({sim.entryPercent}%):</span>
                                  <span className="font-semibold">{formatCurrency(sim.entryAmount)}</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Parcelável em até {sim.entryInstallments}x
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Parcela mensal:</span>
                                  <span className="font-semibold">{formatCurrency(sim.monthlyPayment)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Prazo máximo:</span>
                                  <span className="font-semibold">{sim.maxMonths} meses</span>
                                </div>

                                {(sim.discountOnInterest > 0 ||
                                  sim.discountOnFees > 0 ||
                                  sim.discountOnPrincipal > 0) && (
                                  <div className="pt-2 border-t border-slate-200">
                                    {sim.discountOnPrincipal > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span className="font-medium">Desconto Principal:</span>
                                        <span className="font-bold">
                                          {formatCurrency(sim.discountOnPrincipal)}
                                        </span>
                                      </div>
                                    )}
                                    {sim.discountOnInterest > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span className="font-medium">Desconto Juros:</span>
                                        <span className="font-bold">
                                          {formatCurrency(sim.discountOnInterest)}
                                        </span>
                                      </div>
                                    )}
                                    {sim.discountOnFees > 0 && (
                                      <div className="flex justify-between text-green-600">
                                        <span className="font-medium">Desconto Multas:</span>
                                        <span className="font-bold">{formatCurrency(sim.discountOnFees)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="pt-2 border-t-2 border-slate-300 bg-slate-50 p-2 rounded">
                                  <div className="flex justify-between mb-1">
                                    <span className="text-slate-600">Total a pagar:</span>
                                    <span className="font-bold text-lg text-slate-900">
                                      {formatCurrency(sim.totalWithDiscount)}
                                    </span>
                                  </div>
                                  {sim.savings > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-xs text-green-600">Economia total:</span>
                                      <span className="text-xs font-bold text-green-600">
                                        {formatCurrency(sim.savings)}
                                      </span>
                                    </div>
                                  )}
                                  {sim.savingsVsWorst > 0 && (
                                    <div className="flex justify-between mt-1">
                                      <span className="text-xs text-green-700">vs. pior modalidade:</span>
                                      <span className="text-xs font-bold text-green-700">
                                        +{formatCurrency(sim.savingsVsWorst)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>

                        {modalityComparison.bestModality && (
                          <Card className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-brand">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">🎯</div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2">
                                  Modalidade Mais Vantajosa para Rating{' '}
                                  <Badge className={getRatingColor(simulationResult.rating_estimado)}>
                                    {simulationResult.rating_estimado}
                                  </Badge>
                                </h3>
                                <p className="text-sm text-slate-700 mb-3">
                                  Com base nas condições dos Editais PGFN 2025, a modalidade{' '}
                                  <strong>
                                    {
                                      modalityComparison.comparisons.find((c) => c.isBest)
                                        ?.name
                                    }
                                  </strong>{' '}
                                  oferece as melhores condições para seu perfil de rating.
                                </p>
                                {modalityComparison.comparisons.find((c) => c.isBest) && (
                                  <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-slate-600">Valor total a pagar:</span>
                                        <span className="font-bold text-lg text-green-600 ml-2">
                                          {formatCurrency(
                                            modalityComparison.comparisons.find((c) => c.isBest)!
                                              .totalWithDiscount
                                          )}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Economia total:</span>
                                        <span className="font-bold text-lg text-green-600 ml-2">
                                          {formatCurrency(
                                            modalityComparison.comparisons.find((c) => c.isBest)!.savings
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        )}

                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-800">
                            <strong>Nota:</strong> As condições são baseadas nos Editais PGFN 2025 (Edital 11/2025 e
                            Editais de Contencioso). Valores de juros e multas são estimativos. Consulte o portal
                            REGULARIZE para valores exatos e condições específicas do seu caso.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          Nenhuma modalidade elegível encontrada para o valor informado. Verifique os critérios de
                          elegibilidade de cada modalidade.
                        </p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Valores Calculados */}
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Valores Agregados Calculados</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-3">Ativos</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Ativo Circulante:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.ativo_circulante_total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Realizável LP:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.realizavel_longo_prazo_total)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">Total Ativo:</span>
                          <span className="font-bold text-lg text-blue-600">
                            {formatCurrency(simulationResult.calculated_values.ativo_total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-3">Passivos e PL</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Passivo Circulante:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.passivo_circulante_total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Passivo Não Circulante:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.passivo_nao_circulante_total)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Patrimônio Líquido:</span>
                          <span className="font-semibold">
                            {formatCurrency(simulationResult.calculated_values.patrimonio_liquido_total)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">Total Passivo + PL:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(
                              simulationResult.calculated_values.passivo_total +
                                simulationResult.calculated_values.patrimonio_liquido_total
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                </div>
              </div>

              {/* Botão flutuante — abre layout de impressão em página dedicada */}
              <button
                type="button"
                onClick={() =>
                  navigate('/rating-validator/print-preview', {
                    state: { simulationResult, debtAmount, debtSimulations },
                  })
                }
                aria-label="Abrir layout de impressão"
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand/40"
                title="Abrir layout de impressão"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Simulação de Cenários por classificação (Rating)</h2>
                <p className="text-slate-600">
                  A classificação da capacidade de pagamento (rating A, B, C ou D) define as condições em transações com a Fazenda. Teste diferentes valores de dívida e compare as condições oferecidas para cada classificação nos editais PGFN. Identifique qual enquadramento seria mais vantajoso para seu cliente.
                </p>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Prazo Importante:</strong> Edital PGDAU 11/2025 prorrogado até{' '}
                    <strong>30 de janeiro de 2026</strong>. Use esta ferramenta para planejar estratégias de
                    negociação antes do prazo final.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor da Dívida (R$)
                </label>
                <MoneyInput
                  label="Valor da Dívida"
                  value={debtAmount || 0}
                  onChange={(value) => setDebtAmount(value)}
                  className="text-right text-lg"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Informe o valor total da dívida para simular as condições de cada rating
                </p>
              </div>

              {debtAmount > 0 && (
                <div className="space-y-6">
                  {/* Comparação por Rating */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Comparação por Rating</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                        // Na tela de cenários, não passar clientId para permitir ver todas as modalidades
                        const capagSim = calculateModalitySimulation(debtAmount, 'CAPAG', rating, false, undefined);
                        if (!capagSim) return null;

                        return (
                          <Card
                            key={rating}
                            className={`p-5 ${
                              rating === 'C' || rating === 'D'
                                ? 'border-2 border-brand bg-brand/5'
                                : 'border border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={`${getRatingColor(rating)} text-lg px-3 py-1`}>
                                Rating {rating}
                              </Badge>
                              {(rating === 'C' || rating === 'D') && (
                                <Badge className="bg-brand text-white text-xs">
                                  Com Descontos
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Entrada (6%):</span>
                                <span className="font-semibold">{formatCurrency(capagSim.entryAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Parcela mensal:</span>
                                <span className="font-semibold">{formatCurrency(capagSim.monthlyPayment)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Prazo:</span>
                                <span className="font-semibold">{capagSim.maxMonths} meses</span>
                              </div>
                              {(rating === 'C' || rating === 'D') && (
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="flex justify-between text-green-600">
                                    <span className="font-medium">Economia:</span>
                                    <span className="font-bold">{formatCurrency(capagSim.savings)}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    Desconto Real: {formatPercent(capagSim.savings / capagSim.totalWithInterest, 1)}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {rating === 'D' ? '70%' : rating === 'C' ? '65-70%' : '0%'} do valor total
                                  </div>
                                </div>
                              )}
                              {rating === 'A' || rating === 'B' ? (
                                <div className="pt-2 border-t border-slate-200">
                                  <div className="text-xs text-slate-500">
                                    Desconto Real: 0% (sem desconto para Rating {rating})
                                  </div>
                                </div>
                              ) : null}
                              <div className="pt-2 border-t-2 border-slate-300 bg-slate-50 p-2 rounded">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Total a pagar:</span>
                                  <span className="font-bold text-lg text-slate-900">
                                    {formatCurrency(capagSim.totalWithDiscount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Análise Estratégica */}
                  <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300">
                    <h3 className="text-lg font-semibold mb-4">💡 Análise Estratégica</h3>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold mb-2">Diferença entre Ratings C/D vs A/B</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Rating A/B (sem desconto):</span>
                            <span className="font-bold text-lg text-slate-700 ml-2">
                              {formatCurrency(
                                calculateModalitySimulation(debtAmount, 'CAPAG', 'A', false, undefined)?.totalWithDiscount || 0
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Rating C/D (com desconto):</span>
                            <span className="font-bold text-lg text-green-600 ml-2">
                              {formatCurrency(
                                calculateModalitySimulation(debtAmount, 'CAPAG', 'C', false, undefined)?.totalWithDiscount || 0
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <span className="text-slate-600">Economia potencial com Rating C/D:</span>
                          <span className="font-bold text-xl text-green-600 ml-2">
                            {formatCurrency(
                              (calculateModalitySimulation(debtAmount, 'CAPAG', 'A', false, undefined)?.totalWithDiscount || 0) -
                                (calculateModalitySimulation(debtAmount, 'CAPAG', 'C', false, undefined)?.totalWithDiscount || 0)
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <h4 className="font-semibold mb-2">⚠️ Alerta: Discrepância de Rating</h4>
                        <p className="text-sm text-slate-700 mb-3">
                          Se o sistema PGFN calcular um Rating diferente do seu cálculo, você pode solicitar revisão
                          da Capag antes do prazo final (30/01/2026). Esta ferramenta permite validar seu cálculo
                          antecipadamente.
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge className="bg-yellow-100 text-yellow-800">Estratégia</Badge>
                          <span className="text-slate-600">
                            Calcule o rating do cliente antes dele entrar no sistema PGFN para identificar
                            discrepâncias e solicitar revisão.
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Comparativo de Modalidades */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Comparativo de Modalidades por Rating</h3>
                    <div className="space-y-4">
                      {(['A', 'B', 'C', 'D'] as const).map((rating) => {
                        // Na tela de cenários, não passar clientId para permitir ver todas as modalidades
                        const comparison = compareModalities(debtAmount, rating, false, false, undefined);
                        if (!comparison || comparison.comparisons.length === 0) return null;

                        return (
                          <div key={rating} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={getRatingColor(rating)}>Rating {rating}</Badge>
                              <span className="text-sm text-slate-600">
                                Melhor modalidade:{' '}
                                <strong>
                                  {comparison.comparisons.find((c) => c.isBest)?.name || 'N/A'}
                                </strong>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {comparison.comparisons.map((sim) => (
                                <div
                                  key={sim.modality}
                                  className={`p-3 rounded border ${
                                    sim.isBest
                                      ? 'bg-brand/5 border-brand'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-700">{sim.name}</span>
                                    {sim.isBest && (
                                      <Badge className="bg-brand text-white text-xs">⭐ Melhor</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Total:</span>
                                      <span className="font-bold">{formatCurrency(sim.totalWithDiscount)}</span>
                                    </div>
                                    {sim.savings > 0 && (
                                      <>
                                        <div className="flex justify-between text-green-600">
                                          <span>Economia:</span>
                                          <span className="font-bold">{formatCurrency(sim.savings)}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                          Desconto: {formatPercent(sim.savings / sim.totalWithInterest, 1)}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'real' && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Validação Real a partir de ECD
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                A validação automática a partir de arquivos ECD será implementada quando tivermos exemplos de dados.
                Por enquanto, utilize a simulação manual.
              </p>
            </div>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Histórico de Validações
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                O histórico de validações salvas será exibido aqui em breve.
              </p>
            </div>
          </Card>
        )}
      </div>
      <ToastContainer />
    </Layout>
  );
}
